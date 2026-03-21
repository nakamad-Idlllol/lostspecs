import {
  ENTRIES_PATH,
  SOURCES_PATH,
  closeContentDatabase,
  ensureContentSeededFromJson,
  exportEntriesFromDb,
  exportSourcesFromDb,
  openContentDatabase,
  readJson
} from "./lib/content-store.mjs";

function assertSame(label, actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${label} が content DB と一致しません`);
  }
}

function main() {
  const db = openContentDatabase();

  try {
    ensureContentSeededFromJson(db);

    const dbEntries = exportEntriesFromDb(db);
    const dbSources = exportSourcesFromDb(db);
    const fileEntries = readJson(ENTRIES_PATH);
    const fileSources = readJson(SOURCES_PATH);

    assertSame("entries.json", dbEntries, fileEntries);
    assertSame("sources.json", dbSources, fileSources);

    console.log(`[OK] content DB matches public JSON (${dbEntries.length} entries / ${dbSources.items.length} sources)`);
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
