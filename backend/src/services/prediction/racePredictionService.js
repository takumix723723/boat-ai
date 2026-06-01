import { motorFactorScore } from '../boatrace/motorEvaluation.js';

/** 競艇の印（AI順位から付与） */
const MARK_BY_RANK = ['◎', '○', '▲', '△', '×', ''];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function tierFromPercent(percent) {
  if (percent >= 80) return 'high';
  if (percent >= 60) return 'medium';
  return 'low';
}

function labelFromTier(tier) {
  if (tier === 'high') return 'HIGH CONFIDENCE';
  if (tier === 'medium') return 'MEDIUM CONFIDENCE';
  return 'LOW CONFIDENCE';
}

/**
 * AI点数から各艇の相対強さ（0〜1）
 * @param {object[]} ranked
 */
function laneWeights(ranked) {
  const scores = ranked.map((e) => e.aiScore?.total ?? 50);
  const max = Math.max(...scores);
  const exp = scores.map((s) => Math.exp((s - max) / 12));
  const sum = exp.reduce((a, b) => a + b, 0) || 1;
  const map = new Map();
  ranked.forEach((e, i) => {
    map.set(e.lane, exp[i] / sum);
  });
  return map;
}

/**
 * @param {object[]} ranked
 */
function computeRaceSignals(ranked) {
  const top1 = ranked[0].aiScore?.total ?? 0;
  const top2 = ranked[1]?.aiScore?.total ?? 0;
  const top3 = ranked[2]?.aiScore?.total ?? 0;
  const bottom = ranked[ranked.length - 1]?.aiScore?.total ?? 0;

  const gap12 = top1 - top2;
  const gap23 = top2 - top3;
  const spread = top1 - bottom;

  const contention = clamp(1 - (gap12 / 14 + gap23 / 10) / 2, 0, 1);

  const lane1Idx = ranked.findIndex((e) => e.lane === 1);
  const lane1Lead = lane1Idx === 0 ? 1 : lane1Idx === 1 ? 0.55 : lane1Idx === 2 ? 0.25 : 0;

  const top3Entries = ranked.slice(0, 3);
  const motorScores = top3Entries.map((e) => motorFactorScore(e.motor));
  const stScores = top3Entries.map((e) => {
    const st = e.st;
    if (st == null) return 50;
    return clamp(100 - st * 200, 0, 100);
  });
  const motorSpread =
    Math.max(...motorScores) - Math.min(...motorScores);
  const stSpread = Math.max(...stScores) - Math.min(...stScores);
  const motorStEdge = (motorSpread + stSpread) / 2;

  const top1Weight = laneWeights(ranked).get(ranked[0].lane) ?? 0;

  return {
    gap12,
    gap23,
    spread,
    contention,
    lane1Lead,
    motorStEdge,
    top1Weight,
    topLane: ranked[0].lane,
  };
}

/**
 * @param {object} signals
 * @param {'honmei'|'formation'|'box'|'ana'} kind
 */
function confidenceForKind(signals, kind) {
  const { gap12, gap23, spread, contention, lane1Lead, motorStEdge, top1Weight } =
    signals;

  let base;
  switch (kind) {
    case 'honmei':
      base =
        38 +
        Math.min(28, gap12 * 2.2) +
        Math.min(14, spread * 0.35) +
        Math.min(12, top1Weight * 100) +
        lane1Lead * 10 +
        Math.min(8, motorStEdge * 0.25);
      base -= contention * 22;
      return clamp(Math.round(base), 28, 95);

    case 'formation':
      base =
        32 +
        Math.min(22, gap12 * 1.6) +
        Math.min(12, spread * 0.28) +
        Math.min(10, top1Weight * 80) +
        lane1Lead * 6;
      base -= contention * 12;
      base += Math.min(8, gap23 * 0.5);
      return clamp(Math.round(base), 35, 88);

    case 'box':
      base =
        34 +
        contention * 32 +
        Math.min(10, gap23 * 0.8) +
        Math.min(6, motorStEdge * 0.15);
      base -= Math.min(24, gap12 * 1.4);
      base -= Math.min(8, spread * 0.15);
      return clamp(Math.round(base), 30, 82);

    case 'ana':
      base =
        18 +
        contention * 14 +
        Math.min(8, gap12 * 0.4);
      base -= Math.min(12, gap12 * 0.8);
      base -= lane1Lead * 8;
      base -= Math.min(10, top1Weight * 60);
      return clamp(Math.round(base), 12, 48);

    default:
      return 50;
  }
}

