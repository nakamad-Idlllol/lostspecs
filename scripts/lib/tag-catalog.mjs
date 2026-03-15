import fs from "node:fs";
import path from "node:path";

const TAG_CATALOG_PATH = path.resolve(process.cwd(), "tag-catalog.json");

let cachedCatalog = null;

export function loadTagCatalog() {
  if (cachedCatalog) return cachedCatalog;

  const raw = JSON.parse(fs.readFileSync(TAG_CATALOG_PATH, "utf8"));
  const groups = Array.isArray(raw.groups) ? raw.groups : [];
  const aliases = raw.aliases && typeof raw.aliases === "object" ? raw.aliases : {};

  const groupMap = new Map();
  const canonicalTags = new Set();
  const tagToGroup = new Map();

  for (const group of groups) {
    const tags = Array.isArray(group?.tags) ? group.tags.filter((tag) => typeof tag === "string" && tag.trim()) : [];
    groupMap.set(group.key, tags);
    for (const tag of tags) {
      canonicalTags.add(tag);
      tagToGroup.set(tag, group.key);
    }
  }

  cachedCatalog = {
    version: raw.version ?? 1,
    groups,
    aliases,
    groupMap,
    canonicalTags,
    tagToGroup
  };

  return cachedCatalog;
}

export function normalizeTag(tag, catalog = loadTagCatalog()) {
  if (typeof tag !== "string") return null;
  const trimmed = tag.trim();
  if (!trimmed) return null;
  return catalog.aliases[trimmed] ?? trimmed;
}

export function normalizeTags(tags, catalog = loadTagCatalog()) {
  const normalized = [];
  const seen = new Set();

  for (const tag of Array.isArray(tags) ? tags : []) {
    const canonical = normalizeTag(tag, catalog);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    normalized.push(canonical);
  }

  return normalized;
}

export function getGroupTags(groupKey, catalog = loadTagCatalog()) {
  return catalog.groupMap.get(groupKey) ?? [];
}

export function getTagGroup(tag, catalog = loadTagCatalog()) {
  return catalog.tagToGroup.get(tag) ?? null;
}

export function getPrimaryTag(tags, catalog = loadTagCatalog()) {
  const normalized = normalizeTags(tags, catalog);
  const subjectTags = new Set(getGroupTags("subject", catalog));
  return normalized.find((tag) => subjectTags.has(tag)) ?? null;
}

export function sortTags(tags, catalog = loadTagCatalog()) {
  const normalized = normalizeTags(tags, catalog);
  const order = ["subject", "status", "background", "workflow"];

  return normalized.sort((a, b) => {
    const groupA = getTagGroup(a, catalog);
    const groupB = getTagGroup(b, catalog);
    const rankA = groupA ? order.indexOf(groupA) : order.length;
    const rankB = groupB ? order.indexOf(groupB) : order.length;

    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b, "ja");
  });
}

