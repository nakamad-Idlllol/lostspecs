import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadTagCatalog, normalizeTags } from "./tag-catalog.mjs";

export const CONTENT_DB_PATH = path.resolve(process.cwd(), "data", "content.sqlite");
export const ENTRIES_PATH = path.resolve(process.cwd(), "entries.json");
export const SOURCES_PATH = path.resolve(process.cwd(), "sources.json");
export const SITE_META_FILES = [
  path.resolve(process.cwd(), "assets", "js", "data.js"),
  path.resolve(process.cwd(), "app.js")
];

function nowIso() {
  return new Date().toISOString();
}

export function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function slugifySourceId(value) {
  return `src-${String(value)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)}`;
}

export function classifySource(url) {
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

export function openContentDatabase(filePath = CONTENT_DB_PATH) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec("PRAGMA foreign_keys = ON;");
  ensureContentSchema(db);
  return db;
}

export function ensureContentSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY,
      work TEXT NOT NULL,
      medium TEXT NOT NULL,
      item_title TEXT NOT NULL,
      status TEXT NOT NULL,
      first_appearance TEXT NOT NULL,
      overview TEXT NOT NULL,
      depiction TEXT NOT NULL,
      unresolved_points TEXT NOT NULL,
      reception TEXT NOT NULL,
      external_context TEXT NOT NULL,
      interpretation TEXT NOT NULL,
      future_possibility TEXT NOT NULL,
      discussion_points TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      group_key TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entry_tags (
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (entry_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS timelines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      detail TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      source_type TEXT NOT NULL,
      priority INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entry_sources (
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (entry_id, source_id)
    );

    CREATE INDEX IF NOT EXISTS idx_entries_medium ON entries(medium);
    CREATE INDEX IF NOT EXISTS idx_entries_work ON entries(work);
    CREATE INDEX IF NOT EXISTS idx_tags_group_key ON tags(group_key);
    CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id ON entry_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_timelines_entry_id ON timelines(entry_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_sources_priority ON sources(priority, id);
    CREATE INDEX IF NOT EXISTS idx_entry_sources_source_id ON entry_sources(source_id);
  `);

  db.prepare(`
    INSERT INTO content_meta(key, value)
    VALUES ('schema_version', '1')
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run();
}

export function closeContentDatabase(db) {
  db.close();
}

export function withTransaction(db, fn) {
  db.exec("BEGIN IMMEDIATE;");
  try {
    const result = fn();
    db.exec("COMMIT;");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK;");
    } catch {
      // ignore rollback failures
    }
    throw error;
  }
}

export function hasSeedContent(db) {
  const row = db.prepare("SELECT COUNT(*) AS count FROM entries").get();
  return Number(row?.count ?? 0) > 0;
}

function getTagIdMap(db) {
  return new Map(db.prepare("SELECT id, name FROM tags").all().map((row) => [row.name, row.id]));
}

export function syncTagsFromCatalog(db, catalog = loadTagCatalog()) {
  const upsert = db.prepare(`
    INSERT INTO tags(name, group_key)
    VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET group_key = excluded.group_key
  `);

  withTransaction(db, () => {
    for (const group of catalog.groups ?? []) {
      for (const tag of group.tags ?? []) {
        upsert.run(tag, group.key);
      }
    }
  });
}

function clearContentTables(db) {
  db.exec(`
    DELETE FROM entry_sources;
    DELETE FROM timelines;
    DELETE FROM entry_tags;
    DELETE FROM entries;
    DELETE FROM sources;
  `);
}

function normalizeSourceRoot(sourceRoot) {
  if (!sourceRoot || typeof sourceRoot !== "object" || !Array.isArray(sourceRoot.items)) {
    return { schemaVersion: 1, updatedAt: todayLocal(), items: [] };
  }
  return sourceRoot;
}

export function replaceContentFromData(db, { entries, sourceRoot }) {
  if (!Array.isArray(entries)) {
    throw new Error("entries は配列である必要があります");
  }

  const normalizedSourceRoot = normalizeSourceRoot(sourceRoot);
  const catalog = loadTagCatalog();
  syncTagsFromCatalog(db, catalog);

  const tagIdMap = getTagIdMap(db);
  const now = nowIso();
  const normalizedSourceMap = new Map();

  for (const item of normalizedSourceRoot.items) {
    if (typeof item?.url !== "string" || !item.url) continue;
    normalizedSourceMap.set(item.url, {
      id: item.id || slugifySourceId(item.url),
      label: item.label || item.url,
      url: item.url,
      sourceType: item.sourceType || classifySource(item.url).sourceType,
      priority: item.priority ?? classifySource(item.url).priority,
      enabled: item.enabled === false ? 0 : 1,
      notes: item.notes ?? "",
      entryRefs: Array.isArray(item.entryRefs) ? item.entryRefs : []
    });
  }

  const insertEntry = db.prepare(`
    INSERT INTO entries(
      id, work, medium, item_title, status, first_appearance,
      overview, depiction, unresolved_points, reception, external_context,
      interpretation, future_possibility, discussion_points, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEntryTag = db.prepare(`
    INSERT INTO entry_tags(entry_id, tag_id, sort_order)
    VALUES (?, ?, ?)
  `);
  const insertTimeline = db.prepare(`
    INSERT INTO timelines(entry_id, label, detail, sort_order)
    VALUES (?, ?, ?, ?)
  `);
  const insertSource = db.prepare(`
    INSERT INTO sources(id, label, url, source_type, priority, enabled, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEntrySource = db.prepare(`
    INSERT INTO entry_sources(entry_id, source_id, sort_order)
    VALUES (?, ?, ?)
  `);

  withTransaction(db, () => {
    clearContentTables(db);

    for (const source of normalizedSourceMap.values()) {
      insertSource.run(
        source.id,
        source.label,
        source.url,
        source.sourceType,
        source.priority,
        source.enabled,
        source.notes,
        now,
        now
      );
    }

    const linkTracker = new Set();
    const nextSourceSort = new Map();

    for (const entry of [...entries].sort((a, b) => Number(a.id) - Number(b.id))) {
      insertEntry.run(
        entry.id,
        entry.work,
        entry.medium,
        entry.itemTitle,
        entry.status,
        entry.firstAppearance,
        entry.overview,
        entry.depiction,
        entry.unresolvedPoints,
        entry.reception,
        entry.externalContext,
        entry.interpretation,
        entry.futurePossibility,
        entry.discussionPoints,
        now,
        now
      );

      const tags = normalizeTags(entry.tags, catalog);
      tags.forEach((tag, index) => {
        const tagId = tagIdMap.get(tag);
        if (!tagId) {
          throw new Error(`未登録タグです: ${tag}`);
        }
        insertEntryTag.run(entry.id, tagId, index);
      });

      (entry.timeline ?? []).forEach((item, index) => {
        insertTimeline.run(entry.id, item.label, item.detail, index);
      });

      let sortOrder = 0;
      for (const source of entry.sources ?? []) {
        if (typeof source?.url !== "string" || !source.url) continue;

        let sourceRow = normalizedSourceMap.get(source.url);
        if (!sourceRow) {
          const classified = classifySource(source.url);
          sourceRow = {
            id: slugifySourceId(source.url),
            label: source.label || source.url,
            url: source.url,
            sourceType: classified.sourceType,
            priority: classified.priority,
            enabled: 1,
            notes: "",
            entryRefs: []
          };
          normalizedSourceMap.set(source.url, sourceRow);
          insertSource.run(
            sourceRow.id,
            sourceRow.label,
            sourceRow.url,
            sourceRow.sourceType,
            sourceRow.priority,
            sourceRow.enabled,
            sourceRow.notes,
            now,
            now
          );
        }

        const linkKey = `${entry.id}:${sourceRow.id}`;
        if (!linkTracker.has(linkKey)) {
          insertEntrySource.run(entry.id, sourceRow.id, sortOrder);
          linkTracker.add(linkKey);
        }
        sortOrder += 1;
      }

      nextSourceSort.set(entry.id, sortOrder);
    }

    for (const source of normalizedSourceMap.values()) {
      for (const entryId of source.entryRefs ?? []) {
        const linkKey = `${entryId}:${source.id}`;
        if (linkTracker.has(linkKey)) continue;
        const entryExists = db.prepare("SELECT 1 AS ok FROM entries WHERE id = ?").get(entryId);
        if (!entryExists) continue;

        const sortOrder = nextSourceSort.get(entryId) ?? 0;
        insertEntrySource.run(entryId, source.id, sortOrder);
        nextSourceSort.set(entryId, sortOrder + 1);
        linkTracker.add(linkKey);
      }
    }

    db.prepare(`
      INSERT INTO content_meta(key, value)
      VALUES ('last_imported_at', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(now);
  });
}

export function ensureContentSeededFromJson(db, options = {}) {
  const {
    entriesPath = ENTRIES_PATH,
    sourcesPath = SOURCES_PATH,
    force = false
  } = options;

  if (!force && hasSeedContent(db)) return false;

  const entries = readJson(entriesPath);
  const sourceRoot = readJson(sourcesPath);
  replaceContentFromData(db, { entries, sourceRoot });
  return true;
}

export function exportEntriesFromDb(db) {
  const entries = db.prepare(`
    SELECT
      id, work, medium, item_title, status, first_appearance,
      overview, depiction, unresolved_points, reception, external_context,
      interpretation, future_possibility, discussion_points
    FROM entries
    ORDER BY id
  `).all();

  const tagsStmt = db.prepare(`
    SELECT t.name
    FROM entry_tags et
    JOIN tags t ON t.id = et.tag_id
    WHERE et.entry_id = ?
    ORDER BY et.sort_order, t.name
  `);
  const timelinesStmt = db.prepare(`
    SELECT label, detail
    FROM timelines
    WHERE entry_id = ?
    ORDER BY sort_order, id
  `);
  const sourcesStmt = db.prepare(`
    SELECT s.label, s.url
    FROM entry_sources es
    JOIN sources s ON s.id = es.source_id
    WHERE es.entry_id = ?
    ORDER BY es.sort_order, s.id
  `);

  return entries.map((entry) => ({
    id: entry.id,
    work: entry.work,
    medium: entry.medium,
    itemTitle: entry.item_title,
    status: entry.status,
    tags: tagsStmt.all(entry.id).map((row) => row.name),
    firstAppearance: entry.first_appearance,
    overview: entry.overview,
    depiction: entry.depiction,
    unresolvedPoints: entry.unresolved_points,
    reception: entry.reception,
    externalContext: entry.external_context,
    interpretation: entry.interpretation,
    futurePossibility: entry.future_possibility,
    discussionPoints: entry.discussion_points,
    timeline: timelinesStmt.all(entry.id).map((row) => ({
      label: row.label,
      detail: row.detail
    })),
    sources: sourcesStmt.all(entry.id).map((row) => ({
      label: row.label,
      url: row.url
    }))
  }));
}

export function exportSourcesFromDb(db) {
  const items = db.prepare(`
    SELECT id, label, url, source_type, priority, enabled, notes
    FROM sources
    ORDER BY priority, id
  `).all();

  const refsStmt = db.prepare(`
    SELECT es.entry_id, e.work
    FROM entry_sources es
    JOIN entries e ON e.id = es.entry_id
    WHERE es.source_id = ?
    ORDER BY es.entry_id, es.sort_order
  `);

  return {
    schemaVersion: 1,
    updatedAt: todayLocal(),
    items: items.map((item) => {
      const refs = refsStmt.all(item.id);
      const workRefs = [...new Set(refs.map((row) => row.work))].sort((a, b) => a.localeCompare(b, "ja"));

      return {
        id: item.id,
        label: item.label,
        url: item.url,
        sourceType: item.source_type,
        priority: item.priority,
        enabled: Boolean(item.enabled),
        workRefs,
        entryRefs: refs.map((row) => row.entry_id),
        notes: item.notes
      };
    })
  };
}

export function updateSiteMetaFiles(updatedAt = todayLocal(), filePaths = SITE_META_FILES) {
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) continue;
    const source = fs.readFileSync(filePath, "utf8");
    const next = source.replace(/updatedAt:\s*"[^"]+"/, `updatedAt: "${updatedAt}"`);
    if (next !== source) {
      fs.writeFileSync(filePath, next, "utf8");
    }
  }
}

export function exportPublicJsonFromDb(db, options = {}) {
  const {
    entriesPath = ENTRIES_PATH,
    sourcesPath = SOURCES_PATH,
    updateSiteMeta = true
  } = options;

  const entries = exportEntriesFromDb(db);
  const sources = exportSourcesFromDb(db);

  writeJson(entriesPath, entries);
  writeJson(sourcesPath, sources);
  if (updateSiteMeta) {
    updateSiteMetaFiles(sources.updatedAt);
  }

  db.prepare(`
    INSERT INTO content_meta(key, value)
    VALUES ('last_exported_at', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(nowIso());

  return { entries, sources };
}
