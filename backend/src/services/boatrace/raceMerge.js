/**
 * Live更新時: 前回スナップショットとマージし previousAiScore を引き継ぐ
 */

function lastMinuteSignature(lm) {
  if (!lm) return '';
  return [lm.weather, lm.wind, lm.wave, lm.remark].join('|');
}

function pickOfficialResult(oldRace, newRace) {
  if (newRace?.officialResult?.available) return newRace.officialResult;
  if (oldRace?.officialResult?.available) return oldRace.officialResult;
  return (
    newRace?.officialResult ??
    oldRace?.officialResult ?? {
      available: false,
      reason: 'pending',
      message: 'レース結果はまだ取得できていません',
      placements: [],
    }
  );
}

/**
 * @param {object[]|null|undefined} oldRaces
 * @param {object[]} newRaces
 */
export function mergeRacesWithPrevious(oldRaces, newRaces) {
  if (!oldRaces?.length) {
    return newRaces.map((race) => ({
      ...race,
      entries: race.entries.map((e) => ({
        ...e,
        previousAiScore: null,
      })),
    }));
  }

  const oldMap = new Map(oldRaces.map((r) => [r.id, r]));

  return newRaces.map((newRace) => {
    const oldRace = oldMap.get(newRace.id);
    if (!oldRace) {
      return {
        ...newRace,
        entries: newRace.entries.map((e) => ({
          ...e,
          previousAiScore: null,
        })),
      };
    }

    const oldByLane = new Map(oldRace.entries.map((e) => [e.lane, e]));
    const lastMinuteChanged =
      lastMinuteSignature(oldRace.lastMinute) !==
      lastMinuteSignature(newRace.lastMinute);

    const entries = newRace.entries.map((newE) => {
      const oldE = oldByLane.get(newE.lane);
      return {
        ...newE,
        previousAiScore: oldE?.aiScore?.total ?? null,
        _oldAiScore: oldE?.aiScore ?? null,
        _oldSt: oldE?.st ?? null,
        _oldExhibitionTime: oldE?.exhibitionTime ?? null,
      };
    });

    return {
      ...newRace,
      officialResult: pickOfficialResult(oldRace, newRace),
      entries,
      _lastMinuteChanged: lastMinuteChanged,
    };
  });
}
