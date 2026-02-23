import fs from "node:fs";
import path from "node:path";
import { loadAutomationConfig } from "./lib/automation-config.mjs";

const SOURCES_PATH = path.resolve(process.cwd(), "sources.json");
const SNAPSHOT_ROOT = path.resolve(process.cwd(), "data", "snapshots");
const robotsCache = new Map();

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limit: Infinity,
    delayMs: null,
    includeDisabled: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--include-disabled") options.includeDisabled = true;
    else if (arg === "--limit") options.limit = Number(argv[++i] ?? "0");
    else if (arg === "--delay-ms") options.delayMs = Number(argv[++i] ?? "0");
    else throw new Error(`未知の引数: ${arg}`);
  }

  if (!Number.isFinite(options.limit) || options.limit <= 0) options.limit = Infinity;
  if (options.delayMs !== null && (!Number.isFinite(options.delayMs) || options.delayMs < 0)) {
    options.delayMs = null;
  }
  return options;
}

function readSources() {
  const root = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
  if (!root || typeof root !== "object" || !Array.isArray(root.items)) {
    throw new Error("sources.json の形式が不正です");
  }
  return root.items;
}

function nowStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}${m}${day}-${hh}${mm}${ss}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizePathForRobots(url) {
  const parsed = new URL(url);
  const pathname = parsed.pathname || "/";
  const search = parsed.search || "";
  return `${pathname}${search}`;
}

function parseRobotsTxt(text) {
  const groups = [];
  let current = null;

  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+#.*$/, "").trim());

  for (const line of lines) {
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || current.closed) {
        current = { userAgents: [], rules: [], crawlDelay: null, closed: false };
        groups.push(current);
      }
      current.userAgents.push(value.toLowerCase());
      continue;
    }

    if (!current) continue;
    current.closed = true;

    if (field === "disallow" || field === "allow") {
      current.rules.push({ type: field, path: value || "/" });
    } else if (field === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.crawlDelay = n;
    }
  }

  return groups;
}

function pickRobotsGroup(groups, userAgent) {
  const ua = userAgent.toLowerCase();
  const token = ua.split(/[\/\s]/)[0];

  let best = null;
  let bestScore = -1;

  for (const group of groups) {
    for (const declared of group.userAgents) {
      let score = -1;
      if (declared === "*") score = 1;
      else if (declared && token.includes(declared)) score = 100 + declared.length;
      else if (declared && ua.includes(declared)) score = 50 + declared.length;

      if (score > bestScore) {
        best = group;
        bestScore = score;
      }
    }
  }

  return best;
}

function robotsDecisionForPath(group, targetUrl) {
  if (!group) return { allowed: true, crawlDelaySec: null, matchedRule: null };

  const pathWithQuery = normalizePathForRobots(targetUrl);
  let winner = null;

  for (const rule of group.rules) {
    const rulePath = rule.path ?? "";
    if (!rulePath) continue;
    if (rulePath === "/") {
      if (!winner || 1 > winner.length || (1 === winner.length && rule.type === "allow")) {
        winner = { ...rule, length: 1 };
      }
      continue;
    }
    if (pathWithQuery.startsWith(rulePath)) {
      const len = rulePath.length;
      if (!winner || len > winner.length || (len === winner.length && rule.type === "allow")) {
        winner = { ...rule, length: len };
      }
    }
  }

  const allowed = !winner || winner.type !== "disallow";
  return { allowed, crawlDelaySec: group.crawlDelay ?? null, matchedRule: winner };
}

