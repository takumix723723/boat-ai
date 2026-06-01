/**
 * 人間が読めるレース表示用（raceId解析はフォールバックのみ）
 * @param {string|undefined} ymd - YYYY-MM-DD or YYYYMMDD
 */
export function formatDisplayDate(ymd) {
  if (!ymd) return null;
  const s = String(ymd).trim();
  let y;
  let m;
  let d;
  if (s.includes('-')) {
    [y, m, d] = s.slice(0, 10).split('-');
  } else if (s.length >= 8) {
    y = s.slice(0, 4);
    m = s.slice(4, 6);
    d = s.slice(6, 8);
  } else {
    return null;
  }
  return `${y}/${m}/${d}`;
}

/**
 * @param {string} [raceId]
 */
export function parseDateFromRaceId(raceId) {
  if (!raceId) return null;
  const m = String(raceId).match(/^(\d{4})(\d{2})(\d{2})-/);
  if (!m) return null;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

/**
 * @param {object|null|undefined} race
 * @param {object|null|undefined} [meta] - dataset meta or history payload
 */
export function getRaceDisplayDate(race, meta = null) {
  const fromMeta =
    race?.meta?.raceDate ??
    race?.meta?.race_date ??
    meta?.raceDate ??
    meta?.race_date ??
    null;
  return formatDisplayDate(fromMeta) ?? parseDateFromRaceId(race?.id ?? race?.raceId);
}

/**
 * @param {object|null|undefined} race
 * @param {object|null|undefined} [meta]
 */
export function buildRaceLabel(race, meta = null) {
  if (!race) {
    return {
      date: getRaceDisplayDate(null, meta),
      venueName: null,
      raceNo: null,
      startTime: null,
      title: '—',
      line: '—',
      inline: '—',
    };
  }

  const date = getRaceDisplayDate(race, meta);
  const venueName = race.venueName ?? meta?.venueName ?? null;
  const raceNo = race.raceNo ?? meta?.raceNo ?? null;
  const startTime = race.startTime ?? meta?.startTime ?? null;

  const venueRno =
    venueName && raceNo != null
      ? `${venueName} ${raceNo}R`
      : venueName ?? '—';

  const parts = [];
  if (date) parts.push(date);
  if (venueName && raceNo != null) parts.push(`${venueName} ${raceNo}R`);
  if (startTime && startTime !== '—') parts.push(`締切 ${startTime}`);

  return {
    date,
    venueName,
    raceNo,
    startTime,
    title: venueRno,
    line: parts.join('｜'),
    inline: parts.join('｜'),
  };
}
