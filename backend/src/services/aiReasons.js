const REASON_LABELS = {
  st: 'ST',
  exhibitionTime: '展示T',
  lane: '枠順',
  motor: 'モーター',
  course: 'コース',
  lastMinute: '直前',
};

const REASON_KEYS = Object.keys(REASON_LABELS);

/**
 * AI内訳から上位要素を抽出（ランキング画面用）
 * @param {import('../types/race.js').AiScoreBreakdown} aiScore
 * @param {number} [limit=3]
 */
export function getTopReasons(aiScore, limit = 3) {
  if (!aiScore) return [];
  return REASON_KEYS.map((key) => ({
    key,
    label: REASON_LABELS[key],
    score: aiScore[key] ?? 0,
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
