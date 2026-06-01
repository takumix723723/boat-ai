import './TopReasons.css';

/**
 * @param {{ reasons: { label: string, score: number }[], compact?: boolean }} props
 */
export default function TopReasons({ reasons, compact = false }) {
  if (!reasons?.length) return null;

  return (
    <div className={`top-reasons ${compact ? 'compact' : ''}`}>
      <span className="top-reasons-title">上位要因</span>
      <div className="top-reasons-tags">
        {reasons.map((r) => (
          <span key={r.label} className="reason-tag">
            <span className="reason-label">{r.label}</span>
            <span className="reason-score">{r.score}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
