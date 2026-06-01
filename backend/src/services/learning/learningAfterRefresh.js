import {
  isLearningAfterRefreshEnabled,
  getLearningPolicy,
} from '../../config/learningPolicy.js';
import { runAutoLearning } from './autoLearningService.js';

let refreshChain = Promise.resolve();
let lastQueuedAt = 0;
const DEBOUNCE_MS = 60_000;

/**
 * refresh 後に条件付きで学習（デバウンス・直列実行）
 */
export function queueLearningAfterRefresh() {
  if (!isLearningAfterRefreshEnabled()) return;

  const now = Date.now();
  if (now - lastQueuedAt < DEBOUNCE_MS) return;
  lastQueuedAt = now;

  refreshChain = refreshChain.then(async () => {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const policy = getLearningPolicy();
      console.info('[learningAfterRefresh] checking conditions');
      const result = await runAutoLearning({ trigger: 'refresh' });
      if (!result.skipped && result.ok) {
        console.info('[learningAfterRefresh] learning run', result.run?.status);
      } else if (result.skipped) {
        console.info('[learningAfterRefresh] skipped', result.reason || result.message);
      }
    } catch (err) {
      console.error('[learningAfterRefresh] failed', err.message);
    }
  });
}
