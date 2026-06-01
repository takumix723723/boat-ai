/**
 * フロントエンド型定義（将来 TypeScript 化予定）
 * @typedef {import('../../../backend/src/types/race.js')} RaceTypes
 */

export const SCORE_LABELS = {
  st: 'ST',
  exhibitionTime: '展示T',
  lane: '枠順',
  motor: 'モーター',
  course: 'コース',
  lastMinute: '直前',
};

export const STATUS_COLORS = {
  直前: 'status-live',
  展示済: 'status-done',
  一般: 'grade-normal',
  G1: 'grade-g1',
};
