import fs from "node:fs";
import path from "node:path";
import { loadAutomationConfig } from "./lib/automation-config.mjs";

const CANDIDATES_ROOT = path.resolve(process.cwd(), "data", "candidates");
const PUBLISHER_ROOT = path.resolve(process.cwd(), "data", "publisher");
const ENTRIES_PATH = path.resolve(process.cwd(), "entries.json");

function parseArgs(argv) {
  const options = {
    batch: null,
    apply: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--batch") options.batch = argv[++i] ?? null;
    else if (arg === "--apply") options.apply = true;
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

function latestBatch(root) {
  return listDirs(root).at(-1) ?? null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function completeSuggestedEntry(entry) {
  const requiredStringFields = [
    "work",
    "medium",
    "itemTitle",
    "classification",
    "status",
    "firstAppearance",
    "factShown",
    "factAfter",
    "evaluation",
    "note"
  ];

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  if (!Array.isArray(entry.tags) || entry.tags.length === 0 || entry.tags.some((v) => !isNonEmptyString(v))) {
    return false;
  }
  if (
    !Array.isArray(entry.sources) ||
    entry.sources.length === 0 ||
    entry.sources.some((s) => !s || !isNonEmptyString(s.label) || !isNonEmptyString(s.url))
  ) {
    return false;
  }
  return requiredStringFields.every((key) => isNonEmptyString(entry[key]));
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

function buildEntryId(candidate) {
  const work = candidate.suggestedEntry?.work ?? "";
  const title = candidate.suggestedEntry?.itemTitle ?? "";
  const base = `${slugify(work)}-${slugify(title)}`.replace(/^-+|-+$/g, "");
  if (base) return base.slice(0, 96);
  return `auto-${slugify(candidate.sourceId ?? candidate.candidateId ?? "candidate")}`;
}

function entrySourceUrls(entry) {
  return new Set((entry.sources ?? []).map((s) => s?.url).filter(Boolean));
}

function evaluateCandidate(candidate, context, config) {
  const reasons = [];
  const publisher = config.publisher ?? {};
  const minConfidence = publisher.minConfidence ?? 95;

  if (candidate.decision?.key !== "candidate_ready") reasons.push("decision_not_candidate_ready");
  if (typeof candidate.confidence !== "number" || candidate.confidence < minConfidence) reasons.push("confidence_too_low");

  if (candidate.candidateType !== "new_entry") {
    if (candidate.candidateType === "evidence_update" && publisher.allowEvidenceUpdateAutoApply) {
      // allowed by config
    } else {
      reasons.push("candidate_type_not_auto_publishable");
    }
  }

  if (candidate.duplicateSignals?.sourceUrlAlreadyUsed) reasons.push("source_url_already_used");
  if (candidate.duplicateSignals?.linkedExistingEntries && !publisher.allowEvidenceUpdateAutoApply) {
    reasons.push("linked_existing_entry");
  }

  if (publisher.requireCompleteSuggestedEntry && !completeSuggestedEntry(candidate.suggestedEntry)) {
    reasons.push("suggested_entry_incomplete");
  }

  const normalized = { ...(candidate.suggestedEntry ?? {}) };
  if (!isNonEmptyString(normalized.id)) {
    normalized.id = buildEntryId(candidate);
  }

  if (context.entryIds.has(normalized.id)) reasons.push("entry_id_already_exists");

  const sourceUrls = new Set((normalized.sources ?? []).map((s) => s?.url).filter(Boolean));
  for (const url of sourceUrls) {
    if (context.knownSourceUrls.has(url)) {
      reasons.push("entry_source_url_already_exists");
      break;
    }
  }

  const publishable = publisher.autoApplyEnabled && reasons.length === 0;

  return {
    publishable,
    reasons,
    normalizedSuggestedEntry: normalized
  };
}

function buildContext(entries) {
  const entryIds = new Set(entries.map((e) => e.id).filter(Boolean));
  const knownSourceUrls = new Set();
  for (const entry of entries) {
    for (const url of entrySourceUrls(entry)) knownSourceUrls.add(url);
  }
  return { entryIds, knownSourceUrls };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = loadAutomationConfig();
  const batch = options.batch ?? latestBatch(CANDIDATES_ROOT);

  if (!batch) {
    console.log("[publisher] 候補バッチがありません（data/candidates 配下が空です）");
    return;
  }

  const batchDir = path.join(CANDIDATES_ROOT, batch);
  const candidatesPath = path.join(batchDir, "candidates.json");
  if (!fs.existsSync(candidatesPath)) {
    console.log(`[publisher] candidates.json がありません: data/candidates/${batch}`);
    return;
  }

  const candidates = readJson(candidatesPath);
  const entries = readJson(ENTRIES_PATH);
  const context = buildContext(entries);

  const evaluated = [];
  const toApply = [];
  const rejected = [];

  for (const candidate of candidates) {
    const result = evaluateCandidate(candidate, context, config);
    const item = {
      candidateId: candidate.candidateId,
      sourceId: candidate.sourceId,
      title: candidate.suggestedEntry?.itemTitle ?? null,
      confidence: candidate.confidence ?? null,
      decision: candidate.decision ?? null,
      candidateType: candidate.candidateType ?? null,
      publishable: result.publishable,
      reasons: result.reasons
    };

    evaluated.push(item);

    if (result.publishable) {
      toApply.push({
        candidateId: candidate.candidateId,
        entry: result.normalizedSuggestedEntry
      });
      context.entryIds.add(result.normalizedSuggestedEntry.id);
      for (const url of (result.normalizedSuggestedEntry.sources ?? []).map((s) => s?.url).filter(Boolean)) {
        context.knownSourceUrls.add(url);
      }
    } else {
      rejected.push(item);
    }
  }

  let appliedCount = 0;
  if (options.apply && toApply.length > 0) {
    const nextEntries = [...entries];
    for (const item of toApply) {
      nextEntries.push(item.entry);
      appliedCount += 1;
    }
    writeJson(ENTRIES_PATH, nextEntries);
  }

  const summary = {
    batch,
    generatedAt: new Date().toISOString(),
    requestedApply: options.apply,
    autoApplyEnabled: Boolean(config.publisher?.autoApplyEnabled),
    totalCandidates: candidates.length,
    publishableCount: toApply.length,
    appliedCount,
    rejectedCount: rejected.length,
    reasonsHistogram: Object.fromEntries(
      [...rejected.flatMap((r) => r.reasons)].reduce((map, reason) => {
        map.set(reason, (map.get(reason) ?? 0) + 1);
        return map;
      }, new Map())
    )
  };

  const outDir = path.join(PUBLISHER_ROOT, batch);
  writeJson(path.join(outDir, "evaluated-candidates.json"), evaluated);
  writeJson(path.join(outDir, "_summary.json"), summary);
  writeJson(
    path.join(PUBLISHER_ROOT, "_latest.json"),
    { batch, path: `data/publisher/${batch}`, summary },
  );

  console.log(
    `[publisher] batch=${batch} total=${summary.totalCandidates} publishable=${summary.publishableCount} applied=${summary.appliedCount}`
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
