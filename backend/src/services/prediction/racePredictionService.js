/** 競艇の印（AI順位から付与） */
const MARK_BY_RANK = ['◎', '○', '▲', '△', '×', ''];

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
 * 3連単の推定確率（独立近似）と表示用オッズ
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

/** 確率 → 推定オッズ（控除率ざっくり25%想定） */
function probToEstimatedOdds(prob) {
  if (prob <= 0) return 999.9;
  const raw = 0.75 / prob;
  return Math.round(Math.min(999.9, Math.max(3.0, raw)) * 10) / 10;
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

  const top1 = ranked[0].aiScore.total;
  const top2 = ranked[1]?.aiScore?.total ?? 0;
  const top3 = ranked[2]?.aiScore?.total ?? 0;
  const gap12 = top1 - top2;
  const spread = top1 - (ranked[ranked.length - 1]?.aiScore?.total ?? 0);

  let confidencePercent = 50;
  confidencePercent += Math.min(25, gap12 * 1.2);
  confidencePercent += Math.min(15, (top1 - top3) * 0.6);
  confidencePercent += Math.min(10, spread * 0.3);
  confidencePercent = Math.round(Math.min(92, Math.max(38, confidencePercent)));

  let level = 'medium';
  let message = 'AI点数差は中程度。複数パターンを検討してください。';
  if (confidencePercent >= 72) {
    level = 'high';
    message = `AI1位（${ranked[0].lane}号艇）が他艇より明確に高評価。本命信頼度は高めです。`;
  } else if (confidencePercent < 55) {
    level = 'low';
    message = '上位艇の点数が拮抗しています。買い目は分散推奨です。';
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
    ? `本命3連単 ${main.combo}（推定${main.odds}倍）· 1着候補 ${ranked[0].lane}号艇◎`
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
    },
    marks,
    trifecta: {
      type: '3連単',
      main: main ?? null,
      picks,
    },
    summary,
  };
}
