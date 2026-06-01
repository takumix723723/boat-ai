import { useEffect, useState } from 'react';
import { fetchRaceHistory } from '../api/client';
import ScoreDeltaBadge from './ScoreDeltaBadge';
import './AiHistorySection.css';

function formatCapturedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatNum(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toFixed(digits);
}

/**
 * @param {{ raceId: string, refreshKey?: string|number|null }} props
 */
export default function AiHistorySection({ raceId, refreshKey = null }) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

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

  if (loading) {
    return (
      <section className="ai-history card">
        <h2 className="ai-history-title">AI推移</h2>
        <p className="ai-history-muted">履歴を読み込み中…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ai-history card">
        <h2 className="ai-history-title">AI推移</h2>
        <p className="ai-history-empty">{error}</p>
      </section>
    );
  }

  if (!history?.available) {
    return (
      <section className="ai-history card">
        <h2 className="ai-history-title">AI推移</h2>
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

  return (
    <section className="ai-history card">
      <h2 className="ai-history-title">AI推移</h2>
      <p className="ai-history-sub">
        DB保存スナップショット {history.snapshotCount} 件 · 各更新時点の AI 点数
      </p>

      {history.snapshots.map((snap) => (
        <div key={`${snap.sequence}-${snap.capturedAt}`} className="ai-history-block">
          <div className="ai-history-block-head">
            <span className="ai-history-seq">#{snap.sequence}</span>
            <time dateTime={snap.capturedAt}>{formatCapturedAt(snap.capturedAt)}</time>
            {snap.status && (
              <span className="badge status-done">{snap.status}</span>
            )}
          </div>

          <div className="ai-history-table-wrap">
            <table className="ai-history-table">
              <thead>
                <tr>
                  <th>枠</th>
                  <th>選手</th>
                  <th>AI</th>
                  <th>変動</th>
                  <th>ST</th>
                  <th>展示</th>
                </tr>
              </thead>
              <tbody>
                {snap.entries.map((entry) => (
                  <tr key={entry.lane}>
                    <td>{entry.lane}</td>
                    <td className="ai-history-name">{entry.name}</td>
                    <td className="ai-history-score">{entry.aiScore?.total ?? '—'}</td>
                    <td>
                      <ScoreDeltaBadge delta={entry.scoreDelta} size="sm" />
                      {!entry.scoreDelta && entry.previousTotal != null && (
                        <span className="ai-history-muted">—</span>
                      )}
                      {!entry.scoreDelta && entry.previousTotal == null && (
                        <span className="ai-history-muted">初回</span>
                      )}
                    </td>
                    <td>{formatNum(entry.st, 2)}</td>
                    <td>{formatNum(entry.exhibitionTime, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
