import { useEffect, useState } from 'react';
import { fetchRacePrediction } from '../api/client';
import './PredictionSection.css';

const CONFIDENCE_LABEL = {
  high: '高',
  medium: '中',
  low: '低',
};

/**
 * @param {{ raceId: string, refreshKey?: string|number|null }} props
 */
export default function PredictionSection({ raceId, refreshKey = null }) {
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchRacePrediction(raceId)
      .then((res) => {
        if (!cancelled) setPrediction(res.prediction ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[PredictionSection] fetch failed', err);
          setError(err.message || '予想の取得に失敗しました');
        }
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
      <section className="prediction card">
        <h2 className="prediction-title">AI予想 / 買い目</h2>
        <p className="prediction-muted">読み込み中…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="prediction card">
        <h2 className="prediction-title">AI予想 / 買い目</h2>
        <p className="prediction-empty">{error}</p>
        <p className="prediction-hint">
          API（/api/races/…/prediction）の接続を確認してください。
        </p>
      </section>
    );
  }

  if (!prediction?.available) {
    return (
      <section className="prediction card">
        <h2 className="prediction-title">AI予想 / 買い目</h2>
        <p className="prediction-empty">
          {prediction?.message ?? '予想を表示できません'}
        </p>
      </section>
    );
  }

  const { confidence, marks, trifecta, summary, oddsNote } = prediction;
  const confClass = confidence?.level ? `conf-${confidence.level}` : '';

  return (
    <section className="prediction card">
      <h2 className="prediction-title">AI予想 / 買い目</h2>
      {summary && <p className="prediction-summary">{summary}</p>}

      <div className={`prediction-confidence ${confClass}`}>
        <span className="prediction-conf-label">信頼度</span>
        <span className="prediction-conf-value">
          {CONFIDENCE_LABEL[confidence?.level] ?? '—'} · {confidence?.percent}%
        </span>
        {confidence?.message && (
          <p className="prediction-conf-msg">{confidence.message}</p>
        )}
      </div>

      <h3 className="prediction-h3">印（AI順位）</h3>
      <div className="prediction-marks">
        {marks?.map((m) => (
          <div key={m.lane} className="prediction-mark-chip">
            <span className={`mark-symbol mark-${m.mark}`}>{m.mark}</span>
            <span className={`lane-dot lane-${m.lane}`}>{m.lane}</span>
            <span className="mark-name">{m.name}</span>
            <span className="mark-ai">AI {m.aiTotal}</span>
          </div>
        ))}
      </div>

      <h3 className="prediction-h3">3連単 買い目</h3>
      {trifecta?.main && (
        <div className="prediction-main-pick">
          <span className="pick-label">{trifecta.main.label ?? '本命'}</span>
          <span className="pick-combo">{trifecta.main.combo}</span>
          <span className="pick-odds">推定 {trifecta.main.odds}倍</span>
        </div>
      )}

      <div className="prediction-picks-table-wrap">
        <table className="prediction-picks-table">
          <thead>
            <tr>
              <th>#</th>
              <th>組み合わせ</th>
              <th>推定オッズ</th>
              <th>区分</th>
            </tr>
          </thead>
          <tbody>
            {trifecta?.picks?.map((p) => (
              <tr key={p.combo} className={p.rank === 1 ? 'pick-row-main' : ''}>
                <td>{p.rank}</td>
                <td className="pick-combo-cell">{p.combo}</td>
                <td>{p.odds}倍</td>
                <td>{p.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {oddsNote && <p className="prediction-hint">{oddsNote}</p>}
    </section>
  );
}
