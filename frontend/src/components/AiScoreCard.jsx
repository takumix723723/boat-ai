import { SCORE_LABELS } from '../types/race';
import TopReasons from './TopReasons';
import ScoreDeltaBadge from './ScoreDeltaBadge';
import FavoriteButton from './FavoriteButton';
import './AiScoreCard.css';

function scoreTier(total) {
  if (total >= 80) return 'high';
  if (total >= 65) return 'mid';
  return 'low';
}

function buildTopReasons(aiScore, limit = 3) {
  if (!aiScore) return [];
  return Object.entries(SCORE_LABELS)
    .map(([key, label]) => ({ label, score: aiScore[key] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export default function AiScoreCard({
  entry,
  showBreakdown = true,
  showReasons = false,
  isFavoriteRacer = false,
  onToggleFavoriteRacer,
  intelligenceTags = [],
  onOpenIntelligence,
}) {
  const { aiScore, scoreDelta } = entry;
  const total = aiScore?.total ?? 0;

  return (
    <article
      className={`ai-card tier-${scoreTier(total)} ${isFavoriteRacer ? 'is-fav-racer' : ''}`}
    >
      <div className="ai-card-head">
        <div className={`lane-dot lane-${entry.lane}`}>{entry.lane}</div>
        <div className="ai-card-meta">
          <div className="racer-name-row">
            <h3 className="racer-name">
              {onOpenIntelligence ? (
                <button
                  type="button"
                  className="racer-name-btn"
                  onClick={() => onOpenIntelligence(entry)}
                >
                  {entry.name}
                </button>
              ) : (
                entry.name
              )}
            </h3>
            {onToggleFavoriteRacer && (
              <FavoriteButton
                kind="racer"
                size="sm"
                active={isFavoriteRacer}
                onToggle={() => onToggleFavoriteRacer(entry.racerId, entry.name)}
              />
            )}
          </div>
          <p className="racer-sub">
            {entry.rank} / {entry.branch} · {entry.racerId}
            {onOpenIntelligence && (
              <>
                {' '}
                ·{' '}
                <button
                  type="button"
                  className="ai-karte-btn"
                  onClick={() => onOpenIntelligence(entry)}
                >
                  選手カルテ
                </button>
              </>
            )}
          </p>
          {intelligenceTags?.length > 0 && (
            <div className="ai-intel-tags">
              {intelligenceTags.map((t) => (
                <span
                  key={t.id}
                  className={`ai-intel-tag ai-intel-tag--${t.tone ?? 'muted'}`}
                >
                  {t.label}
                </span>
              ))}
            </div>
          )}
          {scoreDelta && (
            <ScoreDeltaBadge delta={scoreDelta} size="sm" />
          )}
        </div>
        <div className="ai-score-block">
          <span className="ai-score-label">AI</span>
          <span className="ai-score-value">{total}</span>
          {entry.previousAiScore != null &&
            entry.previousAiScore !== total && (
              <span className="ai-prev-score">前 {entry.previousAiScore}</span>
            )}
        </div>
      </div>

      {showReasons && aiScore && (
        <TopReasons reasons={buildTopReasons(aiScore)} compact />
      )}

      {showBreakdown && aiScore && (
        <div className="ai-breakdown">
          {Object.entries(SCORE_LABELS).map(([key, label]) => (
            <div key={key} className="breakdown-item">
              <span className="breakdown-label">{label}</span>
              <div className="breakdown-bar-wrap">
                <div
                  className="breakdown-bar"
                  style={{ width: `${aiScore[key]}%` }}
                />
              </div>
              <span className="breakdown-num">{aiScore[key]}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
