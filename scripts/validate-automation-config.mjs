import { loadAutomationConfig, getAutomationConfigPath } from "./lib/automation-config.mjs";
import path from "node:path";

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exitCode = 1;
}

function main() {
  const config = loadAutomationConfig();
  let errorCount = 0;

  if (typeof config.version !== "number") {
    fail("version は数値である必要があります");
    errorCount += 1;
  }

  const provider = config.deployment?.provider;
  if (provider !== "vercel") {
    fail(`deployment.provider は 'vercel' を想定しています（現在: ${provider}）`);
    errorCount += 1;
  }

  const cron = config.schedule?.dailyCron;
  if (typeof cron !== "string" || cron.trim().split(/\s+/).length !== 5) {
    fail("schedule.dailyCron は 5 フィールドの cron 文字列である必要があります");
    errorCount += 1;
  }

  const delayMs = config.fetch?.defaultDelayMs;
  if (!Number.isInteger(delayMs) || delayMs < 0) {
    fail("fetch.defaultDelayMs は 0 以上の整数である必要があります");
    errorCount += 1;
  }

  const timeoutMs = config.fetch?.requestTimeoutMs;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000) {
    fail("fetch.requestTimeoutMs は 1000 以上の整数である必要があります");
    errorCount += 1;
  }

  const userAgent = config.fetch?.userAgent;
  if (typeof userAgent !== "string" || userAgent.trim().length < 8) {
    fail("fetch.userAgent は十分な長さの文字列である必要があります");
    errorCount += 1;
  }

  const thresholds = config.scoring?.thresholds;
  const candidateReadyMin = thresholds?.candidateReadyMin;
  const needsReviewMin = thresholds?.needsReviewMin;
  if (!Number.isInteger(candidateReadyMin) || !Number.isInteger(needsReviewMin)) {
    fail("scoring.thresholds の値は整数である必要があります");
    errorCount += 1;
  } else if (!(0 <= needsReviewMin && needsReviewMin <= candidateReadyMin && candidateReadyMin <= 100)) {
    fail("閾値は 0 <= needsReviewMin <= candidateReadyMin <= 100 を満たす必要があります");
    errorCount += 1;
  }

  const publisher = config.publisher ?? {};
  if (typeof publisher.autoApplyEnabled !== "boolean") {
    fail("publisher.autoApplyEnabled は boolean である必要があります");
    errorCount += 1;
  }
  if (typeof publisher.allowEvidenceUpdateAutoApply !== "boolean") {
    fail("publisher.allowEvidenceUpdateAutoApply は boolean である必要があります");
    errorCount += 1;
  }
  if (!Number.isInteger(publisher.minConfidence) || publisher.minConfidence < 0 || publisher.minConfidence > 100) {
    fail("publisher.minConfidence は 0..100 の整数である必要があります");
    errorCount += 1;
  }
  if (typeof publisher.requireCompleteSuggestedEntry !== "boolean") {
    fail("publisher.requireCompleteSuggestedEntry は boolean である必要があります");
    errorCount += 1;
  }

  if (errorCount > 0) {
    console.error(`[FAIL] ${errorCount} 件の問題を検出しました`);
    process.exit(1);
  }

  console.log(`[OK] automation config validated: ${path.relative(process.cwd(), getAutomationConfigPath())}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
