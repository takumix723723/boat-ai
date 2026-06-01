import { useEffect, useState } from 'react';
import { fetchRaceHistory } from '../api/client';
import RaceInfoHeader from './RaceInfoHeader';
import './AiHistorySection.css';
import './RaceInfoHeader.css';

function formatUpdatedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatHistoryAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * @param {object} entry
 * @returns {{ label: string, arrow: string, tone: 'up'|'down'|'flat' }}
 */
function getLaneDeltaDisplay(entry) {
  const delta = entry.scoreDelta;
  if (!delta || delta.diff === 0) {
    return { label: '±0', arrow: '', tone: 'flat' };
  }
  const sign = delta.diff > 0 ? '+' : '';
  return {
    label: `${sign}${delta.diff}`,
    arrow: delta.direction === 'up' ? '↑' : '↓',
    tone: delta.direction === 'up' ? 'up' : 'down',
  };
}

function LatestSnapshot({ snap }) {
  return (
    <div className="ai-latest">
      <p className="ai-latest-updated">
        更新 <time dateTime={snap.capturedAt}>{formatUpdatedAt(snap.capturedAt)}</time>
        {snap.status && (
          <span className="ai-latest-status">{snap.status}</span>
        )}
      </p>
      <ul className="ai-latest-list">
        {snap.entries.map((entry) => {
          const { label, arrow, tone } = getLaneDeltaDisplay(entry);
          return (
            <li key={entry.lane} className={`ai-latest-row ai-delta--${tone}`}>
              <span className="ai-latest-lane">{entry.lane}号艇</span>
              <span className="ai-latest-delta">
                {label}
                {arrow && <span className="ai-latest-arrow"> {arrow}</span>}
              </span>
              <span className="ai-latest-score">{entry.aiScore?.total ?? '—'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PastSnapshotBlock({ snap }) {
  return (
    <div className="ai-past-block">
      <time className="ai-past-time" dateTime={snap.capturedAt}>
        {formatHistoryAt(snap.capturedAt)}
      </time>
      <ul className="ai-past-list">
        {snap.entries.map((entry) => {
          const { label, arrow, tone } = getLaneDeltaDisplay(entry);
          return (
            <li key={entry.lane} className={`ai-past-row ai-delta--${tone}`}>
              <span>{entry.lane}号</span>
              <span>
                {label}
                {arrow && ` ${arrow}`}
              </span>
              <span className="ai-past-score">{entry.aiScore?.total ?? '—'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * @param {{ raceId: string, race?: object|null, meta?: object|null, refreshKey?: string|number|null }} props
 */
export default function AiHistorySection({
  raceId,
  race = null,
  meta = null,
  refreshKey = null,
}) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpanded(false);

    fetchRaceHistory(raceId)
      .then((res) => {
        if (!cancelled) setHistory(res.history ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '履歴の取得に失敗しました');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [raceId, refreshKey]);

  const raceForHeader =
    race ??
    (history?.venueName
      ? {
          id: raceId,
          venueName: history.venueName,
          raceNo: history.raceNo,
        }
      : { id: raceId });

  if (loading) {
    return (
      <section className="ai-history card">
        <RaceInfoHeader
          race={raceForHeader}
          meta={meta}
          sectionTitle="AI推移 / 履歴"
        />
        <p className="ai-history-muted">読み込み中…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ai-history card">
        <RaceInfoHeader
          race={raceForHeader}
          meta={meta}
          sectionTitle="AI推移 / 履歴"
        />
        <p className="ai-history-empty">{error}</p>
      </section>
    );
  }

  if (!history?.available) {
    return (
      <section className="ai-history card">
        <RaceInfoHeader
          race={raceForHeader}
          meta={meta}
          sectionTitle="AI推移 / 履歴"
        />
        <p className="ai-history-empty">
          {history?.message ?? '保存された履歴がありません。'}
        </p>
        {history?.reason === 'no_snapshots' && (
          <p className="ai-history-hint">
            バックエンドで PERSIST_SNAPSHOTS=true のあと、Live 更新（refresh）を行うと DB
            に蓄積されます。
          </p>
        )}
      </section>
    );
  }

  const snapshots = history.snapshots ?? [];
  const latest = snapshots[snapshots.length - 1];
  const pastSnapshots = snapshots.length > 1 ? snapshots.slice(0, -1).reverse() : [];

  return (
    <section className="ai-history card">
      <RaceInfoHeader
        race={raceForHeader}
        meta={meta}
        sectionTitle="AI推移 / 履歴"
      />

      {latest && <LatestSnapshot snap={latest} />}

      {pastSnapshots.length > 0 && (
        <div className="ai-history-past">
          <button
            type="button"
            className="ai-history-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? '履歴を閉じる' : '履歴を見る'}
            <span className="ai-history-toggle-icon" aria-hidden>
              {expanded ? '▲' : '▼'}
            </span>
          </button>

          {expanded && (
            <div className="ai-history-past-panel">
              {pastSnapshots.map((snap) => (
                <PastSnapshotBlock
                  key={`${snap.sequence}-${snap.capturedAt}`}
                  snap={snap}
                />
              ))}
              <p className="ai-history-count" aria-label="保存件数">
                {history.snapshotCount}件保存
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
