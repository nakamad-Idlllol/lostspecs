export const POPULAR_ENTRY_LIMIT = 4;

export function buildEntryPagePath(id) {
  return `/term/${encodeURIComponent(String(id))}`;
}

function parseEntryIdFromPath(path) {
  const value = String(path || "");
  const directMatch = value.match(/\/term\/(\d+)(?:\/)?$/);
  if (directMatch) return Number(directMatch[1]);

  const legacyMatch = value.match(/term\.html\?id=(\d+)/);
  if (legacyMatch) return Number(legacyMatch[1]);

  return null;
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

function scoreMetricRow(row) {
  const pageviews = Number(row?.pageviews || 0);
  const visitors = Number(row?.visitors || 0);
  const visits = Number(row?.visits || 0);
  const totaltime = Number(row?.totaltime || 0);

  return visitors * 10 + visits * 6 + pageviews * 2 + Math.min(Math.round(totaltime / 1000 / 30), 20);
}

export function selectPopularEntriesFromMetrics(entries, rows, limit = POPULAR_ENTRY_LIMIT) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  const ranked = rows
    .map((row) => {
      const id = parseEntryIdFromPath(row?.name || row?.x || "");
      const entry = id ? byId.get(id) : null;
      if (!entry) return null;

      return {
        entry,
        metrics: {
          path: row?.name || row?.x || buildEntryPagePath(entry.id),
          pageviews: Number(row?.pageviews || 0),
          visitors: Number(row?.visitors || 0),
          visits: Number(row?.visits || 0),
          bounces: Number(row?.bounces || 0),
          totaltime: Number(row?.totaltime || 0)
        },
        score: scoreMetricRow(row)
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.metrics.visitors !== a.metrics.visitors) return b.metrics.visitors - a.metrics.visitors;
      if (b.metrics.pageviews !== a.metrics.pageviews) return b.metrics.pageviews - a.metrics.pageviews;
      return b.entry.id - a.entry.id;
    });

  return ranked.slice(0, limit);
}
