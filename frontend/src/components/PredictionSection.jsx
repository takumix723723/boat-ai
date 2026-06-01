import { useEffect, useState } from 'react';
import {
  ApiError,
  fetchRacePrediction,
  formatApiError,
  getApiBaseDebug,
} from '../api/client';
import './PredictionSection.css';

function ConfidenceMeter({ percent, tier, label }) {
  return (
    <div className={`pred-conf-meter pred-conf-meter--${tier}`}>
      <span className="pred-conf-pct">{percent}%</span>
      <span className="pred-conf-tag">{label}</span>
    </div>
  );
}

function BetRecommendationCard({ rec }) {
  if (!rec) return null;
  return (
    <article className={`pred-rec pred-rec--${rec.id}`}>
      <header className="pred-rec-head">
        <h3 className="pred-rec-title">
          <span className="pred-rec-emoji" aria-hidden>
            {rec.emoji}
          </span>
          {rec.title}
        </h3>
        <ConfidenceMeter
          percent={rec.confidencePercent}
          tier={rec.confidenceTier}
          label={rec.confidenceLabel}
        />
      </header>
      <p className="pred-rec-conf-caption">自信度 {rec.confidencePercent}%</p>
      <ul className="pred-rec-lines">
        {rec.lines?.map((line) => (
          <li key={line} className="pred-rec-line">
            {line}
          </li>
        ))}
      </ul>
      {rec.note && <p className="pred-rec-note">{rec.note}</p>}
    </article>
  );
}

/**
 * @param {{ raceId: string, refreshKey?: string|number|null }} props
 */
export default function PredictionSection({ raceId, refreshKey = null }) {
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setErrorDetail(null);

    if (!raceId) {
      setError('Prediction API error: raceId is missing');
      setLoading(false);
      return undefined;
    }

    fetchRacePrediction(raceId)
      .then((res) => {
        if (!cancelled) setPrediction(res.prediction ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[PredictionSection] fetch failed', err);
          setError(formatApiError(err, 'Prediction API'));
          if (err instanceof ApiError) {
            setErrorDetail({
              status: err.status,
              path: err.path,
              url: err.url,
              body: err.body,
            });
          }
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
        <h2 className="prediction-title">AI買い目提案</h2>
        <p className="prediction-muted">読み込み中…</p>
      </section>
    );
  }

  if (error) {
    const apiDebug = getApiBaseDebug();
    const isRouteMissing =
      errorDetail?.status === 404 && errorDetail?.body?.error === 'Not found';
    const hitStaticSite =
      isRouteMissing &&
      errorDetail?.url &&
      !String(errorDetail.url).includes('boat-ai-api');
    return (
      <section className="prediction card">
        <h2 className="prediction-title">AI買い目提案</h2>
        <p className="prediction-empty prediction-error-main">{error}</p>
        {errorDetail && (
          <dl className="prediction-error-detail">
            <div>
              <dt>Status</dt>
              <dd>{errorDetail.status || '—'}</dd>
            </div>
            <div>
              <dt>Path</dt>
              <dd>{errorDetail.path}</dd>
            </div>
            {errorDetail.url && (
              <div>
                <dt>URL</dt>
                <dd className="prediction-error-url">{errorDetail.url}</dd>
              </div>
            )}
            <div>
              <dt>API base</dt>
              <dd className="prediction-error-url">
                {apiDebug.base || '(same-origin / vite proxy)'}
              </dd>
            </div>
            <div>
              <dt>VITE_API_URL</dt>
              <dd>{apiDebug.viteEnv}</dd>
            </div>
            <div>
              <dt>Resolved via</dt>
              <dd>{apiDebug.source}</dd>
            </div>
          </dl>
        )}
        <p className="prediction-hint">
          {hitStaticSite
            ? 'リクエストが boat-ai-web（静的サイト）に向いています。Render の boat-ai-web に VITE_API_URL=https://boat-ai-api.onrender.com を設定し、Static を再ビルドしてください。'
            : isRouteMissing
              ? 'API に prediction ルートがありません。boat-ai-api を最新 commit で再デプロイし、/api/health の apiFeatures.racePrediction を確認してください。'
              : 'Network タブで上記 URL が boat-ai-api 向きで 200 になるか確認してください。'}
        </p>
      </section>
    );
  }

  if (!prediction?.available) {
    return (
      <section className="prediction card">
        <h2 className="prediction-title">AI買い目提案</h2>
        <p className="prediction-empty">
          {prediction?.message ?? '予想を表示できません'}
        </p>
      </section>
    );
  }

  const { confidence, marks, recommendations, oddsNote } = prediction;

  return (
    <section className="prediction card">
      <h2 className="prediction-title">AI買い目提案</h2>

      {confidence?.message && (
        <p className="prediction-summary">{confidence.message}</p>
      )}

      <div className="pred-rec-list">
        {recommendations?.map((rec) => (
          <BetRecommendationCard key={rec.id} rec={rec} />
        ))}
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

      {oddsNote && <p className="prediction-hint">{oddsNote}</p>}
    </section>
  );
}
