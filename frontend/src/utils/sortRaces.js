/**
 * お気に入り場を上部に、その中・外とも締切順は維持
 * @param {object[]} races - sortByDeadline 済み配列
 * @param {Set<string>} favoriteVenueCodes
 */
export function partitionRacesByFavoriteVenues(races, favoriteVenueCodes) {
  if (!favoriteVenueCodes?.size) {
    return { favorite: [], other: races };
  }
  const favorite = [];
  const other = [];
  for (const race of races) {
    if (favoriteVenueCodes.has(race.venueCode)) {
      favorite.push(race);
    } else {
      other.push(race);
    }
  }
  return { favorite, other };
}
