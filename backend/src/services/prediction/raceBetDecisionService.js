import { isBoxEligibleForStats } from './predictionBetSpec.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/** 保守的初期値（実績で調整） */
export const VERDICT_THRESHOLDS = {
  betScoreMin: 60,
  skipScoreMaxForBet: 40,
  skipScoreMinForSkip: 45,
  evHonmeiMinForBet: 0.02,
  evHonmeiMaxForSkip: 0,
  gap12MinForBet: 6,
  gap12MaxForSkip: 4.5,
  honmeiPctMinForBet: 70,
  contentionMinForSkip: 0.52,
  formationPointsWide: 8,
};

const STAKE_DISCLAIMER =
  '配分はおすすめ例です。固定の賭け金ではありません。';

const STAKE_BET = {
  totalYen: 1000,
  honmei: 500,
  osae: 300,
  box: 200,
  note: '本命・抑え・BOXの配分例（検討用）',
  isExample: true,
  disclaimer: STAKE_DISCLAIMER,
};
const STAKE_WATCH = {
  totalYen: 300,
  honmei: 200,
  osae: 100,
  box: 0,
  note: '混戦向け・少額の配分例（検討用）',
  isExample: true,
  disclaimer: STAKE_DISCLAIMER,
};
const STAKE_SKIP = {
  totalYen: 0,
  honmei: 0,
  osae: 0,
  box: 0,
  note: '見送り推奨・参考買い目のみ',
  isExample: true,
  disclaimer: STAKE_DISCLAIMER,
};

/**
 * @param {object[]} ranked
 */
function factorAlignmentScore(ranked) {
  if (!ranked?.length) return 0;
  const top = ranked[0];
  const factors = ['st', 'exhibitionTime', 'motor', 'racer', 'rank'];
  let lead = 0;
  for (const key of factors) {
    const vals = ranked.map((e) => {
      if (key === 'motor') return e.motor?.rate2nd ?? e.motor?.rate3rd ?? 0;
      if (key === 'racer') {
        const s = e.racerStats;
        return (s?.national?.winRate ?? 0) + (s?.local?.winRate ?? 0) * 0.5;
      }
      if (key === 'rank') {
        const r = e.rank ?? '';
        if (r.startsWith('A1')) return 4;
        if (r.startsWith('A2')) return 3;
        if (r.startsWith('B1')) return 2;
        return 1;
      }
      return e[key] ?? e.aiScore?.breakdown?.[key] ?? 0;
    });
    const max = Math.max(...vals);
    const topVal = vals[ranked.indexOf(top)];
    if (topVal >= max) lead += 1;
  }
  return Math.round((lead / factors.length) * 100);
}

function extractBetSpread(prediction, ranked) {
  const guide = prediction.bettingGuide?.howToBet;
  const formationPoints = guide?.formation?.points ?? 0;
  const boxLanes = ranked.length >= 3 ? [ranked[1]?.lane, ranked[2]?.lane, ranked[Math.min(4, ranked.length - 1)]?.lane].filter(Boolean) : [];
  const boxJson = { lanes: [...new Set(boxLanes)], points: guide?.box?.points ?? 0 };
  const boxEligible = isBoxEligibleForStats(boxJson);
  const wide =
    formationPoints >= VERDICT_THRESHOLDS.formationPointsWide || !boxEligible;
  return { formationPoints, boxEligible, wide };
}

/**
 * @param {object} prediction - buildRacePrediction 出力
 * @param {object} race
 */
