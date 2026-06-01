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

function computeRaceSignals(ranked) {
  const top1 = ranked[0].aiScore?.total ?? 0;
  const top2 = ranked[1]?.aiScore?.total ?? 0;
  const top3 = ranked[2]?.aiScore?.total ?? 0;
  const bottom = ranked[ranked.length - 1]?.aiScore?.total ?? 0;

  const gap12 = top1 - top2;
  const gap23 = top2 - top3;
  const gap13 = top1 - top3;
  const spread = top1 - bottom;
  const contention = clamp(1 - (gap12 / 14 + gap23 / 10) / 2, 0, 1);

  const lane1Idx = ranked.findIndex((e) => e.lane === 1);
  const lane1Lead = lane1Idx === 0 ? 1 : lane1Idx === 1 ? 0.55 : lane1Idx === 2 ? 0.25 : 0;

  const top3Entries = ranked.slice(0, 3);
  const motorScores = top3Entries.map((e) => motorFactorScore(e.motor));
  const stSpread =
    Math.max(
      ...top3Entries.map((e) => (e.st != null ? clamp(100 - e.st * 200, 0, 100) : 50))
    ) -
    Math.min(
      ...top3Entries.map((e) => (e.st != null ? clamp(100 - e.st * 200, 0, 100) : 50))
    );
  const motorSpread =
    Math.max(...motorScores) - Math.min(...motorScores);
  const motorStEdge = (motorSpread + stSpread) / 2;
  const top1Weight = laneWeights(ranked).get(ranked[0].lane) ?? 0;

  return {
    gap12,
    gap23,
    gap13,
    spread,
    contention,
    lane1Lead,
    motorStEdge,
    top1Weight,
    topLane: ranked[0].lane,
    top3Within5: gap13 <= 5,
  };
}

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

function buildFormationParts(ranked) {
  const head = ranked[0].lane;
  const secondLanes = [ranked[1].lane, ranked[2].lane];
  const thirdSet = new Set(
    ranked.slice(1, Math.min(5, ranked.length)).map((e) => e.lane)
  );
  const thirdLanes = [...thirdSet].sort((a, b) => a - b);
  let points = 0;
  for (const s of secondLanes) {
    for (const t of thirdLanes) {
      if (head !== s && head !== t && s !== t) points += 1;
    }
  }
  return {
    display: `${head}→${secondLanes.join(',')}→${thirdLanes.join(',')}`,
    points,
    head,
    secondLanes,
    thirdLanes,
  };
}

function buildBoxParts(ranked) {
  const lanes = [
    ranked[1]?.lane,
    ranked[2]?.lane,
    ranked[Math.min(4, ranked.length - 1)]?.lane,
  ]
    .filter((l) => l != null)
    .sort((a, b) => a - b);
  const unique = [...new Set(lanes)];
  const n = unique.length;
  const points = n >= 3 ? 6 : n === 2 ? 2 : 1;
  return {
    display: unique.join('-'),
    points,
    lanes: unique,
  };
}

function buildBettingGuide(ranked, combos, signals) {
  const honmeiConfidencePercent = confidenceForKind(signals, 'honmei');
  const main = combos[0];
  const sub = combos[1];
  const formation = buildFormationParts(ranked);
  const box = buildBoxParts(ranked);
  const safeCombos = combos.slice(0, 2).map((c) => ({
    combo: c.combo,
    odds: c.odds,
  }));

  const motorSorted = [...ranked]
    .filter((e) => e.motor?.rate2nd != null)
    .sort((a, b) => (b.motor?.rate2nd ?? 0) - (a.motor?.rate2nd ?? 0));
  const motorTop = motorSorted[0];

  const gap12r = Math.round(signals.gap12 * 10) / 10;
  const gap13r = Math.round(signals.gap13 * 10) / 10;

  let safeReason = `AI上位2パターン（1-2位差${gap12r}pt）を抑えて購入`;
  let boxReason = `上位${box.lanes.join('-')}艇が拮抗（AI差${gap13r}pt以内）— 6点BOXで分散`;
  let formReason = `${formation.head}号艇軸。2・3着を${formation.secondLanes.join('/')}→${formation.thirdLanes.join('/')}で押さえる`;

  if (signals.gap12 >= 10) {
    safeReason = `AI1位${ranked[0].lane}号が${gap12r}ptリード — 本命2点に寄せる`;
    boxReason = `念のため上位艇BOX（${box.lanes.join('-')}）で保険`;
  }
  if (motorTop) {
    formReason += ` · モーター2連率${motorTop.lane}号${motorTop.motor.rate2nd}%`;
  }

  return {
    honmeiConfidencePercent,
    honmei: {
      combo: main?.combo ?? '—',
      odds: main?.odds ?? null,
      alternates: sub
        ? [{ combo: sub.combo, odds: sub.odds }]
        : [],
    },
    howToBet: {
      safe: {
        label: '安全',
        combos: safeCombos.map((c) => c.combo),
        odds: safeCombos.map((c) => c.odds),
        points: safeCombos.length,
        reason: safeReason,
      },
      box: {
        label: 'BOX',
        combo: box.display,
        points: box.points,
        reason: boxReason,
      },
      formation: {
        label: 'フォーメーション',
        display: formation.display,
        points: formation.points,
        reason: formReason,
      },
    },
  };
}

