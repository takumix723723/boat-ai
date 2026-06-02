/** @typedef {{ A1: number, A2: number, B1: number, B2: number }} RankScores */

export const DEFAULT_RANK_SCORES = {
  A1: 92,
  A2: 82,
  B1: 68,
  B2: 52,
};

export const RANK_ORDER = ['A1', 'A2', 'B1', 'B2'];

const SCORE_MIN = 40;
const SCORE_MAX = 98;

/**
 * @param {object|null|undefined} calibration
 * @returns {RankScores}
 */
export function resolveRankScores(calibration = null) {
  const fromProfile = calibration?.rankScores;
  if (!fromProfile || typeof fromProfile !== 'object') {
    return { ...DEFAULT_RANK_SCORES };
  }

  const out = { ...DEFAULT_RANK_SCORES };
  for (const key of RANK_ORDER) {
    const n = Number(fromProfile[key]);
    if (Number.isFinite(n)) {
      out[key] = Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(n)));
    }
  }
  return enforceRankOrder(out);
}

/**
 * @param {RankScores} scores
 */
export function enforceRankOrder(scores) {
  const ordered = [scores.A1, scores.A2, scores.B1, scores.B2];
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i] > ordered[i - 1]) {
      ordered[i] = ordered[i - 1];
    }
  }
  return {
    A1: ordered[0],
    A2: ordered[1],
    B1: ordered[2],
    B2: ordered[3],
  };
}

/**
 * @param {string|null|undefined} rank
 * @param {object|null|undefined} [calibration]
 */
export function scoreRank(rank, calibration = null) {
  const scores = resolveRankScores(calibration);
  if (!rank || typeof rank !== 'string') return 50;
  const key = rank.trim().toUpperCase();
  if (key in scores) return scores[key];
  return 50;
}

export const DEFAULT_CALIBRATION = {
  version: 1,
  rankScores: { ...DEFAULT_RANK_SCORES },
};
