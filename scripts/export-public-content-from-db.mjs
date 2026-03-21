import path from "node:path";
import {
  CONTENT_DB_PATH,
  closeContentDatabase,
  ensureContentSeededFromJson,
  exportPublicJsonFromDb,
  openContentDatabase
} from "./lib/content-store.mjs";

function main() {
  const db = openContentDatabase();

  try {
    ensureContentSeededFromJson(db);
    exportPublicJsonFromDb(db);
    console.log(`[OK] exported entries.json and sources.json from ${path.relative(process.cwd(), CONTENT_DB_PATH)}`);
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
