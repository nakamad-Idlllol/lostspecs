import fs from "node:fs";
import path from "node:path";
import { enrichEntry } from "../assets/js/entry-taxonomy.mjs";
import {
  buildEntryPagePath,
  selectFallbackPopularEntries,
  selectPopularEntriesFromMetrics
} from "../assets/js/popularity.mjs";

const ENTRIES_PATH = path.resolve(process.cwd(), "entries.json");
const OUTPUT_PATH = path.resolve(process.cwd(), "popular-entries.json");

function readEntries() {
  return JSON.parse(fs.readFileSync(ENTRIES_PATH, "utf8")).map((entry) => enrichEntry(entry));
}

function buildFallbackPayload(entries, reason) {
  const items = selectFallbackPopularEntries(entries).map(({ entry, score }) => ({
    id: entry.id,
    path: buildEntryPagePath(entry.id),
    pageviews: 0,
    visitors: 0,
    visits: 0,
    totaltime: 0,
    score
  }));

  return {
    source: "fallback",
    reason,
    generatedAt: new Date().toISOString(),
    windowDays: null,
    items
  };
}

async function fetchPopularRows() {
  const websiteId = process.env.UMAMI_WEBSITE_ID?.trim();
  const apiKey = process.env.UMAMI_API_KEY?.trim();
  const apiUrl = (process.env.UMAMI_API_URL?.trim() || "https://api.umami.is").replace(/\/+$/, "");
  const windowDays = Number(process.env.UMAMI_POPULAR_DAYS || 90);

  if (!websiteId || !apiKey) {
    return {
      rows: null,
      windowDays,
      reason: "UMAMI_WEBSITE_ID または UMAMI_API_KEY が未設定"
    };
  }

  const endAt = Date.now();
  const startAt = endAt - windowDays * 24 * 60 * 60 * 1000;
  const url = new URL(`${apiUrl}/v1/websites/${websiteId}/metrics`);
  url.searchParams.set("type", "url");
  url.searchParams.set("startAt", String(startAt));
  url.searchParams.set("endAt", String(endAt));
  url.searchParams.set("limit", "50");

  const response = await fetch(url, {
    headers: {
      "x-umami-api-key": apiKey,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Umami API request failed: HTTP ${response.status}`);
  }

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

  return {
    rows,
    windowDays,
    reason: null
  };
}

async function main() {
  const entries = readEntries();

  try {
    const { rows, windowDays, reason } = await fetchPopularRows();

    if (!rows || !rows.length) {
      const payload = buildFallbackPayload(entries, reason || "人気ページの計測データがまだありません");
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
      console.log(`[popular] wrote fallback ${path.relative(process.cwd(), OUTPUT_PATH)}`);
      return;
    }

    const selected = selectPopularEntriesFromMetrics(entries, rows);
    const payload = {
      source: selected.length ? "umami" : "fallback",
      reason: selected.length ? null : "記事ページの人気データがまだありません",
      generatedAt: new Date().toISOString(),
      windowDays,
      items: (selected.length
        ? selected.map(({ entry, metrics, score }) => ({
            id: entry.id,
            path: metrics.path,
            pageviews: metrics.pageviews,
            visitors: metrics.visitors,
            visits: metrics.visits,
            totaltime: metrics.totaltime,
            score
          }))
        : buildFallbackPayload(entries, "記事ページの人気データがまだありません").items)
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
    console.log(`[popular] wrote ${path.relative(process.cwd(), OUTPUT_PATH)} (${payload.source})`);
  } catch (error) {
    const payload = buildFallbackPayload(entries, error instanceof Error ? error.message : String(error));
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
    console.log(`[popular] wrote fallback ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  }
}

await main();
