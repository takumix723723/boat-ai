/**
 * Boatrace Open API クライアント（HTTP取得のみ）
 * @see backend/docs/DATA_SOURCES.md
 */

import {
  fetchJsonWithRetry,
  OpenApiFetchError,
  parseFetchError,
} from './openApiFetch.js';

const DEFAULT_BASE = 'https://boatraceopenapi.github.io';

function getBaseUrl() {
  return (process.env.BOATRACE_OPENAPI_BASE || DEFAULT_BASE).replace(/\/$/, '');
}

function todayPartsJst() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  return { year: y, ymd: `${y}${m}${d}`, iso: `${y}-${m}-${d}` };
}

function resolveDatePath(dateParam) {
  if (!dateParam || dateParam === 'today') {
    return { segment: 'today', ...todayPartsJst() };
  }
  const normalized = dateParam.replace(/-/g, '');
  if (!/^\d{8}$/.test(normalized)) {
    throw new Error(`Invalid date: ${dateParam}`);
  }
  return {
    segment: `${normalized.slice(0, 4)}/${normalized}`,
    year: normalized.slice(0, 4),
    ymd: normalized,
    iso: `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`,
  };
}

function buildUrl(kind, segment) {
  return `${getBaseUrl()}/${kind}/v2/${segment}.json`;
}

/**
 * programs / previews を個別に取得（片方失敗でも他方は試行済み）
 * @param {string} date
 */
export async function fetchLivePayload(date) {
  const { segment, iso, ymd } = resolveDatePath(date);
  const programsUrl = buildUrl('programs', segment);
  const previewsUrl = buildUrl('previews', segment);
  const resultsUrl = buildUrl('results', segment);

  const result = {
    date: date === 'today' ? 'today' : date,
    segment,
    raceDate: iso,
    ymd,
    programsUrl,
    previewsUrl,
    resultsUrl,
    programs: null,
    previews: null,
    results: [],
    resultsAvailable: false,
    errors: [],
  };

  let programsErr = null;
  let previewsErr = null;

  try {
    const { body } = await fetchJsonWithRetry(programsUrl, {
      label: 'programs',
    });
    if (!body?.programs || !Array.isArray(body.programs)) {
      throw new OpenApiFetchError('Invalid programs payload', {
        url: programsUrl,
        label: 'programs',
        category: 'invalid_payload',
      });
    }
    result.programs = body.programs;
  } catch (err) {
    programsErr = err;
    result.errors.push({
      endpoint: 'programs',
      ...(err instanceof OpenApiFetchError
        ? err.details
        : { message: err.message, ...parseFetchError(err, programsUrl) }),
    });
  }

  try {
    const { body } = await fetchJsonWithRetry(previewsUrl, {
      label: 'previews',
    });
    if (!body?.previews || !Array.isArray(body.previews)) {
      throw new OpenApiFetchError('Invalid previews payload', {
        url: previewsUrl,
        label: 'previews',
        category: 'invalid_payload',
      });
    }
    result.previews = body.previews;
  } catch (err) {
    previewsErr = err;
    result.errors.push({
      endpoint: 'previews',
      ...(err instanceof OpenApiFetchError
        ? err.details
        : { message: err.message, ...parseFetchError(err, previewsUrl) }),
    });
  }

  if (!result.programs || !result.previews) {
    const combined = new OpenApiFetchError(
      'Live payload incomplete (programs and/or previews failed)',
      {
        programsUrl,
        previewsUrl,
        programsOk: !!result.programs,
        previewsOk: !!result.previews,
        programsError: programsErr?.details ?? programsErr?.message,
        previewsError: previewsErr?.details ?? previewsErr?.message,
        errors: result.errors,
      }
    );
    throw combined;
  }

  try {
    const { body } = await fetchJsonWithRetry(resultsUrl, {
      label: 'results',
    });
    if (body?.results && Array.isArray(body.results)) {
      result.results = body.results;
      result.resultsAvailable = body.results.length > 0;
    }
  } catch (err) {
    result.errors.push({
      endpoint: 'results',
      ...(err instanceof OpenApiFetchError
        ? err.details
        : { message: err.message, ...parseFetchError(err, resultsUrl) }),
    });
  }

  return result;
}

/** @deprecated 直接利用より fetchLivePayload 推奨 */
export async function fetchPrograms(date) {
  const payload = await fetchLivePayload(date);
  return payload.programs;
}

/** @deprecated */
export async function fetchPreviews(date) {
  const payload = await fetchLivePayload(date);
  return payload.previews;
}

export function getJstTodayIso() {
  return todayPartsJst().iso;
}

export { OpenApiFetchError, parseFetchError };
