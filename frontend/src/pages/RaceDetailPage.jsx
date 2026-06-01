import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchRace,
  fetchRacerIntelligence,
  refreshRaces,
  updateLastMinute,
} from '../api/client';
import DataSourceBanner from '../components/DataSourceBanner';
import AiScoreCard from '../components/AiScoreCard';
import EntryTable from '../components/EntryTable';
import ExhibitionPanel from '../components/ExhibitionPanel';
import LastMinutePanel from '../components/LastMinutePanel';
import { useLiveRefresh, LIVE_POLL_INTERVAL_MS } from '../hooks/useLiveRefresh';
import { usePreferences } from '../hooks/usePreferences';
import FavoriteButton from '../components/FavoriteButton';
import AiHistorySection from '../components/AiHistorySection';
import RaceResultSection from '../components/RaceResultSection';
import PredictionSection from '../components/PredictionSection';
import RacerIntelligenceModal from '../components/RacerIntelligenceModal';
import './RaceDetailPage.css';

export default function RaceDetailPage() {
  const { id } = useParams();

  const loadDetail = useCallback(() => fetchRace(id), [id]);

  const refreshDetail = useCallback(async () => {
    await refreshRaces();
    return fetchRace(id);
  }, [id]);

  const { toggleVenue, isFavoriteVenue, toggleRacer, isFavoriteRacer } =
    usePreferences();

  const { meta, data, loading, refreshing, error, lastUpdated, refresh, setData } =
    useLiveRefresh({
      load: loadDetail,
      refresh: refreshDetail,
    });

  const race = data?.race ?? null;
  const venueFav = race ? isFavoriteVenue(race.venueCode) : false;

  const entriesByAi = useMemo(() => {
    if (!race?.entries) return [];
    return [...race.entries].sort(
      (a, b) => (b.aiScore?.total ?? 0) - (a.aiScore?.total ?? 0)
    );
  }, [race?.entries]);

  const [karteEntry, setKarteEntry] = useState(null);
  const [intelTagsByRacer, setIntelTagsByRacer] = useState({});

  useEffect(() => {
    if (!race?.entries?.length) return undefined;
    let cancelled = false;
    const ids = [...new Set(race.entries.map((e) => e.racerId))];
    Promise.all(
      ids.map(async (racerId) => {
        try {
          const data = await fetchRacerIntelligence(racerId);
          return [racerId, data.intelligence?.tags ?? []];
        } catch {
          return [racerId, []];
        }
      })
    ).then((rows) => {
      if (!cancelled) setIntelTagsByRacer(Object.fromEntries(rows));
    });
    return () => {
      cancelled = true;
    };
  }, [race?.entries, lastUpdated]);

  if (loading && !race) {
    return <div className="page loading">分析データ取得中…</div>;
  }
  if (error && !race) {
    return <div className="page error-box">{error}</div>;
  }
  if (!race) {
    return <div className="page error-box">レースが見つかりません</div>;
  }

  return (
    <div className="page race-detail">
      <DataSourceBanner
        meta={meta ?? race.meta}
        onRefresh={refresh}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      {refreshing && (
        <div className="live-refresh-bar" aria-live="polite">
          <span className="data-banner-spinner" />
          展示・直前を反映して再採点中…
        </div>
      )}

      <p className="page-sub detail-live-sub">
        {LIVE_POLL_INTERVAL_MS / 1000}秒ごとに自動更新 · 点数変動を表示
      </p>

      <div className="race-hero card">
        <div className="race-hero-top">
          <FavoriteButton
            kind="venue"
            active={venueFav}
            onToggle={() => toggleVenue(race.venueCode, race.venueName)}
          />
          <h1 className="page-title">
            {race.venueName} {race.raceNo}R
          </h1>
          <span
            className={`badge ${race.grade?.includes('G') ? 'grade-g1' : 'grade-normal'}`}
          >
            {race.grade}
          </span>
        </div>
        <div className="race-hero-meta">
          <span
            className={`badge ${race.status === '直前' ? 'status-live' : 'status-done'}`}
          >
            {race.status}
          </span>
          <span>{race.startTime} 締切</span>
        </div>
      </div>

      <LastMinutePanel
        lastMinute={race.lastMinute}
        onUpdate={async (body) => {
          const result = await updateLastMinute(id, body);
          setData(result);
        }}
      />

      <ExhibitionPanel entries={race.entries} />

      <EntryTable entries={race.entries} />

      <PredictionSection raceId={race.id} refreshKey={lastUpdated} />

      <RaceResultSection raceId={race.id} refreshKey={lastUpdated} />

      <AiHistorySection raceId={race.id} refreshKey={lastUpdated} />

      <section className="ai-section">
        <h2 className="ai-section-title">AI総合評価</h2>
        <p className="ai-section-sub">
          展示・直前の変化で自動再採点 · 緑=上昇 赤=下降
        </p>
        {entriesByAi.map((entry) => (
          <AiScoreCard
            key={entry.lane}
            entry={entry}
            isFavoriteRacer={isFavoriteRacer(entry.racerId)}
            onToggleFavoriteRacer={toggleRacer}
            intelligenceTags={intelTagsByRacer[entry.racerId] ?? []}
            onOpenIntelligence={setKarteEntry}
          />
        ))}
      </section>

      {karteEntry && (
        <RacerIntelligenceModal
          racerId={karteEntry.racerId}
          name={karteEntry.name}
          onClose={() => setKarteEntry(null)}
        />
      )}
    </div>
  );
}
