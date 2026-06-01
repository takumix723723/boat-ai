import { buildAiVerification } from '../results/aiVerification.js';

/**
 * 1レース分の精度指標
 * @param {object[]} entries - aiScore 付き
 * @param {object[]} placements
 */
export function evaluateRaceAccuracy(entries, placements) {
  const verification = buildAiVerification(entries, placements);
  if (!verification) return null;

  let rankDiffSum = 0;
  let rankDiffCount = 0;

  for (const row of verification.comparisons) {
    if (row.actualPlace != null && row.aiRank != null) {
      rankDiffSum += Math.abs(row.aiRank - row.actualPlace);
      rankDiffCount += 1;
    }
  }

  return {
    topAiGotWin: verification.topAiGotWin,
    winnerInAiTop3: verification.winnerInAiTop3,
    top3HitCount: verification.top3HitCount,
    rankDiffAverage:
      rankDiffCount > 0 ? rankDiffSum / rankDiffCount : null,
    analyzedEntries: rankDiffCount,
  };
}

/**
 * @param {ReturnType<typeof evaluateRaceAccuracy>[]} raceMetrics
 */
export function aggregateAccuracyMetrics(raceMetrics) {
  const valid = raceMetrics.filter(Boolean);
  const analyzedRaces = valid.length;

  if (analyzedRaces === 0) {
    return {
      analyzedRaces: 0,
      analyzedEntries: 0,
      aiTop1WinRate: null,
      aiTop3HitRate: null,
      top3HitAverage: null,
      rankDiffAverage: null,
      aiTop1Wins: 0,
      aiTop3WinnerHits: 0,
    };
  }

  let analyzedEntries = 0;
  let aiTop1Wins = 0;
  let aiTop3WinnerHits = 0;
  let top3HitSum = 0;
  let rankDiffSum = 0;
  let rankDiffEntryCount = 0;

  for (const m of valid) {
    analyzedEntries += m.analyzedEntries;
    if (m.topAiGotWin) aiTop1Wins += 1;
    if (m.winnerInAiTop3) aiTop3WinnerHits += 1;
    top3HitSum += m.top3HitCount;
    if (m.rankDiffAverage != null && m.analyzedEntries > 0) {
      rankDiffSum += m.rankDiffAverage * m.analyzedEntries;
      rankDiffEntryCount += m.analyzedEntries;
    }
  }

  return {
    analyzedRaces,
    analyzedEntries,
    aiTop1Wins,
    aiTop3WinnerHits,
    aiTop1WinRate: (aiTop1Wins / analyzedRaces) * 100,
    aiTop3HitRate: (aiTop3WinnerHits / analyzedRaces) * 100,
    top3HitAverage: top3HitSum / analyzedRaces,
    rankDiffAverage:
      rankDiffEntryCount > 0 ? rankDiffSum / rankDiffEntryCount : null,
  };
}

/**
 * @param {{ venueCode: string, venueName: string, metric: ReturnType<typeof evaluateRaceAccuracy> }[]} grouped
 */
export function buildVenueBreakdown(grouped) {
  const byVenue = new Map();

  for (const { venueCode, venueName, metric } of grouped) {
    if (!metric) continue;
    const key = venueCode;
    if (!byVenue.has(key)) {
      byVenue.set(key, { venueCode, venueName, metrics: [] });
    }
    byVenue.get(key).metrics.push(metric);
  }

  return [...byVenue.values()]
    .map(({ venueCode, venueName, metrics }) => {
      const agg = aggregateAccuracyMetrics(metrics);
      return {
        venueCode,
        venueName,
        analyzedRaces: agg.analyzedRaces,
        analyzedEntries: agg.analyzedEntries,
        aiTop1WinRate: agg.aiTop1WinRate,
        aiTop3HitRate: agg.aiTop3HitRate,
        top3HitAverage: agg.top3HitAverage,
        rankDiffAverage: agg.rankDiffAverage,
        aiTop1Wins: agg.aiTop1Wins,
        aiTop3WinnerHits: agg.aiTop3WinnerHits,
      };
    })
    .sort((a, b) => b.analyzedRaces - a.analyzedRaces);
}
