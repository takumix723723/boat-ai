import { getPrisma } from '../../db/client.js';
import {
  DEFAULT_WEIGHTS,
  WEIGHT_FACTOR_LABELS,
} from '../ai/weightConfig.js';
import {
  getActiveWeightsSync,
  listWeightProfiles,
} from '../ai/weightProfileService.js';
import { simulateAccuracyForWeights } from './accuracySimulation.js';
import {
  loadRacesForAccuracy,
  buildAccuracyRaceCases,
} from './accuracyDataLoader.js';
import {
  splitRaceCases,
  evaluateOverfit,
  metricsToAccuracyBlock,
  MIN_RACES_FOR_SPLIT,
} from './trainTestSplit.js';

const FACTOR_KEYS = Object.keys(DEFAULT_WEIGHTS);

const DEFAULT_TRIALS = 64;
const MAX_TRIALS = 100;
const TOP_RESULTS = 10;
const DEFAULT_TRAIN_RATIO = 0.7;

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * 非負の乱数から合計1.0の重みベクトルを生成
 */
export function randomWeightVector() {
  const raw = FACTOR_KEYS.map(() => 0.04 + Math.random() * 0.32);
  const sum = raw.reduce((a, b) => a + b, 0);
  const weights = {};
  let allocated = 0;
  for (let i = 0; i < FACTOR_KEYS.length - 1; i++) {
    const key = FACTOR_KEYS[i];
    weights[key] = Math.round((raw[i] / sum) * 1000) / 1000;
    allocated += weights[key];
  }
  weights[FACTOR_KEYS[FACTOR_KEYS.length - 1]] =
    Math.round((1 - allocated) * 1000) / 1000;
  return weights;
}

function metricsToSummary(weights, metrics, extra = {}) {
  return {
    weights,
    analyzedRaces: metrics.analyzedRaces,
    aiTop1WinRate: metrics.aiTop1WinRate,
    aiTop3HitRate: metrics.aiTop3HitRate,
    top3HitAverage: metrics.top3HitAverage,
    rankDiffAverage: metrics.rankDiffAverage,
    aiTop1Wins: metrics.aiTop1Wins,
    ...extra,
  };
}

/**
 * @param {{ trials?: number, trainRatio?: number }} [options]
 */
