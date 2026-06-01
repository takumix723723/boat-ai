/** 画面・APIで表示してよい公式着順のソース */
const OFFICIAL_SOURCES = new Set(['BoatraceOpenAPI/results']);

export const PENDING_OFFICIAL_RESULT = {
  available: false,
  reason: 'pending',
  message: '結果未確定（レース前 / 開催中）',
  source: null,
  placements: [],
};

/**
 * Open API 等の本物の着順のみ true（モック・テスト生成は除外）
 * @param {object|null|undefined} result
 */
export function isRealOfficialResult(result) {
  if (!result || typeof result !== 'object') return false;
  if (!result.available) return false;
  if (!Array.isArray(result.placements) || result.placements.length === 0) {
    return false;
  }
  if (result.source === 'mock' || result.reason === 'mock') return false;
  if (!OFFICIAL_SOURCES.has(result.source)) return false;
  return true;
}

/**
 * @param {object|null|undefined} result
 * @param {string} [externalRaceId]
 */
export function normalizeOfficialResultForDisplay(result, externalRaceId = null) {
  if (!isRealOfficialResult(result)) {
    return { ...PENDING_OFFICIAL_RESULT };
  }
  if (externalRaceId && result.raceId && result.raceId !== externalRaceId) {
    return { ...PENDING_OFFICIAL_RESULT, reason: 'race_mismatch' };
  }
  return result;
}

/**
 * @param {object|null|undefined} race
 */
export function stripNonOfficialResultFromRace(race) {
  if (!race) return race;
  if (isRealOfficialResult(race.officialResult)) return race;
  return { ...race, officialResult: { ...PENDING_OFFICIAL_RESULT } };
}
