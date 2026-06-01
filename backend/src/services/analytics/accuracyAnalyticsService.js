import { getPrisma } from '../../db/client.js';
import { getActiveWeightsSync } from '../ai/weightProfileService.js';
import { buildVenueBreakdown } from './accuracyMetrics.js';
import {
  loadRacesForAccuracy,
  buildAccuracyRaceCases,
} from './accuracyDataLoader.js';
import { simulateAccuracyForWeights } from './accuracySimulation.js';

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * DB: races.official_result + 最新 ai_scores スナップショット
 */
export async function getAccuracyAnalytics() {
  if (!isDatabaseConfigured()) {
    return {
      available: false,
      reason: 'database_unavailable',
      message: 'DATABASE_URL が未設定のため精度分析できません。',
      analyzedRaces: 0,
      analyzedEntries: 0,
      aiTop1WinRate: null,
      aiTop3HitRate: null,
      top3HitAverage: null,
      rankDiffAverage: null,
      venueBreakdown: [],
      formulas: getFormulasDoc(),
    };
  }

  try {
    const prisma = getPrisma();
    const races = await loadRacesForAccuracy(prisma);
    const cases = buildAccuracyRaceCases(races);
    const activeWeights = getActiveWeightsSync();
    const { metrics: agg, venueRows } = simulateAccuracyForWeights(
      activeWeights,
      cases
    );
    const venueBreakdown = buildVenueBreakdown(venueRows);

    if (agg.analyzedRaces === 0) {
      return {
        available: true,
        reason: 'no_data',
        message:
          '分析対象がありません。結果付きレースを PERSIST_SNAPSHOTS=true で refresh 保存してください。',
        ...agg,
        aiTop1WinRate: null,
        aiTop3HitRate: null,
        top3HitAverage: null,
        rankDiffAverage: null,
        venueBreakdown: [],
        formulas: getFormulasDoc(),
      };
    }

    return {
      available: true,
      reason: null,
      message: null,
      ...agg,
      venueBreakdown,
      formulas: getFormulasDoc(),
    };
  } catch (err) {
    console.error('[accuracyAnalytics] failed', { message: err.message });
    return {
      available: false,
      reason: 'error',
      message: '精度分析の取得に失敗しました。',
      analyzedRaces: 0,
      analyzedEntries: 0,
      aiTop1WinRate: null,
      aiTop3HitRate: null,
      top3HitAverage: null,
      rankDiffAverage: null,
      venueBreakdown: [],
      formulas: getFormulasDoc(),
    };
  }
}

function getFormulasDoc() {
  return {
    aiTop1WinRate:
      'AI総合点1位の艇が実際に1着だったレース数 ÷ 分析レース数 × 100',
    aiTop3HitRate:
      '実際の1着艇がAI上位3艇に含まれていたレース数 ÷ 分析レース数 × 100',
    top3HitAverage:
      '各レースで「AI上位3艇のうち実際の3着以内に入った艇数」(0〜3) の平均',
    rankDiffAverage:
      '各艇の |AI順位 − 実着順| を全艇で平均（小さいほど予想が近い）',
  };
}
