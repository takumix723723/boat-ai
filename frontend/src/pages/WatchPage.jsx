import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchWatchlistEvents,
  refreshRaces,
} from '../api/client';
import DataSourceBanner from '../components/DataSourceBanner';
import ScoreDeltaBadge from '../components/ScoreDeltaBadge';
import { useLiveRefresh, LIVE_POLL_INTERVAL_MS } from '../hooks/useLiveRefresh';
import { usePreferences } from '../hooks/usePreferences';
import './WatchPage.css';

const SECTIONS = [
  { key: 'urgent', title: '緊急', sub: '締切が近いレース', icon: '🔥' },
  { key: 'score_delta', title: 'AI急上昇', sub: '点数が大きく上昇', icon: '📈' },
  { key: 'favorites', title: 'お気に入り', sub: '登録した場・選手', icon: '❤️' },
  { key: 'watch', title: '今注目', sub: 'AI高評価など', icon: '👀' },
];

function WatchEventCard({ event }) {
  const severityClass = `watch-event--${event.severity ?? 'info'}`;

  return (
    <li>
      <Link
        to={`/race/${event.raceId}`}
        className={`watch-event card ${severityClass}`}
      >
        <div className="watch-event-head">
          <span className={`watch-event-type watch-event-type--${event.eventType}`}>
            {eventTypeLabel(event.eventType)}
          </span>
          <span className="watch-event-venue">
            {event.venueName} {event.raceNo}R
          </span>
        </div>
        <p className="watch-event-message">{event.message}</p>
        {(event.aiScore != null || event.scoreDelta) && (
          <div className="watch-event-meta">
            {event.aiScore != null && (
              <span className="watch-ai-score">AI {event.aiScore}</span>
            )}
            {event.scoreDelta && (
              <ScoreDeltaBadge delta={event.scoreDelta} size="sm" />
            )}
          </div>
        )}
      </Link>
    </li>
  );
}

function eventTypeLabel(type) {
  const map = {
    deadline_soon: '締切',
    score_delta: '急上昇',
    favorite_racer: '選手',
    favorite_venue: '場',
    ai_score_high: '高評価',
  };
  return map[type] ?? type;
}

function WatchSection({ title, sub, icon, events }) {
  if (!events?.length) {
    return (
      <section className="watch-section">
        <h2 className="watch-section-title">
          <span aria-hidden>{icon}</span> {title}
        </h2>
        <p className="watch-section-sub">{sub}</p>
        <p className="watch-empty">該当なし</p>
      </section>
    );
  }

  return (
    <section className="watch-section">
      <h2 className="watch-section-title">
        <span aria-hidden>{icon}</span> {title}
        <span className="watch-section-count">{events.length}</span>
      </h2>
      <p className="watch-section-sub">{sub}</p>
      <ul className="watch-event-list">
        {events.map((ev) => (
          <WatchEventCard key={ev.id} event={ev} />
        ))}
      </ul>
    </section>
  );
}

export default function WatchPage() {
  const { prefs, favoriteRacerIds, favoriteVenueCodes } = usePreferences();

  const racerIds = useMemo(
    () => [...favoriteRacerIds],
    [favoriteRacerIds]
  );
  const venueCodes = useMemo(
    () => [...favoriteVenueCodes],
    [favoriteVenueCodes]
  );

  const loadWatch = useCallback(
    () =>
      fetchWatchlistEvents({
        favoriteRacerIds: racerIds,
        favoriteVenueCodes: venueCodes,
      }),
    [racerIds, venueCodes]
  );

  const refreshWatch = useCallback(async () => {
    await refreshRaces();
    return fetchWatchlistEvents({
      favoriteRacerIds: racerIds,
      favoriteVenueCodes: venueCodes,
    });
  }, [racerIds, venueCodes]);

  const { meta, data, loading, refreshing, error, lastUpdated, refresh } =
    useLiveRefresh({
      load: loadWatch,
      refresh: refreshWatch,
    });

  const grouped = data?.grouped ?? {};
  const rules = data?.watchRules;
  const total = data?.eventCount ?? 0;

  if (loading && !data) {
    return <div className="page loading">通知を取得中…</div>;
  }

  return (
    <div className="page watch-page">
      <DataSourceBanner
        meta={meta ?? data?.meta}
        onRefresh={refresh}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      <div className="watch-hero card">
        <h1 className="page-title">通知 / Watch</h1>
        <p className="page-sub">
          AIが「見るべきレース」をピックアップ · {LIVE_POLL_INTERVAL_MS / 1000}秒更新
        </p>
        {total > 0 ? (
          <p className="watch-summary">
            いま <strong>{total}</strong> 件の注目イベント
          </p>
        ) : (
          <p className="watch-summary muted">注目イベントはありません</p>
        )}
        {rules && (
          <p className="watch-rules-hint">
            閾値: AI≥{rules.aiScoreThreshold} / 上昇≥+{rules.scoreDeltaThreshold} /
            締切≤{rules.deadlineMinutes}分
          </p>
        )}
        <p className="watch-push-note">
          アプリ内通知のみ（Push・認証は未実装）
        </p>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!prefs?.favoriteRacers?.length && !prefs?.favoriteVenues?.length && (
        <div className="watch-tip card">
          <p>
            レース一覧や詳細で ⭐ 場・❤️ 選手を登録すると「お気に入り」に表示されます。
          </p>
        </div>
      )}

      {SECTIONS.map((s) => (
        <WatchSection
          key={s.key}
          title={s.title}
          sub={s.sub}
          icon={s.icon}
          events={grouped[s.key]}
        />
      ))}
    </div>
  );
}
