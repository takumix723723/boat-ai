import { buildRaceLabel } from '../utils/raceLabel';
import './RaceInfoHeader.css';

/**
 * カード上部のレース識別ヘッダー
 * @param {{
 *   race?: object|null,
 *   meta?: object|null,
 *   sectionTitle?: string,
 *   compact?: boolean,
 * }} props
 */
export default function RaceInfoHeader({
  race = null,
  meta = null,
  sectionTitle = null,
  compact = true,
}) {
  const label = buildRaceLabel(race, meta);

  return (
    <header
      className={`race-info-header ${compact ? 'race-info-header--compact' : ''}`}
    >
      <div className="race-info-primary">
        <span className="race-info-icon" aria-hidden>
          🏁
        </span>
        <span className="race-info-title">{label.title}</span>
      </div>
      <div className="race-info-meta">
        {label.date && (
          <span className="race-info-chip">
            <span className="race-info-chip-icon" aria-hidden>
              📅
            </span>
            {label.date}
          </span>
        )}
        {label.startTime && label.startTime !== '—' && (
          <span className="race-info-chip">締切 {label.startTime}</span>
        )}
      </div>
      {sectionTitle && (
        <p className="race-info-section">{sectionTitle}</p>
      )}
    </header>
  );
}
