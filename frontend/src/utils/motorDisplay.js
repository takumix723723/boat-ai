/**
 * モーター号機と2連率を誤解なく表示（単独の数値は出さない）
 * @param {import('../types/race.js').MotorEvaluation|null|undefined} motor
 */
export function formatMotorDisplay(motor) {
  if (!motor) return '—';

  const hasNo = motor.motorNo != null;
  const has2nd = motor.rate2nd != null;

  if (hasNo && has2nd) {
    return `${motor.motorNo}号機（2連${formatRate(motor.rate2nd)}）`;
  }
  if (hasNo) {
    return `${motor.motorNo}号機`;
  }
  if (has2nd) {
    return `2連率 ${formatRate(motor.rate2nd)}`;
  }
  if (motor.note) return motor.note;
  return '—';
}

function formatRate(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;
}
