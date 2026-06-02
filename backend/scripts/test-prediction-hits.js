import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFormationParts, buildBoxParts } from '../src/services/prediction/predictionBetSpec.js';
import {
  evaluateFormationHit,
  evaluateBoxHit,
  evaluateHonmeiWinHit,
  evaluateAllBetHits,
} from '../src/services/prediction/predictionHitEvaluators.js';

const ranked6 = [1, 2, 3, 4, 5, 6].map((lane, i) => ({
  lane,
  aiScore: { total: 100 - i * 5 },
}));

test('formation hit when head and lanes match', () => {
  const form = buildFormationParts(ranked6);
  assert.equal(evaluateFormationHit([1, 2, 3], form), true);
  assert.equal(evaluateFormationHit([2, 1, 3], form), false);
});

test('box 3-lane hit on permutation', () => {
  const box = buildBoxParts(ranked6);
  assert.equal(box.points, 6);
  const [a, b, c] = box.lanes;
  assert.equal(evaluateBoxHit([a, b, c], box), true);
  assert.equal(evaluateBoxHit([a, c, 6], box), false);
});

test('honmei win', () => {
  assert.equal(evaluateHonmeiWinHit(1, 1), true);
  assert.equal(evaluateHonmeiWinHit(2, 1), false);
});

test('evaluateAllBetHits', () => {
  const form = buildFormationParts(ranked6);
  const box = buildBoxParts(ranked6);
  const hits = evaluateAllBetHits(
    [
      { place: 1, lane: 1 },
      { place: 2, lane: 2 },
      { place: 3, lane: 3 },
    ],
    {
      honmeiLane: 1,
      honmeiTrifectaCombo: '1-2-3',
      formationJson: form,
      boxJson: box,
      anaCombo: '6-5-4',
    }
  );
  assert.equal(hits.hitHonmeiWin, true);
  assert.equal(hits.hitHonmeiTrifecta, true);
  assert.equal(hits.hitFormation, true);
  assert.equal(hits.hitBox, evaluateBoxHit([1, 2, 3], box));
  assert.equal(hits.hitAna, false);
  assert.equal(hits.boxEligibleForStats, true);
});
