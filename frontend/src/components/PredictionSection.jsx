import { useEffect, useState } from 'react';
import {
  ApiError,
  fetchRacePrediction,
  formatApiError,
  getApiBaseDebug,
} from '../api/client';
import RaceInfoHeader from './RaceInfoHeader';
import './PredictionSection.css';
import './RaceInfoHeader.css';

function ConfBadge({ percent, tier = 'medium' }) {
  const dot = tier === 'high' ? '🟢' : tier === 'medium' ? '🟡' : '🟠';
  const label =
    tier === 'high' ? 'HIGH' : tier === 'medium' ? 'MED' : 'LOW';
  return (
    <span className={`pred-conf-badge pred-conf-badge--${tier}`}>
      <span className="pred-conf-dot" aria-hidden>
        {dot}
      </span>
      <span className="pred-conf-pct">{percent}%</span>
      <span className="pred-conf-lv">{label}</span>
    </span>
  );
}

function HonmeiCard({ honmei, guide }) {
  const primary = honmei?.primary ?? guide?.honmei;
  if (!primary?.combo) return null;

  const pct =
    primary.confidencePercent ?? guide?.honmeiConfidencePercent ?? 0;
  const tier = honmei?.confidenceTier ?? 'medium';

  return (
    <article className="pred-dark-card pred-honmei-card">
      <div className="pred-pick-top">
        <span className="pred-pick-type pred-pick-type--honmei">🔥 本命</span>
        <ConfBadge percent={pct} tier={tier} />
      </div>
      <p className="pred-pick-combo pred-pick-combo--hero">{primary.combo}</p>
      {primary.odds != null && (
        <p className="pred-pick-points">推定 {primary.odds}倍</p>
      )}
      {honmei?.alternates?.length > 0 && (
        <p className="pred-pick-reason">
          次点 {honmei.alternates.map((a) => a.combo).join(' · ')}
        </p>
      )}
    </article>
  );
}

function BetPickCard({ type, combo, points, reason, confidencePercent, tier }) {
  if (!combo) return null;
  return (
    <article className="pred-dark-card pred-pick-card">
      <div className="pred-pick-top">
        <span className="pred-pick-type">{type}</span>
        {confidencePercent != null && (
          <ConfBadge percent={confidencePercent} tier={tier} />
        )}
      </div>
      <p className="pred-pick-combo">{combo}</p>
      {points != null && (
        <p className="pred-pick-points">({points}点)</p>
      )}
      {reason && <p className="pred-pick-reason">{reason}</p>}
    </article>
  );
}

function BettingPicks({ guide, recommendations }) {
  if (!guide?.howToBet) return null;
  const { safe, box, formation } = guide.howToBet;
  const boxRec = recommendations?.find((r) => r.id === 'box');
  const formRec = recommendations?.find((r) => r.id === 'formation');

  return (
    <div className="pred-pick-grid">
      <BetPickCard
        type="安全"
        combo={safe.combos.join(' / ')}
        points={safe.points}
        reason={safe.reason}
      />
      <BetPickCard
        type="BOX"
        combo={box.combo}
        points={box.points}
        reason={box.reason}
        confidencePercent={boxRec?.confidencePercent}
        tier={boxRec?.confidenceTier}
      />
      <BetPickCard
        type="フォーメーション"
        combo={formation.display}
        points={formation.points}
        reason={formation.reason}
        confidencePercent={formRec?.confidencePercent}
        tier={formRec?.confidenceTier}
      />
    </div>
  );
}

function AiBrief({ aiComment }) {
  if (!aiComment) return null;
  return (
    <details className="pred-ai-brief">
      <summary>{aiComment.headline}</summary>
      <p className="pred-ai-brief-text">{aiComment.summary}</p>
      <p className="pred-ai-brief-text">{aiComment.actionHint}</p>
    </details>
  );
}

/**
 * @param {{ raceId: string, race?: object|null, meta?: object|null, refreshKey?: string|number|null }} props
 */
export default function PredictionSection({
  raceId,
  race = null,
  meta = null,
  refreshKey = null,
}) {
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
      <section className="prediction card prediction--dark">
        <RaceInfoHeader race={race} meta={meta} sectionTitle="AI買い目提案" />
        <p className="prediction-muted">読み込み中…</p>
      </section>
    );
  }

  if (error) {
    const apiDebug = getApiBaseDebug();
    return (
      <section className="prediction card prediction--dark">
        <RaceInfoHeader race={race} meta={meta} sectionTitle="AI買い目提案" />
        <p className="prediction-empty prediction-error-main">{error}</p>
        {errorDetail?.url && (
          <p className="prediction-hint prediction-error-url">{errorDetail.url}</p>
        )}
        <p className="prediction-hint">API: {apiDebug.base || '—'}</p>
      </section>
    );
  }

  if (!prediction?.available) {
    return (
      <section className="prediction card prediction--dark">
        <RaceInfoHeader race={race} meta={meta} sectionTitle="AI買い目提案" />
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
    <section className="prediction card prediction--dark">
      <RaceInfoHeader race={race} meta={meta} sectionTitle="AI買い目提案" />

      <HonmeiCard honmei={honmeiRec} guide={bettingGuide} />
      <BettingPicks guide={bettingGuide} recommendations={recommendations} />
      <AiBrief aiComment={aiComment} />

      <h3 className="prediction-h3">印</h3>
      <div className="prediction-marks">
        {marks?.map((m) => (
          <div key={m.lane} className="prediction-mark-chip">
            <span className={`mark-symbol mark-${m.mark}`}>{m.mark}</span>
            <span className={`lane-dot lane-${m.lane}`}>{m.lane}</span>
            <span className="mark-name">{m.name}</span>
            <span className="mark-ai">{m.aiTotal}</span>
          </div>
        ))}
      </div>

      {oddsNote && <p className="prediction-hint">{oddsNote}</p>}
    </section>
  );
}
