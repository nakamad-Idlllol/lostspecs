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

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text) {
  return cleanText(text)
    .split(/(?<=[。.!?！？])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function clipText(text, max = 180) {
  const s = cleanText(text);
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function choosePrimaryDescription(extracted) {
  return (
    cleanText(extracted.extracted?.ogDescription) ||
    cleanText(extracted.extracted?.description) ||
    ""
  );
}

function chooseFactSentence(extracted) {
  const candidates = [
    choosePrimaryDescription(extracted),
    ...splitSentences(extracted.extracted?.textSample || "")
  ];
  const picked = candidates.find((s) => s && s.length >= 20);
  return picked ? clipText(picked, 220) : "";
}

function hasChallengeSignal(extracted) {
  return Boolean(extracted.extracted?.challengeLikely);
}

function buildSuggestedEntry(extracted, sourceMeta, { workRefs, mediumHint, classificationHint, decision, sourceLinkedExisting }) {
  const primaryTitle = pickTitle(extracted) || sourceMeta?.label || extracted.sourceId || "要確認タイトル";
  const description = choosePrimaryDescription(extracted);
  const factSeed = chooseFactSentence(extracted);
  const h2List = Array.isArray(extracted.extracted?.h2List) ? extracted.extracted.h2List : [];

  const templateFields = [];
  const setTemplate = (key, value) => {
    templateFields.push(key);
    return value;
  };

  const work = workRefs[0] ?? setTemplate("work", "要確認（作品名未推定）");
  const medium = mediumHint ?? setTemplate("medium", "要確認");
  const classification = classificationHint ?? setTemplate("classification", "作中要素");
  const status = inferStatus(decision.key);

  const tags = [status, "自動抽出候補"];
  if (hasChallengeSignal(extracted)) tags.push("アクセス制限/要再取得");
  if (sourceLinkedExisting) tags.push("既存エントリ関連");

  const firstAppearance = sourceLinkedExisting
    ? setTemplate("firstAppearance", "既存エントリの追補候補（初出は既存記事を参照）")
    : setTemplate("firstAppearance", "要確認（本文・見出しから初出情報を抽出予定）");

  const factShown =
    factSeed ||
    setTemplate("factShown", `要確認（${clipText(primaryTitle, 80)} に関する本文抽出に失敗または不足）`);

  const factAfter = sourceLinkedExisting
    ? setTemplate("factAfter", "既存エントリへの出典追加・補強候補。本文差分確認後に反映。")
    : setTemplate("factAfter", "自動抽出段階では後続の扱いを確定できないため、要レビュー。");

  const evaluation = hasChallengeSignal(extracted)
    ? setTemplate("evaluation", "アクセス制限/認証ページの可能性があり、再取得または別ソース確認が必要。")
    : setTemplate(
        "evaluation",
        `自動抽出候補（信頼度 ${extracted.confidence ?? "-"}）。判定=${decision.label}。人手レビューで文章整形・事実確認を行う。`
      );

  const noteParts = [
    `自動抽出候補（${new Date().toISOString()}）`,
    `sourceId=${extracted.sourceId}`,
    description ? "description抽出あり" : "description抽出なし",
    h2List.length ? `h2=${h2List.slice(0, 3).join(" / ")}` : "h2なし"
  ];

  return {
    entry: {
      id: null,
      work,
      medium,
      itemTitle: primaryTitle,
      classification,
      status,
      tags,
      firstAppearance,
      factShown,
      factAfter,
      evaluation,
      note: noteParts.join(" | "),
      sources: [
        {
          label: sourceMeta?.label ?? extracted.url,
          url: extracted.url
        }
      ]
    },
    meta: {
      templateFilled: templateFields.length > 0,
      templateFields,
      hasChallengeSignal: hasChallengeSignal(extracted),
      hasDescription: Boolean(description),
      extractedH2Count: h2List.length
    }
  };
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
  const suggested = buildSuggestedEntry(extracted, sourceMeta, {
    workRefs,
    mediumHint,
    classificationHint,
    decision,
    sourceLinkedExisting
  });

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
      h2List: extracted.extracted?.h2List ?? [],
      ogTitle: extracted.extracted?.ogTitle ?? "",
      description: extracted.extracted?.description ?? "",
      ogDescription: extracted.extracted?.ogDescription ?? "",
      textSample: extracted.extracted?.textSample ?? "",
      textLength: extracted.extracted?.textLength ?? 0,
      challengeLikely: Boolean(extracted.extracted?.challengeLikely),
      challengeSignals: extracted.extracted?.challengeSignals ?? []
    },
    suggestedEntry: suggested.entry,
    suggestedEntryMeta: suggested.meta,
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
      templateFilled: Boolean(c.suggestedEntryMeta?.templateFilled),
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
    templateFilledCount: candidates.filter((c) => c.suggestedEntryMeta?.templateFilled).length,
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
