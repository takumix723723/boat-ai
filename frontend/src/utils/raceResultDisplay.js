/**
 * 結果APIレスポンスが画面表示可能か（本物の公式着順のみ）
 * @param {object|null|undefined} result
 * @param {object|null|undefined} [meta]
 */
export function isResultDisplayable(result, meta = null) {
  if (!result?.available) return false;
  if (result.source === 'mock') return false;
  if (meta?.dataSource === 'mock') return false;
  if (!Array.isArray(result.placements) || result.placements.length === 0) {
    return false;
  }
  if (result.source && result.source !== 'BoatraceOpenAPI/results') {
    return false;
  }
  return true;
}

export const RESULT_PENDING_MESSAGE = '結果未確定（レース前 / 開催中）';
