import { getActiveRaces } from '../../data/raceRepository.js';
import { minutesUntilClose } from '../../utils/raceTime.js';

/** @typedef {'favorite_racer'|'favorite_venue'|'ai_score_high'|'score_delta'|'deadline_soon'} EventType */
/** @typedef {'urgent'|'watch'|'info'} Severity */
/** @typedef {'urgent'|'score_delta'|'favorites'|'watch'} UiCategory */

/**
 * @param {object} params
 */
function makeEvent({
  eventType,
  severity,
  category,
  message,
  race,
  entry = null,
  extra = {},
}) {
  const now = new Date().toISOString();
  return {
    id: `${race.id}-${eventType}-${entry?.lane ?? ''}-${entry?.racerId ?? ''}`,
    eventType,
    severity,
    category,
    message,
    raceId: race.id,
    venueCode: race.venueCode,
    venueName: race.venueName,
    raceNo: race.raceNo,
    grade: race.grade,
    status: race.status,
    startTime: race.startTime,
    closedAt: race.meta?.raceClosedAt ?? null,
    lane: entry?.lane ?? null,
    racerId: entry?.racerId ?? null,
    racerName: entry?.name ?? null,
    aiScore: entry?.aiScore?.total ?? null,
    scoreDelta: entry?.scoreDelta ?? null,
    createdAt: now,
    ...extra,
  };
}

const SEVERITY_RANK = { urgent: 0, watch: 1, info: 2 };

/**
 * 現在のレースデータから Watch イベントを検知
 *
 * @param {object} options
 * @param {import('../../config/watchRules.js').DEFAULT_WATCH_RULES} options.rules
 * @param {Set<string>} options.favoriteRacerIds
 * @param {Set<string>} options.favoriteVenueCodes
 */
export function detectWatchlistEvents({
  rules,
  favoriteRacerIds,
  favoriteVenueCodes,
}) {
  const races = getActiveRaces();
  const events = [];
  const now = Date.now();

  for (const race of races) {
    const raceDate = race.meta?.raceDate ?? null;
    const closedAt = race.meta?.raceClosedAt ?? null;
    const entries = race.entries ?? [];

    if (rules.favoriteVenue && favoriteVenueCodes.size > 0) {
      if (favoriteVenueCodes.has(race.venueCode)) {
        events.push(
          makeEvent({
            eventType: 'favorite_venue',
            severity: 'info',
            category: 'favorites',
            message: `お気に入りの場 · ${race.venueName} ${race.raceNo}R`,
            race,
          })
        );
      }
    }

    const mins = minutesUntilClose(closedAt, race.startTime, raceDate, now);
    if (
      mins != null &&
      mins <= rules.deadlineMinutes &&
      mins > 0
    ) {
      const minLabel = Math.ceil(mins);
      events.push(
        makeEvent({
          eventType: 'deadline_soon',
          severity: 'urgent',
          category: 'urgent',
          message: `締切まで約${minLabel}分 · ${race.venueName} ${race.raceNo}R`,
          race,
          extra: { minutesUntilClose: Math.round(mins * 10) / 10 },
        })
      );
    }

    for (const entry of entries) {
      const total = entry.aiScore?.total;
      const delta = entry.scoreDelta;

      if (
        rules.favoriteRacer &&
        favoriteRacerIds.size > 0 &&
        favoriteRacerIds.has(entry.racerId)
      ) {
        events.push(
          makeEvent({
            eventType: 'favorite_racer',
            severity: 'watch',
            category: 'favorites',
            message: `お気に入り選手 · ${entry.name}（${entry.lane}号艇）${race.venueName} ${race.raceNo}R`,
            race,
            entry,
          })
        );
      }

      if (
        total != null &&
        total >= rules.aiScoreThreshold
      ) {
        events.push(
          makeEvent({
            eventType: 'ai_score_high',
            severity: 'watch',
            category: 'watch',
            message: `AI高評価 ${total}点 · ${entry.name} ${race.venueName} ${race.raceNo}R`,
            race,
            entry,
            extra: { aiScoreThreshold: rules.aiScoreThreshold },
          })
        );
      }

      if (
        delta &&
        delta.direction === 'up' &&
        delta.diff >= rules.scoreDeltaThreshold
      ) {
        events.push(
          makeEvent({
            eventType: 'score_delta',
            severity: 'watch',
            category: 'score_delta',
            message: `AI急上昇 +${delta.diff}（${delta.reason}）· ${entry.name} ${race.venueName} ${race.raceNo}R`,
            race,
            entry,
            extra: { scoreDeltaThreshold: rules.scoreDeltaThreshold },
          })
        );
      }
    }
  }

  events.sort((a, b) => {
    const sr =
      (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
    if (sr !== 0) return sr;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const grouped = {
    urgent: events.filter((e) => e.category === 'urgent'),
    score_delta: events.filter((e) => e.category === 'score_delta'),
    favorites: events.filter((e) => e.category === 'favorites'),
    watch: events.filter((e) => e.category === 'watch'),
  };

  return { events, grouped };
}
