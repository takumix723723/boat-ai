import { applyAiScoresToRace } from '../services/aiScore.js';
import { getTopReasons } from '../services/aiReasons.js';
import { pickTopRaceDelta } from '../services/scoreDelta.js';
import { loadRaces, refreshRaces } from '../services/boatrace/raceDataService.js';

let activeDate = 'today';
/** @type {{ meta: object, races: object[] } | null} */
let activeDataset = null;

export async function ensureDataset(date = 'today') {
  const key = date || 'today';
  if (activeDataset && activeDate === key) {
    return activeDataset;
  }
  activeDate = key;
  activeDataset = await loadRaces(key);
  return activeDataset;
}

export async function reloadDataset(date = activeDate) {
  activeDate = date || 'today';
  activeDataset = await refreshRaces(activeDate);
  return activeDataset;
}

export function getDatasetMeta() {
  return activeDataset?.meta ?? null;
}

/** Watchlist 検知用の生レース配列 */
export function getActiveRaces() {
  return activeDataset?.races ?? [];
}

function mapRaceSummary(r) {
  return {
    id: r.id,
    venueCode: r.venueCode,
    venueName: r.venueName,
    raceNo: r.raceNo,
    grade: r.grade,
    status: r.status,
    startTime: r.startTime,
    closedAt: r.meta?.raceClosedAt ?? null,
    topAiScore: Math.max(...r.entries.map((e) => e.aiScore.total)),
    topScoreDelta: pickTopRaceDelta(r.entries),
    dataSource: r.meta?.dataSource ?? activeDataset.meta.dataSource,
  };
}

export function listRaces() {
  if (!activeDataset) return [];
  return activeDataset.races.map(mapRaceSummary);
}

/** 今日の全艇を AI 点数順にランキング */
export function listAiRanking(limit = 50) {
  if (!activeDataset) return [];
  const items = [];
  for (const race of activeDataset.races) {
    for (const entry of race.entries) {
      items.push({
        raceId: race.id,
        venueName: race.venueName,
        venueCode: race.venueCode,
        raceNo: race.raceNo,
        grade: race.grade,
        status: race.status,
        startTime: race.startTime,
        closedAt: race.meta?.raceClosedAt ?? null,
        lane: entry.lane,
        racerId: entry.racerId,
        name: entry.name,
        rank: entry.rank,
        branch: entry.branch,
        aiTotal: entry.aiScore?.total ?? 0,
        previousAiScore: entry.previousAiScore ?? null,
        scoreDelta: entry.scoreDelta ?? null,
        aiScore: entry.aiScore,
        topReasons: getTopReasons(entry.aiScore, 3),
      });
    }
  }
  return items
    .sort((a, b) => b.aiTotal - a.aiTotal)
    .slice(0, Math.max(1, limit));
}

export function getRaceById(id) {
  if (!activeDataset) return null;
  return activeDataset.races.find((r) => r.id === id) ?? null;
}

function updateRaceInStore(updated) {
  const idx = activeDataset.races.findIndex((r) => r.id === updated.id);
  if (idx === -1) return null;
  activeDataset.races[idx] = applyAiScoresToRace(updated);
  return activeDataset.races[idx];
}

export function updateLastMinute(id, payload) {
  const race = getRaceById(id);
  if (!race) return null;
  const entries = race.entries.map((e) => ({
    ...e,
    previousAiScore: e.aiScore?.total ?? e.previousAiScore ?? null,
    scoreDelta: null,
    _oldAiScore: e.aiScore,
  }));
  return updateRaceInStore({
    ...race,
    entries,
    _lastMinuteChanged: true,
    lastMinute: {
      ...race.lastMinute,
      ...payload,
      updatedAt: new Date().toISOString(),
    },
  });
}

export function updateExhibition(id, lane, data) {
  const race = getRaceById(id);
  if (!race) return null;
  const entries = race.entries.map((e) => {
    if (e.lane !== lane) return e;
    return {
      ...e,
      previousAiScore: e.aiScore?.total ?? null,
      scoreDelta: null,
      st: data.st ?? e.st,
      exhibitionTime: data.exhibitionTime ?? e.exhibitionTime,
      tilt: data.tilt ?? e.tilt,
      _oldAiScore: e.aiScore,
      _oldSt: e.st,
      _oldExhibitionTime: e.exhibitionTime,
    };
  });
  return updateRaceInStore({
    ...race,
    entries,
    _lastMinuteChanged: false,
    status: race.status === '直前' ? race.status : '展示済',
  });
}
