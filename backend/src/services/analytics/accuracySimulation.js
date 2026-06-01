import { getPrisma } from '../../db/client.js';
import { totalFromBreakdown } from '../ai/weightConfig.js';
import {
  evaluateRaceAccuracy,
  aggregateAccuracyMetrics,
} from './accuracyMetrics.js';
import { loadRacesForAccuracy, buildAccuracyRaceCases } from './accuracyDataLoader.js';

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * 保存済み breakdown + 重みプロファイルで総合点を再計算し精度を集計
 * @param {Record<string, number>} weights
 */
export function simulateAccuracyForWeights(weights, raceCases) {
  const perRace = [];
  const venueRows = [];

  for (const raceCase of raceCases) {
    const entries = raceCase.entries.map((e) => ({
      lane: e.lane,
      racerId: e.racerId,
      name: e.name,
      aiScore: {
        total: totalFromBreakdown(e.breakdown, weights),
        ...e.breakdown,
      },
    }));

    const metric = evaluateRaceAccuracy(entries, raceCase.placements);
    if (!metric) continue;

    perRace.push(metric);
    venueRows.push({
      venueCode: raceCase.venueCode,
      venueName: raceCase.venueName,
      metric,
    });
  }

  return {
    metrics: aggregateAccuracyMetrics(perRace),
    venueRows,
  };
}

/**
 * @param {{ id: string, name: string, label: string, weights: Record<string, number>, isActive?: boolean }[]} profiles
 */
export async function simulateProfilesAccuracy(profiles) {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const prisma = getPrisma();
  const races = await loadRacesForAccuracy(prisma);
  const cases = buildAccuracyRaceCases(races);

  if (!cases.length) return [];

  return profiles.map((profile) => {
    const { metrics } = simulateAccuracyForWeights(profile.weights, cases);
    return {
      profileId: profile.id,
      name: profile.name,
      label: profile.label,
      isActive: profile.isActive ?? false,
      analyzedRaces: metrics.analyzedRaces,
      aiTop1WinRate: metrics.aiTop1WinRate,
      aiTop3HitRate: metrics.aiTop3HitRate,
      top3HitAverage: metrics.top3HitAverage,
      rankDiffAverage: metrics.rankDiffAverage,
      aiTop1Wins: metrics.aiTop1Wins,
      aiTop3WinnerHits: metrics.aiTop3WinnerHits,
    };
  });
}