/**
 * @param {number[]} lanes [1着,2着,3着]
 * @param {Map<number, number>} weights
 */
function comboProbability(lanes, weights) {
  const [a, b, c] = lanes;
  const wa = weights.get(a) ?? 0;
  const wb = weights.get(b) ?? 0;
  const wc = weights.get(c) ?? 0;
  const denom = 1 - wa || 0.001;
  const p2 = wb / denom;
  const denom2 = denom - wb || 0.001;
  const p3 = wc / denom2;
  return wa * p2 * p3;
}

function probToEstimatedOdds(prob) {
  if (prob <= 0) return 999.9;
  const raw = 0.75 / prob;
  return Math.round(Math.min(999.9, Math.max(3.0, raw)) * 10) / 10;
}

function buildFormationLine(ranked) {
  const head = ranked[0].lane;
  const second = [ranked[1].lane, ranked[2].lane].join(',');
  const thirdSet = new Set(ranked.slice(1, Math.min(5, ranked.length)).map((e) => e.lane));
  const third = [...thirdSet].sort((a, b) => a - b).join(',');
  return `${head}→${second}→${third}`;
}

function buildBoxLine(ranked) {
  const idxB = Math.min(1, ranked.length - 1);
  const idxC = Math.min(2, ranked.length - 1);
  const idxD = Math.min(4, ranked.length - 1);
  const lanes = [ranked[idxB], ranked[idxC], ranked[idxD]]
    .map((e) => e.lane)
    .sort((a, b) => a - b);
  const unique = [...new Set(lanes)];
  return `${unique.join('-')} BOX`;
}

/**
 * @param {object[]} ranked
 * @param {object[]} combos
 */
function buildBettingRecommendations(ranked, combos, signals) {
  const topCombos = combos.slice(0, 2).map((c) => c.combo);
  const honmeiPct = confidenceForKind(signals, 'honmei');
  const formationPct = confidenceForKind(signals, 'formation');
  const boxPct = confidenceForKind(signals, 'box');
  const anaPct = confidenceForKind(signals, 'ana');

  const top3Lanes = new Set(ranked.slice(0, 3).map((e) => e.lane));
  const upsetCombo =
    combos.find((c) => !top3Lanes.has(c.lanes[0])) ??
    combos[combos.length - 1];

  const honmeiTier = tierFromPercent(honmeiPct);
  const formationTier = tierFromPercent(formationPct);
  const boxTier = tierFromPercent(boxPct);
  const anaTier = tierFromPercent(anaPct);

  return [
    {
      id: 'honmei',
      emoji: '🔥',
      title: '本命',
      confidencePercent: honmeiPct,
      confidenceTier: honmeiTier,
      confidenceLabel: labelFromTier(honmeiTier),
      lines: topCombos.length ? topCombos : [combos[0]?.combo].filter(Boolean),
    },
    {
      id: 'formation',
      emoji: '📊',
      title: 'フォーメーション',
      confidencePercent: formationPct,
      confidenceTier: formationTier,
      confidenceLabel: labelFromTier(formationTier),
      lines: [buildFormationLine(ranked)],
    },
    {
      id: 'box',
      emoji: '🎲',
      title: 'BOX',
      confidencePercent: boxPct,
      confidenceTier: boxTier,
      confidenceLabel: labelFromTier(boxTier),
      lines: [buildBoxLine(ranked)],
      note:
        signals.contention >= 0.55
          ? '上位が接近 — BOX分散を推奨'
          : null,
    },
    {
      id: 'ana',
      emoji: '💥',
      title: '穴',
      confidencePercent: anaPct,
      confidenceTier: anaTier,
      confidenceLabel: labelFromTier(anaTier),
      lines: upsetCombo ? [upsetCombo.combo] : [],
    },
  ];
}

