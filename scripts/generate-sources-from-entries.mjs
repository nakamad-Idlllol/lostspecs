import fs from "node:fs";
import path from "node:path";

const ENTRIES_PATH = path.resolve(process.cwd(), "entries.json");
const OUTPUT_PATH = path.resolve(process.cwd(), "sources.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function classifySource(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes("pokemon.co.jp") || host.includes("digimon.net") || host.includes("shonenjump")) {
    return { sourceType: "official", priority: 1 };
  }
  if (
    host.includes("bulbapedia") ||
    host.includes("wikimon") ||
    host.includes("jojowiki.com") ||
    host.includes("fandom.com")
  ) {
    return { sourceType: "fan-wiki", priority: 2 };
  }
  return { sourceType: "secondary", priority: 3 };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildSources(entries) {
  const byUrl = new Map();

  for (const entry of entries) {
    for (const source of entry.sources ?? []) {
      if (!source?.url) continue;
      const key = source.url;
      const current = byUrl.get(key) ?? {
        id: `src-${slugify(source.url)}`,
        label: source.label ?? source.url,
        url: source.url,
        enabled: true,
        workRefs: new Set(),
        entryRefs: new Set(),
        sourceType: "secondary",
        priority: 3,
        notes: ""
      };

      current.workRefs.add(entry.work);
      current.entryRefs.add(entry.id);

      const classified = classifySource(source.url);
      if (classified.priority < current.priority) {
        current.priority = classified.priority;
        current.sourceType = classified.sourceType;
      }

      byUrl.set(key, current);
    }
  }

  const items = [...byUrl.values()]
    .map((item) => ({
      id: item.id,
      label: item.label,
      url: item.url,
      sourceType: item.sourceType,
      priority: item.priority,
      enabled: item.enabled,
      workRefs: [...item.workRefs].sort(),
      entryRefs: [...item.entryRefs].sort(),
      notes: item.notes
    }))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id, "ja"));

  return {
    schemaVersion: 1,
    updatedAt: todayLocal(),
    items
  };
}

function main() {
  const entries = readJson(ENTRIES_PATH);
  if (!Array.isArray(entries)) {
    throw new Error("entries.json は配列である必要があります");
  }

  const sources = buildSources(entries);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sources, null, 2) + "\n", "utf8");
  console.log(`[OK] generated sources.json (${sources.items.length} items)`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
