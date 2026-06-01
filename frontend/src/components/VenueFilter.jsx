import FavoriteButton from './FavoriteButton';
import './VenueFilter.css';

/**
 * @param {{
 *   venues: { name: string, code: string, count: number }[],
 *   value: string,
 *   onChange: (v: string) => void,
 *   isFavoriteVenue: (code: string) => boolean,
 *   onToggleVenueFavorite: (code: string, name: string) => void,
 * }} props
 */
export default function VenueFilter({
  venues,
  value,
  onChange,
  isFavoriteVenue,
  onToggleVenueFavorite,
}) {
  if (venues.length <= 1) return null;

  const sorted = [...venues].sort((a, b) => {
    const af = isFavoriteVenue(a.code) ? 0 : 1;
    const bf = isFavoriteVenue(b.code) ? 0 : 1;
    if (af !== bf) return af - bf;
    return a.name.localeCompare(b.name, 'ja');
  });

  return (
    <div className="venue-filter-wrap">
      <div className="venue-filter" role="tablist" aria-label="競艇場フィルタ">
        <button
          type="button"
          role="tab"
          aria-selected={value === ''}
          className={`venue-chip ${value === '' ? 'active' : ''}`}
          onClick={() => onChange('')}
        >
          <span className="venue-chip-label">全場</span>
          <span className="venue-chip-count">
            {venues.reduce((s, v) => s + v.count, 0)}
          </span>
        </button>
        {sorted.map(({ name, code, count }) => {
          const fav = isFavoriteVenue(code);
          return (
            <div key={code} className={`venue-chip-wrap ${fav ? 'is-fav' : ''}`}>
              <button
                type="button"
                role="tab"
                aria-selected={value === name}
                className={`venue-chip ${value === name ? 'active' : ''}`}
                onClick={() => onChange(name)}
              >
                {fav && <span className="venue-fav-mark" aria-hidden>⭐</span>}
                <span className="venue-chip-label">{name}</span>
                <span className="venue-chip-count">{count}</span>
              </button>
              <FavoriteButton
                kind="venue"
                size="sm"
                active={fav}
                onToggle={() => onToggleVenueFavorite(code, name)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
