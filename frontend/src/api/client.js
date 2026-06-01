const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status: number, path: string, url: string, body?: object }} detail
   */
  constructor(message, detail) {
    super(message);
    this.name = 'ApiError';
    this.status = detail.status;
    this.path = detail.path;
    this.url = detail.url;
    this.body = detail.body ?? null;
  }
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
  } catch (networkErr) {
    throw new ApiError(
      `Network error: ${networkErr.message || 'fetch failed'}`,
      { status: 0, path, url, body: null }
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const serverMsg =
      typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`;
    throw new ApiError(serverMsg, {
      status: res.status,
      path,
      url,
      body,
    });
  }
  return res.json();
}

/** @param {ApiError|Error} err */
export function formatApiError(err, label = 'API') {
  if (err instanceof ApiError) {
    if (err.status === 0) {
      return `${label} error: network — ${err.message}`;
    }
    return `${label} error: ${err.status} — ${err.message}`;
  }
  return `${label} error: ${err.message || 'unknown'}`;
}

export function fetchRaces(date = 'today') {
  return request(`/api/races?date=${encodeURIComponent(date)}`);
}

export function fetchRace(id, date = 'today') {
  return request(`/api/races/${id}?date=${encodeURIComponent(date)}`);
}

export function fetchRaceHistory(id) {
  return request(`/api/races/${encodeURIComponent(id)}/history`);
}

export function fetchRaceResult(id, date = 'today') {
  return request(
    `/api/races/${encodeURIComponent(id)}/result?date=${encodeURIComponent(date)}`
  );
}

export function fetchRacePrediction(id, date = 'today') {
  return request(
    `/api/races/${encodeURIComponent(id)}/prediction?date=${encodeURIComponent(date)}`
  );
}

export function fetchAccuracyAnalytics() {
  return request('/api/analytics/accuracy');
}

export function fetchRacerIntelligence(racerId) {
  return request(`/api/racers/${encodeURIComponent(racerId)}/intelligence`);
}

/**
 * @param {object} [options]
 * @param {string} [options.date]
 * @param {string[]} [options.favoriteRacerIds]
 * @param {string[]} [options.favoriteVenueCodes]
 */
export function fetchLearningStatus() {
  return request('/api/learning/status');
}

export function fetchLearningRuns(limit = 20) {
  return request(`/api/learning/runs?limit=${limit}`);
}

export function runAutoLearning(body = {}) {
  return request('/api/learning/run', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function applyLearningRun(runId) {
  return request(`/api/learning/runs/${encodeURIComponent(runId)}/apply`, {
    method: 'POST',
  });
}

export function fetchWatchlistEvents({
  date = 'today',
  favoriteRacerIds = [],
  favoriteVenueCodes = [],
} = {}) {
  const params = new URLSearchParams({ date });
  if (favoriteRacerIds.length) {
    params.set('favoriteRacerIds', favoriteRacerIds.join(','));
  }
  if (favoriteVenueCodes.length) {
    params.set('favoriteVenueCodes', favoriteVenueCodes.join(','));
  }
  return request(`/api/watchlist/events?${params}`);
}

export function fetchWeightProfiles() {
  return request('/api/analytics/weights');
}

export function updateWeightProfiles(body) {
  return request('/api/analytics/weights', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function optimizeWeightProfiles(body = {}) {
  return request('/api/analytics/weights/optimize', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function refreshRaces(date = 'today') {
  return request(`/api/races/refresh?date=${encodeURIComponent(date)}`, {
    method: 'POST',
  });
}

export function fetchRanking(limit = 50, date = 'today') {
  return request(
    `/api/ranking?date=${encodeURIComponent(date)}&limit=${limit}`
  );
}

export function updateLastMinute(id, body) {
  return request(`/api/races/${id}/last-minute`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function updateExhibition(id, lane, body) {
  return request(`/api/races/${id}/exhibition/${lane}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
