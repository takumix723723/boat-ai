/**
 * 締切・カウントダウン（フロント raceTime.js と同等ロジック）
 */

/** @returns {number|null} */
export function parseClosedAt(closedAt, startTime, raceDate) {
  if (closedAt) {
    const normalized = closedAt.includes('T')
      ? closedAt
      : closedAt.replace(' ', 'T');
    const withTz = /[Z+-]\d/.test(normalized)
      ? normalized
      : `${normalized}+09:00`;
    const ms = Date.parse(withTz);
    if (!Number.isNaN(ms)) return ms;
  }
  if (raceDate && startTime && startTime !== '—') {
    const d = String(raceDate).replace(/-/g, '');
    if (d.length >= 8) {
      const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      const ms = Date.parse(`${iso}T${startTime}:00+09:00`);
      if (!Number.isNaN(ms)) return ms;
    }
  }
  return null;
}

/** @returns {number|null} 締切までの分数（発走済は null） */
export function minutesUntilClose(closedAt, startTime, raceDate, now = Date.now()) {
  const ms = parseClosedAt(closedAt, startTime, raceDate);
  if (ms == null) return null;
  const diff = ms - now;
  if (diff <= 0) return null;
  return diff / 60_000;
}
