const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
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
