import {
  buildTermUrl,
  escapeHtml,
  loadEntries,
  normalizeOption,
  shorten,
  syncFooterMeta,
  uniqueStrings,
  updateUrlQuery
} from "./data.js";

const state = {
  q: "",
  m: "all",
  t: []
};

const KNOWN_MEDIA = ["アニメ", "漫画", "ゲーム"];
const MAX_SUGGESTIONS = 8;

let entries = [];
let filterOptions = [];

const els = {
  searchInput: document.getElementById("searchInput"),
  selectedFilters: document.getElementById("selectedFilters"),
  searchSuggestions: document.getElementById("searchSuggestions"),
  resultSummary: document.getElementById("resultSummary"),
  entryList: document.getElementById("entryList"),
  resetBtn: document.getElementById("resetBtn")
};

function sanitizeSelectedTags(value, options) {
  const allowed = new Set(options);
  const seen = new Set();
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag && allowed.has(tag) && !seen.has(tag) && seen.add(tag));
}

function parseState(mediumOptions, tagOptions) {
  const params = new URLSearchParams(window.location.search);
  state.q = (params.get("q") || "").trim();
  state.m = normalizeOption(params.get("m") || "all", mediumOptions);
  state.t = sanitizeSelectedTags(params.get("t"), tagOptions);
}

function createFilterOptions() {
  const mediums = uniqueStrings([...KNOWN_MEDIA, ...entries.map((entry) => entry.medium)]);
  const tags = uniqueStrings(entries.flatMap((entry) => entry.tags));

  filterOptions = [
    ...mediums.map((value) => ({
      kind: "medium",
      label: "媒体",
      value
    })),
    ...tags.map((value) => ({
      kind: "tag",
      label: "タグ",
      value
    }))
  ];

  return {
    mediumOptions: ["all", ...mediums],
    tagOptions: tags
  };
}

function getSelectedFilterItems() {
  const selected = [];

  if (state.m !== "all") {
    selected.push({ kind: "medium", label: "媒体", value: state.m });
  }

  state.t.forEach((tag) => {
    selected.push({ kind: "tag", label: "タグ", value: tag });
  });

  return selected;
}

function renderSelectedFilters() {
  if (!els.selectedFilters) return;

  const selected = getSelectedFilterItems();

  if (!selected.length) {
    els.selectedFilters.innerHTML = '<span class="filter-chip filter-chip-subtle">追加した絞り込み条件はここに表示されます</span>';
    return;
  }

  els.selectedFilters.innerHTML = selected
    .map(
      (item) => `
        <span class="filter-chip filter-chip-active selected-filter-chip">
          <span class="filter-chip-kind">${escapeHtml(item.label)}</span>
          <span>${escapeHtml(item.value)}</span>
          <button
            type="button"
            class="filter-chip-remove"
            data-kind="${escapeHtml(item.kind)}"
            data-value="${escapeHtml(item.value)}"
            aria-label="${escapeHtml(`${item.label} ${item.value} を外す`)}"
          >
            ×
          </button>
        </span>
      `
    )
    .join("");

  els.selectedFilters.querySelectorAll(".filter-chip-remove").forEach((button) => {
    button.addEventListener("click", () => {
      removeFilter(button.dataset.kind, button.dataset.value || "");
    });
  });
}

function getMatchingFilters(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return filterOptions
    .filter((option) => {
      if (option.kind === "medium" && state.m === option.value) return false;
      if (option.kind === "tag" && state.t.includes(option.value)) return false;
      return option.value.toLowerCase().includes(normalized);
    })
    .sort((a, b) => {
      const aStarts = a.value.toLowerCase().startsWith(normalized) ? 0 : 1;
      const bStarts = b.value.toLowerCase().startsWith(normalized) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.value.localeCompare(b.value, "ja");
    })
    .slice(0, MAX_SUGGESTIONS);
}

function renderSuggestions() {
  if (!els.searchSuggestions) return;

  const suggestions = getMatchingFilters(state.q);

  if (!state.q) {
    els.searchSuggestions.innerHTML = "";
    return;
  }

  if (!suggestions.length) {
    els.searchSuggestions.innerHTML = '<span class="filter-chip filter-chip-subtle">候補にない語はそのまま全文検索に使われます</span>';
    return;
  }

  els.searchSuggestions.innerHTML = suggestions
    .map(
      (option) => `
        <button
          type="button"
          class="filter-chip search-suggestion-chip"
          data-kind="${escapeHtml(option.kind)}"
          data-value="${escapeHtml(option.value)}"
        >
          <span class="filter-chip-kind">${escapeHtml(option.label)}</span>
          <span>${escapeHtml(option.value)}</span>
        </button>
      `
    )
    .join("");

  els.searchSuggestions.querySelectorAll(".search-suggestion-chip").forEach((button) => {
    button.addEventListener("click", () => {
      addFilter({
        kind: button.dataset.kind,
        value: button.dataset.value || ""
      });
    });
  });
}

