/**
 * フォーメーション / BOX の構造定義（予想・判定・集計で共有）
 * @param {object[]} ranked - aiScore.total 降順
 */
export function buildFormationParts(ranked) {
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

/**
 * @param {object[]} ranked
 */
export function buildBoxParts(ranked) {
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

/** MVP 成績分母: 3艇BOX（6点）のみ */
export function isBoxEligibleForStats(boxJson) {
  if (!boxJson?.lanes?.length) return false;
  return boxJson.lanes.length >= 3 && (boxJson.points ?? 0) >= 6;
}
