const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/**
 * @param {object} boat - programs 艇オブジェクト
 */
export function mapRacerStatsFromProgram(boat) {
  return {
    nationalWin: boat.racer_national_top_1_percent ?? null,
    national2nd: boat.racer_national_top_2_percent ?? null,
    national3rd: boat.racer_national_top_3_percent ?? null,
    localWin: boat.racer_local_top_1_percent ?? null,
    local2nd: boat.racer_local_top_2_percent ?? null,
    local3rd: boat.racer_local_top_3_percent ?? null,
  };
}

/**
 * 旧 motor JSON（全国勝率が motor 内にあった時代）から復元
 * @param {object|null|undefined} motor
 */
export function racerStatsFromLegacyMotor(motor) {
  if (!motor || typeof motor !== 'object') return null;
  const has =
    motor.winRate != null ||
    motor.localWinRate != null ||
    motor.nationalWin != null;
  if (!has) return null;
  return {
    nationalWin: motor.nationalWin ?? motor.winRate ?? null,
    national2nd: motor.national2nd ?? null,
    national3rd: motor.national3rd ?? null,
    localWin: motor.localWin ?? motor.localWinRate ?? null,
    local2nd: motor.local2nd ?? null,
    local3rd: motor.local3rd ?? null,
  };
}

/**
 * @param {object|null|undefined} racerStats
 */
export function resolveRacerStats(racerStats, motor = null) {
  if (racerStats && typeof racerStats === 'object') {
    return racerStats;
  }
  return racerStatsFromLegacyMotor(motor) ?? {
    nationalWin: null,
    national2nd: null,
    national3rd: null,
    localWin: null,
    local2nd: null,
    local3rd: null,
  };
}

/**
 * 選手力 0–100（欠損はスキップして正規化）
 * @param {object|null|undefined} racerStats
 */
export function racerFactorScore(racerStats) {
  const s = resolveRacerStats(racerStats);
  const parts = [
    [s.nationalWin, 2.2, 0.22],
    [s.national2nd, 1.15, 0.18],
    [s.national3rd, 0.95, 0.14],
    [s.localWin, 2.4, 0.18],
    [s.local2nd, 1.2, 0.14],
    [s.local3rd, 0.95, 0.14],
  ];

  let weighted = 0;
  let weightSum = 0;
  for (const [value, mult, wt] of parts) {
    if (value != null && Number.isFinite(Number(value))) {
      weighted += Number(value) * mult * wt;
      weightSum += wt;
    }
  }
  if (weightSum === 0) return 50;
  return clamp(Math.round(weighted / weightSum));
}
