import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    fetchLimit: null
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--fetch-limit") options.fetchLimit = argv[++i] ?? null;
    else throw new Error(`未知の引数: ${arg}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  console.log("[daily] validate config");
  run("node", ["scripts/validate-automation-config.mjs"]);

  console.log("[daily] generate sources.json from entries.json");
  run("node", ["scripts/generate-sources-from-entries.mjs"]);

  console.log("[daily] validate data files");
  run("node", ["scripts/validate-entries.mjs"]);
  run("node", ["scripts/validate-sources.mjs"]);

  console.log("[daily] fetch sources");
  const fetchArgs = ["scripts/fetch-sources.mjs"];
  if (options.dryRun) fetchArgs.push("--dry-run");
  if (options.fetchLimit) fetchArgs.push("--limit", String(options.fetchLimit));
  run("node", fetchArgs);

  console.log("[daily] extract latest snapshots");
  run("node", ["scripts/extract-snapshots.mjs"]);

  console.log("[daily] complete");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
