import fs from "node:fs";
import path from "node:path";
import { loadAutomationConfig } from "./lib/automation-config.mjs";
import { getPrimaryTag, loadTagCatalog, normalizeTags, sortTags } from "./lib/tag-catalog.mjs";

const EXTRACTED_ROOT = path.resolve(process.cwd(), "data", "extracted");
const CANDIDATES_ROOT = path.resolve(process.cwd(), "data", "candidates");
const SOURCES_PATH = path.resolve(process.cwd(), "sources.json");
const ENTRIES_PATH = path.resolve(process.cwd(), "entries.json");
const tagCatalog = loadTagCatalog();

function parseArgs(argv) {
  const options = { batch: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--batch") options.batch = argv[++i] ?? null;
    else throw new Error(`未対応の引数: ${arg}`);
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

function entryKey(value) {
  return String(value);
}

function buildIndexes(entries, sources) {
  const existingSourceUrls = new Set();
  const entryById = new Map();
  const sourceById = new Map((sources.items ?? []).map((source) => [source.id, source]));
  const entriesByWork = new Map();

  for (const entry of entries) {
    entryById.set(entryKey(entry.id), entry);
    if (!entriesByWork.has(entry.work)) entriesByWork.set(entry.work, []);
    entriesByWork.get(entry.work).push(entry);
    for (const source of entry.sources ?? []) {
      if (typeof source?.url === "string" && source.url) {
        existingSourceUrls.add(source.url);
      }
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

function inferPrimaryTag(entryRefs, entryById) {
  const labels = new Set();
  for (const id of entryRefs ?? []) {
    const entry = entryById.get(entryKey(id));
    const primaryTag = getPrimaryTag(entry?.tags ?? [], tagCatalog);
    if (primaryTag) labels.add(primaryTag);
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
    .split(/(?<=[。!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function clipText(text, max = 180) {
  const value = cleanText(text);
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function choosePrimaryDescription(extracted) {
  return cleanText(extracted.extracted?.ogDescription) || cleanText(extracted.extracted?.description) || "";
}

function chooseFactSentence(extracted) {
  const candidates = [
    choosePrimaryDescription(extracted),
    ...splitSentences(extracted.extracted?.textSample || "")
  ];
  const picked = candidates.find((sentence) => sentence && sentence.length >= 20);
  return picked ? clipText(picked, 220) : "";
}

function hasChallengeSignal(extracted) {
  return Boolean(extracted.extracted?.challengeLikely);
}

function buildTagSet(primaryTag, decision, extracted, sourceLinkedExisting) {
  const tags = [
    primaryTag,
    inferStatus(decision.key),
    "自動抽出候補"
  ];

  if (hasChallengeSignal(extracted)) tags.push("アクセス制限/要再取得");
  if (sourceLinkedExisting) tags.push("既存エントリ関連");

  const ordered = sortTags(normalizeTags(tags, tagCatalog).filter((tag) => tag !== primaryTag), tagCatalog);
  return [primaryTag, ...ordered];
}

function buildSuggestedEntry(extracted, sourceMeta, { workRefs, mediumHint, primaryTagHint, decision, sourceLinkedExisting }) {
  const primaryTitle = pickTitle(extracted) || sourceMeta?.label || extracted.sourceId || "要確認タイトル";
  const description = choosePrimaryDescription(extracted);
  const factSeed = chooseFactSentence(extracted);
  const h2List = Array.isArray(extracted.extracted?.h2List) ? extracted.extracted.h2List : [];

  const templateFields = [];
  const setTemplate = (key, value) => {
    templateFields.push(key);
    return value;
  };

  const work = workRefs[0] ?? setTemplate("work", "要確認（作品未整理）");
  const medium = mediumHint ?? setTemplate("medium", "要確認");
  const primaryTag = primaryTagHint ?? setTemplate("tags", "設定");
  const tags = buildTagSet(primaryTag, decision, extracted, sourceLinkedExisting);
  const status = inferStatus(decision.key);

  const firstAppearance = sourceLinkedExisting
    ? setTemplate("firstAppearance", "既存エントリに関連する補足情報。初出は既存記事を要確認。")
    : setTemplate("firstAppearance", "要確認。出典記事の初出情報を確認して追記。");

  const depiction =
    factSeed ||
    setTemplate("depiction", `出典ページ「${clipText(primaryTitle, 80)}」に関する記述をもとに整理予定。`);

  const overview = hasChallengeSignal(extracted)
    ? setTemplate("overview", "アクセス制限や本文不足があり、一次情報の再確認が必要です。")
    : setTemplate("overview", `自動抽出候補です。信頼度 ${extracted.confidence ?? "-"} をもとに下書きを生成しています。`);

  const externalContext = description
    ? setTemplate("externalContext", `抽出された説明文: ${clipText(description, 180)}`)
    : setTemplate("externalContext", "現時点では外部資料の補足が不足しています。出典確認後に追記してください。");

  const unresolvedPoints = sourceLinkedExisting
    ? setTemplate("unresolvedPoints", "既存記事に対して、どの論点を補強する情報かを整理してください。")
    : setTemplate("unresolvedPoints", "何が未回収要素として扱えるか、要レビューです。");

  const reception = setTemplate("reception", "反応・受け止められ方は未整理です。必要に応じて追記してください。");
  const interpretation = setTemplate("interpretation", "解釈・考察は未整理です。複数説がある場合は分けて追記してください。");
  const futurePossibility = setTemplate("futurePossibility", "続編・補足資料・再設定で拾われる余地があるかは未整理です。");
  const discussionPoints = setTemplate("discussionPoints", "論点整理は未着手です。未回収か、演出か、設定変更かを確認してください。");
  const timeline = [
    {
      label: "初期整理",
      detail: sourceLinkedExisting
        ? "既存エントリ関連の候補として追加。どの記述に紐づくかの精査が必要。"
        : "自動抽出候補として追加。出典本文を見ながら時系列を補う。"
    }
  ];

  return {
    entry: {
      id: null,
      work,
      medium,
      itemTitle: primaryTitle,
      status,
      tags,
      firstAppearance,
      overview,
      depiction,
      unresolvedPoints,
      reception,
      externalContext,
      interpretation,
      futurePossibility,
      discussionPoints,
      timeline,
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
  const primaryTagHint = inferPrimaryTag(entryRefs, indexes.entryById);
  const thresholds = config.scoring?.thresholds ?? {};

  const candidateType = sourceLinkedExisting ? "evidence_update" : "new_entry";
  const autoEligible = decision.key === "candidate_ready" && candidateType === "new_entry" && !sourceAlreadyUsed;
  const suggested = buildSuggestedEntry(extracted, sourceMeta, {
    workRefs,
    mediumHint,
    primaryTagHint,
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
    console.log("[transform] 抽出バッチがありません。data/extracted を確認してください。");
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
    .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".json") && !dirent.name.startsWith("_"))
    .map((dirent) => dirent.name)
    .sort();

  if (files.length === 0) {
    console.log(`[transform] 対象ファイルがありません: data/extracted/${batch}`);
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
      const rank = (item) => (item.decision?.key === "candidate_ready" ? 0 : item.decision?.key === "needs_review" ? 1 : 2);
      return rank(a) - rank(b) || b.confidence - a.confidence || String(a.candidateId).localeCompare(String(b.candidateId), "ja");
    })
    .map((candidate) => ({
      candidateId: candidate.candidateId,
      sourceId: candidate.sourceId,
      sourceUrl: candidate.sourceUrl,
      title: candidate.suggestedEntry.itemTitle,
      decision: candidate.decision,
      confidence: candidate.confidence,
      candidateType: candidate.candidateType,
      autoEligible: candidate.autoEligible,
      templateFilled: Boolean(candidate.suggestedEntryMeta?.templateFilled),
      duplicateSignals: candidate.duplicateSignals,
      workRefs: candidate.workRefs,
      entryRefs: candidate.entryRefs,
      reviewReasons: candidate.reviewReasons
    }));

  const summary = {
    batch,
    generatedAt: new Date().toISOString(),
    total: candidates.length,
    candidateReadyCount: candidates.filter((candidate) => candidate.decision?.key === "candidate_ready").length,
    needsReviewCount: candidates.filter((candidate) => candidate.decision?.key === "needs_review").length,
    holdCount: candidates.filter((candidate) => candidate.decision?.key === "hold").length,
    autoEligibleCount: candidates.filter((candidate) => candidate.autoEligible).length,
    templateFilledCount: candidates.filter((candidate) => candidate.suggestedEntryMeta?.templateFilled).length,
    evidenceUpdateCount: candidates.filter((candidate) => candidate.candidateType === "evidence_update").length,
    newEntryCount: candidates.filter((candidate) => candidate.candidateType === "new_entry").length
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
