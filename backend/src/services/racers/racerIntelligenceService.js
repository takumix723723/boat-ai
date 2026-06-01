import { getPrisma } from '../../db/client.js';
import { getMockRaces } from '../../data/mockRaces.js';
import { applyAiScoresToRace } from '../aiScore.js';
import { isRealOfficialResult } from '../results/officialResultPolicy.js';

const MIN_SAMPLES = 3;
const RECENT_LIMIT = 5;

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function parsePlacements(officialResult) {
  if (!isRealOfficialResult(officialResult)) return [];
  return officialResult.placements;
}

function computeConfidence(sampleCount) {
  if (sampleCount < MIN_SAMPLES) {
    return {
      level: 'insufficient',
      score: Math.min(sampleCount / MIN_SAMPLES, 0.33),
      insufficientData: true,
      message: `サンプル不足（${sampleCount}レース）。${MIN_SAMPLES}レース以上で信頼度向上。`,
    };
  }
  if (sampleCount < 8) {
    return {
      level: 'low',
      score: 0.45,
      insufficientData: false,
      message: '参考程度（データ少なめ）',
    };
  }
  if (sampleCount < 20) {
    return {
      level: 'medium',
      score: 0.72,
      insufficientData: false,
      message: '一定の信頼性あり',
    };
  }
  return {
    level: 'high',
    score: 0.92,
    insufficientData: false,
    message: '十分なサンプル数',
  };
}

function stdDev(values) {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : null;
}

/**
 * @param {object[]} participations
 */
export function buildIntelligenceTags(metrics, participations) {
  const tags = [];

  if (metrics.innerWinRate != null && metrics.innerWinRate >= 25 && metrics.innerLaneStarts >= 2) {
    tags.push({ id: 'inner_strong', label: 'イン強い', tone: 'positive' });
  }
  if (metrics.avgSt != null && metrics.stStdDev != null && metrics.stStdDev <= 0.06) {
    tags.push({ id: 'st_stable', label: 'ST安定', tone: 'positive' });
  }
  if (metrics.aiTop1HitRate != null && metrics.aiTop1HitRate >= 35) {
    tags.push({ id: 'ai_affinity', label: 'AI相性良', tone: 'positive' });
  }
  if (metrics.aiTop1HitRate != null && metrics.aiTop1HitRate <= 10 && metrics.sampleCount >= 5) {
    tags.push({ id: 'ai_mismatch', label: 'AI要注意', tone: 'warn' });
  }

  const recent = participations.slice(0, 3);
  if (recent.length >= 2) {
    const avgRecent =
      recent.reduce((s, p) => s + (p.place ?? 6), 0) / recent.length;
    if (avgRecent <= 2.2) {
      tags.push({ id: 'recent_hot', label: '最近好調', tone: 'positive' });
    } else if (avgRecent >= 4.5) {
      tags.push({ id: 'recent_cold', label: '最近苦戦', tone: 'muted' });
    }
  }

  return tags.slice(0, 4);
}

/**
 * @param {string} racerId
 */
async function loadParticipationsFromDb(racerId) {
  const prisma = getPrisma();
  const racer = await prisma.racer.findUnique({ where: { id: racerId } });

  const aiRows = await prisma.aiScore.findMany({
    where: { raceEntry: { racerId } },
    include: {
      raceEntry: {
        select: {
          lane: true,
          raceId: true,
          race: {
            select: {
              externalId: true,
              venueName: true,
              raceNo: true,
              raceDate: true,
              officialResult: true,
            },
          },
        },
      },
      snapshot: {
        select: { id: true, capturedAt: true, sequence: true },
      },
    },
    orderBy: [{ snapshot: { capturedAt: 'desc' } }, { snapshot: { sequence: 'desc' } }],
  });

  const snapshotRankCache = new Map();

  const participations = [];

  for (const row of aiRows) {
    const race = row.raceEntry.race;
    const lane = row.raceEntry.lane;
    const snapId = row.snapshot.id;

    let rankByLane = snapshotRankCache.get(snapId);
    if (!rankByLane) {
      const siblings = await prisma.aiScore.findMany({
        where: {
          snapshotId: snapId,
          raceEntry: { raceId: row.raceEntry.raceId },
        },
        include: { raceEntry: { select: { lane: true } } },
      });
      const sorted = [...siblings].sort((a, b) => b.total - a.total);
      rankByLane = new Map(sorted.map((s, i) => [s.raceEntry.lane, i + 1]));
      snapshotRankCache.set(snapId, rankByLane);
    }

    const placements = parsePlacements(race.officialResult);
    const placement = placements.find((p) => p.lane === lane);
    const place = placement?.place ?? null;
    const st = row.st != null ? Number(row.st) : null;

    participations.push({
      raceExternalId: race.externalId,
      venueName: race.venueName,
      raceNo: race.raceNo,
      capturedAt: row.snapshot.capturedAt.toISOString(),
      lane,
      place,
      st,
      aiTotal: row.total,
      aiRank: rankByLane.get(lane) ?? null,
      aiTop1: rankByLane.get(lane) === 1,
      aiTop3: (rankByLane.get(lane) ?? 99) <= 3,
      won: place === 1,
      placed: place != null && place <= 2,
      inTop3: place != null && place <= 3,
    });
  }

  return { racer, participations };
}

