/** Train/Test 分割に必要な最小レース数 */
export const MIN_RACES_FOR_SPLIT = 4;

const DEFAULT_TRAIN_RATIO = 0.7;

/**
 * レース単位でランダム分割（再現性不要・毎回シャッフル）
 * @param {object[]} cases
 * @param {number} [trainRatio]
 * @returns {{ train: object[], test: object[], trainRatio: number, testRatio: number } | null}
 */
export function splitRaceCases(cases, trainRatio = DEFAULT_TRAIN_RATIO) {
  if (!cases?.length || cases.length < MIN_RACES_FOR_SPLIT) {
    return null;
  }

  const ratio = Math.min(0.9, Math.max(0.5, Number(trainRatio) || DEFAULT_TRAIN_RATIO));
  const shuffled = [...cases];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  let trainSize = Math.round(shuffled.length * ratio);
  trainSize = Math.max(1, Math.min(shuffled.length - 1, trainSize));

  return {
    train: shuffled.slice(0, trainSize),
    test: shuffled.slice(trainSize),
    trainRatio: trainSize / shuffled.length,
    testRatio: (shuffled.length - trainSize) / shuffled.length,
  };
}

/**
 * @param {object|null} trainAccuracy
 * @param {object|null} testAccuracy
 */
export function evaluateOverfit(trainAccuracy, testAccuracy) {
  if (!trainAccuracy || !testAccuracy) {
    return {
      flagged: false,
      message: null,
      gap: null,
      criteria: null,
    };
  }

  if (testAccuracy.analyzedRaces < 1) {
    return {
      flagged: false,
      message: 'テストデータが不足しているため過学習判定をスキップしました。',
      gap: null,
      criteria: null,
    };
  }

  // テスト2レース未満は勝率が0/100%に偏りやすい（4〜5レース分割時）
  if (testAccuracy.analyzedRaces < 2) {
    return {
      flagged: false,
      message: 'テストが2レース未満のため過学習判定をスキップしました。',
      gap: trainAccuracy.aiTop1WinRate - testAccuracy.aiTop1WinRate,
      criteria: null,
    };
  }

  const trainTop1 = trainAccuracy.aiTop1WinRate ?? 0;
  const testTop1 = testAccuracy.aiTop1WinRate ?? 0;
  const gap = trainTop1 - testTop1;

  // Train が高く Test が大きく下がる → 過学習の可能性
  const flagged = gap >= 15 || (trainTop1 >= 40 && testTop1 < trainTop1 * 0.65);

  let message = null;
  if (flagged) {
    message = `Train AI1位勝率 ${Math.round(trainTop1)}% に対し Test ${Math.round(testTop1)}%（差 ${Math.round(gap)}pt）。過去データへの過剰適合の可能性があります。`;
  }

  return {
    flagged,
    message,
    gap,
    criteria:
      'Train−Test の AI1位勝率差が 15pt 以上、または Train≥40% かつ Test<Train×65%',
  };
}

/**
 * @param {import('./accuracySimulation.js').simulateAccuracyForWeights} metrics
 */
export function metricsToAccuracyBlock(metrics) {
  return {
    analyzedRaces: metrics.analyzedRaces,
    aiTop1WinRate: metrics.aiTop1WinRate,
    aiTop3HitRate: metrics.aiTop3HitRate,
    top3HitAverage: metrics.top3HitAverage,
    rankDiffAverage: metrics.rankDiffAverage,
    aiTop1Wins: metrics.aiTop1Wins,
    aiTop3WinnerHits: metrics.aiTop3WinnerHits,
  };
}
