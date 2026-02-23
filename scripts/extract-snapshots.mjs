import fs from "node:fs";
import path from "node:path";

const SNAPSHOT_ROOT = path.resolve(process.cwd(), "data", "snapshots");
const EXTRACTED_ROOT = path.resolve(process.cwd(), "data", "extracted");

function parseArgs(argv) {
  const options = {
    batch: null
  };
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
  const dirs = listDirs(SNAPSHOT_ROOT);
  return dirs.at(-1) ?? null;
}

function stripHtml(html) {
  return String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagText(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? stripHtml(match[1]).slice(0, 500) : "";
}

function extractMetaContent(html, attrName, attrValue) {
  const escapedAttrName = attrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedAttrValue = attrValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta[^>]+${escapedAttrName}=["']${escapedAttrValue}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i"
  );
  const reSwap = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*${escapedAttrName}=["']${escapedAttrValue}["'][^>]*>`,
    "i"
  );
  const match = html.match(re) ?? html.match(reSwap);
  return match ? match[1].trim() : "";
}

function scoreExtraction(record, extracted) {
  let score = 0;
  const reasons = [];

  if (record.ok) score += 20;
  else reasons.push("fetch_failed");

  if (typeof record.status === "number" && record.status >= 200 && record.status < 300) score += 20;
  else reasons.push("non_2xx");

  if (record.contentType?.includes("text/html")) score += 20;
  else reasons.push("non_html");

  if (extracted.title) score += 15;
  else reasons.push("missing_title");

  if (extracted.ogTitle) score += 10;
  if (extracted.h1) score += 10;
  if (extracted.textSample.length >= 80) score += 5;
  else reasons.push("short_text");

  return {
    confidence: Math.max(0, Math.min(100, score)),
    reviewReasons: reasons
  };
}

function extractRecord(record) {
  const body = typeof record.body === "string" ? record.body : "";
  const title = extractTagText(body, "title");
  const h1 = extractTagText(body, "h1");
  const ogTitle = extractMetaContent(body, "property", "og:title");
  const text = stripHtml(body);
  const textSample = text.slice(0, 1200);
  const scored = scoreExtraction(record, { title, h1, ogTitle, textSample });

  return {
    sourceId: record.sourceId ?? "",
    url: record.url ?? "",
    fetchedAt: record.fetchedAt ?? "",
    fetchOk: Boolean(record.ok),
    status: record.status ?? null,
    contentType: record.contentType ?? "",
    extracted: {
      title,
      h1,
      ogTitle,
      textSample,
      textLength: text.length
    },
    confidence: scored.confidence,
    reviewReasons: scored.reviewReasons
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const batch = chooseBatch(options.batch);
  if (!batch) {
    console.log("[extract] スナップショットバッチがありません（data/snapshots 配下が空です）");
    return;
  }

  const inDir = path.join(SNAPSHOT_ROOT, batch);
  if (!fs.existsSync(inDir)) {
    throw new Error(`指定バッチが見つかりません: ${batch}`);
  }

  const outDir = path.join(EXTRACTED_ROOT, batch);
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs
    .readdirSync(inDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".json") && d.name !== "_manifest.json")
    .map((d) => d.name)
    .sort();

  if (files.length === 0) {
    console.log(`[extract] 対象ファイルがありません: data/snapshots/${batch}`);
    return;
  }

  const queue = [];
  let processed = 0;

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(inDir, file), "utf8"));
    const extracted = extractRecord(raw);
    fs.writeFileSync(path.join(outDir, file), JSON.stringify(extracted, null, 2) + "\n", "utf8");

    queue.push({
      sourceId: extracted.sourceId,
      url: extracted.url,
      confidence: extracted.confidence,
      reviewReasons: extracted.reviewReasons,
      title: extracted.extracted.title || extracted.extracted.ogTitle || extracted.extracted.h1 || ""
    });
    processed += 1;
  }

  queue.sort((a, b) => a.confidence - b.confidence || a.sourceId.localeCompare(b.sourceId, "ja"));

  fs.writeFileSync(path.join(outDir, "_review-queue.json"), JSON.stringify(queue, null, 2) + "\n", "utf8");
  fs.writeFileSync(
    path.join(outDir, "_summary.json"),
    JSON.stringify(
      {
        batch,
        processed,
        lowConfidenceCount: queue.filter((q) => q.confidence < 60).length,
        generatedAt: new Date().toISOString()
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  console.log(`[extract] processed=${processed} batch=${batch} out=${path.relative(process.cwd(), outDir)}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
