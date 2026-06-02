import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildRaceFingerprint,
  buildAdviceStructuralFingerprint,
  hashPredictionPayload,
} from '../src/services/persistence/snapshotFingerprint.js';

const baseRace = {
  status: '直前',
  lastMinute: { note: 'a' },
  officialResult: { available: false },
  entries: [
    { lane: 1, aiScore: { total: 80 }, st: 0.15 },
    { lane: 2, aiScore: { total: 70 }, st: 0.16 },
  ],
};

test('same race fingerprint matches', () => {
  const a = buildRaceFingerprint(baseRace);
  const b = buildRaceFingerprint({ ...baseRace });
  assert.equal(a, b);
});

test('score change changes fingerprint', () => {
  const a = buildRaceFingerprint(baseRace);
  const changed = {
    ...baseRace,
    entries: [
      { lane: 1, aiScore: { total: 81 }, st: 0.15 },
      { lane: 2, aiScore: { total: 70 }, st: 0.16 },
    ],
  };
  assert.notEqual(a, buildRaceFingerprint(changed));
});

test('official result changes fingerprint', () => {
  const open = buildRaceFingerprint(baseRace);
  const settled = buildRaceFingerprint({
    ...baseRace,
    officialResult: {
      available: true,
      source: 'BoatraceOpenAPI/results',
      placements: [{ place: 1, lane: 1 }],
    },
  });
  assert.notEqual(open, settled);
});

test('advice structural fingerprint stable', () => {
  const row = {
    verdict: 'skip',
    honmeiLane: 1,
    honmeiTrifectaCombo: '1-2-3',
    honmeiConfidencePercent: 50,
    honmeiConfidenceTier: 'low',
    formationJson: { points: 4 },
    boxJson: { points: 6 },
    anaCombo: '6-5-4',
    betScore: 40,
    skipScore: 60,
    evHonmei: -0.1,
    hasEdge: false,
  };
  assert.equal(
    buildAdviceStructuralFingerprint(row),
    buildAdviceStructuralFingerprint({ ...row })
  );
});

test('prediction payload hash differs when combo changes', () => {
  const p1 = { trifecta: { main: { combo: '1-2-3' } } };
  const p2 = { trifecta: { main: { combo: '1-3-2' } } };
  assert.notEqual(hashPredictionPayload(p1), hashPredictionPayload(p2));
});
