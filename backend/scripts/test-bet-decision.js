import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildRaceBetDecision,
  VERDICT_THRESHOLDS,
} from '../src/services/prediction/raceBetDecisionService.js';

function mockRace(entries) {
  return { entries };
}

function mockPrediction(overrides = {}) {
  return {
    available: true,
    confidence: { percent: 75, tier: 'medium' },
    signals: { gap12: 8, contention: 0.2, gap13: 10 },
    trifecta: {
      main: { combo: '1-2-3', probability: 0.12, odds: 12 },
    },
    bettingGuide: {
      howToBet: {
        formation: { points: 4, display: '1→2,3→2,3,4' },
        box: { points: 6, combo: '2-3-4' },
      },
    },
    marks: [{ lane: 1, mark: '◎' }],
    ...overrides,
  };
}

test('conservative: mixed race tends skip or watch not bet', () => {
  const decision = buildRaceBetDecision(
    mockPrediction({
      confidence: { percent: 52 },
      signals: { gap12: 3, contention: 0.7, gap13: 4 },
      trifecta: { main: { probability: 0.04, odds: 8 } },
      bettingGuide: {
        howToBet: {
          formation: { points: 10 },
          box: { points: 2, combo: '2-3' },
        },
      },
    }),
    mockRace([{ lane: 1, aiScore: { total: 80 } }, { lane: 2, aiScore: { total: 78 } }])
  );
  assert.notEqual(decision.verdict, 'bet');
});

test('bet requires thresholds', () => {
  const decision = buildRaceBetDecision(
    mockPrediction({
      confidence: { percent: 82 },
      signals: { gap12: 10, contention: 0.15 },
      trifecta: { main: { probability: 0.15, odds: 15 } },
    }),
    mockRace([
      { lane: 1, aiScore: { total: 95, breakdown: {} } },
      { lane: 2, aiScore: { total: 70 } },
    ])
  );
  if (decision.verdict === 'bet') {
    assert.ok(decision.betScore >= VERDICT_THRESHOLDS.betScoreMin);
    assert.ok(decision.skipScore < VERDICT_THRESHOLDS.skipScoreMaxForBet);
    assert.ok(decision.evHonmei > VERDICT_THRESHOLDS.evHonmeiMinForBet);
  }
});

test('stake plan is example not fixed', () => {
  const decision = buildRaceBetDecision(mockPrediction(), mockRace([]));
  assert.equal(decision.stakePlan?.isExample, true);
  assert.ok(decision.stakeDisclaimer?.includes('おすすめ例'));
});
