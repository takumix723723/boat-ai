import { isBoxEligibleForStats } from './predictionBetSpec.js';

/**
 * @param {object[]} placements - { place, lane }
 * @returns {{ winner: number|null, combo: string|null, ordered: number[]|null }}
 */
export function parseResultFromPlacements(placements) {
  if (!placements?.length) {
    return { winner: null, combo: null, ordered: null };
  }
  const byPlace = placements
    .filter((p) => p.place >= 1 && p.place <= 3)
    .sort((a, b) => a.place - b.place);
  if (byPlace.length < 3) {
    const w = placements.find((p) => p.place === 1);
    return {
      winner: w?.lane ?? null,
      combo: null,
      ordered: null,
    };
  }
  const ordered = byPlace.map((p) => p.lane);
  return {
    winner: ordered[0],
    combo: ordered.join('-'),
    ordered,
  };
}

/**
 * @param {number|null} winnerLane
 * @param {number|null} honmeiLane
 */
export function evaluateHonmeiWinHit(winnerLane, honmeiLane) {
  if (winnerLane == null || honmeiLane == null) return null;
  return winnerLane === honmeiLane;
}

/**
 * @param {string|null} resultCombo
 * @param {string|null} honmeiTrifectaCombo
 */
export function evaluateHonmeiTrifectaHit(resultCombo, honmeiTrifectaCombo) {
  if (!resultCombo || !honmeiTrifectaCombo) return null;
  return resultCombo === honmeiTrifectaCombo;
}

/**
 * @param {number[]|null} ordered - 1-2-3着の艇番
 * @param {object|null} formation - buildFormationParts 出力
 */
export function evaluateFormationHit(ordered, formation) {
  if (!ordered || ordered.length < 3 || !formation) return null;
  const [w, s, t] = ordered;
  const { head, secondLanes, thirdLanes } = formation;
  if (w !== head) return false;
  if (!secondLanes.includes(s)) return false;
  if (!thirdLanes.includes(t)) return false;
  if (w === s || w === t || s === t) return false;
  return true;
}

/**
 * @param {number[]|null} ordered
 * @param {object|null} box - buildBoxParts 出力
 */
export function evaluateBoxHit(ordered, box) {
  if (!ordered || ordered.length < 3 || !box?.lanes?.length) return null;
  const lanes = box.lanes;
  const [w, s, t] = ordered;
  if (!lanes.includes(w) || !lanes.includes(s) || !lanes.includes(t)) {
    return false;
  }
  if (lanes.length >= 3) {
    const set = new Set(lanes);
    return set.has(w) && set.has(s) && set.has(t) && w !== s && s !== t && w !== t;
  }
  if (lanes.length === 2) {
    const inBox = (l) => lanes.includes(l);
    return inBox(w) && inBox(s) && inBox(t);
  }
  return w === lanes[0] && s === lanes[0] && t === lanes[0];
}

/**
 * @param {string|null} resultCombo
 * @param {string|null} anaCombo
 */
export function evaluateAnaHit(resultCombo, anaCombo) {
  if (!resultCombo || !anaCombo) return null;
  return resultCombo === anaCombo;
}

/**
 * @param {object[]} placements
 * @param {object} advice - DB 行相当
 */
export function evaluateAllBetHits(placements, advice) {
  const { winner, combo, ordered } = parseResultFromPlacements(placements);
  const formation =
    advice.formationJson ?? advice.formation_json ?? null;
  const box = advice.boxJson ?? advice.box_json ?? null;

  return {
    winnerLane: winner,
    resultCombo: combo,
    hitHonmeiWin: evaluateHonmeiWinHit(winner, advice.honmeiLane ?? advice.honmei_lane),
    hitHonmeiTrifecta: evaluateHonmeiTrifectaHit(
      combo,
      advice.honmeiTrifectaCombo ?? advice.honmei_trifecta_combo
    ),
    hitFormation: evaluateFormationHit(ordered, formation),
    hitBox: evaluateBoxHit(ordered, box),
    hitAna: evaluateAnaHit(combo, advice.anaCombo ?? advice.ana_combo),
    boxEligibleForStats: isBoxEligibleForStats(box),
  };
}
