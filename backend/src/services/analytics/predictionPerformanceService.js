import { getPrisma } from '../../db/client.js';
import { isBoxEligibleForStats } from '../prediction/predictionBetSpec.js';

const DISCLAIMER =
  '買い目成績はAI提案の検証用です。的中は将来を保証しません。';

function jstDateString(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
  }).format(d);
}

function parseJstDate(str) {
  return new Date(`${str}T00:00:00.000Z`);
}

/**
 * @param {'today'|'7d'|'all'} period
 */
export function resolvePeriodRange(period) {
  const endStr = jstDateString();
  const end = parseJstDate(endStr);
  if (period === 'all') {
    return { start: null, end, periodLabel: '累計' };
  }
  if (period === '7d') {
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    return { start, end, periodLabel: '直近7日' };
  }
  return { start: end, end, periodLabel: '今日' };
}

function emptyMetric() {
  return {
    hits: 0,
    total: 0,
    rate: null,
    avgPoints: null,
    roi: null,
    roiLabel: '未対応',
  };
}

function finishMetric(hits, total, pointsSum, pointsCount) {
  return {
    hits,
    total,
    rate: total > 0 ? Math.round((hits / total) * 1000) / 10 : null,
    avgPoints:
      pointsCount > 0
        ? Math.round((pointsSum / pointsCount) * 10) / 10
        : null,
    roi: null,
    roiLabel: '未対応',
  };
}

/**
 * @param {object[]} rows
 * @param {'all'|'bet_only'} scope
 */
function aggregateRows(rows, scope) {
  const filtered =
    scope === 'bet_only' ? rows.filter((r) => r.verdict === 'bet') : rows;

  const settled = filtered.filter((r) => r.resultStatus === 'settled');
  const pending = filtered.filter((r) => r.resultStatus !== 'settled');

  const m = {
    honmeiWin: emptyMetric(),
    honmeiTrifecta: emptyMetric(),
    formation: emptyMetric(),
    box: emptyMetric(),
    ana: emptyMetric(),
  };

  let formPointsSum = 0;
  let formPointsN = 0;
  let boxPointsSum = 0;
  let boxPointsN = 0;
  let boxExcluded = 0;

  for (const r of settled) {
    if (r.hitHonmeiWin != null) {
      m.honmeiWin.total += 1;
      if (r.hitHonmeiWin) m.honmeiWin.hits += 1;
    }
    if (r.hitHonmeiTrifecta != null) {
      m.honmeiTrifecta.total += 1;
      if (r.hitHonmeiTrifecta) m.honmeiTrifecta.hits += 1;
    }
    if (r.hitFormation != null) {
      m.formation.total += 1;
      if (r.hitFormation) m.formation.hits += 1;
      const pts = r.formationJson?.points;
      if (typeof pts === 'number') {
        formPointsSum += pts;
        formPointsN += 1;
      }
    }
    if (r.hitAna != null && r.anaCombo) {
      m.ana.total += 1;
      if (r.hitAna) m.ana.hits += 1;
    }

    const boxJson = r.boxJson;
    if (isBoxEligibleForStats(boxJson)) {
      if (r.hitBox != null) {
        m.box.total += 1;
        if (r.hitBox) m.box.hits += 1;
        const pts = boxJson?.points;
        if (typeof pts === 'number') {
          boxPointsSum += pts;
          boxPointsN += 1;
        }
      }
    } else if (r.hitBox != null) {
      boxExcluded += 1;
    }
  }

  m.honmeiWin = finishMetric(m.honmeiWin.hits, m.honmeiWin.total, 0, 0);
  m.honmeiTrifecta = finishMetric(
    m.honmeiTrifecta.hits,
    m.honmeiTrifecta.total,
    0,
    0
  );
  m.formation = finishMetric(
    m.formation.hits,
    m.formation.total,
    formPointsSum,
    formPointsN
  );
  m.box = finishMetric(m.box.hits, m.box.total, boxPointsSum, boxPointsN);
  m.ana = finishMetric(m.ana.hits, m.ana.total, 0, 0);

  return {
    summary: m,
    recordCount: filtered.length,
    settledCount: settled.length,
    pendingCount: pending.length,
    boxReferenceOnly: boxExcluded,
  };
}

