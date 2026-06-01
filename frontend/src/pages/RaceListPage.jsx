import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchRaces, refreshRaces } from '../api/client';
import DataSourceBanner from '../components/DataSourceBanner';
import VenueFilter from '../components/VenueFilter';
import RaceDeadline from '../components/RaceDeadline';
import ScoreDeltaBadge from '../components/ScoreDeltaBadge';
import FavoriteButton from '../components/FavoriteButton';
import { useLiveRefresh, LIVE_POLL_INTERVAL_MS } from '../hooks/useLiveRefresh';
import { usePreferences } from '../hooks/usePreferences';
import { partitionRacesByFavoriteVenues } from '../utils/sortRaces';
import { sortByDeadline, getUrgency, parseClosedAt } from '../utils/raceTime';
import { buildRaceLabel, formatDisplayDate } from '../utils/raceLabel';
import '../components/RaceInfoHeader.css';
import './RaceListPage.css';

function RaceListSection({ title, races, raceDate, showDivider, isFavoriteVenue, onToggleVenue }) {
  if (!races.length) return null;

  return (
    <>
      {showDivider && title && (
        <h2 className="race-section-title">{title}</h2>
      )}
      <ul className="race-list">
        {races.map((race) => {
          const closedAtMs = parseClosedAt(
            race.closedAt,
            race.startTime,
            raceDate
          );
          const urgency = getUrgency(closedAtMs);
          const venueFav = isFavoriteVenue(race.venueCode);
          const label = buildRaceLabel(race, { raceDate });

          return (
            <li key={race.id}>
              <Link
                to={`/race/${race.id}`}
                className={`race-list-item urgency-border-${urgency} ${venueFav ? 'is-fav-venue' : ''}`}
              >
                <div className="race-list-top">
                  <FavoriteButton
                    kind="venue"
                    size="sm"
                    active={venueFav}
                    onToggle={() =>
                      onToggleVenue(race.venueCode, race.venueName)
                    }
                  />
                  <div className="race-list-label">
                    {label.date && (
                      <span className="race-list-label-date">{label.date}</span>
                    )}
                    <div className="race-list-label-main">
                      <span className="venue">{race.venueName}</span>
                      <span className="race-no">{race.raceNo}R</span>
                      {label.startTime && label.startTime !== '—' && (
                        <span className="race-list-label-deadline">
                          締切 {label.startTime}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`badge ${race.grade?.includes('G') ? 'grade-g1' : 'grade-normal'}`}
                  >
                    {race.grade}
                  </span>
                </div>
                <div className="race-list-mid">
                  <span
                    className={`badge ${race.status === '直前' ? 'status-live' : 'status-done'}`}
                  >
                    {race.status}
                  </span>
                  <RaceDeadline
                    closedAt={race.closedAt}
                    startTime={race.startTime}
                    raceDate={raceDate}
                  />
                </div>
                <div className="race-list-bottom">
                  <div className="race-list-ai">
                    <span className="ai-top-label">AI最高</span>
                    <span className="ai-top-score">{race.topAiScore}</span>
                    {race.topScoreDelta && (
                      <ScoreDeltaBadge delta={race.topScoreDelta} size="sm" />
                    )}
                  </div>
                  <span className="chevron">›</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function RaceListPage() {
  const [venueFilter, setVenueFilter] = useState('');
  const [, tick] = useState(0);
  const {
    favoriteVenueCodes,
    toggleVenue,
    isFavoriteVenue,
  } = usePreferences();

  const { meta, data, loading, refreshing, error, lastUpdated, refresh } =
    useLiveRefresh({
      load: fetchRaces,
      refresh: refreshRaces,
    });

  const races = data?.races ?? [];

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const venues = useMemo(() => {
    const map = new Map();
    for (const r of races) {
      const key = r.venueCode;
      if (!map.has(key)) {
        map.set(key, { name: r.venueName, code: r.venueCode, count: 0 });
      }
      map.get(key).count += 1;
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'ja')
    );
  }, [races]);

  const sorted = useMemo(() => sortByDeadline(races), [races, tick]);

  const filtered = useMemo(() => {
    if (!venueFilter) return sorted;
    return sorted.filter((r) => r.venueName === venueFilter);
  }, [sorted, venueFilter]);

  const { favorite, other } = useMemo(
    () => partitionRacesByFavoriteVenues(filtered, favoriteVenueCodes),
    [filtered, favoriteVenueCodes]
  );

  const hasFavorites = favoriteVenueCodes.size > 0;
  const showSections =
    hasFavorites && !venueFilter && favorite.length > 0 && other.length > 0;

  if (loading && races.length === 0) {
    return <div className="page loading">実データを取得中…</div>;
  }
  if (error && races.length === 0) {
    return <div className="page error-box">{error}</div>;
  }

  const raceDate = meta?.raceDate;

  return (
    <div className="page">
      <h1 className="page-title">本日のレース</h1>
      {raceDate && (
        <p className="page-race-date">開催日 {formatDisplayDate(raceDate)}</p>
      )}
      <p className="page-sub">
        締切が近い順 · ⭐お気に入りの場を優先 ·{' '}
        {LIVE_POLL_INTERVAL_MS / 1000}秒更新
      </p>

      <DataSourceBanner
        meta={meta}
        onRefresh={refresh}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      {refreshing && (
        <div className="live-refresh-bar" aria-live="polite">
          <span className="data-banner-spinner" />
          最新データを取得しています…
        </div>
      )}

      <VenueFilter
        venues={venues}
        value={venueFilter}
        onChange={setVenueFilter}
        isFavoriteVenue={isFavoriteVenue}
        onToggleVenueFavorite={toggleVenue}
      />

      {showSections ? (
        <>
          <RaceListSection
            title="⭐ お気に入りの場"
            races={favorite}
            raceDate={raceDate}
            showDivider
            isFavoriteVenue={isFavoriteVenue}
            onToggleVenue={toggleVenue}
          />
          <RaceListSection
            title="その他の場"
            races={other}
            raceDate={raceDate}
            showDivider
            isFavoriteVenue={isFavoriteVenue}
            onToggleVenue={toggleVenue}
          />
        </>
      ) : (
        <RaceListSection
          title={null}
          races={filtered}
          raceDate={raceDate}
          showDivider={false}
          isFavoriteVenue={isFavoriteVenue}
          onToggleVenue={toggleVenue}
        />
      )}

      {filtered.length === 0 && !loading && (
        <p className="empty-list">該当レースがありません</p>
      )}
    </div>
  );
}
