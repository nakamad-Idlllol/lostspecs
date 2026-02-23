import { spawnSync } from "node:child_process";
import fs from "node:fs";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function parseArgs(argv) {
  const options = {
    bump: argv[0] ?? "patch",
    git: false,
    push: false
  };

  argv.slice(1).forEach((arg) => {
    if (arg === "--git") options.git = true;
    else if (arg === "--push") {
      options.git = true;
      options.push = true;
    } else {
      throw new Error(`未知のオプション: ${arg}`);
    }
  });

  return options;
}

function main() {
  const { bump, git, push } = parseArgs(process.argv.slice(2));

  console.log(`[release] bump version (${bump})`);
  run("node", ["scripts/bump-version.mjs", bump]);

  console.log("[release] check app.js syntax");
  run("node", ["--check", "app.js"]);

  console.log("[release] validate automation.config.json");
  run("node", ["scripts/validate-automation-config.mjs"]);

  console.log("[release] validate entries.json");
  run("node", ["scripts/validate-entries.mjs"]);

  console.log("[release] validate sources.json");
  run("node", ["scripts/validate-sources.mjs"]);

  console.log("[release] run publisher (plan-only)");
  run("node", ["scripts/publish-candidates-to-entries.mjs"]);

  console.log("[release] publish automation status feed");
  run("node", ["scripts/publish-automation-status.mjs"]);

  if (!git) {
    console.log("[release] 完了（git 操作なし）");
    return;
  }

  console.log("[release] git add");
  run("git", [
    "add",
    "app.js",
    "automation.config.json",
    "entries.json",
    "sources.json",
    "automation-status.json",
    "automation-review-feed.json",
    "index.html",
    "styles.css",
    "package.json",
    "vercel.json",
    "scripts",
    ".github",
    "data",
    "AUTOMATION_ROADMAP.md"
  ]);

  const version = extractCurrentVersion();
  console.log("[release] git commit");
  run("git", ["commit", "-m", `Release v${version}`]);

  if (push) {
    console.log("[release] git push");
    run("git", ["push"]);
  } else {
    console.log("[release] 完了（commit 済み / push なし）");
  }
}

function extractCurrentVersion() {
  const text = fs.readFileSync("app.js", "utf8");
  const match = text.match(/\bversion:\s*"(\d+\.\d+\.\d+)"/);
  if (!match) {
    throw new Error("app.js からバージョンを取得できません");
  }
  return match[1];
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
