import fs from "node:fs";
import path from "node:path";

const APP_PATH = path.resolve(process.cwd(), "app.js");

function parseArgs(argv) {
  const [arg = "patch"] = argv;
  return { target: arg };
}

function getTodayLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function bumpSemver(current, target) {
  const match = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`現行バージョン形式が不正です: ${current}`);

  let [major, minor, patch] = match.slice(1).map(Number);

  if (/^\d+\.\d+\.\d+$/.test(target)) {
    return target;
  }

  if (target === "major") {
    major += 1;
    minor = 0;
    patch = 0;
    return `${major}.${minor}.${patch}`;
  }
  if (target === "minor") {
    minor += 1;
    patch = 0;
    return `${major}.${minor}.${patch}`;
  }
  if (target === "patch") {
    patch += 1;
    return `${major}.${minor}.${patch}`;
  }

  throw new Error(`未知の更新種別です: ${target}（major/minor/patch または x.y.z を指定）`);
}

function main() {
  const { target } = parseArgs(process.argv.slice(2));
  const source = fs.readFileSync(APP_PATH, "utf8");

  const versionMatch = source.match(/(\bversion:\s*")(\d+\.\d+\.\d+)(")/);
  const dateMatch = source.match(/(\bupdatedAt:\s*")(\d{4}-\d{2}-\d{2})(")/);

  if (!versionMatch) throw new Error("app.js 内の SITE_META.version を検出できません");
  if (!dateMatch) throw new Error("app.js 内の SITE_META.updatedAt を検出できません");

  const currentVersion = versionMatch[2];
  const nextVersion = bumpSemver(currentVersion, target);
  const today = getTodayLocal();

  let updated = source.replace(versionMatch[0], `${versionMatch[1]}${nextVersion}${versionMatch[3]}`);
  updated = updated.replace(dateMatch[0], `${dateMatch[1]}${today}${dateMatch[3]}`);

  fs.writeFileSync(APP_PATH, updated, "utf8");

  console.log(`version: ${currentVersion} -> ${nextVersion}`);
  console.log(`updatedAt: ${dateMatch[2]} -> ${today}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