/**
 * メモリ（モック）から集計
 * @param {string} racerId
 */
function loadParticipationsFromMemory(racerId) {
  const races = getMockRaces().map(applyAiScoresToRace);
  const participations = [];
  let racer = null;

  for (const race of races) {
    const entry = race.entries?.find((e) => e.racerId === racerId);
    if (!entry) continue;
    if (!racer) {
      racer = { id: racerId, name: entry.name, rank: entry.rank, branch: entry.branch };
    }

    const placements = race.officialResult?.placements ?? [];
    const placement = placements.find((p) => p.lane === entry.lane);
    const place = placement?.place ?? null;

    const ranked = [...race.entries]
      .filter((e) => e.aiScore?.total != null)
      .sort((a, b) => (b.aiScore?.total ?? 0) - (a.aiScore?.total ?? 0));
    const aiRank = ranked.findIndex((e) => e.lane === entry.lane) + 1;

    participations.push({
      raceExternalId: race.id,
      venueName: race.venueName,
      raceNo: race.raceNo,
      capturedAt: race.officialResult?.fetchedAt ?? new Date().toISOString(),
      lane: entry.lane,
      place,
      st: entry.st,
      aiTotal: entry.aiScore?.total ?? null,
      aiRank: aiRank || null,
      aiTop1: aiRank === 1,
      aiTop3: aiRank > 0 && aiRank <= 3,
      won: place === 1,
      placed: place != null && place <= 2,
      inTop3: place != null && place <= 3,
    });
  }

  participations.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  return { racer, participations };
}

