/** 点数変動の要因ラベル（Phase4 Live UX） */
const FACTOR_LABELS = {
  st: { up: 'ST好転', down: 'ST悪化' },
  exhibitionTime: { up: '展示好転', down: '展示悪化' },
  lastMinute: { up: '直前好転', down: '直前悪化' },
  motor: { up: '機材好転', down: '機材悪化' },
  course: { up: 'コース好転', down: 'コース悪化' },
  lane: { up: '枠順好転', down: '枠順悪化' },
};

const WEIGHTS = {
  st: 0.2,
  exhibitionTime: 0.25,
  lane: 0.15,
  motor: 0.2,
  course: 0.1,
  lastMinute: 0.1,
};

const FACTOR_KEYS = Object.keys(FACTOR_LABELS);

/**
 * @param {number|null} previousTotal
 * @param {object} newAiScore
 * @param {object|null} oldAiScore
 * @param {{ stChanged?: boolean, exhibitionChanged?: boolean, lastMinuteChanged?: boolean }} hints
 */
export function buildScoreDelta(previousTotal, newAiScore, oldAiScore, hints = {}) {
  if (previousTotal == null || newAiScore?.total == null) return null;
  const diff = newAiScore.total - previousTotal;
  if (diff === 0) return null;

  const direction = diff > 0 ? 'up' : 'down';
  let bestKey = 'exhibitionTime';
  let bestImpact = 0;

  if (oldAiScore) {
    for (const key of FACTOR_KEYS) {
      const impact = (newAiScore[key] - (oldAiScore[key] ?? 0)) * WEIGHTS[key];
      if (Math.abs(impact) > Math.abs(bestImpact)) {
        bestImpact = impact;
        bestKey = key;
      }
    }
  }

  if (hints.exhibitionChanged) bestKey = 'exhibitionTime';
  else if (hints.stChanged) bestKey = 'st';
  else if (hints.lastMinuteChanged) bestKey = 'lastMinute';

  const labels = FACTOR_LABELS[bestKey];
  const reason = direction === 'up' ? labels.up : labels.down;

  return {
    diff,
    direction,
    reason,
    factor: bestKey,
  };
}

/** レース内で最も大きな変動艇 */
export function pickTopRaceDelta(entries) {
  let best = null;
  for (const e of entries) {
    if (!e.scoreDelta) continue;
    if (
      !best ||
      Math.abs(e.scoreDelta.diff) > Math.abs(best.scoreDelta.diff)
    ) {
      best = e;
    }
  }
  if (!best?.scoreDelta) return null;
  return {
    lane: best.lane,
    name: best.name,
    ...best.scoreDelta,
  };
}