function addFilter(option) {
  if (!option?.value) return;

  if (option.kind === "medium") {
    state.m = option.value;
  } else if (option.kind === "tag" && !state.t.includes(option.value)) {
    state.t = [...state.t, option.value];
  }

  state.q = "";
  if (els.searchInput) {
    els.searchInput.value = "";
    els.searchInput.focus();
  }

  rerender();
}

function removeFilter(kind, value) {
  if (kind === "medium" && state.m === value) {
    state.m = "all";
  }

  if (kind === "tag") {
    state.t = state.t.filter((tag) => tag !== value);
  }

  rerender();
}

function matchesSearch(entry, query) {
  if (!query) return true;

  const haystack = [
    entry.work,
    entry.medium,
    entry.itemTitle,
    entry.status,
    entry.firstAppearance,
    entry.overview,
    entry.depiction,
    entry.unresolvedPoints,
    entry.reception,
    entry.externalContext,
    entry.interpretation,
    entry.futurePossibility,
    entry.discussionPoints,
    ...entry.timeline.flatMap((item) => [item.label, item.detail]),
    ...entry.tags
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function getFilteredEntries() {
  return entries.filter((entry) => {
    const matchMedium = state.m === "all" || entry.medium === state.m;
    const matchTags = state.t.every((tag) => entry.tags.includes(tag));
    const matchQuery = matchesSearch(entry, state.q);
    return matchMedium && matchTags && matchQuery;
  });
}

function renderSummary(filtered) {
  if (!els.resultSummary) return;

  const works = new Set(filtered.map((entry) => entry.work));
  els.resultSummary.textContent = `${filtered.length}件 / ${works.size}作品`;
}

function renderList(filtered) {
  if (!els.entryList) return;

  if (!filtered.length) {
    els.entryList.innerHTML = '<p class="empty-state">条件に一致する記事はありません。検索語か絞り込み条件を調整してください。</p>';
    return;
  }

  els.entryList.innerHTML = filtered
    .map((entry) => {
      const primaryTag = entry.tags[0] ?? "";
      return `
        <article class="entry-card">
          <div class="entry-head">
            <h3 class="entry-title"><a href="${buildTermUrl(entry.id)}">${escapeHtml(entry.itemTitle)}</a></h3>
            ${primaryTag ? `<span class="tag-pill">${escapeHtml(primaryTag)}</span>` : ""}
          </div>
          <p class="entry-meta">${escapeHtml(entry.work)} / ${escapeHtml(entry.medium)} / ${escapeHtml(entry.status)}</p>
          <p class="entry-summary">${escapeHtml(shorten(entry.overview, 120))}</p>
          <div class="entry-tags">
            ${entry.tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <a class="button ghost entry-card-link" href="${buildTermUrl(entry.id)}">記事詳細へ</a>
        </article>
      `;
    })
    .join("");
}

function syncQuery() {
  updateUrlQuery({
    q: state.q,
    m: state.m,
    t: state.t.join(",")
  });
}

function rerender() {
  const filtered = getFilteredEntries();
  renderSelectedFilters();
  renderSuggestions();
  renderSummary(filtered);
  renderList(filtered);
  syncQuery();
}

function resetFilters() {
  state.q = "";
  state.m = "all";
  state.t = [];

  if (els.searchInput) {
    els.searchInput.value = "";
  }

  rerender();
}

function handleSearchKeydown(event) {
  if (event.key === "Enter") {
    const [firstSuggestion] = getMatchingFilters(state.q);
    if (firstSuggestion) {
      event.preventDefault();
      addFilter(firstSuggestion);
    }
    return;
  }

  if (event.key === "Backspace" && !state.q && state.t.length) {
    state.t = state.t.slice(0, -1);
    rerender();
  }
}

function initEvents() {
  if (els.searchInput) {
    els.searchInput.addEventListener("input", (event) => {
      state.q = event.target.value.trim();
      rerender();
    });

    els.searchInput.addEventListener("keydown", handleSearchKeydown);
  }

  if (els.resetBtn) {
    els.resetBtn.addEventListener("click", resetFilters);
  }
}

function renderLoadError(message) {
  if (els.resultSummary) {
    els.resultSummary.textContent = "読み込み失敗";
  }
  if (els.entryList) {
    els.entryList.innerHTML = `<p class="empty-state">entries.json の読み込みに失敗しました: ${escapeHtml(message)}</p>`;
  }
}

async function init() {
  syncFooterMeta();

  try {
    entries = await loadEntries();
  } catch (error) {
    renderLoadError(error instanceof Error ? error.message : String(error));
    return;
  }

  const { mediumOptions, tagOptions } = createFilterOptions();
  parseState(mediumOptions, tagOptions);

  if (els.searchInput) {
    els.searchInput.value = state.q;
  }

  initEvents();
  rerender();
}

void init();
