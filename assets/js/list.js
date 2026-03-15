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
  t: "all"
};

let entries = [];

const els = {
  searchInput: document.getElementById("searchInput"),
  mediumSelect: document.getElementById("mediumSelect"),
  tagSelect: document.getElementById("tagSelect"),
  resultSummary: document.getElementById("resultSummary"),
  entryList: document.getElementById("entryList"),
  resetBtn: document.getElementById("resetBtn")
};

function parseState(mediumOptions, tagOptions) {
  const params = new URLSearchParams(window.location.search);
  state.q = (params.get("q") || "").trim();
  state.m = normalizeOption(params.get("m") || "all", mediumOptions);
  state.t = normalizeOption(params.get("t") || "all", tagOptions);
}

function fillSelect(select, values, selected) {
  if (!select) return;

  select.innerHTML = "";

  const all = document.createElement("option");
  all.value = "all";
  all.textContent = "すべて";
  select.append(all);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });

  select.value = selected;
}

function matchesSearch(entry, query) {
  if (!query) return true;

  const haystack = [
    entry.work,
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
    const matchTag = state.t === "all" || entry.tags.includes(state.t);
    const matchQuery = matchesSearch(entry, state.q);
    return matchMedium && matchTag && matchQuery;
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
    els.entryList.innerHTML = '<p class="empty-state">条件に一致する記事はありません。検索語かタグを調整してください。</p>';
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
    t: state.t
  });
}

function rerender() {
  const filtered = getFilteredEntries();
  renderSummary(filtered);
  renderList(filtered);
  syncQuery();
}

function resetFilters() {
  state.q = "";
  state.m = "all";
  state.t = "all";

  if (els.searchInput) els.searchInput.value = "";
  if (els.mediumSelect) els.mediumSelect.value = "all";
  if (els.tagSelect) els.tagSelect.value = "all";

  rerender();
}

function initEvents() {
  if (els.searchInput) {
    els.searchInput.addEventListener("input", (event) => {
      state.q = event.target.value.trim();
      rerender();
    });
  }

  if (els.mediumSelect) {
    els.mediumSelect.addEventListener("change", (event) => {
      state.m = event.target.value;
      rerender();
    });
  }

  if (els.tagSelect) {
    els.tagSelect.addEventListener("change", (event) => {
      state.t = event.target.value;
      rerender();
    });
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

  const mediumOptions = ["all", ...uniqueStrings(entries.map((entry) => entry.medium))];
  const tagOptions = ["all", ...uniqueStrings(entries.flatMap((entry) => entry.tags))];

  parseState(mediumOptions, tagOptions);

  fillSelect(els.mediumSelect, mediumOptions.slice(1), state.m);
  fillSelect(els.tagSelect, tagOptions.slice(1), state.t);

  if (els.searchInput) {
    els.searchInput.value = state.q;
  }

  initEvents();
  rerender();
}

void init();
