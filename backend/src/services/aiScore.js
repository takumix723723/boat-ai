import { buildScoreDelta } from './scoreDelta.js';
import { getActiveWeightsSync, getActiveCalibrationSync } from './ai/weightProfileService.js';
import { DEFAULT_WEIGHTS } from './ai/weightConfig.js';
import { motorFactorScore } from './boatrace/motorEvaluation.js';
import { racerFactorScore, resolveRacerStats } from './boatrace/racerStats.js';
import { scoreRank } from './ai/rankCalibration.js';

/**
 * AI点数（0-100）
 */
const LANE_COURSE_SCORE = {
  1: 72,
  2: 88,
  3: 85,
  4: 78,
  5: 70,
  6: 62,
};

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function scoreSt(st) {
  if (st == null) return 50;
  if (st <= 0.05) return 95;
  if (st <= 0.1) return 88;
  if (st <= 0.15) return 78;
  if (st <= 0.2) return 68;
  if (st <= 0.25) return 58;
  return 45;
}

function scoreExhibitionTime(time) {
  if (time == null) return 50;
  if (time <= 6.52) return 95;
  if (time <= 6.58) return 85;
  if (time <= 6.65) return 75;
  if (time <= 6.72) return 65;
  if (time <= 6.8) return 55;
  return 42;
}

function scoreLane(lane) {
  const base = { 1: 82, 2: 90, 3: 86, 4: 76, 5: 68, 6: 60 };
  return base[lane] ?? 50;
}

function scoreMotor(motor) {
  return motorFactorScore(motor);
}

function scoreRacer(entry) {
  return racerFactorScore(resolveRacerStats(entry.racerStats, entry.motor));
}

function scoreCourse(lane) {
  return LANE_COURSE_SCORE[lane] ?? 50;
}

function scoreLastMinute(lastMinute, lane) {
  if (!lastMinute) return 50;
  let base = 50;
  const wind = lastMinute.wind ?? '';
  if (wind.includes('向') || wind.includes('追')) {
    const tailwindBonus = { 1: 8, 2: 5, 3: 2, 4: 0, 5: -2, 6: -4 };
    base += tailwindBonus[lane] ?? 0;
  }
  if (wind.includes('逆')) {
    const headwindBonus = { 1: -4, 2: -2, 3: 0, 4: 2, 5: 4, 6: 6 };
    base += headwindBonus[lane] ?? 0;
  }
  const wave = lastMinute.wave ?? '';
  if (wave.includes('高') || wave.includes('荒')) {
    base -= lane <= 2 ? 3 : 0;
    base += lane >= 5 ? 4 : 0;
  }
  return clamp(base);
}

/**
 * @param {import('../types/race.js').RacerEntry} entry
 * @param {import('../types/race.js').LastMinuteInfo} lastMinute
 * @param {Record<string, number>} [weights]
 * @param {object|null} [calibration]
 */
export function calculateAiScore(
  entry,
  lastMinute,
  weights = null,
  calibration = null
) {
  const w = weights ?? getActiveWeightsSync() ?? DEFAULT_WEIGHTS;
  const cal = calibration ?? getActiveCalibrationSync();

  const breakdown = {
    st: scoreSt(entry.st),
    exhibitionTime: scoreExhibitionTime(entry.exhibitionTime),
    lane: scoreLane(entry.lane),
    motor: scoreMotor(entry.motor),
    racer: scoreRacer(entry),
    rank: scoreRank(entry.rank, cal),
    course: scoreCourse(entry.lane),
    lastMinute: scoreLastMinute(lastMinute, entry.lane),
  };

  const total = Math.round(
    breakdown.st * w.st +
      breakdown.exhibitionTime * w.exhibitionTime +
      breakdown.lane * w.lane +
      breakdown.motor * w.motor +
      breakdown.racer * w.racer +
      breakdown.rank * w.rank +
      breakdown.course * w.course +
      breakdown.lastMinute * w.lastMinute
  );

  return { ...breakdown, total: clamp(total) };
}

/** レース全艇のAI点数を再計算 */
export function applyAiScoresToRace(race) {
  const lastMinuteChanged = race._lastMinuteChanged ?? false;

  const entries = race.entries.map((e) => {
    const previousAiScore =
      e.previousAiScore != null ? e.previousAiScore : null;
    const aiScore = calculateAiScore(e, race.lastMinute);

    const stChanged =
      e._oldSt != null &&
      e.st != null &&
      Math.abs(e._oldSt - e.st) > 0.001;
    const exhibitionChanged =
      e._oldExhibitionTime != null &&
      e.exhibitionTime != null &&
      Math.abs(e._oldExhibitionTime - e.exhibitionTime) > 0.001;

    const scoreDelta = buildScoreDelta(
      previousAiScore,
      aiScore,
      e._oldAiScore ?? null,
      { stChanged, exhibitionChanged, lastMinuteChanged }
    );

    const {
      _oldAiScore,
      _oldSt,
      _oldExhibitionTime,
      ...clean
    } = e;

    return {
      ...clean,
      aiScore,
      previousAiScore,
      scoreDelta,
    };
  });

  const { _lastMinuteChanged, ...cleanRace } = race;
  return { ...cleanRace, entries };
}