export function buildRaceBetDecision(prediction, race) {
  if (!prediction?.available) {
    return {
      available: false,
      reason: prediction?.reason ?? 'no_prediction',
    };
  }

  const T = VERDICT_THRESHOLDS;
  const signals = prediction.signals ?? {};
  const gap12 = signals.gap12 ?? 0;
  const contention = signals.contention ?? 0;
  const honmeiPct = prediction.confidence?.percent ?? 50;
  const ranked = [...(race.entries ?? [])]
    .filter((e) => e.aiScore?.total != null)
    .sort((a, b) => (b.aiScore?.total ?? 0) - (a.aiScore?.total ?? 0));
  const alignment = factorAlignmentScore(ranked);
  const spread = extractBetSpread(prediction, ranked);

  const main = prediction.trifecta?.main;
  const prob = main?.probability ?? 0.05;
  const odds = main?.odds ?? 10;
  const evHonmei = prob * odds - 1;

  const betScore = clamp(
    Math.round(
      (honmeiPct * 0.45 +
        Math.min(30, gap12 * 2.5) +
        alignment * 0.2 +
        (evHonmei > 0 ? 10 : 0)) *
        10
    ) / 10,
    0,
    100
  );
  const skipScore = clamp(
    Math.round(
      ((100 - honmeiPct) * 0.35 +
        contention * 35 +
        Math.max(0, 8 - gap12) * 4 +
        (spread.wide ? 12 : 0)) *
        10
    ) / 10,
    0,
    100
  );

  const reasons = [];
  if (gap12 >= T.gap12MinForBet) {
    reasons.push(`AI1-2位差${gap12}pt — 本命に寄せやすい`);
  }
  if (gap12 < T.gap12MaxForSkip) {
    reasons.push(`1-2位差${gap12}pt — 混戦`);
  }
  if (honmeiPct >= T.honmeiPctMinForBet) {
    reasons.push(`本命自信度${honmeiPct}%`);
  }
  if (honmeiPct < 55) reasons.push(`本命自信度${honmeiPct}% — 慎重`);
  if (evHonmei > T.evHonmeiMinForBet) reasons.push('推定EVがプラス寄り');
  if (evHonmei <= T.evHonmeiMaxForSkip) reasons.push('推定EVが弱い');
  if (spread.wide) reasons.push('買い目が広がり気味 — 見送り寄り');
  if (contention >= T.contentionMinForSkip) reasons.push('拮抗度が高い');

  const canBet =
    betScore >= T.betScoreMin &&
    skipScore < T.skipScoreMaxForBet &&
    evHonmei > T.evHonmeiMinForBet &&
    gap12 >= T.gap12MinForBet &&
    honmeiPct >= T.honmeiPctMinForBet &&
    !spread.wide;

  const shouldSkip =
    skipScore >= T.skipScoreMinForSkip ||
    evHonmei <= T.evHonmeiMaxForSkip ||
    gap12 < T.gap12MaxForSkip ||
    contention >= T.contentionMinForSkip ||
    spread.wide ||
    (skipScore >= 38 && gap12 < T.gap12MinForBet);

  let verdict = 'watch';
  let stakePlan = STAKE_WATCH;

  if (shouldSkip && !canBet) {
    verdict = 'skip';
    stakePlan = STAKE_SKIP;
    reasons.push('見送り: エッジ不足・混戦・買い目広がり');
  } else if (canBet && !shouldSkip) {
    verdict = 'bet';
    stakePlan = STAKE_BET;
    reasons.push('勝負候補: スコア・EV・差分が基準を満たす');
  } else {
    reasons.push('様子見: 判断保留・少額向け');
  }

  const verdictLabels = {
    bet: '勝負候補',
    watch: '様子見',
    skip: '見送り',
  };

  return {
    available: true,
    verdict,
    verdictLabel: verdictLabels[verdict],
    verdictSubtitle:
      verdict === 'bet'
        ? '積極検討（乱発しない基準を満たした場合のみ）'
        : verdict === 'watch'
          ? '買うなら少額・混戦'
          : '買わない推奨',
    betScore,
    skipScore,
    factorAlignmentScore: alignment,
    evHonmei: Math.round(evHonmei * 1000) / 1000,
    hasEdge: evHonmei > T.evHonmeiMinForBet,
    verdictReasons: reasons.slice(0, 6),
    stakePlan,
    stakeDisclaimer: STAKE_DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

export function buildBetAdviceForApi(prediction, decision) {
  if (!prediction?.available || !decision?.available) {
    return { available: false, reason: decision?.reason ?? 'no_advice' };
  }
  return {
    available: true,
    ...decision,
    oddsSource: prediction.oddsSource ?? 'estimated',
    honmeiLane: prediction.marks?.[0]?.lane ?? null,
  };
}
