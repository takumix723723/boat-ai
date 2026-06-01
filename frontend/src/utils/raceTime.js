/** @returns {number|null} Unix ms (JST想定の closedAt 文字列) */
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
    const d = raceDate.replace(/-/g, '');
    const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    const ms = Date.parse(`${iso}T${startTime}:00+09:00`);
    if (!Number.isNaN(ms)) return ms;
  }
  return null;
}

/** @returns {'hot'|'warn'|'soon'|'past'|'unknown'} */
export function getUrgency(closedAtMs, now = Date.now()) {
  if (closedAtMs == null) return 'unknown';
  const diff = closedAtMs - now;
  if (diff <= 0) return 'past';
  if (diff <= 10 * 60 * 1000) return 'hot';
  if (diff <= 30 * 60 * 1000) return 'warn';
  return 'soon';
}

export function formatCountdown(closedAtMs, now = Date.now()) {
  if (closedAtMs == null) return '—';
  const diff = closedAtMs - now;
  if (diff <= 0) return '発走済';
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function urgencyIcon(urgency) {
  if (urgency === 'hot') return '🔥';
  if (urgency === 'warn') return '⚠️';
  return null;
}

/** 締切が近い順（未発走優先 → 発走済みは末尾） */
export function sortByDeadline(races, now = Date.now()) {
  return [...races].sort((a, b) => {
    const aMs = parseClosedAt(a.closedAt, a.startTime);
    const bMs = parseClosedAt(b.closedAt, b.startTime);
    const aPast = aMs != null && aMs <= now;
    const bPast = bMs != null && bMs <= now;
    if (aPast !== bPast) return aPast ? 1 : -1;
    if (aMs == null && bMs == null) return 0;
    if (aMs == null) return 1;
    if (bMs == null) return -1;
    return aMs - bMs;
  });
}
