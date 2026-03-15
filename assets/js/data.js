export const SITE_META = {
  version: "0.5.0",
  updatedAt: "2026-03-05"
};

const REQUIRED_FIELDS = [
  "id",
  "work",
  "medium",
  "itemTitle",
  "classification",
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

function validateEntriesShape(data) {
  if (!Array.isArray(data)) {
    throw new Error("entries.json は配列である必要があります。");
  }

  const seen = new Set();
  data.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`entries[${index}] が不正です。`);
    }
    REQUIRED_FIELDS.forEach((field) => {
      if (!(field in entry)) {
        throw new Error(`entries[${index}] に必須項目 ${field} がありません。`);
      }
    });
    if (!Number.isInteger(entry.id) || entry.id <= 0) {
      throw new Error(`entries[${index}].id が不正です。`);
    }
    if (seen.has(entry.id)) {
      throw new Error(`重複IDを検出しました: ${entry.id}`);
    }
    seen.add(entry.id);
    if (!Array.isArray(entry.tags)) {
      throw new Error(`entries[${index}].tags は配列である必要があります。`);
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
      .then((json) => validateEntriesShape(json));
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
