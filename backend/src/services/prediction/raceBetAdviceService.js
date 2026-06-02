import { getPrisma } from '../../db/client.js';
import { isPersistenceEnabled } from '../../config/persistence.js';
import { isRealOfficialResult } from '../results/officialResultPolicy.js';
import { parseRaceDateFromExternalId } from '../../repositories/prisma/prismaRaceRepository.js';
import { buildFormationParts, buildBoxParts } from './predictionBetSpec.js';
import { buildRacePrediction } from './racePredictionService.js';
import { buildRaceBetDecision } from './raceBetDecisionService.js';
import { evaluateAllBetHits } from './predictionHitEvaluators.js';

function toDecimal(value) {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

function rankedEntries(race) {
  return [...(race.entries ?? [])]
    .filter((e) => e.aiScore?.total != null)
    .sort((a, b) => (b.aiScore?.total ?? 0) - (a.aiScore?.total ?? 0));
}

/**
 * @param {object} race
 * @param {string} raceUuid
 * @param {string} snapshotId
 */
export function buildAdviceRowFromRace(race, raceUuid, snapshotId) {
  const prediction = buildRacePrediction(race);
  const decision = buildRaceBetDecision(prediction, race);
  if (!prediction.available) return null;

  const honmei = prediction.marks?.[0];
  const anaRec = prediction.recommendations?.find((r) => r.id === 'ana');
  const ranked = rankedEntries(race);
  const formationJson = {
    ...buildFormationParts(ranked),
    display:
      prediction.bettingGuide?.howToBet?.formation?.display ??
      buildFormationParts(ranked).display,
    points:
      prediction.bettingGuide?.howToBet?.formation?.points ??
      buildFormationParts(ranked).points,
  };
  const boxBuilt = buildBoxParts(ranked);
  const boxJson = {
    ...boxBuilt,
    display:
      prediction.bettingGuide?.howToBet?.box?.combo ?? boxBuilt.display,
    points:
      prediction.bettingGuide?.howToBet?.box?.points ?? boxBuilt.points,
  };

  const raceDate = race.meta?.raceDate
    ? new Date(`${race.meta.raceDate}T00:00:00.000Z`)
    : parseRaceDateFromExternalId(race.id);

  const mainCombo =
    prediction.trifecta?.main?.combo ??
    prediction.bettingGuide?.honmei?.combo ??
    '—';

  const now = new Date();
  const predAt = prediction.generatedAt
    ? new Date(prediction.generatedAt)
    : now;

  return {
    raceId: raceUuid,
    snapshotId,
    raceDate,
    venueCode: race.venueCode,
    venueName: race.venueName,
    raceNo: race.raceNo,
    adviceGeneratedAt: now,
    predictionGeneratedAt: predAt,
    oddsSource: prediction.oddsSource ?? 'estimated',
    verdict: decision.available ? decision.verdict : 'watch',
    betScore: decision.betScore ?? 50,
    skipScore: decision.skipScore ?? 50,
    factorAlignmentScore: decision.factorAlignmentScore ?? null,
    evHonmei: decision.evHonmei ?? null,
    hasEdge: decision.hasEdge ?? false,
    verdictReasons: decision.verdictReasons ?? [],
    stakePlanJson: decision.stakePlan ?? { totalYen: 0 },
    honmeiLane: honmei?.lane ?? ranked[0]?.lane ?? 1,
    honmeiMark: honmei?.mark ?? '◎',
    honmeiConfidencePercent: prediction.confidence?.percent ?? 50,
    honmeiConfidenceTier: prediction.confidence?.tier ?? 'medium',
    honmeiTrifectaCombo: mainCombo,
    honmeiEstimatedOdds: toDecimal(prediction.trifecta?.main?.odds),
    formationJson,
    boxJson,
    anaCombo: anaRec?.lines?.[0] ?? null,
    anaEstimatedOdds: toDecimal(anaRec?.odds),
    predictionPayload: prediction,
    resultStatus: 'pending',
  };
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {object} race
 * @param {string} raceUuid
 * @param {string} snapshotId
 */
export async function upsertBetAdviceInTransaction(tx, race, raceUuid, snapshotId) {
  const row = buildAdviceRowFromRace(race, raceUuid, snapshotId);
  if (!row) return null;

  const existing = await tx.raceBetAdvice.findUnique({
    where: { raceId: raceUuid },
    select: { resultStatus: true },
  });
  if (existing?.resultStatus === 'settled') {
    return row;
  }

  const { resultStatus: _rs, ...updateRow } = row;
  await tx.raceBetAdvice.upsert({
    where: { raceId: raceUuid },
    create: row,
    update: updateRow,
  });

  return row;
}

/**
 * @param {string} raceUuid
 * @param {object} officialResult
 */
export async function settleBetAdviceForRace(raceUuid, officialResult) {
  if (!isPersistenceEnabled() || !isRealOfficialResult(officialResult)) {
    return null;
  }

  const prisma = getPrisma();
  const existing = await prisma.raceBetAdvice.findUnique({
    where: { raceId: raceUuid },
  });
  if (!existing) return null;

  const hits = evaluateAllBetHits(officialResult.placements, {
    honmeiLane: existing.honmeiLane,
    honmeiTrifectaCombo: existing.honmeiTrifectaCombo,
    formationJson: existing.formationJson,
    boxJson: existing.boxJson,
    anaCombo: existing.anaCombo,
  });

  return prisma.raceBetAdvice.update({
    where: { raceId: raceUuid },
    data: {
      resultStatus: 'settled',
      resultSettledAt: new Date(),
      resultCombo: hits.resultCombo,
      winnerLane: hits.winnerLane,
      hitHonmeiWin: hits.hitHonmeiWin,
      hitHonmeiTrifecta: hits.hitHonmeiTrifecta,
      hitFormation: hits.hitFormation,
      hitBox: hits.hitBox,
      hitAna: hits.hitAna,
    },
  });
}

/**
 * Live 保存後: 公式結果があれば outcome 更新
 * @param {object} race
 * @param {string} raceUuid
 */
export async function afterRacePersisted(race, raceUuid) {
  if (!isPersistenceEnabled()) return;
  if (isRealOfficialResult(race.officialResult)) {
    await settleBetAdviceForRace(raceUuid, race.officialResult);
  }
}

export function buildBetAdviceFromMemory(race) {
  const prediction = buildRacePrediction(race);
  const decision = buildRaceBetDecision(prediction, race);
  if (!prediction.available) {
    return { available: false, reason: prediction.reason ?? 'no_prediction' };
  }
  return {
    available: true,
    verdict: decision.verdict,
    verdictLabel: decision.verdictLabel,
    verdictSubtitle: decision.verdictSubtitle,
    stakePlan: decision.stakePlan,
    stakeDisclaimer: decision.stakeDisclaimer,
    verdictReasons: decision.verdictReasons,
    evHonmei: decision.evHonmei,
    hasEdge: decision.hasEdge,
    betScore: decision.betScore,
    skipScore: decision.skipScore,
  };
}
