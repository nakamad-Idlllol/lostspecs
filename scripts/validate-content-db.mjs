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

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }

  return value;
}

function assertSame(label, actual, expected) {
  const actualJson = JSON.stringify(canonicalize(actual));
  const expectedJson = JSON.stringify(canonicalize(expected));
  if (actualJson !== expectedJson) {
    throw new Error(`${label} が content DB と一致しません`);
  }
}

function main() {
  const db = openContentDatabase();

  try {
    ensureContentSeededFromJson(db, { force: true });

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
