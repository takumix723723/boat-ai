import { getPrisma } from '../../db/client.js';
import { calculateAiScore } from '../aiScore.js';
import { DEFAULT_CALIBRATION } from '../ai/rankCalibration.js';
import {
  evaluateRaceAccuracy,
  aggregateAccuracyMetrics,
} from './accuracyMetrics.js';
import { loadRacesForAccuracy, buildAccuracyRaceCases } from './accuracyDataLoader.js';

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * 生データからフル再計算して精度を集計
 * @param {Record<string, number>} weights
 * @param {Awaited<ReturnType<typeof buildAccuracyRaceCases>>} raceCases
 * @param {object|null} [calibration]
 */
export function simulateAccuracyForWeights(
  weights,
  raceCases,
  calibration = DEFAULT_CALIBRATION
) {
  const perRace = [];
  const venueRows = [];

  for (const raceCase of raceCases) {
    const entries = raceCase.entries.map((entry) => {
      const aiScore = calculateAiScore(
        entry,
        raceCase.lastMinute,
        weights,
        calibration
      );
      return {
        lane: entry.lane,
        racerId: entry.racerId,
        name: entry.name,
        aiScore,
      };
    });

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
 * @param {{ id: string, name: string, label: string, weights: Record<string, number>, isActive?: boolean, calibration?: object }[]} profiles
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
    const calibration = profile.calibration ?? DEFAULT_CALIBRATION;
    const { metrics } = simulateAccuracyForWeights(
      profile.weights,
      cases,
      calibration
    );
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