export async function optimizeWeights(options = {}) {
  const startedAt = Date.now();
  let trials = Number(options.trials);
  if (!Number.isFinite(trials) || trials < 1) trials = DEFAULT_TRIALS;
  trials = Math.min(Math.floor(trials), MAX_TRIALS);

  const trainRatioOpt = Number(options.trainRatio);
  const trainRatio = Number.isFinite(trainRatioOpt)
    ? trainRatioOpt
    : DEFAULT_TRAIN_RATIO;

  if (!isDatabaseConfigured()) {
    return emptyResponse(startedAt, {
      available: false,
      reason: 'database_unavailable',
      message: 'DATABASE_URL が未設定のため最適化できません。',
    });
  }

  const prisma = getPrisma();
  const races = await loadRacesForAccuracy(prisma);
  const allCases = buildAccuracyRaceCases(races);

  if (!allCases.length) {
    return emptyResponse(startedAt, {
      available: true,
      reason: 'no_data',
      message:
        '分析対象レースがありません。結果付きスナップショットを DB に蓄積してください。',
    });
  }

  const split = splitRaceCases(allCases, trainRatio);
  const useSplit = split != null;
  const trainCases = useSplit ? split.train : allCases;
  const testCases = useSplit ? split.test : [];

  const weightState = await listWeightProfiles();
  const active = weightState.activeProfile;
  const baselineWeights = active?.weights ?? getActiveWeightsSync();

  const candidates = [];
  const seen = new Set();

  function addCandidate(weights, meta = {}) {
    const key = FACTOR_KEYS.map((k) => weights[k].toFixed(3)).join(',');
    if (seen.has(key)) return;
    seen.add(key);
    const { metrics } = simulateAccuracyForWeights(weights, trainCases);
    candidates.push(metricsToSummary(weights, metrics, meta));
  }

  addCandidate(baselineWeights, {
    label: active?.label ?? '現在（稼働中）',
    name: active?.name ?? 'baseline',
    isBaseline: true,
  });

  addCandidate({ ...DEFAULT_WEIGHTS }, {
    label: 'コード既定',
    name: 'default-code',
    isReference: true,
  });

  for (let i = 0; i < trials; i++) {
    addCandidate(randomWeightVector(), {
      label: `探索 #${i + 1}`,
      name: `random-${i + 1}`,
    });
  }

  candidates.sort((a, b) => {
    const top1 = (b.aiTop1WinRate ?? 0) - (a.aiTop1WinRate ?? 0);
    if (top1 !== 0) return top1;
    return (b.aiTop3HitRate ?? 0) - (a.aiTop3HitRate ?? 0);
  });

  const best = candidates[0];
  const baseline = candidates.find((c) => c.isBaseline) ?? candidates[0];
  const testedProfiles = candidates.slice(0, TOP_RESULTS);

  const trainBestMetrics = simulateAccuracyForWeights(
    best.weights,
    trainCases
  ).metrics;
  const trainAccuracy = metricsToAccuracyBlock(trainBestMetrics);

  let testAccuracy = null;
  let overfitWarning = { flagged: false, message: null, gap: null, criteria: null };

  if (useSplit && testCases.length > 0) {
    const testBestMetrics = simulateAccuracyForWeights(
      best.weights,
      testCases
    ).metrics;
    testAccuracy = metricsToAccuracyBlock(testBestMetrics);
    overfitWarning = evaluateOverfit(trainAccuracy, testAccuracy);
  }

  const baselineTrain = metricsToAccuracyBlock(
    simulateAccuracyForWeights(baselineWeights, trainCases).metrics
  );
  const baselineTest =
    useSplit && testCases.length > 0
      ? metricsToAccuracyBlock(
          simulateAccuracyForWeights(baselineWeights, testCases).metrics
        )
      : null;

  const bestProfile = {
    name: 'optimized-search',
    label: '最適化候補（探索）',
    weights: best.weights,
    suggestedSaveName: `optimized-${Date.now().toString(36).slice(-6)}`,
  };

  return {
    available: true,
    reason: null,
    message: null,
    method: 'random_search',
    objective: 'aiTop1WinRate',
    trialCount: trials,
    uniqueCandidates: candidates.length,
    elapsedMs: Date.now() - startedAt,
    analyzedRaces: allCases.length,
    factorLabels: WEIGHT_FACTOR_LABELS,
    validation: {
      enabled: useSplit,
      insufficient: !useSplit,
      message: useSplit
        ? `ランダム分割: Train ${trainCases.length} / Test ${testCases.length} レース`
        : `分割には ${MIN_RACES_FOR_SPLIT} レース以上必要です（現在 ${allCases.length}）。全件で探索しました。`,
      minRacesForSplit: MIN_RACES_FOR_SPLIT,
    },
    splitRatio: useSplit
      ? {
          train: split.trainRatio,
          test: split.testRatio,
          trainPercent: Math.round(split.trainRatio * 100),
          testPercent: Math.round(split.testRatio * 100),
        }
      : null,
    splitCounts: useSplit
      ? {
          total: allCases.length,
          train: trainCases.length,
          test: testCases.length,
        }
      : { total: allCases.length, train: allCases.length, test: 0 },
    trainAccuracy,
    testAccuracy,
    overfitWarning,
    baseline,
    baselineOnSplit: {
      train: baselineTrain,
      test: baselineTest,
    },
    bestProfile,
    bestAccuracy: trainAccuracy,
    improvement: {
      aiTop1WinRateDelta:
        (trainAccuracy.aiTop1WinRate ?? 0) - (baselineTrain.aiTop1WinRate ?? 0),
      aiTop3HitRateDelta:
        (trainAccuracy.aiTop3HitRate ?? 0) - (baselineTrain.aiTop3HitRate ?? 0),
    },
    testedProfiles,
  };
}

function emptyResponse(startedAt, extra) {
  return {
    method: 'random_search',
    trialCount: 0,
    uniqueCandidates: 0,
    elapsedMs: Date.now() - startedAt,
    analyzedRaces: 0,
    bestProfile: null,
    bestAccuracy: null,
    trainAccuracy: null,
    testAccuracy: null,
    overfitWarning: null,
    splitRatio: null,
    splitCounts: null,
    validation: null,
    baseline: null,
    testedProfiles: [],
    ...extra,
  };
}
