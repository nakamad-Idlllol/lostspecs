export const SITE_META = {
  version: "0.5.0",
  updatedAt: "2026-03-21"
};

export const DIVISION_OPTIONS = ["人物", "アイテム", "場所", "エピソード", "演出", "組織", "設定", "境界事例"];
export const JUDGEMENT_OPTIONS = ["未回収", "要判断", "制作事情", "外部補足"];

const PRODUCTION_MARKERS = ["制作都合", "構想変更", "未放送", "制作都合で未使用"];
const UNRESOLVED_MARKERS = ["未回収"];
const PENDING_MARKERS = ["解釈が分かれる", "境界事例"];
const EXTERNAL_MARKERS = ["外部説明あり"];

const REQUIRED_FIELDS = [
  "id",
  "work",
  "medium",
  "itemTitle",
  "status",
  "tags",
  "firstAppearance",
  "overview",
  "depiction",
  "unresolvedPoints",
  "reception",
  "externalContext",
  "interpretation",
  "futurePossibility",
  "discussionPoints",
  "timeline",
  "sources"
];

let entriesPromise = null;

function hasMarker(entry, markers) {
  return [entry.status, ...entry.tags].some((value) => markers.some((marker) => String(value).includes(marker)));
}

export function deriveDivision(entry) {
  return DIVISION_OPTIONS.find((label) => entry.tags.includes(label)) || "設定";
}

export function deriveJudgement(entry) {
  if (hasMarker(entry, PRODUCTION_MARKERS)) return "制作事情";
  if (hasMarker(entry, UNRESOLVED_MARKERS)) return "未回収";
  if (hasMarker(entry, PENDING_MARKERS)) return "要判断";
  if (hasMarker(entry, EXTERNAL_MARKERS)) return "外部補足";
  return "要判断";
}

export function enrichEntry(entry) {
  return {
    ...entry,
    division: deriveDivision(entry),
    judgement: deriveJudgement(entry)
  };
}

export function getEntryAxes(entry) {
  return {
    medium: entry.medium,
    work: entry.work,
    division: entry.division ?? deriveDivision(entry),
    judgement: entry.judgement ?? deriveJudgement(entry)
  };
}

export function getAxisOptions(entries) {
  return {
    mediumOptions: ["all", ...uniqueStrings(entries.map((entry) => entry.medium))],
    workOptions: ["all", ...uniqueStrings(entries.map((entry) => entry.work))],
    divisionOptions: ["all", ...uniqueStrings(entries.map((entry) => entry.division ?? deriveDivision(entry)))],
    judgementOptions: ["all", ...uniqueStrings(entries.map((entry) => entry.judgement ?? deriveJudgement(entry)))]
  };
}

function validateEntriesShape(data) {
  if (!Array.isArray(data)) {
    throw new Error("entries.json は配列である必要があります。");
  }

  const seen = new Set();
  data.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`entries[${index}] はオブジェクトである必要があります。`);
    }

    REQUIRED_FIELDS.forEach((field) => {
      if (!(field in entry)) {
        throw new Error(`entries[${index}] に必須フィールド ${field} がありません。`);
      }
    });

    if (!Number.isInteger(entry.id) || entry.id <= 0) {
      throw new Error(`entries[${index}].id は正の整数である必要があります。`);
    }

    if (seen.has(entry.id)) {
      throw new Error(`重複したIDがあります: ${entry.id}`);
    }
    seen.add(entry.id);

    if (!Array.isArray(entry.tags) || entry.tags.length === 0) {
      throw new Error(`entries[${index}].tags は1件以上の配列である必要があります。`);
    }

    if (!Array.isArray(entry.timeline)) {
      throw new Error(`entries[${index}].timeline は配列である必要があります。`);
    }

    if (!Array.isArray(entry.sources)) {
      throw new Error(`entries[${index}].sources は配列である必要があります。`);
    }
  });

  return data;
}

export async function loadEntries() {
  if (!entriesPromise) {
    entriesPromise = fetch("entries.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`entries.json の取得に失敗しました (HTTP ${response.status})`);
        }
        return response.json();
      })
      .then((json) => validateEntriesShape(json).map((entry) => enrichEntry(entry)));
  }

  return entriesPromise;
}

export function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
}

export function countWorks(entries) {
  return new Set(entries.map((entry) => entry.work)).size;
}

export function buildTermUrl(id) {
  return `term.html?id=${encodeURIComponent(String(id))}`;
}

export function buildEntriesUrl(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) {
        search.set(key, value.join(","));
      }
      return;
    }

    if (value && value !== "all") {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return `entries.html${query ? `?${query}` : ""}`;
}

export function buildCategoriesUrl(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) {
        search.set(key, value.join(","));
      }
      return;
    }

    if (value && value !== "all") {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return `categories.html${query ? `?${query}` : ""}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function shorten(text, maxLength = 120) {
  const value = String(text ?? "");
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

export function syncFooterMeta() {
  const versionEl = document.getElementById("siteVersion");
  const updatedAtEl = document.getElementById("siteUpdatedAt");

  if (versionEl) versionEl.textContent = SITE_META.version;
  if (updatedAtEl) {
    updatedAtEl.dateTime = SITE_META.updatedAt;
    updatedAtEl.textContent = SITE_META.updatedAt;
  }
}

export function normalizeOption(value, options) {
  return options.includes(value) ? value : "all";
}

export function updateUrlQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) {
        search.set(key, value.join(","));
      }
      return;
    }

    if (value && value !== "all") {
      search.set(key, value);
    }
  });

  const next = `${window.location.pathname}${search.toString() ? `?${search.toString()}` : ""}`;
  const current = `${window.location.pathname}${window.location.search}`;

  if (next !== current) {
    window.history.replaceState(null, "", next);
  }
}
