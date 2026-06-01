import { useEffect, useState } from 'react';
import {
  ApiError,
  fetchRacePrediction,
  formatApiError,
  getApiBaseDebug,
} from '../api/client';
import './PredictionSection.css';

function HonmeiCard({ honmei, guide }) {
  const primary = honmei?.primary ?? guide?.honmei;
  if (!primary?.combo) return null;

  return (
    <article className="pred-honmei-card">
      <div className="pred-honmei-label">🔥 本命</div>
      <div className="pred-honmei-combo">{primary.combo}</div>
      <div className="pred-honmei-meta">
        <div className="pred-honmei-stat">
          <span className="pred-honmei-stat-label">本命自信度</span>
          <span className="pred-honmei-stat-value">
            {primary.confidencePercent ?? guide?.honmeiConfidencePercent}%
          </span>
        </div>
        {primary.odds != null && (
          <div className="pred-honmei-stat">
            <span className="pred-honmei-stat-label">推定</span>
            <span className="pred-honmei-stat-value pred-honmei-odds">
              {primary.odds}倍
            </span>
          </div>
        )}
      </div>
      {honmei?.alternates?.length > 0 && (
        <p className="pred-honmei-alt">
          次点: {honmei.alternates.map((a) => a.combo).join(' · ')}
        </p>
      )}
    </article>
  );
}

function BettingGuideCard({ guide, aiComment }) {
  if (!guide?.howToBet) return null;
  const { safe, box, formation } = guide.howToBet;

  return (
    <article className="pred-guide-card">
      <div className="pred-guide-head">
        <span className="pred-guide-head-label">本命自信度</span>
        <span className="pred-guide-head-pct">
          {guide.honmeiConfidencePercent}%
        </span>
      </div>

      {aiComment && (
        <div className="pred-ai-comment">
          <p className="pred-ai-comment-headline">{aiComment.headline}</p>
          <p className="pred-ai-comment-summary">{aiComment.summary}</p>
          <p className="pred-ai-comment-action">{aiComment.actionHint}</p>
          {aiComment.recommended?.length > 0 && (
            <ul className="pred-ai-comment-recs">
              {aiComment.recommended.map((r) => (
                <li key={`${r.type}-${r.text}`}>
                  <strong>{r.type}</strong> {r.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <h3 className="pred-guide-title">おすすめ買い方</h3>

      <div className="pred-bet-row">
        <span className="pred-bet-type">安全</span>
        <div className="pred-bet-body">
          <p className="pred-bet-combos">{safe.combos.join(' / ')}</p>
          <p className="pred-bet-points">{safe.points}点</p>
          <p className="pred-bet-reason">{safe.reason}</p>
        </div>
      </div>

      <div className="pred-bet-row">
        <span className="pred-bet-type">BOX</span>
        <div className="pred-bet-body">
          <p className="pred-bet-combos">
            {box.combo}（{box.points}点）
          </p>
          <p className="pred-bet-reason">{box.reason}</p>
        </div>
      </div>

      <div className="pred-bet-row">
        <span className="pred-bet-type">フォーメーション</span>
        <div className="pred-bet-body">
          <p className="pred-bet-combos">{formation.display}</p>
          <p className="pred-bet-points">{formation.points}点</p>
          <p className="pred-bet-reason">{formation.reason}</p>
        </div>
      </div>
    </article>
  );
}

function SubRecommendationCards({ recommendations }) {
  const subs = recommendations?.filter((r) => r.id !== 'honmei') ?? [];
  if (!subs.length) return null;

  return (
    <div className="pred-sub-recs">
      {subs.map((rec) => (
        <article key={rec.id} className={`pred-sub-rec pred-sub-rec--${rec.id}`}>
          <div className="pred-sub-rec-head">
            <span>
              {rec.emoji} {rec.title}
            </span>
            <span className="pred-sub-rec-pct">{rec.confidencePercent}%</span>
          </div>
          {rec.lines?.map((line) => (
            <p key={line} className="pred-sub-rec-line">
              {line}
              {rec.points != null ? `（${rec.points}点）` : ''}
            </p>
          ))}
        </article>
      ))}
    </div>
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
              <dd>{apiDebug.base || '(proxy)'}</dd>
            </div>
          </dl>
        )}
        <p className="prediction-hint">
          {hitStaticSite
            ? 'VITE_API_URL を boat-ai-api に向けて Static を再ビルドしてください。'
            : 'Network タブで prediction URL を確認してください。'}
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

  const { marks, recommendations, oddsNote, bettingGuide, aiComment } =
    prediction;
  const honmeiRec = recommendations?.find((r) => r.id === 'honmei');

  return (
    <section className="prediction card">
      <h2 className="prediction-title">AI買い目提案</h2>

      <HonmeiCard honmei={honmeiRec} guide={bettingGuide} />
      <BettingGuideCard guide={bettingGuide} aiComment={aiComment} />
      <SubRecommendationCards recommendations={recommendations} />

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
