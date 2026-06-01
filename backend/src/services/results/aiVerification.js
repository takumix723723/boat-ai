/**
 * AI予想 vs 実結果の簡易比較
 * @param {object[]} entries - aiScore 付きエントリ
 * @param {object[]} placements - { place, lane, name, ... }
 */
export function buildAiVerification(entries, placements) {
  if (!placements?.length || !entries?.length) return null;

  const placeByLane = new Map(placements.map((p) => [p.lane, p.place]));
  const ranked = [...entries]
    .filter((e) => e.aiScore?.total != null)
    .sort((a, b) => (b.aiScore?.total ?? 0) - (a.aiScore?.total ?? 0));

  if (!ranked.length) return null;

  const topAi = ranked[0];
  const winner = placements.find((p) => p.place === 1);
  const top3AiLanes = ranked.slice(0, 3).map((e) => e.lane);
  const actualTop3 = placements.filter((p) => p.place <= 3).map((p) => p.lane);
  const top3HitCount = top3AiLanes.filter((l) => actualTop3.includes(l)).length;

  const comparisons = ranked.map((e, idx) => ({
    aiRank: idx + 1,
    lane: e.lane,
    name: e.name,
    aiTotal: e.aiScore?.total ?? null,
    actualPlace: placeByLane.get(e.lane) ?? null,
    hitWin: placeByLane.get(e.lane) === 1,
    inActualTop3: (placeByLane.get(e.lane) ?? 99) <= 3,
  }));

  const topAiGotWin = topAi?.lane != null && topAi.lane === winner?.lane;
  const winnerInAiTop3 =
    winner?.lane != null && top3AiLanes.includes(winner.lane);

  return {
    topAiLane: topAi?.lane ?? null,
    topAiTotal: topAi?.aiScore?.total ?? null,
    winnerLane: winner?.lane ?? null,
    topAiGotWin,
    winnerInAiTop3,
    top3HitCount,
    comparisons,
    summary:
      topAi && winner
        ? `AI1位は${topAi.lane}号艇（${topAi.aiScore.total}点）→ 実際${winner.lane}号艇が1着${topAiGotWin ? '（的中）' : ''}`
        : null,
  };
}