function aggregateByVenue(settled, scope) {
  const byVenue = new Map();
  for (const r of settled) {
    if (scope === 'bet_only' && r.verdict !== 'bet') continue;
    const key = r.venueCode;
    if (!byVenue.has(key)) {
      byVenue.set(key, {
        venueCode: r.venueCode,
        venueName: r.venueName,
        honmeiWin: { hits: 0, total: 0 },
        formation: { hits: 0, total: 0 },
        box: { hits: 0, total: 0 },
      });
    }
    const v = byVenue.get(key);
    if (r.hitHonmeiWin != null) {
      v.honmeiWin.total += 1;
      if (r.hitHonmeiWin) v.honmeiWin.hits += 1;
    }
    if (r.hitFormation != null) {
      v.formation.total += 1;
      if (r.hitFormation) v.formation.hits += 1;
    }
    if (isBoxEligibleForStats(r.boxJson) && r.hitBox != null) {
      v.box.total += 1;
      if (r.hitBox) v.box.hits += 1;
    }
  }
  return [...byVenue.values()].map((v) => ({
    ...v,
    honmeiWinRate:
      v.honmeiWin.total > 0
        ? Math.round((v.honmeiWin.hits / v.honmeiWin.total) * 1000) / 10
        : null,
    formationRate:
      v.formation.total > 0
        ? Math.round((v.formation.hits / v.formation.total) * 1000) / 10
        : null,
    boxRate:
      v.box.total > 0
        ? Math.round((v.box.hits / v.box.total) * 1000) / 10
        : null,
  }));
}

function aggregateByConfidence(settled, scope) {
  const tiers = ['high', 'medium', 'low'];
  return tiers.map((tier) => {
    const rows = settled.filter((r) => {
      if (scope === 'bet_only' && r.verdict !== 'bet') return false;
      return r.honmeiConfidenceTier === tier;
    });
    let hits = 0;
    let total = 0;
    for (const r of rows) {
      if (r.hitHonmeiWin != null) {
        total += 1;
        if (r.hitHonmeiWin) hits += 1;
      }
    }
    return {
      tier,
      label:
        tier === 'high'
          ? 'HIGH'
          : tier === 'medium'
            ? 'MEDIUM'
            : 'LOW',
      honmeiWin: finishMetric(hits, total, 0, 0),
    };
  });
}

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * @param {{ period?: string, scope?: string }} query
 */
export async function getPredictionPerformance(query = {}) {
  const period = query.period === '7d' || query.period === 'all' ? query.period : 'today';
  const scope = query.scope === 'bet_only' ? 'bet_only' : 'all';

  if (!isDatabaseConfigured()) {
    return {
      available: false,
      reason: 'database_unavailable',
      message: 'DATABASE_URL が未設定のため成績を表示できません。',
      disclaimer: DISCLAIMER,
    };
  }

  const { start, end, periodLabel } = resolvePeriodRange(period);

  try {
    const prisma = getPrisma();
    const where = {};
    if (start && end) {
      if (period === 'today') {
        where.raceDate = start;
      } else {
        where.raceDate = { gte: start, lte: end };
      }
    }

    const rows = await prisma.raceBetAdvice.findMany({
      where,
      orderBy: [{ raceDate: 'desc' }, { raceNo: 'asc' }],
    });

    const agg = aggregateRows(rows, scope);
    const settled = rows.filter((r) => r.resultStatus === 'settled');

    const honmeiToday = agg.summary.honmeiWin;
    const headline =
      honmeiToday.total > 0 && honmeiToday.rate != null
        ? `今日の調子: 本命1着 ${honmeiToday.hits}/${honmeiToday.total}（${honmeiToday.rate}%）`
        : agg.pendingCount > 0
          ? `結果待ち ${agg.pendingCount}R`
          : '成績データを蓄積中';

    return {
      available: true,
      reason: null,
      message: null,
      period,
      periodLabel,
      scope,
      scopeLabel: scope === 'bet_only' ? '勝負候補のみ' : '全予想',
      disclaimer: DISCLAIMER,
      headline: period === 'today' ? headline : `${periodLabel}の買い目成績`,
      ...agg,
      byVenue: aggregateByVenue(settled, scope),
      byConfidence: aggregateByConfidence(settled, scope),
      pending: {
        noResult: agg.pendingCount,
        noAdvice: 0,
      },
    };
  } catch (err) {
    console.error('[predictionPerformance] failed', { message: err.message });
    return {
      available: false,
      reason: 'error',
      message: '成績の取得に失敗しました。',
      disclaimer: DISCLAIMER,
    };
  }
}
