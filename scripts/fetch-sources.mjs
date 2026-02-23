import fs from "node:fs";
import path from "node:path";

const SOURCES_PATH = path.resolve(process.cwd(), "sources.json");
const SNAPSHOT_ROOT = path.resolve(process.cwd(), "data", "snapshots");

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limit: Infinity,
    delayMs: 1000,
    includeDisabled: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--include-disabled") options.includeDisabled = true;
    else if (arg === "--limit") options.limit = Number(argv[++i] ?? "0");
    else if (arg === "--delay-ms") options.delayMs = Number(argv[++i] ?? "0");
    else throw new Error(`未知の引数: ${arg}`);
  }

  if (!Number.isFinite(options.limit) || options.limit <= 0) options.limit = Infinity;
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) options.delayMs = 0;
  return options;
}

function readSources() {
  const root = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
  if (!root || typeof root !== "object" || !Array.isArray(root.items)) {
    throw new Error("sources.json の形式が不正です");
  }
  return root.items;
}

function nowStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}${m}${day}-${hh}${mm}${ss}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function fetchOne(item, outDir) {
  const startedAt = new Date().toISOString();
  let record;

  try {
    const response = await fetch(item.url, {
      headers: {
        "User-Agent": "lostspecs-fetcher/0.1 (+local automation prototype)"
      }
    });
    const text = await response.text();
    record = {
      sourceId: item.id,
      url: item.url,
      fetchedAt: new Date().toISOString(),
      startedAt,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type") ?? "",
      finalUrl: response.url,
      body: text
    };
  } catch (error) {
    record = {
      sourceId: item.id,
      url: item.url,
      fetchedAt: new Date().toISOString(),
      startedAt,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  const fileName = `${sanitizeFileName(item.id)}.json`;
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(record, null, 2) + "\n", "utf8");

  return record;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const items = readSources()
    .filter((item) => options.includeDisabled || item.enabled)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id, "ja"))
    .slice(0, options.limit);

  if (items.length === 0) {
    console.log("[fetch] 対象ソースがありません");
    return;
  }

  console.log(`[fetch] targets=${items.length} dryRun=${options.dryRun} delayMs=${options.delayMs}`);
  items.forEach((item, index) => {
    console.log(`  ${String(index + 1).padStart(2, "0")}. [p${item.priority}] ${item.id} -> ${item.url}`);
  });

  if (options.dryRun) return;

  const batchDir = path.join(SNAPSHOT_ROOT, nowStamp());
  fs.mkdirSync(batchDir, { recursive: true });

  let success = 0;
  let failure = 0;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const result = await fetchOne(item, batchDir);
    if (result.ok) success += 1;
    else failure += 1;

    console.log(
      `[fetch] ${i + 1}/${items.length} ${item.id} -> ${result.ok ? result.status : `ERROR ${result.error}`}`
    );

    if (i < items.length - 1 && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    total: items.length,
    success,
    failure,
    items: items.map((item) => ({ id: item.id, url: item.url }))
  };
  fs.writeFileSync(path.join(batchDir, "_manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

  console.log(`[fetch] completed: success=${success} failure=${failure} dir=${path.relative(process.cwd(), batchDir)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
