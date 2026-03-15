import fs from "node:fs";
import path from "node:path";
import {
  getGroupTags,
  getPrimaryTag,
  loadTagCatalog,
  normalizeTag,
  normalizeTags
} from "./lib/tag-catalog.mjs";

const target = process.argv[2] ?? "entries.json";
const filePath = path.resolve(process.cwd(), target);
const catalog = loadTagCatalog();
const subjectTags = new Set(getGroupTags("subject", catalog));

const requiredFields = [
  "id",
  "work",
  "medium",
  "itemTitle",
  "status",
  "tags",
  "firstAppearance",
  "overview",
  "depiction",
  "unresolvedPoints",
  "reception",
  "externalContext",
  "interpretation",
  "futurePossibility",
  "discussionPoints",
  "timeline",
  "sources"
];

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

let raw;
try {
  raw = fs.readFileSync(filePath, "utf8");
} catch (error) {
  fail(`ファイルを読めません: ${filePath}`);
  console.error(error);
  process.exit();
}

let entries;
try {
  entries = JSON.parse(raw);
} catch (error) {
  fail(`JSON の解析に失敗しました: ${filePath}`);
  console.error(error);
  process.exit();
}

if (!Array.isArray(entries)) {
  fail("ルート要素は配列である必要があります。");
  process.exit();
}

const seenIds = new Set();
let errorCount = 0;

entries.forEach((entry, index) => {
  const label = `entries[${index}]`;

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    fail(`${label} はオブジェクトである必要があります。`);
    errorCount += 1;
    return;
  }

  for (const field of requiredFields) {
    if (!(field in entry)) {
      fail(`${label} に必須フィールド ${field} がありません。`);
      errorCount += 1;
    }
  }

  if (!isPositiveInteger(entry.id)) {
    fail(`${label}.id は 1 以上の整数である必要があります。`);
    errorCount += 1;
  } else if (seenIds.has(entry.id)) {
    fail(`${label}.id が重複しています: ${entry.id}`);
    errorCount += 1;
  } else {
    seenIds.add(entry.id);
  }

  for (const field of [
    "work",
    "medium",
    "itemTitle",
    "status",
    "firstAppearance",
    "overview",
    "depiction",
    "unresolvedPoints",
    "reception",
    "externalContext",
    "interpretation",
    "futurePossibility",
    "discussionPoints"
  ]) {
    if (!isNonEmptyString(entry[field])) {
      fail(`${label}.${field} は空でない文字列である必要があります。`);
      errorCount += 1;
    }
  }

  if (!Array.isArray(entry.tags) || entry.tags.length === 0) {
    fail(`${label}.tags は1件以上の配列である必要があります。`);
    errorCount += 1;
  } else if (entry.tags.some((tag) => !isNonEmptyString(tag))) {
    fail(`${label}.tags に空の値があります。`);
    errorCount += 1;
  } else {
    const normalized = normalizeTags(entry.tags, catalog);
    if (normalized.length !== entry.tags.length) {
      fail(`${label}.tags に重複または空タグがあります。`);
      errorCount += 1;
    }

    entry.tags.forEach((tag, tagIndex) => {
      const normalizedTag = normalizeTag(tag, catalog);
      if (normalizedTag !== tag) {
        fail(`${label}.tags[${tagIndex}] は正規表記ではありません: ${tag} -> ${normalizedTag}`);
        errorCount += 1;
      } else if (!catalog.canonicalTags.has(tag)) {
        fail(`${label}.tags[${tagIndex}] はタグ辞書にありません: ${tag}`);
        errorCount += 1;
      }
    });

    const primaryTag = getPrimaryTag(entry.tags, catalog);
    if (!primaryTag) {
      fail(`${label}.tags に対象タグがありません。`);
      errorCount += 1;
    } else if (entry.tags[0] !== primaryTag || !subjectTags.has(entry.tags[0])) {
      fail(`${label}.tags の先頭は主タグである必要があります。現在: ${entry.tags[0]}`);
      errorCount += 1;
    }
  }

  if (!Array.isArray(entry.timeline) || entry.timeline.length === 0) {
    fail(`${label}.timeline は1件以上の配列である必要があります。`);
    errorCount += 1;
  } else {
    entry.timeline.forEach((item, itemIndex) => {
      const itemLabel = `${label}.timeline[${itemIndex}]`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        fail(`${itemLabel} はオブジェクトである必要があります。`);
        errorCount += 1;
        return;
      }
      if (!isNonEmptyString(item.label)) {
        fail(`${itemLabel}.label は空でない文字列である必要があります。`);
        errorCount += 1;
      }
      if (!isNonEmptyString(item.detail)) {
        fail(`${itemLabel}.detail は空でない文字列である必要があります。`);
        errorCount += 1;
      }
    });
  }

  if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
    fail(`${label}.sources は1件以上の配列である必要があります。`);
    errorCount += 1;
  } else {
    entry.sources.forEach((source, sourceIndex) => {
      const sourceLabel = `${label}.sources[${sourceIndex}]`;
      if (!source || typeof source !== "object" || Array.isArray(source)) {
        fail(`${sourceLabel} はオブジェクトである必要があります。`);
        errorCount += 1;
        return;
      }
      if (!isNonEmptyString(source.label)) {
        fail(`${sourceLabel}.label は空でない文字列である必要があります。`);
        errorCount += 1;
      }
      if (!isNonEmptyString(source.url)) {
        fail(`${sourceLabel}.url は空でない文字列である必要があります。`);
        errorCount += 1;
      } else {
        try {
          new URL(source.url);
        } catch {
          fail(`${sourceLabel}.url が不正です: ${source.url}`);
          errorCount += 1;
        }
      }
    });
  }
});

if (errorCount > 0) {
  console.error(`[FAIL] ${errorCount} 件の問題を検出しました`);
  process.exit(1);
}

console.log(`[OK] ${entries.length} 件を検証しました: ${path.relative(process.cwd(), filePath)}`);
