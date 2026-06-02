import { applyAiScoresToRace } from '../aiScore.js';
import {
  fetchLivePayload,
  getJstTodayIso,
  OpenApiFetchError,
} from './openApiClient.js';
import {
  formatFailureForUser,
  parseFetchError,
} from './openApiFetch.js';
import { normalizeRaceDataset } from './normalizer.js';
import {
  normalizeResultsMap,
  attachResultsToRaces,
} from './resultNormalizer.js';
import { mergeRacesWithPrevious } from './raceMerge.js';
import { getMockRaces } from '../../data/mockRaces.js';
import { persistDatasetIfEnabled } from '../persistence/snapshotPersistenceService.js';
import { refreshActiveWeightsCache } from '../ai/weightProfileService.js';

/** 通常GET用キャッシュ（長め） */
const CACHE_TTL_MS = (() => {
  const n = Number(process.env.BOATRACE_CACHE_TTL_MS);
  return Number.isFinite(n) && n > 0 ? n : 5 * 60 * 1000;
})();

/** @type {Map<string, { loadedAt: number, meta: object, races: object[] }>} */
const cache = new Map();

function getDataMode() {
  const mode = (process.env.BOATRACE_DATA_MODE || 'auto').toLowerCase();
  if (['auto', 'live', 'mock'].includes(mode)) return mode;
  return 'auto';
}

function resolveDate(date) {
  if (!date || date === 'today') return 'today';
  return date.replace(/-/g, '');
}

/**
 * コンソール向け詳細ログ
 */
function logLiveFetchFailure(err, dateKey) {
  const base = {
    date: dateKey,
    message: err?.message,
    name: err?.name,
  };

  if (err instanceof OpenApiFetchError && err.details) {
    const d = err.details;
    console.error('[raceDataService] Live fetch failed (detailed)', {
      ...base,
      programsUrl: d.programsUrl,
      previewsUrl: d.previewsUrl,
      programsOk: d.programsOk,
      previewsOk: d.previewsOk,
      errors: d.errors,
      programsError: d.programsError,
      previewsError: d.previewsError,
      last: d.last,
    });
    return;
  }

  const cause = err?.cause;
  console.error('[raceDataService] Live fetch failed (detailed)', {
    ...base,
    causeMessage: cause?.message ?? null,
    code: cause?.code ?? null,
    syscall: cause?.syscall ?? null,
    timedOut: err?.name === 'AbortError',
    parsed: err?.message === 'fetch failed' && cause ? parseFetchError(err, 'n/a') : null,
  });
}

function buildLiveNotice() {
  return 'データは最大30分程度遅れる場合があります。アプリは45秒ごとに再確認します。';
}

async function loadLiveRaces(date) {
  const payload = await fetchLivePayload(date);

  const raceDate = payload.programs[0]?.race_date ?? payload.raceDate ?? getJstTodayIso();
  const fetchedAt = new Date().toISOString();
  const meta = {
    dataSource: 'live',
    sourceProvider: 'BoatraceOpenAPI',
    sourceNote: '非公式オープンデータ（公式サイト由来・約30分更新）',
    fetchedAt,
    raceDate,
    programsCount: payload.programs.length,
    previewsCount: payload.previews.length,
    resultsCount: payload.results?.length ?? 0,
    resultsAvailable: payload.resultsAvailable ?? false,
    liveNotice: buildLiveNotice(),
    liveFetchFailed: false,
    fallbackReason: null,
    isStale: false,
    fetchUrls: {
      programs: payload.programsUrl,
      previews: payload.previewsUrl,
      results: payload.resultsUrl,
    },
  };

  const resultMap = normalizeResultsMap(payload.results ?? [], fetchedAt);
  let races = normalizeRaceDataset(payload.programs, payload.previews, meta);
  races = attachResultsToRaces(races, resultMap);
  return { meta, races };
}

