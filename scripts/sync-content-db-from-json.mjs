import path from "node:path";
import {
  CONTENT_DB_PATH,
  closeContentDatabase,
  ensureContentSeededFromJson,
  hasSeedContent,
  openContentDatabase
} from "./lib/content-store.mjs";

function parseArgs(argv) {
  const options = {
    ifMissing: false,
    force: false
  };

  for (const arg of argv) {
    if (arg === "--if-missing") options.ifMissing = true;
    else if (arg === "--force") options.force = true;
    else throw new Error(`未知の引数: ${arg}`);
  }

  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const db = openContentDatabase();

  try {
    if (options.ifMissing && hasSeedContent(db)) {
      console.log(`[OK] content DB already seeded: ${path.relative(process.cwd(), CONTENT_DB_PATH)}`);
      return;
    }

    ensureContentSeededFromJson(db, { force: options.force || !options.ifMissing });
    console.log(`[OK] synced JSON into content DB: ${path.relative(process.cwd(), CONTENT_DB_PATH)}`);
  } finally {
    closeContentDatabase(db);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
