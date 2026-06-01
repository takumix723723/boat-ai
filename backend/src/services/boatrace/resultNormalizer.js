import { buildRaceId, raceKey } from './normalizer.js';

/**
 * Open API results → raceId 別 officialResult
 * @param {object[]} results
 * @param {string} fetchedAt
 */
export function normalizeResultsMap(results, fetchedAt) {
  const map = new Map();

  for (const row of results ?? []) {
    const id = buildRaceId(row);
    const placements = (row.boats ?? [])
      .filter(
        (b) =>
          b.racer_place_number != null &&
          b.racer_place_number > 0 &&
          b.racer_place_number < 99
      )
      .sort((a, b) => a.racer_place_number - b.racer_place_number)
      .map((b) => ({
        place: b.racer_place_number,
        lane: b.racer_boat_number,
        racerId: String(b.racer_number),
        name: (b.racer_name || '').replace(/\s+/g, ' ').trim(),
        course: b.racer_course_number ?? null,
        startTiming: b.racer_start_timing ?? null,
      }));

    map.set(id, {
      available: placements.length > 0,
      source: 'BoatraceOpenAPI/results',
      sourceKey: raceKey(row),
      fetchedAt,
      placements,
      payouts: row.payouts ?? null,
      techniqueNumber: row.race_technique_number ?? null,
    });
  }

  return map;
}

/**
 * @param {object[]} races
 * @param {Map<string, object>} resultMap
 */
export function attachResultsToRaces(races, resultMap) {
  return races.map((race) => {
    const hit = resultMap.get(race.id);
    if (hit?.available) {
      return { ...race, officialResult: hit };
    }
    return {
      ...race,
      officialResult: race.officialResult ?? {
        available: false,
        reason: 'pending',
        message: 'レース結果はまだ取得できていません',
        source: null,
        placements: [],
      },
    };
  });
}