function loadMockRaces(failure) {
  const userMessage =
    typeof failure === 'string'
      ? `実データ取得失敗 → モック使用中（${failure}）`
      : formatFailureForUser(failure?.details ?? failure);

  const meta = {
    dataSource: 'mock',
    sourceProvider: 'local',
    sourceNote: '開発用モックデータ',
    fetchedAt: new Date().toISOString(),
    raceDate: getJstTodayIso(),
    liveFetchFailed: true,
    fallbackReason: userMessage,
    isStale: false,
    liveNotice: buildLiveNotice(),
    fetchDiagnostics:
      failure instanceof OpenApiFetchError
        ? failure.details
        : failure?.details ?? null,
  };

  const races = getMockRaces().map((r) => ({
    ...r,
    meta: {
      ...meta,
      raceDate: r.id.slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
    },
  }));
  return { meta, races };
}

function loadStaleLiveCache(cached, failure) {
  const userMessage = formatFailureForUser(
    failure instanceof OpenApiFetchError ? failure.details : failure
  );

  console.warn('[raceDataService] Live fetch failed, using stale live cache:', {
    cachedAt: cached.meta?.fetchedAt,
    fallbackReason: userMessage,
    message: failure?.message,
  });

  return {
    meta: {
      ...cached.meta,
      dataSource: 'live',
      isStale: true,
      liveFetchFailed: false,
      staleReason: userMessage,
      fallbackReason: `${userMessage}（前回取得成功分を表示）`,
      liveNotice: buildLiveNotice(),
    },
    races: cached.races.map((r) => ({
      ...r,
      meta: { ...r.meta, isStale: true, staleReason: userMessage },
    })),
  };
}

async function fetchRawDataset(date) {
  await refreshActiveWeightsCache();
  const mode = getDataMode();
  const key = resolveDate(date);

  if (mode === 'mock') {
    return loadMockRaces('BOATRACE_DATA_MODE=mock');
  }

  try {
    return await loadLiveRaces(date);
  } catch (err) {
    logLiveFetchFailure(err, key);

    if (mode === 'live') throw err;

    const cached = cache.get(key);
    if (cached?.meta?.dataSource === 'live' && cached.races?.length) {
      return loadStaleLiveCache(cached, err);
    }

    console.warn('[raceDataService] Using mock fallback:', formatFailureForUser(
      err instanceof OpenApiFetchError ? err.details : err
    ));
    return loadMockRaces(err);
  }
}

function finalizeDataset(result, previousRaces = null) {
  const merged = mergeRacesWithPrevious(previousRaces, result.races);
  return {
    meta: { ...result.meta, fetchedAt: new Date().toISOString() },
    races: merged.map(applyAiScoresToRace),
  };
}

/**
 * @param {string} [date]
 */
export async function loadRaces(date = 'today') {
  const key = resolveDate(date);
  const cached = cache.get(key);

  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached;
  }

  const raw = await fetchRawDataset(key);
  const withScores = finalizeDataset(raw, cached?.races ?? null);

  const stored = { ...withScores, loadedAt: Date.now() };
  cache.set(key, stored);
  return stored;
}

/** Live更新: 常に再取得し前回データとマージして再採点 */
export async function refreshRaces(date = 'today') {
  const key = resolveDate(date);
  const previousRaces = cache.get(key)?.races ?? null;

  const raw = await fetchRawDataset(key);
  const withScores = finalizeDataset(raw, previousRaces);

  const stored = { ...withScores, loadedAt: Date.now() };
  cache.set(key, stored);
  await persistDatasetIfEnabled(stored);
  return stored;
}

export function getCacheMeta(date = 'today') {
  const key = resolveDate(date);
  const cached = cache.get(key);
  if (!cached) return null;
  return cached.meta;
}

/** 診断用: 手動で取得テスト */
export async function diagnoseLiveFetch(date = 'today') {
  const key = resolveDate(date);
  const startedAt = Date.now();
  try {
    const payload = await fetchLivePayload(key);
    return {
      ok: true,
      elapsedMs: Date.now() - startedAt,
      programsUrl: payload.programsUrl,
      previewsUrl: payload.previewsUrl,
      programsCount: payload.programs.length,
      previewsCount: payload.previews.length,
    };
  } catch (err) {
    return {
      ok: false,
      elapsedMs: Date.now() - startedAt,
      message: err.message,
      details: err instanceof OpenApiFetchError ? err.details : parseFetchError(err, 'n/a'),
    };
  }
}