function buildAiComment(ranked, signals, guide) {
  const gap12 = Math.round(signals.gap12 * 10) / 10;
  const gap13 = Math.round(signals.gap13 * 10) / 10;

  let headline;
  if (signals.gap12 <= 5) {
    headline = `混戦（AI差${gap12}pt以内）`;
  } else if (signals.gap12 >= 12) {
    headline = `順当（AI1位が${gap12}ptリード）`;
  } else {
    headline = `やや混戦（1-2位差${gap12}pt）`;
  }

  const top = ranked[0];
  const second = ranked[1];
  const courseNote =
    top.lane === 1
      ? `イン${top.lane}号艇がAI首位（${top.aiScore.total}点）`
      : `${top.lane}号艇がAI首位（${top.aiScore.total}点）· インは${ranked.find((e) => e.lane === 1)?.aiScore?.total ?? '—'}点`;

  const motorTop = [...ranked]
    .filter((e) => e.motor?.rate2nd != null)
    .sort((a, b) => (b.motor?.rate2nd ?? 0) - (a.motor?.rate2nd ?? 0))[0];

  const summary = `${courseNote}。2位${second.lane}号（${second.aiScore.total}点）との差${gap12}pt / 上位3艇差${gap13}pt。${
    motorTop
      ? `モーター2連率は${motorTop.lane}号${motorTop.motor.rate2nd}%。`
      : ''
  }`;

  const recommended = [
    {
      type: 'BOX',
      text: `${guide.howToBet.box.combo}（${guide.howToBet.box.points}点）`,
    },
    {
      type: 'フォーメーション',
      text: guide.howToBet.formation.display,
    },
  ];

  const actionHint = signals.top3Within5
    ? 'おすすめ: BOXで6点 · フォーメーションで4点前後'
    : `おすすめ: 安全買い ${guide.howToBet.safe.combos.join(' / ')} を軸に`;

  return {
    headline,
    summary,
    actionHint,
    recommended,
    gap12,
    gap13,
  };
}

function buildBettingRecommendations(ranked, combos, signals, guide) {
  const honmeiPct = guide.honmeiConfidencePercent;
  const formationPct = confidenceForKind(signals, 'formation');
  const boxPct = confidenceForKind(signals, 'box');
  const anaPct = confidenceForKind(signals, 'ana');

  const top3Lanes = new Set(ranked.slice(0, 3).map((e) => e.lane));
  const upsetCombo =
    combos.find((c) => !top3Lanes.has(c.lanes[0])) ??
    combos[combos.length - 1];

  const main = guide.honmei;

  return [
    {
      id: 'honmei',
      emoji: '🔥',
      title: '本命',
      confidencePercent: honmeiPct,
      confidenceTier: tierFromPercent(honmeiPct),
      confidenceLabel: labelFromTier(tierFromPercent(honmeiPct)),
      primary: {
        combo: main.combo,
        odds: main.odds,
        confidencePercent: honmeiPct,
      },
      lines: [
        main.combo,
        ...main.alternates.map((a) => a.combo),
      ].filter(Boolean),
      alternates: main.alternates,
    },
    {
      id: 'formation',
      emoji: '📊',
      title: 'フォーメーション',
      confidencePercent: formationPct,
      confidenceTier: tierFromPercent(formationPct),
      confidenceLabel: labelFromTier(tierFromPercent(formationPct)),
      lines: [guide.howToBet.formation.display],
      points: guide.howToBet.formation.points,
    },
    {
      id: 'box',
      emoji: '🎲',
      title: 'BOX',
      confidencePercent: boxPct,
      confidenceTier: tierFromPercent(boxPct),
      confidenceLabel: labelFromTier(tierFromPercent(boxPct)),
      lines: [`${guide.howToBet.box.combo} BOX`],
      points: guide.howToBet.box.points,
    },
    {
      id: 'ana',
      emoji: '💥',
      title: '穴',
      confidencePercent: anaPct,
      confidenceTier: tierFromPercent(anaPct),
      confidenceLabel: labelFromTier(tierFromPercent(anaPct)),
      lines: upsetCombo ? [upsetCombo.combo] : [],
      odds: upsetCombo?.odds ?? null,
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

  const bettingGuide = buildBettingGuide(ranked, combos, signals);
  const aiComment = buildAiComment(ranked, signals, bettingGuide);
  const recommendations = buildBettingRecommendations(
    ranked,
    combos,
    signals,
    bettingGuide
  );
  const honmeiPct = bettingGuide.honmeiConfidencePercent;

  const marks = ranked.map((e, idx) => ({
    lane: e.lane,
    racerId: e.racerId,
    name: e.name,
    mark: MARK_BY_RANK[idx] ?? '',
    aiRank: idx + 1,
    aiTotal: e.aiScore.total,
  }));

  const main = picks[0];

  return {
    available: true,
    reason: null,
    message: null,
    generatedAt: new Date().toISOString(),
    oddsSource: 'estimated',
    oddsNote:
      'オッズはAI点数から算出した推定値です。公式オッズではありません。',
    confidence: {
      level:
        honmeiPct >= 80 ? 'high' : honmeiPct < 60 ? 'low' : 'medium',
      percent: honmeiPct,
      message: aiComment.headline,
      tier: tierFromPercent(honmeiPct),
      label: labelFromTier(tierFromPercent(honmeiPct)),
    },
    aiComment,
    bettingGuide,
    signals: {
      gap12: Math.round(signals.gap12 * 10) / 10,
      gap13: Math.round(signals.gap13 * 10) / 10,
      contention: Math.round(signals.contention * 100) / 100,
      lane1Lead: Math.round(signals.lane1Lead * 100) / 100,
      top3Within5: signals.top3Within5,
    },
    marks,
    recommendations,
    trifecta: {
      type: '3連単',
      main: main ?? null,
      picks,
    },
    summary: main
      ? `本命 ${main.combo} · 自信度${honmeiPct}% · 推定${main.odds}倍`
      : null,
  };
}
