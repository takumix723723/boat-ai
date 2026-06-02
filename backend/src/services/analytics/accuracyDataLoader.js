import { getPrisma } from '../../db/client.js';
import { isRealOfficialResult } from '../results/officialResultPolicy.js';
import { racerStatsFromLegacyMotor } from '../boatrace/racerStats.js';

export function parseOfficialResult(json) {
  if (!isRealOfficialResult(json)) return null;
  return json.placements;
}

/**
 * @param {object|null|undefined} motor
 * @param {object|null|undefined} racerStats
 */
export function resolveStoredRacerStats(motor, racerStats) {
  if (racerStats && typeof racerStats === 'object') return racerStats;
  return racerStatsFromLegacyMotor(motor);
}

/**
 * 精度分析・シミュレーション共通のレースデータ
 */
export async function loadRacesForAccuracy(prisma) {
  return prisma.race.findMany({
    where: {
      officialResult: {
        path: ['available'],
        equals: true,
      },
    },
    select: {
      externalId: true,
      venueCode: true,
      venueName: true,
      officialResult: true,
      snapshots: {
        where: { aiScores: { some: {} } },
        orderBy: [{ sequence: 'desc' }, { capturedAt: 'desc' }],
        take: 1,
        select: {
          lastMinute: true,
          aiScores: {
            include: {
              raceEntry: {
                select: {
                  lane: true,
                  racerId: true,
                  motor: true,
                  racerStats: true,
                  racer: { select: { name: true, rank: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * @param {Awaited<ReturnType<typeof loadRacesForAccuracy>>} races
 */
export function buildAccuracyRaceCases(races) {
  const cases = [];

  for (const race of races) {
    const placements = parseOfficialResult(race.officialResult);
    const snap = race.snapshots[0];
    if (!placements?.length || !snap?.aiScores?.length) continue;

    const entries = snap.aiScores.map((row) => {
      const re = row.raceEntry;
      const motor = re.motor && typeof re.motor === 'object' ? re.motor : null;
      const racerStats = resolveStoredRacerStats(motor, re.racerStats);

      return {
        lane: re.lane,
        racerId: re.racerId,
        name: re.racer.name,
        rank: re.racer.rank ?? 'B1',
        branch: null,
        st: row.st != null ? Number(row.st) : null,
        exhibitionTime:
          row.exhibitionTime != null ? Number(row.exhibitionTime) : null,
        tilt: row.tilt != null ? Number(row.tilt) : null,
        motor,
        racerStats,
      };
    });

    cases.push({
      venueCode: race.venueCode,
      venueName: race.venueName,
      placements,
      lastMinute: snap.lastMinute ?? null,
      entries,
    });
  }

  return cases;
}
