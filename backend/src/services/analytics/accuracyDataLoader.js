import { getPrisma } from '../../db/client.js';

export function parseOfficialResult(json) {
  if (!json || typeof json !== 'object') return null;
  if (!json.available || !Array.isArray(json.placements)) return null;
  return json.placements;
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

    const entries = snap.aiScores.map((row) => ({
      lane: row.raceEntry.lane,
      racerId: row.raceEntry.racerId,
      name: row.raceEntry.racer.name,
      breakdown:
        row.breakdown && typeof row.breakdown === 'object'
          ? row.breakdown
          : {
              st: 50,
              exhibitionTime: 50,
              lane: 50,
              motor: 50,
              course: 50,
              lastMinute: 50,
            },
    }));

    cases.push({
      venueCode: race.venueCode,
      venueName: race.venueName,
      placements,
      entries,
    });
  }

  return cases;
}