/**
 * @param {object} race - aiScore 付き Race
 */
export function buildRacePrediction(race) {
  if (!race?.entries?.length) {
    return {
      available: false,
      reason: 'no_entries',
      message: '出走データがありません',
    };
  }

  const ranked = [...race.entries]
    .filter((e) => e.aiScore?.total != null)
    .sort((a, b) => (b.aiScore?.total ?? 0) - (a.aiScore?.total ?? 0));

  if (ranked.length < 3) {
    return {
      available: false,
      reason: 'insufficient_scores',
      message: 'AI採点が不足しているため予想を生成できません',
    };
  }

  const signals = computeRaceSignals(ranked);
  const weights = laneWeights(ranked);
  const topLanes = ranked.slice(0, Math.min(5, ranked.length)).map((e) => e.lane);

  const combos = [];
  for (let i = 0; i < topLanes.length; i++) {
    for (let j = 0; j < topLanes.length; j++) {
      if (j === i) continue;
      for (let k = 0; k < topLanes.length; k++) {
        if (k === i || k === j) continue;
        const lanes = [topLanes[i], topLanes[j], topLanes[k]];
        const prob = comboProbability(lanes, weights);
        combos.push({
          lanes,
          combo: lanes.join('-'),
          probability: prob,
          odds: probToEstimatedOdds(prob),
          oddsType: 'estimated',
        });
      }
    }
  }

  combos.sort((a, b) => b.probability - a.probability);
  const picks = combos.slice(0, 8).map((c, idx) => ({
    ...c,
    rank: idx + 1,
    label: idx === 0 ? '本命' : idx <= 2 ? '対抗' : '穴',
  }));

  const recommendations = buildBettingRecommendations(ranked, combos, signals);
  const honmeiRec = recommendations.find((r) => r.id === 'honmei');
  const confidencePercent = honmeiRec?.confidencePercent ?? 50;

  let level = 'medium';
  let message = 'AI点数差は中程度。複数パターンを検討してください。';
  if (confidencePercent >= 80) {
    level = 'high';
    message = `AI1位（${ranked[0].lane}号艇）が他艇より明確に高評価。本命信頼度は高めです。`;
  } else if (confidencePercent < 60) {
    level = 'low';
    message =
      signals.contention >= 0.55
        ? '上位が接近した混戦模様。BOX・フォーメーション中心が無難です。'
        : '上位艇の点数が拮抗しています。買い目は分散推奨です。';
  }

  const marks = ranked.map((e, idx) => ({
    lane: e.lane,
    racerId: e.racerId,
    name: e.name,
    mark: MARK_BY_RANK[idx] ?? '',
    aiRank: idx + 1,
    aiTotal: e.aiScore.total,
  }));

  const main = picks[0];
  const summary = main
    ? `本命3連単 ${main.combo}（推定${main.odds}倍）· 自信度 ${honmeiRec?.confidencePercent}%`
    : null;

  return {
    available: true,
    reason: null,
    message: null,
    generatedAt: new Date().toISOString(),
    oddsSource: 'estimated',
    oddsNote:
      'オッズはAI点数から算出した推定値です。公式オッズではありません。',
    confidence: {
      level,
      percent: confidencePercent,
      message,
      tier: tierFromPercent(confidencePercent),
      label: labelFromTier(tierFromPercent(confidencePercent)),
    },
    signals: {
      gap12: Math.round(signals.gap12 * 10) / 10,
      contention: Math.round(signals.contention * 100) / 100,
      lane1Lead: Math.round(signals.lane1Lead * 100) / 100,
    },
    marks,
    recommendations,
    trifecta: {
      type: '3連単',
      main: main ?? null,
      picks,
    },
    summary,
  };
}
