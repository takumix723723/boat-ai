import './ScoreDeltaBadge.css';

/**
 * @param {{ delta: { diff: number, direction: 'up'|'down', reason: string }|null, size?: 'sm'|'md' }} props
 */
export default function ScoreDeltaBadge({ delta, size = 'md' }) {
  if (!delta || delta.diff === 0) return null;

  const sign = delta.diff > 0 ? '+' : '';

  return (
    <span
      className={`score-delta score-delta--${delta.direction} score-delta--${size}`}
      title={`前回比 ${sign}${delta.diff}点`}
    >
      {sign}
      {delta.diff} {delta.reason}
    </span>
  );
}
