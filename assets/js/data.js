import {
  DIVISION_OPTIONS,
  JUDGEMENT_OPTIONS,
  deriveDivision,
  deriveJudgement,
  enrichEntry,
  getEntryAxes
} from "./entry-taxonomy.js?v=20260321b";

export const SITE_META = {
  version: "0.5.0",
  updatedAt: "2026-03-30"
};

const REQUIRED_FIELDS = [
  "id",
  "work",
  "medium",
  "itemTitle",
  "status",
  "tags",
  "firstAppearance",
  "firstAppearanceDetail",
  "overview",
  "depiction",
  "unresolvedPoints",
  "reception",
  "externalContext",
  "interpretation",
  "futurePossibility",
  "discussionPoints",
  "appearanceTimeline",
  "outsideTimeline",
  "sources"
];

let entriesPromise = null;

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

    if (!Array.isArray(entry.appearanceTimeline)) {
      throw new Error(`entries[${index}].appearanceTimeline は配列である必要があります。`);
    }

    if (!Array.isArray(entry.outsideTimeline)) {
      throw new Error(`entries[${index}].outsideTimeline は配列である必要があります。`);
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
