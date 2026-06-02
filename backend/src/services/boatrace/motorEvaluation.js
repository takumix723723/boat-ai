const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/**
 * Open API / モックのモーター情報を正規化（号機は強さに使わない）
 * @param {object} boat - programs の艇オブジェクト
 */
export function mapMotorFromProgram(boat) {
  const motorNo = boat.racer_assigned_motor_number ?? null;
  const rate2nd = boat.racer_assigned_motor_top_2_percent ?? null;
  const rate3rd = boat.racer_assigned_motor_top_3_percent ?? null;
  return {
    motorNo,
    rate2nd,
    rate3rd,
    note:
      rate2nd == null
        ? 'モーター2連率未取得'
        : motorNo == null
          ? 'モーター号機未取得'
          : null,
  };
}

/**
 * AI採点用: モーター2連率・3連率のみ（号機・選手勝率は未使用）
 * @param {import('../../types/race.js').MotorEvaluation|null|undefined} motor
 */
export function motorFactorScore(motor) {
  if (!motor) return 50;

  let weighted = 0;
  let weightSum = 0;

  if (motor.rate2nd != null) {
    weighted += motor.rate2nd * 1.15 * 0.6;
    weightSum += 0.6;
  }
  if (motor.rate3rd != null) {
    weighted += motor.rate3rd * 0.95 * 0.4;
    weightSum += 0.4;
  }

  if (weightSum === 0) return 50;
  return clamp(Math.round(weighted / weightSum));
}
