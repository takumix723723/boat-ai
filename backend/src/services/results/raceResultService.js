import { getPrisma } from '../../db/client.js';
import { buildAiVerification } from './aiVerification.js';
import {
  isRealOfficialResult,
  normalizeOfficialResultForDisplay,
  PENDING_OFFICIAL_RESULT,
} from './officialResultPolicy.js';

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * @param {object|null} memoryRace - インメモリ Race（AI比較用）
 * @param {string} externalRaceId
 * @param {{ dataSource?: string|null }} [options]
 */
export async function getRaceResult(externalRaceId, memoryRace = null, options = {}) {
  const memoryId = memoryRace?.id ?? null;
  if (memoryId && memoryId !== externalRaceId) {
    memoryRace = null;
  }

  const fromMemory = memoryRace?.officialResult ?? null;
  let officialResult = isRealOfficialResult(fromMemory)
    ? fromMemory
    : { ...PENDING_OFFICIAL_RESULT };

  if (options.dataSource === 'mock') {
    officialResult = { ...PENDING_OFFICIAL_RESULT };
  }
  let savedToDb = false;
  let savedOnSnapshot = false;
  let predictionSource = 'live_memory';
  let predictionCapturedAt = null;
  let entriesForAi = memoryRace?.entries ?? [];

  if (isDatabaseConfigured()) {
    try {
      const prisma = getPrisma();
      const row = await prisma.race.findUnique({
        where: { externalId: externalRaceId },
        select: {
          officialResult: true,
          snapshots: {
            orderBy: [{ capturedAt: 'desc' }, { sequence: 'desc' }],
            take: 1,
            select: {
              capturedAt: true,
              sequence: true,
              officialResult: true,
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

      if (row?.officialResult && typeof row.officialResult === 'object') {
        const dbResult = row.officialResult;
        if (isRealOfficialResult(dbResult)) {
          savedToDb = true;
          if (!isRealOfficialResult(officialResult)) officialResult = dbResult;
        }
      }

      const snap = row?.snapshots?.[0];
      if (snap?.officialResult && typeof snap.officialResult === 'object') {
        if (isRealOfficialResult(snap.officialResult)) savedOnSnapshot = true;
      }

      if (snap?.aiScores?.length) {
        predictionSource = 'db_snapshot';
        predictionCapturedAt = snap.capturedAt.toISOString();
        entriesForAi = snap.aiScores
          .map((a) => ({
            lane: a.raceEntry.lane,
            racerId: a.raceEntry.racerId,
            name: a.raceEntry.racer.name,
            aiScore: {
              total: a.total,
              ...(a.breakdown && typeof a.breakdown === 'object' ? a.breakdown : {}),
            },
          }))
          .sort((a, b) => a.lane - b.lane);
      }
    } catch (err) {
      console.error('[raceResult] DB read failed', {
        raceId: externalRaceId,
        message: err.message,
      });
    }
  }

  officialResult = normalizeOfficialResultForDisplay(
    officialResult,
    externalRaceId
  );

  const displayable = isRealOfficialResult(officialResult);
  const placements = displayable ? officialResult.placements : [];
  const aiVerification = displayable
    ? buildAiVerification(entriesForAi, placements)
    : null;

  return {
    raceId: externalRaceId,
    venueName: memoryRace?.venueName ?? null,
    raceNo: memoryRace?.raceNo ?? null,
    available: displayable,
    reason: displayable ? null : officialResult?.reason ?? 'pending',
    message: displayable
      ? null
      : officialResult?.message ?? PENDING_OFFICIAL_RESULT.message,
    savedToDb,
    savedOnSnapshot,
    source: displayable ? officialResult.source : null,
    fetchedAt: displayable ? officialResult.fetchedAt ?? null : null,
    placements,
    payouts: displayable ? officialResult.payouts ?? null : null,
    predictionSource,
    predictionCapturedAt,
    aiVerification,
  };
}
