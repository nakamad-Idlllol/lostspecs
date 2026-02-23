import fs from "node:fs";
import path from "node:path";
import { loadAutomationConfig } from "./lib/automation-config.mjs";

const EXTRACTED_ROOT = path.resolve(process.cwd(), "data", "extracted");
const CANDIDATES_ROOT = path.resolve(process.cwd(), "data", "candidates");
const PUBLISHER_ROOT = path.resolve(process.cwd(), "data", "publisher");
const STATUS_PATH = path.resolve(process.cwd(), "automation-status.json");
const REVIEW_FEED_PATH = path.resolve(process.cwd(), "automation-review-feed.json");
const APP_PATH = path.resolve(process.cwd(), "app.js");

function listDirs(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function latestBatch(root) {
  return listDirs(root).at(-1) ?? null;
}

function readJsonIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readSiteVersion() {
  const text = fs.readFileSync(APP_PATH, "utf8");
  const version = text.match(/\bversion:\s*"(\d+\.\d+\.\d+)"/)?.[1] ?? null;
  const updatedAt = text.match(/\bupdatedAt:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1] ?? null;
  return { version, updatedAt };
}

function main() {
  const config = loadAutomationConfig();
  const extractedBatch = latestBatch(EXTRACTED_ROOT);
  const candidatesBatch = latestBatch(CANDIDATES_ROOT);
  const publisherBatch = latestBatch(PUBLISHER_ROOT);
  const extractedSummary = extractedBatch
    ? readJsonIfExists(path.join(EXTRACTED_ROOT, extractedBatch, "_summary.json"))
    : null;
  const candidatesSummary = candidatesBatch
    ? readJsonIfExists(path.join(CANDIDATES_ROOT, candidatesBatch, "_summary.json"))
    : null;
  const publisherSummary = publisherBatch
    ? readJsonIfExists(path.join(PUBLISHER_ROOT, publisherBatch, "_summary.json"))
    : null;
  const reviewQueue = candidatesBatch
    ? readJsonIfExists(path.join(CANDIDATES_ROOT, candidatesBatch, "_review-queue.json"), [])
    : [];
  const site = readSiteVersion();

  const status = {
    generatedAt: new Date().toISOString(),
    site,
    deployment: config.deployment ?? null,
    schedule: config.schedule ?? null,
    scoring: config.scoring ?? null,
    latest: {
      extractedBatch,
      extractedSummary,
      candidatesBatch,
      candidatesSummary,
      publisherBatch,
      publisherSummary
    }
  };

  const reviewFeed = {
    generatedAt: new Date().toISOString(),
    batch: candidatesBatch,
    total: Array.isArray(reviewQueue) ? reviewQueue.length : 0,
    items: (Array.isArray(reviewQueue) ? reviewQueue : []).slice(0, 50)
  };

  fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2) + "\n", "utf8");
  fs.writeFileSync(REVIEW_FEED_PATH, JSON.stringify(reviewFeed, null, 2) + "\n", "utf8");

  console.log(
    `[publish] wrote ${path.relative(process.cwd(), STATUS_PATH)} and ${path.relative(process.cwd(), REVIEW_FEED_PATH)}`
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
