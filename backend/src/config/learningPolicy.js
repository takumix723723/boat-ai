/** @typedef {'manual'|'suggest'|'auto'} LearningMode */

export const LEARNING_MODES = ['manual', 'suggest', 'auto'];

const DEFAULT_MODE = 'suggest';

export function getLearningMode() {
  const raw = (process.env.AI_LEARNING_MODE || DEFAULT_MODE).toLowerCase();
  return LEARNING_MODES.includes(raw) ? raw : DEFAULT_MODE;
}

export function isLearningEnabled() {
  return process.env.AI_LEARNING_ENABLED !== 'false';
}

export function isLearningSchedulerEnabled() {
  if (!isLearningEnabled()) return false;
  if (getLearningMode() === 'manual') return false;
  return process.env.AI_LEARNING_SCHEDULER_ENABLED !== 'false';
}

export function isLearningAfterRefreshEnabled() {
  if (!isLearningEnabled()) return false;
  if (getLearningMode() === 'manual') return false;
  return process.env.AI_LEARNING_AFTER_REFRESH !== 'false';
}

export function getLearningPolicy() {
  return {
    enabled: isLearningEnabled(),
    mode: getLearningMode(),
    schedulerEnabled: isLearningSchedulerEnabled(),
    afterRefreshEnabled: isLearningAfterRefreshEnabled(),
    minRaces: Number(process.env.AI_LEARNING_MIN_RACES) || 4,
    minImprovementPt: Number(process.env.AI_LEARNING_MIN_IMPROVEMENT) || 1,
    minNewRacesSinceLastRun:
      Number(process.env.AI_LEARNING_MIN_NEW_RACES) || 1,
    autoTrials: Math.min(
      100,
      Math.max(16, Number(process.env.AI_LEARNING_TRIALS) || 48)
    ),
    cooldownHours: Number(process.env.AI_LEARNING_COOLDOWN_HOURS) || 12,
    dailyHourUtc: (() => {
      const h = Number(process.env.AI_LEARNING_DAILY_HOUR_UTC);
      return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 19;
    })(),
  };
}
