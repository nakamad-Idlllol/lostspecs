export const POPULAR_ENTRY_LIMIT = 4;

export function selectFallbackPopularEntries(entries, limit = POPULAR_ENTRY_LIMIT) {
  const ranked = [...entries]
    .map((entry) => ({
      entry,
      score: getFallbackPopularityScore(entry)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.entry.id !== a.entry.id) return b.entry.id - a.entry.id;
      return a.entry.itemTitle.localeCompare(b.entry.itemTitle, "ja");
    });

  const selected = [];
  const seenWorks = new Set();

  ranked.forEach(({ entry }) => {
    if (selected.length >= limit) return;
    if (seenWorks.has(entry.work)) return;
    selected.push({ entry, score: getFallbackPopularityScore(entry) });
    seenWorks.add(entry.work);
  });

  if (selected.length < limit) {
    ranked.forEach(({ entry, score }) => {
      if (selected.length >= limit) return;
      if (selected.some((item) => item.entry.id === entry.id)) return;
      selected.push({ entry, score });
    });
  }

  return selected;
}

function getFallbackPopularityScore(entry) {
  let score = 0;

  score += Math.min(entry.sources.length, 3) * 3;
  score += Math.min(entry.timeline.length, 4) * 2;
  score += Math.min(Math.floor((entry.overview || "").length / 80), 3);

  if (entry.judgement === "未回収") score += 4;
  if (entry.judgement === "制作事情") score += 3;
  if (entry.judgement === "外部補足") score += 2;
  if (entry.judgement === "要判断") score += 1;

  if (entry.tags.includes("外部説明あり")) score += 2;
  if (entry.division === "人物" || entry.division === "エピソード") score += 1;
  if (entry.status.includes("未回収")) score += 1;

  return score;
}
