/** コード既定値（DB未接続時フォールバック） */
export const DEFAULT_WEIGHTS = {
  st: 0.2,
  exhibitionTime: 0.25,
  lane: 0.15,
  motor: 0.2,
  course: 0.1,
  lastMinute: 0.1,
};

export const WEIGHT_FACTOR_LABELS = {
  st: 'ST',
  exhibitionTime: '展示',
  lane: '枠',
  motor: 'モーター',
  course: 'コース',
  lastMinute: '直前',
};

const FACTOR_KEYS = Object.keys(DEFAULT_WEIGHTS);

/**
 * @param {Record<string, number>} weights
 */
export function normalizeWeights(weights) {
  const out = { ...DEFAULT_WEIGHTS };
  for (const key of FACTOR_KEYS) {
    if (weights[key] != null) {
      const n = Number(weights[key]);
      if (Number.isFinite(n) && n >= 0) out[key] = n;
    }
  }
  return out;
}

/**
 * @param {Record<string, number>} weights
 */
export function validateWeights(weights) {
  const sum = FACTOR_KEYS.reduce((s, k) => s + weights[k], 0);
  if (Math.abs(sum - 1) > 0.02) {
    return {
      ok: false,
      error: `重みの合計は 1.0 付近にしてください（現在: ${sum.toFixed(3)}）`,
    };
  }
  for (const key of FACTOR_KEYS) {
    if (weights[key] < 0 || weights[key] > 1) {
      return { ok: false, error: `${key} の重みが範囲外です` };
    }
  }
  return { ok: true, sum };
}

/**
 * @param {object} breakdown - 各因子スコア 0-100
 * @param {Record<string, number>} weights
 */
export function totalFromBreakdown(breakdown, weights) {
  if (!breakdown) return null;
  const raw =
    (breakdown.st ?? 50) * weights.st +
    (breakdown.exhibitionTime ?? 50) * weights.exhibitionTime +
    (breakdown.lane ?? 50) * weights.lane +
    (breakdown.motor ?? 50) * weights.motor +
    (breakdown.course ?? 50) * weights.course +
    (breakdown.lastMinute ?? 50) * weights.lastMinute;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * @param {import('@prisma/client').AiWeightProfile} row
 */
export function profileRowToWeights(row) {
  return {
    st: Number(row.weightSt),
    exhibitionTime: Number(row.weightExhibition),
    lane: Number(row.weightLane),
    motor: Number(row.weightMotor),
    course: Number(row.weightCourse),
    lastMinute: Number(row.weightLastMinute),
  };
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
    updatedAt: row.updatedAt.toISOString(),
  };
}