async function loadRobotsPolicy(targetUrl, config) {
  const parsed = new URL(targetUrl);
  const origin = parsed.origin;
  if (robotsCache.has(origin)) return robotsCache.get(origin);

  const robotsUrl = new URL("/robots.txt", origin).toString();
  let policy = {
    origin,
    fetched: false,
    available: false,
    group: null,
    error: null
  };

  try {
    const response = await fetch(robotsUrl, {
      headers: { "User-Agent": config.fetch.userAgent },
      signal: AbortSignal.timeout(config.fetch.requestTimeoutMs)
    });

    if (response.ok) {
      const text = await response.text();
      const groups = parseRobotsTxt(text);
      const group = pickRobotsGroup(groups, config.fetch.userAgent);
      policy = { ...policy, fetched: true, available: true, group };
    } else {
      policy = { ...policy, fetched: true, available: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    policy = {
      ...policy,
      fetched: true,
      available: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  robotsCache.set(origin, policy);
  return policy;
}

function isDomainAllowed(url, config) {
  const host = new URL(url).hostname.toLowerCase();
  const allow = config.fetch.allowDomains ?? [];
  const deny = config.fetch.denyDomains ?? [];

  if (deny.some((d) => host === d || host.endsWith(`.${d}`))) return false;
  if (allow.length === 0) return true;
  return allow.some((d) => host === d || host.endsWith(`.${d}`));
}

function makePolicyRecord({ config, robotsPolicy, robotsDecision, effectiveDelayMs }) {
  return {
    respectRobotsTxt: Boolean(config.fetch.respectRobotsTxt),
    respectCrawlDelay: Boolean(config.fetch.respectCrawlDelay),
    robotsFetched: robotsPolicy?.fetched ?? false,
    robotsAvailable: robotsPolicy?.available ?? false,
    robotsError: robotsPolicy?.error ?? null,
    robotsAllowed: robotsDecision?.allowed ?? true,
    robotsMatchedRule: robotsDecision?.matchedRule
      ? { type: robotsDecision.matchedRule.type, path: robotsDecision.matchedRule.path }
      : null,
    crawlDelaySec: robotsDecision?.crawlDelaySec ?? null,
    effectiveDelayMs
  };
}

async function evaluateFetchPolicy(item, config, baseDelayMs) {
  const policy = {
    allowed: true,
    reason: null,
    effectiveDelayMs: baseDelayMs,
    robotsPolicy: null,
    robotsDecision: null
  };

  if (!isDomainAllowed(item.url, config)) {
    policy.allowed = false;
    policy.reason = "domain_blocked_by_policy";
    return policy;
  }

  if (!config.fetch.respectRobotsTxt) {
    return policy;
  }

  const robotsPolicy = await loadRobotsPolicy(item.url, config);
  policy.robotsPolicy = robotsPolicy;

  if (robotsPolicy.available && robotsPolicy.group) {
    const decision = robotsDecisionForPath(robotsPolicy.group, item.url);
    policy.robotsDecision = decision;

    if (!decision.allowed) {
      policy.allowed = false;
      policy.reason = "blocked_by_robots";
      return policy;
    }

    if (config.fetch.respectCrawlDelay && decision.crawlDelaySec !== null) {
      policy.effectiveDelayMs = Math.max(policy.effectiveDelayMs, Math.ceil(decision.crawlDelaySec * 1000));
    }
  }

  return policy;
}

async function fetchOne(item, outDir, config, effectiveDelayMs, policyInfo) {
  const startedAt = new Date().toISOString();
  let record;

  try {
    const response = await fetch(item.url, {
      headers: {
        "User-Agent": config.fetch.userAgent
      },
      signal: AbortSignal.timeout(config.fetch.requestTimeoutMs)
    });

    let text = await response.text();
    if (text.length > config.fetch.maxBodyChars) {
      text = text.slice(0, config.fetch.maxBodyChars);
    }

    record = {
      sourceId: item.id,
      url: item.url,
      fetchedAt: new Date().toISOString(),
      startedAt,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type") ?? "",
      finalUrl: response.url,
      body: text,
      policy: makePolicyRecord({
        config,
        robotsPolicy: policyInfo.robotsPolicy,
        robotsDecision: policyInfo.robotsDecision,
        effectiveDelayMs
      })
    };
  } catch (error) {
    record = {
      sourceId: item.id,
      url: item.url,
      fetchedAt: new Date().toISOString(),
      startedAt,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      policy: makePolicyRecord({
        config,
        robotsPolicy: policyInfo.robotsPolicy,
        robotsDecision: policyInfo.robotsDecision,
        effectiveDelayMs
      })
    };
  }

  const fileName = `${sanitizeFileName(item.id)}.json`;
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(record, null, 2) + "\n", "utf8");

  return record;
}

async function writeSkipRecord(item, outDir, config, policyInfo) {
  const record = {
    sourceId: item.id,
    url: item.url,
    fetchedAt: new Date().toISOString(),
    ok: false,
    skipped: true,
    skipReason: policyInfo.reason,
    policy: makePolicyRecord({
      config,
      robotsPolicy: policyInfo.robotsPolicy,
      robotsDecision: policyInfo.robotsDecision,
      effectiveDelayMs: policyInfo.effectiveDelayMs
    })
  };
  const fileName = `${sanitizeFileName(item.id)}.json`;
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(record, null, 2) + "\n", "utf8");
  return record;
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const config = loadAutomationConfig();
  const baseDelayMs = cli.delayMs ?? config.fetch.defaultDelayMs;

  const items = readSources()
    .filter((item) => cli.includeDisabled || item.enabled)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id, "ja"))
    .slice(0, cli.limit);

  if (items.length === 0) {
    console.log("[fetch] 対象ソースがありません");
    return;
  }

  console.log(
    `[fetch] targets=${items.length} dryRun=${cli.dryRun} baseDelayMs=${baseDelayMs} robots=${config.fetch.respectRobotsTxt}`
  );
  items.forEach((item, index) => {
    console.log(`  ${String(index + 1).padStart(2, "0")}. [p${item.priority}] ${item.id} -> ${item.url}`);
  });

  if (cli.dryRun) return;

  const batchDir = path.join(SNAPSHOT_ROOT, nowStamp());
  fs.mkdirSync(batchDir, { recursive: true });

  let success = 0;
  let failure = 0;
  let skipped = 0;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const policyInfo = await evaluateFetchPolicy(item, config, baseDelayMs);

    let result;
    if (!policyInfo.allowed) {
      result = await writeSkipRecord(item, batchDir, config, policyInfo);
      skipped += 1;
      console.log(`[fetch] ${i + 1}/${items.length} ${item.id} -> SKIP ${policyInfo.reason}`);
    } else {
      result = await fetchOne(item, batchDir, config, policyInfo.effectiveDelayMs, policyInfo);
      if (result.ok) success += 1;
      else failure += 1;
      console.log(
        `[fetch] ${i + 1}/${items.length} ${item.id} -> ${result.ok ? result.status : `ERROR ${result.error}`}`
      );
    }

    const waitMs = policyInfo.effectiveDelayMs;
    if (i < items.length - 1 && waitMs > 0) {
      await sleep(waitMs);
    }
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    total: items.length,
    success,
    failure,
    skipped,
    policy: {
      userAgent: config.fetch.userAgent,
      respectRobotsTxt: config.fetch.respectRobotsTxt,
      respectCrawlDelay: config.fetch.respectCrawlDelay,
      baseDelayMs
    },
    items: items.map((item) => ({ id: item.id, url: item.url }))
  };
  fs.writeFileSync(path.join(batchDir, "_manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

  console.log(
    `[fetch] completed: success=${success} failure=${failure} skipped=${skipped} dir=${path.relative(process.cwd(), batchDir)}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
