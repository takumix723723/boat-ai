import { getPrisma } from '../../db/client.js';
import { PrismaRacerRepository } from './prismaRacerRepository.js';
import { PrismaRaceRepository } from './prismaRaceRepository.js';

function toDecimal(value) {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

function toNumber(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @implements {import('../interfaces/snapshotRepository.js').ISnapshotRepository}
 */
export class PrismaSnapshotRepository {
  /**
   * Live更新後のレース配列をスナップショットとして永続化
   * @param {object[]} races
   * @param {object} globalMeta
   */
  async saveLiveDataset(races, globalMeta = {}) {
    const prisma = getPrisma();
    const capturedAt = new Date(globalMeta.fetchedAt ?? Date.now());
    let snapshotsCreated = 0;
    let aiScoresCreated = 0;

    // Neon 等: 全レース1トランザクションだと P2028 になりやすいためレース単位
    for (const race of races) {
      const result = await prisma.$transaction(
        async (tx) => this.saveOneRace(tx, race, globalMeta, capturedAt),
        { timeout: 30_000 }
      );
      snapshotsCreated += result.snapshotsCreated;
      aiScoresCreated += result.aiScoresCreated;
    }

    return {
      racesProcessed: races.length,
      snapshotsCreated,
      aiScoresCreated,
      capturedAt: capturedAt.toISOString(),
    };
  }

  /**
   * @param {import('@prisma/client').Prisma.TransactionClient} tx
   */
  async saveOneRace(tx, race, globalMeta, capturedAt) {
    const racerRepo = new PrismaRacerRepository(tx);
    const raceRepo = new PrismaRaceRepository(tx);
    let aiScoresCreated = 0;

    for (const entry of race.entries ?? []) {
      await racerRepo.upsert({
        racerId: entry.racerId,
        name: entry.name,
        rank: entry.rank,
        branch: entry.branch,
      });
    }

    const raceRow = await raceRepo.upsert(race);

    const entryIdByLane = new Map();
    for (const entry of race.entries ?? []) {
      const row = await tx.raceEntry.upsert({
        where: {
          raceId_lane: { raceId: raceRow.id, lane: entry.lane },
        },
        create: {
          raceId: raceRow.id,
          lane: entry.lane,
          racerId: entry.racerId,
          motor: entry.motor ?? undefined,
        },
        update: {
          racerId: entry.racerId,
          motor: entry.motor ?? undefined,
        },
      });
      entryIdByLane.set(entry.lane, row.id);
    }

    const agg = await tx.raceSnapshot.aggregate({
      where: { raceId: raceRow.id },
      _max: { sequence: true },
    });
    const sequence = (agg._max.sequence ?? 0) + 1;

    const dataSource =
      race.meta?.dataSource ?? globalMeta.dataSource ?? 'unknown';

    const snapshot = await tx.raceSnapshot.create({
      data: {
        raceId: raceRow.id,
        capturedAt,
        sequence,
        status: race.status ?? null,
        startTime: race.startTime ?? null,
        lastMinute: race.lastMinute ?? undefined,
        dataSource,
        officialResult: race.officialResult?.available
          ? race.officialResult
          : undefined,
        meta: {
          ...(race.meta ?? {}),
          globalFetchedAt: globalMeta.fetchedAt,
        },
      },
    });

    for (const entry of race.entries ?? []) {
      const raceEntryId = entryIdByLane.get(entry.lane);
      if (!raceEntryId || !entry.aiScore) continue;

      await tx.aiScore.create({
        data: {
          snapshotId: snapshot.id,
          raceEntryId,
          total: entry.aiScore.total,
          previousTotal: entry.previousAiScore ?? null,
          breakdown: {
            st: entry.aiScore.st,
            exhibitionTime: entry.aiScore.exhibitionTime,
            lane: entry.aiScore.lane,
            motor: entry.aiScore.motor,
            course: entry.aiScore.course,
            lastMinute: entry.aiScore.lastMinute,
          },
          scoreDelta: entry.scoreDelta ?? undefined,
          st: toDecimal(entry.st),
          exhibitionTime: toDecimal(entry.exhibitionTime),
          tilt: toDecimal(entry.tilt),
        },
      });
      aiScoresCreated += 1;
    }

    return { snapshotsCreated: 1, aiScoresCreated };
  }

  async getStats() {
    const prisma = getPrisma();
    const [snapshots, aiScores, races, latest] = await Promise.all([
      prisma.raceSnapshot.count(),
      prisma.aiScore.count(),
      prisma.race.count(),
      prisma.raceSnapshot.findFirst({
        orderBy: { capturedAt: 'desc' },
        select: { capturedAt: true },
      }),
    ]);

    return {
      totalSnapshots: snapshots,
      totalAiScores: aiScores,
      totalRaces: races,
      latestCapturedAt: latest?.capturedAt?.toISOString() ?? null,
      latestByRace: null,
    };
  }

  /** @param {string} externalRaceId */
  async getRaceHistory(externalRaceId) {
    const prisma = getPrisma();
    const race = await prisma.race.findUnique({
      where: { externalId: externalRaceId },
      select: {
        externalId: true,
        venueName: true,
        raceNo: true,
        snapshots: {
          orderBy: [{ capturedAt: 'asc' }, { sequence: 'asc' }],
          select: {
            sequence: true,
            capturedAt: true,
            status: true,
            aiScores: {
              include: {
                raceEntry: {
                  select: {
                    lane: true,
                    racerId: true,
                    racer: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!race) {
      return {
        found: false,
        raceId: externalRaceId,
        venueName: null,
        raceNo: null,
        snapshots: [],
      };
    }

    const snapshots = race.snapshots.map((snap) => ({
      sequence: snap.sequence,
      capturedAt: snap.capturedAt.toISOString(),
      status: snap.status,
      entries: snap.aiScores
        .map((row) => ({
          lane: row.raceEntry.lane,
          racerId: row.raceEntry.racerId,
          name: row.raceEntry.racer.name,
          aiScore: {
            total: row.total,
            ...(row.breakdown && typeof row.breakdown === 'object'
              ? row.breakdown
              : {}),
          },
          previousTotal: row.previousTotal,
          scoreDelta: row.scoreDelta,
          st: toNumber(row.st),
          exhibitionTime: toNumber(row.exhibitionTime),
          tilt: toNumber(row.tilt),
        }))
        .sort((a, b) => a.lane - b.lane),
    }));

    return {
      found: true,
      raceId: race.externalId,
      venueName: race.venueName,
      raceNo: race.raceNo,
      snapshots,
    };
  }

  /** @param {string} externalRaceId */
  async getStatsForRace(externalRaceId) {
    const prisma = getPrisma();
    const race = await prisma.race.findUnique({
      where: { externalId: externalRaceId },
      select: { id: true, externalId: true, venueName: true, raceNo: true },
    });

    if (!race) {
      return {
        totalSnapshots: 0,
        totalAiScores: 0,
        totalRaces: 0,
        latestCapturedAt: null,
        latestByRace: { externalId: externalRaceId, found: false },
      };
    }

    const [snapshots, aiScores, latest] = await Promise.all([
      prisma.raceSnapshot.count({ where: { raceId: race.id } }),
      prisma.aiScore.count({
        where: { snapshot: { raceId: race.id } },
      }),
      prisma.raceSnapshot.findFirst({
        where: { raceId: race.id },
        orderBy: { capturedAt: 'desc' },
        select: { capturedAt: true, sequence: true, status: true },
      }),
    ]);

    return {
      totalSnapshots: snapshots,
      totalAiScores: aiScores,
      totalRaces: 1,
      latestCapturedAt: latest?.capturedAt?.toISOString() ?? null,
      latestByRace: {
        found: true,
        externalId: race.externalId,
        venueName: race.venueName,
        raceNo: race.raceNo,
        latestSequence: latest?.sequence ?? null,
        latestStatus: latest?.status ?? null,
      },
    };
  }
}
