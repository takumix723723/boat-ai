/**
 * watch_rules — Watchlist 検知の既定閾値
 * クエリで一部上書き可能（GET /api/watchlist/events）
 */
export const DEFAULT_WATCH_RULES = {
  /** お気に入り選手の出走 */
  favoriteRacer: true,
  /** お気に入り場のレース */
  favoriteVenue: true,
  /** AI総合点がこの値以上 */
  aiScoreThreshold: 80,
  /** 点数変動（上昇）がこの値以上 */
  scoreDeltaThreshold: 10,
  /** 締切までこの分数以内 */
  deadlineMinutes: 10,
};

/**
 * @param {import('express').Request} req
 */
export function resolveWatchRules(req) {
  const base = { ...DEFAULT_WATCH_RULES };
  const num = (key, fallback) => {
    const v = req.query[key];
    if (v == null || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    favoriteRacer: base.favoriteRacer,
    favoriteVenue: base.favoriteVenue,
    aiScoreThreshold: num('aiScoreThreshold', base.aiScoreThreshold),
    scoreDeltaThreshold: num('scoreDeltaThreshold', base.scoreDeltaThreshold),
    deadlineMinutes: num('deadlineMinutes', base.deadlineMinutes),
  };
}

/**
 * @param {import('express').Request} req
 */
export function parseFavoriteFilters(req) {
  const racers = String(req.query.favoriteRacerIds || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const venues = String(req.query.favoriteVenueCodes || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    favoriteRacerIds: new Set(racers),
    favoriteVenueCodes: new Set(venues),
  };
}