function aggregateParticipations(racer, participations, source) {
  const racerId = racer?.id ?? null;
  const withResult = participations.filter((p) => p.place != null);
  const sampleCount = withResult.length;

  const stValues = participations.map((p) => p.st).filter((v) => v != null);
  const avgSt =
    stValues.length > 0
      ? Math.round((stValues.reduce((a, b) => a + b, 0) / stValues.length) * 1000) / 1000
      : null;

  const wins = withResult.filter((p) => p.won).length;
  const placed = withResult.filter((p) => p.placed).length;

  const byLane = {};
  for (let lane = 1; lane <= 6; lane++) {
    const rows = withResult.filter((p) => p.lane === lane);
    const laneWins = rows.filter((p) => p.won).length;
    byLane[lane] = {
      lane,
      starts: rows.length,
      wins: laneWins,
      winRate: pct(laneWins, rows.length),
    };
  }

  const innerStarts = withResult.filter((p) => p.lane === 1).length;
  const innerWins = withResult.filter((p) => p.lane === 1 && p.won).length;

  const aiRated = participations.filter((p) => p.aiRank != null);
  const aiTop1Hits = aiRated.filter((p) => p.aiTop1 && p.won).length;
  const aiTop3Hits = aiRated.filter((p) => p.aiTop3 && p.inTop3).length;

  const metrics = {
    sampleCount,
    avgSt,
    stStdDev: stdDev(stValues),
    winRate: pct(wins, sampleCount),
    placeRate: pct(placed, sampleCount),
    innerWinRate: pct(innerWins, innerStarts),
    innerLaneStarts: innerStarts,
    aiTop1HitRate: pct(aiTop1Hits, aiRated.length),
    aiTop3HitRate: pct(aiTop3Hits, aiRated.length),
    aiRatedRaces: aiRated.length,
    byLane: Object.values(byLane),
  };

  const confidence = computeConfidence(sampleCount);
  const tags = buildIntelligenceTags(metrics, withResult);
  const recentForm = withResult.slice(0, RECENT_LIMIT).map((p) => ({
    raceExternalId: p.raceExternalId,
    venueName: p.venueName,
    raceNo: p.raceNo,
    lane: p.lane,
    place: p.place,
    aiRank: p.aiRank,
    capturedAt: p.capturedAt,
  }));

  let recentTrend = null;
  if (recentForm.length >= 2) {
    const avgPlace =
      recentForm.reduce((s, p) => s + p.place, 0) / recentForm.length;
    recentTrend = {
      label: avgPlace <= 2.5 ? '好調' : avgPlace >= 4 ? '苦戦' : '普通',
      avgPlace: Math.round(avgPlace * 10) / 10,
      races: recentForm.length,
    };
  }

  return {
    racerId,
    source,
    profile: racer
      ? {
          racerId: racer.id,
          name: racer.name,
          rank: racer.rank ?? null,
          branch: racer.branch ?? null,
        }
      : { racerId, name: null, rank: null, branch: null },
    intelligence: {
      metrics,
      confidence,
      insufficientData: confidence.insufficientData,
      tags,
      recentForm,
      recentTrend,
      innerTrust: {
        label:
          metrics.innerWinRate != null && metrics.innerWinRate >= 20
            ? 'イン信頼'
            : metrics.innerWinRate != null && metrics.innerWinRate >= 10
              ? 'イン普通'
              : 'イン注意',
        innerWinRate: metrics.innerWinRate,
        innerLaneStarts: metrics.innerLaneStarts,
      },
      aiCompatibility: {
        label:
          metrics.aiTop1HitRate != null && metrics.aiTop1HitRate >= 30
            ? 'AIと相性良'
            : metrics.aiTop1HitRate != null && metrics.aiTop1HitRate <= 12
              ? 'AIと相性弱'
              : 'AI参考程度',
        aiTop1HitRate: metrics.aiTop1HitRate,
        aiTop3HitRate: metrics.aiTop3HitRate,
      },
    },
  };
}

/**
 * @param {string} racerId
 */
export async function getRacerIntelligence(racerId) {
  const id = String(racerId).trim();
  if (!id) {
    return { error: 'Invalid racerId', racerId: id };
  }

  try {
    if (isDatabaseConfigured()) {
      const { racer, participations } = await loadParticipationsFromDb(id);
      if (!participations.length) {
        const mem = loadParticipationsFromMemory(id);
        if (mem.participations.length) {
          return aggregateParticipations(mem.racer, mem.participations, 'memory_mock');
        }
        return {
          racerId: id,
          source: 'none',
          profile: racer
            ? {
                racerId: racer.id,
                name: racer.name,
                rank: racer.rank,
                branch: racer.branch,
              }
            : { racerId: id, name: null, rank: null, branch: null },
          intelligence: null,
          insufficientData: true,
          message: 'この選手の保存データがまだありません。',
        };
      }
      return aggregateParticipations(racer, participations, 'database');
    }

    const mem = loadParticipationsFromMemory(id);
    if (!mem.participations.length) {
      return {
        racerId: id,
        source: 'none',
        profile: { racerId: id, name: null, rank: null, branch: null },
        intelligence: null,
        insufficientData: true,
        message: '選手データが見つかりません。',
      };
    }
    return aggregateParticipations(mem.racer, mem.participations, 'memory_mock');
  } catch (err) {
    console.error('[racerIntelligence] failed', { racerId: id, message: err.message });
    return {
      racerId: id,
      source: 'error',
      profile: { racerId: id, name: null, rank: null, branch: null },
      intelligence: null,
      insufficientData: true,
      message: '選手カルテの取得に失敗しました。',
    };
  }
}
