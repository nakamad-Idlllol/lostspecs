import fs from "node:fs";
import path from "node:path";
import { loadAutomationConfig } from "./lib/automation-config.mjs";

const EXTRACTED_ROOT = path.resolve(process.cwd(), "data", "extracted");
const CANDIDATES_ROOT = path.resolve(process.cwd(), "data", "candidates");
const SOURCES_PATH = path.resolve(process.cwd(), "sources.json");
const ENTRIES_PATH = path.resolve(process.cwd(), "entries.json");

function parseArgs(argv) {
  const options = { batch: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--batch") options.batch = argv[++i] ?? null;
    else throw new Error(`未知の引数: ${arg}`);
  }
  return options;
}

function listDirs(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function chooseBatch(requested) {
  if (requested) return requested;
  const dirs = listDirs(EXTRACTED_ROOT);
  return dirs.at(-1) ?? null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildIndexes(entries, sources) {
  const existingSourceUrls = new Set();
  const entryById = new Map();
  const sourceById = new Map((sources.items ?? []).map((s) => [s.id, s]));
  const entriesByWork = new Map();

  for (const entry of entries) {
    entryById.set(entry.id, entry);
    if (!entriesByWork.has(entry.work)) entriesByWork.set(entry.work, []);
    entriesByWork.get(entry.work).push(entry);
    for (const source of entry.sources ?? []) {
      if (typeof source?.url === "string" && source.url) existingSourceUrls.add(source.url);
    }
  }

  return { existingSourceUrls, entryById, sourceById, entriesByWork };
}

function pickTitle(extracted) {
  return extracted.extracted?.h1 || extracted.extracted?.ogTitle || extracted.extracted?.title || "";
}

function inferMedium(workRefs, entriesByWork) {
  const media = new Set();
  for (const work of workRefs ?? []) {
    for (const entry of entriesByWork.get(work) ?? []) {
      if (entry.medium) media.add(entry.medium);
    }
  }
  return media.size === 1 ? [...media][0] : null;
}

function inferClassification(entryRefs, entryById) {
  const labels = new Set();
  for (const id of entryRefs ?? []) {
    const entry = entryById.get(id);
    if (entry?.classification) labels.add(entry.classification);
  }
  return labels.size === 1 ? [...labels][0] : null;
}

function inferStatus(decisionKey) {
  if (decisionKey === "candidate_ready") return "掲載候補";
  if (decisionKey === "needs_review") return "要レビュー";
  return "保留";
}

function buildCandidate(extracted, sourceMeta, indexes, batch, config) {
  const title = pickTitle(extracted);
  const workRefs = sourceMeta?.workRefs ?? [];
  const entryRefs = sourceMeta?.entryRefs ?? [];
  const sourceAlreadyUsed = indexes.existingSourceUrls.has(extracted.url);
  const sourceLinkedExisting = Array.isArray(entryRefs) && entryRefs.length > 0;
  const decision = extracted.decision ?? { key: "needs_review", label: "要レビュー" };
  const candidateId = `cand-${batch}-${slugify(extracted.sourceId || title || "unknown")}`;
  const mediumHint = inferMedium(workRefs, indexes.entriesByWork);
  const classificationHint = inferClassification(entryRefs, indexes.entryById);
  const thresholds = config.scoring?.thresholds ?? {};

  const candidateType = sourceLinkedExisting ? "evidence_update" : "new_entry";
  const autoEligible = decision.key === "candidate_ready" && candidateType === "new_entry" && !sourceAlreadyUsed;

  return {
    candidateId,
    batch,
    sourceId: extracted.sourceId,
    sourceUrl: extracted.url,
    sourceLabel: sourceMeta?.label ?? extracted.url,
    sourceType: sourceMeta?.sourceType ?? null,
    priority: sourceMeta?.priority ?? null,
    workRefs,
    entryRefs,
    candidateType,
    confidence: extracted.confidence ?? 0,
    decision,
    autoEligible,
    duplicateSignals: {
      sourceUrlAlreadyUsed: sourceAlreadyUsed,
      linkedExistingEntries: sourceLinkedExisting
    },
    thresholdsSnapshot: thresholds,
    extracted: {
      title: extracted.extracted?.title ?? "",
      h1: extracted.extracted?.h1 ?? "",
      ogTitle: extracted.extracted?.ogTitle ?? "",
      textSample: extracted.extracted?.textSample ?? "",
      textLength: extracted.extracted?.textLength ?? 0
    },
    suggestedEntry: {
      id: null,
      work: workRefs[0] ?? null,
      medium: mediumHint,
      itemTitle: title || null,
      classification: classificationHint,
      status: inferStatus(decision.key),
      tags: [inferStatus(decision.key)],
      firstAppearance: null,
      factShown: null,
      factAfter: null,
      evaluation: null,
      note: `自動抽出候補（${new Date().toISOString()}） sourceId=${extracted.sourceId}`,
      sources: [
        {
          label: sourceMeta?.label ?? extracted.url,
          url: extracted.url
        }
      ]
    },
    reviewReasons: extracted.reviewReasons ?? [],
    generatedAt: new Date().toISOString()
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = loadAutomationConfig();
  const batch = chooseBatch(options.batch);

  if (!batch) {
    console.log("[transform] 抽出バッチがありません（data/extracted 配下が空です）");
    return;
  }

  const inDir = path.join(EXTRACTED_ROOT, batch);
  if (!fs.existsSync(inDir)) {
    throw new Error(`指定バッチが見つかりません: ${batch}`);
  }

  const outDir = path.join(CANDIDATES_ROOT, batch);
  fs.mkdirSync(outDir, { recursive: true });

  const sources = readJson(SOURCES_PATH);
  const entries = readJson(ENTRIES_PATH);
  const indexes = buildIndexes(entries, sources);

  const files = fs
    .readdirSync(inDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".json") && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();

  if (files.length === 0) {
    console.log(`[transform] 対象抽出ファイルがありません: data/extracted/${batch}`);
    return;
  }

  const candidates = [];
  for (const file of files) {
    const extracted = readJson(path.join(inDir, file));
    const sourceMeta = indexes.sourceById.get(extracted.sourceId) ?? null;
    candidates.push(buildCandidate(extracted, sourceMeta, indexes, batch, config));
  }

  const reviewQueue = [...candidates]
    .sort((a, b) => {
      const rank = (x) => (x.decision?.key === "candidate_ready" ? 0 : x.decision?.key === "needs_review" ? 1 : 2);
      return (
        rank(a) - rank(b) ||
        b.confidence - a.confidence ||
        String(a.candidateId).localeCompare(String(b.candidateId), "ja")
      );
    })
    .map((c) => ({
      candidateId: c.candidateId,
      sourceId: c.sourceId,
      sourceUrl: c.sourceUrl,
      title: c.suggestedEntry.itemTitle,
      decision: c.decision,
      confidence: c.confidence,
      candidateType: c.candidateType,
      autoEligible: c.autoEligible,
      duplicateSignals: c.duplicateSignals,
      workRefs: c.workRefs,
      entryRefs: c.entryRefs,
      reviewReasons: c.reviewReasons
    }));

  const summary = {
    batch,
    generatedAt: new Date().toISOString(),
    total: candidates.length,
    candidateReadyCount: candidates.filter((c) => c.decision?.key === "candidate_ready").length,
    needsReviewCount: candidates.filter((c) => c.decision?.key === "needs_review").length,
    holdCount: candidates.filter((c) => c.decision?.key === "hold").length,
    autoEligibleCount: candidates.filter((c) => c.autoEligible).length,
    evidenceUpdateCount: candidates.filter((c) => c.candidateType === "evidence_update").length,
    newEntryCount: candidates.filter((c) => c.candidateType === "new_entry").length
  };

  fs.writeFileSync(path.join(outDir, "candidates.json"), JSON.stringify(candidates, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(outDir, "_review-queue.json"), JSON.stringify(reviewQueue, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(outDir, "_summary.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");

  const latestMeta = { batch, path: `data/candidates/${batch}`, summary };
  fs.writeFileSync(path.join(CANDIDATES_ROOT, "_latest.json"), JSON.stringify(latestMeta, null, 2) + "\n", "utf8");

  console.log(
    `[transform] batch=${batch} total=${summary.total} ready=${summary.candidateReadyCount} review=${summary.needsReviewCount} hold=${summary.holdCount}`
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
