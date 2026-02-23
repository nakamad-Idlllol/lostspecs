import fs from "node:fs";
import path from "node:path";

const target = process.argv[2] ?? "entries.json";
const filePath = path.resolve(process.cwd(), target);

const requiredFields = [
  "id",
  "work",
  "medium",
  "itemTitle",
  "classification",
  "status",
  "tags",
  "firstAppearance",
  "factShown",
  "factAfter",
  "evaluation",
  "note",
  "sources"
];

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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
  fail(`JSON 解析に失敗しました: ${filePath}`);
  console.error(error);
  process.exit();
}

if (!Array.isArray(entries)) {
  fail("ルート要素は配列である必要があります");
  process.exit();
}

const seenIds = new Set();
let errorCount = 0;

entries.forEach((entry, index) => {
  const label = `entries[${index}]`;

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    fail(`${label} はオブジェクトである必要があります`);
    errorCount += 1;
    return;
  }

  for (const field of requiredFields) {
    if (!(field in entry)) {
      fail(`${label} に必須項目 ${field} がありません`);
      errorCount += 1;
    }
  }

  if (!isNonEmptyString(entry.id)) {
    fail(`${label}.id は空でない文字列である必要があります`);
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
    "classification",
    "status",
    "firstAppearance",
    "factShown",
    "factAfter",
    "evaluation",
    "note"
  ]) {
    if (!isNonEmptyString(entry[field])) {
      fail(`${label}.${field} は空でない文字列である必要があります`);
      errorCount += 1;
    }
  }

  if (!Array.isArray(entry.tags) || entry.tags.length === 0) {
    fail(`${label}.tags は1件以上の配列である必要があります`);
    errorCount += 1;
  } else if (entry.tags.some((tag) => !isNonEmptyString(tag))) {
    fail(`${label}.tags に空文字または非文字列があります`);
    errorCount += 1;
  }

  if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
    fail(`${label}.sources は1件以上の配列である必要があります`);
    errorCount += 1;
  } else {
    entry.sources.forEach((source, sourceIndex) => {
      const sourceLabel = `${label}.sources[${sourceIndex}]`;
      if (!source || typeof source !== "object" || Array.isArray(source)) {
        fail(`${sourceLabel} はオブジェクトである必要があります`);
        errorCount += 1;
        return;
      }
      if (!isNonEmptyString(source.label)) {
        fail(`${sourceLabel}.label は空でない文字列である必要があります`);
        errorCount += 1;
      }
      if (!isNonEmptyString(source.url)) {
        fail(`${sourceLabel}.url は空でない文字列である必要があります`);
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
