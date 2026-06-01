import { getPrisma } from '../../db/client.js';
import { buildAiVerification } from './aiVerification.js';

const PENDING = {
  available: false,
  reason: 'pending',
  message: 'レース結果はまだ取得できていません',
  source: null,
  placements: [],
};

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * @param {object|null} memoryRace - インメモリ Race（AI比較用）
 * @param {string} externalRaceId
 */
export async function getRaceResult(externalRaceId, memoryRace = null) {
  let officialResult = memoryRace?.officialResult ?? PENDING;
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
        if (dbResult.available) {
          savedToDb = true;
          if (!officialResult.available) officialResult = dbResult;
        }
      }

      const snap = row?.snapshots?.[0];
      if (snap?.officialResult && typeof snap.officialResult === 'object') {
        if (snap.officialResult.available) savedOnSnapshot = true;
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

  const placements = officialResult?.available ? officialResult.placements : [];
  const aiVerification = buildAiVerification(entriesForAi, placements);

  return {
    raceId: externalRaceId,
    available: Boolean(officialResult?.available),
    reason: officialResult?.available ? null : officialResult?.reason ?? 'pending',
    message: officialResult?.available
      ? null
      : officialResult?.message ?? PENDING.message,
    savedToDb,
    savedOnSnapshot,
    source: officialResult?.source ?? null,
    fetchedAt: officialResult?.fetchedAt ?? null,
    placements,
    payouts: officialResult?.payouts ?? null,
    predictionSource,
    predictionCapturedAt,
    aiVerification,
  };
}
