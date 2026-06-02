/** コード既定値 v2（8因子・合計1.0） */
export const DEFAULT_WEIGHTS = {
  exhibitionTime: 0.22,
  st: 0.17,
  motor: 0.15,
  racer: 0.15,
  rank: 0.12,
  lane: 0.1,
  course: 0.05,
  lastMinute: 0.04,
};

export const WEIGHT_FACTOR_LABELS = {
  exhibitionTime: '展示',
  st: 'ST',
  motor: 'モーター',
  racer: '選手力',
  rank: '級',
  lane: '枠',
  course: 'コース',
  lastMinute: '直前',
};

export const FACTOR_KEYS = Object.keys(DEFAULT_WEIGHTS);

/** 級ウェイトの探索上限（極端な級偏重を防ぐ） */
export const MAX_RANK_WEIGHT = 0.18;

/**
 * 旧6因子など欠損を v2 既定で補い、合計1.0に正規化
 * @param {Record<string, number|undefined|null>} partial
 */
export function mergeAndNormalizeWeights(partial = {}) {
  const merged = { ...DEFAULT_WEIGHTS };
  for (const key of FACTOR_KEYS) {
    const n = Number(partial[key]);
    if (Number.isFinite(n) && n >= 0) merged[key] = n;
  }

  const sum = FACTOR_KEYS.reduce((s, k) => s + merged[k], 0);
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };

  const out = {};
  for (const key of FACTOR_KEYS) {
    out[key] = Math.round((merged[key] / sum) * 1000) / 1000;
  }
  const allocated = FACTOR_KEYS.slice(0, -1).reduce((s, k) => s + out[k], 0);
  out[FACTOR_KEYS[FACTOR_KEYS.length - 1]] =
    Math.round((1 - allocated) * 1000) / 1000;
  return out;
}

/**
 * @param {Record<string, number>} weights
 */
export function normalizeWeights(weights) {
  return mergeAndNormalizeWeights(weights);
}

/**
 * @param {Record<string, number>} weights
 */
export function validateWeights(weights) {
  const normalized = mergeAndNormalizeWeights(weights);
  const sum = FACTOR_KEYS.reduce((s, k) => s + normalized[k], 0);
  if (Math.abs(sum - 1) > 0.02) {
    return {
      ok: false,
      error: `重みの合計は 1.0 付近にしてください（現在: ${sum.toFixed(3)}）`,
    };
  }
  for (const key of FACTOR_KEYS) {
    if (normalized[key] < 0 || normalized[key] > 1) {
      return { ok: false, error: `${key} の重みが範囲外です` };
    }
  }
  if (normalized.rank > MAX_RANK_WEIGHT + 0.001) {
    return {
      ok: false,
      error: `級の重みは ${MAX_RANK_WEIGHT} 以下にしてください（現在: ${normalized.rank}）`,
    };
  }
  return { ok: true, sum, normalized };
}

/**
 * @param {object} breakdown
 * @param {Record<string, number>} weights
 */
export function totalFromBreakdown(breakdown, weights) {
  if (!breakdown) return null;
  const w = mergeAndNormalizeWeights(weights);
  const raw = FACTOR_KEYS.reduce(
    (s, k) => s + (breakdown[k] ?? 50) * w[k],
    0
  );
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * @param {import('@prisma/client').AiWeightProfile} row
 */
export function profileRowToWeights(row) {
  const partial = {
    st: row.weightSt != null ? Number(row.weightSt) : undefined,
    exhibitionTime:
      row.weightExhibition != null ? Number(row.weightExhibition) : undefined,
    lane: row.weightLane != null ? Number(row.weightLane) : undefined,
    motor: row.weightMotor != null ? Number(row.weightMotor) : undefined,
    course: row.weightCourse != null ? Number(row.weightCourse) : undefined,
    lastMinute:
      row.weightLastMinute != null ? Number(row.weightLastMinute) : undefined,
    rank: row.weightRank != null ? Number(row.weightRank) : undefined,
    racer: row.weightRacer != null ? Number(row.weightRacer) : undefined,
  };
  return mergeAndNormalizeWeights(partial);
}

/**
 * @param {import('@prisma/client').AiWeightProfile} row
 */
export function profileRowToCalibration(row) {
  const json = row.calibrationJson;
  if (!json || typeof json !== 'object') {
    return { version: 1, rankScores: null };
  }
  return json;
}

/**
 * @param {import('@prisma/client').AiWeightProfile} row
 */
export function profileRowToDto(row) {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    isActive: row.isActive,
    weights: profileRowToWeights(row),
    calibration: profileRowToCalibration(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}
