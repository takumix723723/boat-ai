import { createHash } from 'node:crypto';
import { isRealOfficialResult } from '../results/officialResultPolicy.js';

/**
 * @param {unknown} value
 */
function stableStringify(value) {
  if (value == null) return '';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

/**
 * @param {string} input
 */
export function fingerprintHash(input) {
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}

/**
 * Live レースの保存要否判定用（AI点数・展示・結果状態）
 * @param {object} race
 */
export function buildRaceFingerprint(race) {
  const entries = [...(race.entries ?? [])].sort((a, b) => a.lane - b.lane);
  const lanes = entries.map((e) => ({
    lane: e.lane,
    total: e.aiScore?.total ?? null,
    st: e.st ?? null,
    exhibitionTime: e.exhibitionTime ?? null,
    tilt: e.tilt ?? null,
  }));
  const payload = {
    lanes,
    lastMinute: race.lastMinute ?? null,
    status: race.status ?? null,
    official: isRealOfficialResult(race.officialResult) ? 1 : 0,
  };
  return fingerprintHash(stableStringify(payload));
}

/**
 * @param {object} prediction - buildRacePrediction 出力
 */
export function hashPredictionPayload(prediction) {
  if (!prediction) return null;
  return fingerprintHash(stableStringify(prediction));
}

/**
 * verdict / 成績に必要な構造化列のみ
 * @param {object} row - buildAdviceRowFromRace 出力
 */
export function buildAdviceStructuralFingerprint(row) {
  const payload = {
    verdict: row.verdict,
    honmeiLane: row.honmeiLane,
    honmeiTrifectaCombo: row.honmeiTrifectaCombo,
    honmeiConfidencePercent: row.honmeiConfidencePercent,
    honmeiConfidenceTier: row.honmeiConfidenceTier,
    formationJson: row.formationJson,
    boxJson: row.boxJson,
    anaCombo: row.anaCombo,
    betScore: row.betScore,
    skipScore: row.skipScore,
    evHonmei: row.evHonmei,
    hasEdge: row.hasEdge,
  };
  return fingerprintHash(stableStringify(payload));
}

/** フル prediction JSON を DB に残すか */
export function isPredictionPayloadStorageEnabled() {
  return process.env.STORE_PREDICTION_PAYLOAD === 'true';
}

/**
 * @param {object} row
 * @param {object|null|undefined} existing - DB 既存行
 * @param {object} prediction
 */
export function applyPredictionPayloadPolicy(row, existing, prediction) {
  const next = { ...row };
  const newHash = hashPredictionPayload(prediction);

  if (isPredictionPayloadStorageEnabled()) {
    next.predictionPayload = prediction;
    return { row: next, payloadWritten: true, payloadSkipped: false };
  }

  if (!existing) {
    delete next.predictionPayload;
    return { row: next, payloadWritten: false, payloadSkipped: true };
  }

  const oldHash = existing.predictionPayload
    ? hashPredictionPayload(existing.predictionPayload)
    : null;

  if (newHash !== oldHash) {
    next.predictionPayload = prediction;
    return { row: next, payloadWritten: true, payloadSkipped: false };
  }

  delete next.predictionPayload;
  return { row: next, payloadWritten: false, payloadSkipped: true };
}
