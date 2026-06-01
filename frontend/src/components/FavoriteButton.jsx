import './FavoriteButton.css';

/**
 * @param {{
 *   kind: 'venue' | 'racer',
 *   active: boolean,
 *   onToggle: () => void,
 *   size?: 'sm' | 'md',
 *   label?: string,
 * }} props
 */
export default function FavoriteButton({
  kind,
  active,
  onToggle,
  size = 'md',
  label,
}) {
  const icon = kind === 'venue' ? (active ? '⭐' : '☆') : active ? '❤️' : '🤍';
  const defaultLabel =
    kind === 'venue'
      ? active
        ? 'お気に入り場を解除'
        : 'お気に入り場に追加'
      : active
        ? 'お気に入り選手を解除'
        : 'お気に入り選手に追加';

  return (
    <button
      type="button"
      className={`favorite-btn favorite-btn--${kind} favorite-btn--${size} ${active ? 'active' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={label ?? defaultLabel}
      aria-pressed={active}
    >
      <span className="favorite-btn-icon" aria-hidden>
        {icon}
      </span>
    </button>
  );
}
