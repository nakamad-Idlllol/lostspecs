import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve(process.cwd(), process.argv[2] ?? "sources.json");

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

let root;
try {
  root = JSON.parse(fs.readFileSync(filePath, "utf8"));
} catch (error) {
  console.error(error);
  fail(`JSON を読み込めません: ${filePath}`);
  process.exit();
}

let errorCount = 0;

if (!root || typeof root !== "object" || Array.isArray(root)) {
  fail("ルート要素はオブジェクトである必要があります");
  process.exit(1);
}

if (typeof root.schemaVersion !== "number") {
  fail("schemaVersion は数値である必要があります");
  errorCount += 1;
}

if (!Array.isArray(root.items)) {
  fail("items は配列である必要があります");
  process.exit(1);
}

const seenIds = new Set();
const seenUrls = new Set();

root.items.forEach((item, index) => {
  const label = `items[${index}]`;
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    fail(`${label} はオブジェクトである必要があります`);
    errorCount += 1;
    return;
  }

  for (const key of ["id", "label", "url", "sourceType", "priority", "enabled", "workRefs", "entryRefs"]) {
    if (!(key in item)) {
      fail(`${label} に必須項目 ${key} がありません`);
      errorCount += 1;
    }
  }

  if (!isNonEmptyString(item.id)) {
    fail(`${label}.id は空でない文字列である必要があります`);
    errorCount += 1;
  } else if (seenIds.has(item.id)) {
    fail(`${label}.id が重複しています: ${item.id}`);
    errorCount += 1;
  } else {
    seenIds.add(item.id);
  }

  if (!isNonEmptyString(item.url)) {
    fail(`${label}.url は空でない文字列である必要があります`);
    errorCount += 1;
  } else {
    try {
      const parsed = new URL(item.url);
      if (!/^https?:$/.test(parsed.protocol)) {
        fail(`${label}.url は http/https のみ対応です: ${item.url}`);
        errorCount += 1;
      }
    } catch {
      fail(`${label}.url が不正です: ${item.url}`);
      errorCount += 1;
    }
    if (seenUrls.has(item.url)) {
      fail(`${label}.url が重複しています: ${item.url}`);
      errorCount += 1;
    } else {
      seenUrls.add(item.url);
    }
  }

  if (!["official", "fan-wiki", "secondary"].includes(item.sourceType)) {
    fail(`${label}.sourceType が不正です: ${item.sourceType}`);
    errorCount += 1;
  }

  if (!Number.isInteger(item.priority) || item.priority < 1 || item.priority > 9) {
    fail(`${label}.priority は 1..9 の整数である必要があります`);
    errorCount += 1;
  }

  if (typeof item.enabled !== "boolean") {
    fail(`${label}.enabled は boolean である必要があります`);
    errorCount += 1;
  }

  if (!Array.isArray(item.workRefs) || item.workRefs.some((v) => !isNonEmptyString(v))) {
    fail(`${label}.workRefs は文字列配列である必要があります`);
    errorCount += 1;
  }

  if (!Array.isArray(item.entryRefs) || item.entryRefs.some((v) => !isNonEmptyString(v))) {
    fail(`${label}.entryRefs は文字列配列である必要があります`);
    errorCount += 1;
  }
});

if (errorCount > 0) {
  console.error(`[FAIL] ${errorCount} 件の問題を検出しました`);
  process.exit(1);
}

console.log(`[OK] ${root.items.length} sources validated: ${path.relative(process.cwd(), filePath)}`);
