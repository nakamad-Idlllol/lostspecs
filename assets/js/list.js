import {
  DIVISION_OPTIONS,
  JUDGEMENT_OPTIONS,
  buildTermUrl,
  escapeHtml,
  getAxisOptions,
  loadEntries,
  normalizeOption,
  shorten,
  syncFooterMeta,
  updateUrlQuery
} from "./data.js";

const state = {
  q: "",
  m: "all",
  w: "all",
  d: "all",
  j: "all"
};

let entries = [];
let workOptions = [];

const els = {
  searchInput: document.getElementById("searchInput"),
  workInput: document.getElementById("workInput"),
  workOptions: document.getElementById("workOptions"),
  mediumChips: document.getElementById("mediumChips"),
  divisionChips: document.getElementById("divisionChips"),
  judgementChips: document.getElementById("judgementChips"),
  activeFilters: document.getElementById("activeFilters"),
  resultSummary: document.getElementById("resultSummary"),
  entryList: document.getElementById("entryList"),
  resetBtn: document.getElementById("resetBtn")
};

function parseState(options) {
  const params = new URLSearchParams(window.location.search);
  state.q = (params.get("q") || "").trim();
  state.m = normalizeOption(params.get("m") || "all", options.mediumOptions);
  state.w = normalizeOption(params.get("w") || "all", options.workOptions);
  state.d = normalizeOption(params.get("d") || "all", options.divisionOptions);
  state.j = normalizeOption(params.get("j") || "all", options.judgementOptions);
}

function renderChipGroup(container, values, selected, onSelect) {
  if (!container) return;

  container.innerHTML = "";

  ["all", ...values].forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-chip";
    button.dataset.value = value;
    button.textContent = value === "all" ? "すべて" : value;
    button.setAttribute("aria-pressed", String(selected === value));

    if (selected === value) {
      button.classList.add("filter-chip-active");
    }

    button.addEventListener("click", () => onSelect(value));
    container.append(button);
  });
}

function renderWorkOptions(values) {
  if (!els.workOptions) return;

  els.workOptions.innerHTML = values
    .map((value) => `<option value="${escapeHtml(value)}"></option>`)
    .join("");
}

function renderActiveFilters() {
  if (!els.activeFilters) return;

  const active = [
    state.m !== "all" ? { label: "媒体", value: state.m, key: "m" } : null,
    state.w !== "all" ? { label: "作品", value: state.w, key: "w" } : null,
    state.d !== "all" ? { label: "分別", value: state.d, key: "d" } : null,
    state.j !== "all" ? { label: "判別", value: state.j, key: "j" } : null
  ].filter(Boolean);

  if (!active.length) {
    els.activeFilters.innerHTML = '<span class="filter-chip filter-chip-subtle">4軸の条件を選ぶとここに表示されます</span>';
    return;
  }

  els.activeFilters.innerHTML = active
    .map(
      (item) => `
        <span class="filter-chip filter-chip-active selected-filter-chip">
          <span class="filter-chip-kind">${escapeHtml(item.label)}</span>
          <span>${escapeHtml(item.value)}</span>
          <button
            type="button"
            class="filter-chip-remove"
            data-key="${escapeHtml(item.key)}"
            aria-label="${escapeHtml(`${item.label} ${item.value} を外す`)}"
          >
            ×
          </button>
        </span>
      `
    )
    .join("");

  els.activeFilters.querySelectorAll(".filter-chip-remove").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.key;
      if (!key) return;
      state[key] = "all";
      if (key === "w" && els.workInput) {
        els.workInput.value = "";
      }
      rerender();
    });
  });
}

function renderFilterControls() {
  const options = getAxisOptions(entries);

  renderChipGroup(els.mediumChips, options.mediumOptions.slice(1), state.m, (value) => {
    state.m = value;
    rerender();
  });

  renderChipGroup(els.divisionChips, DIVISION_OPTIONS, state.d, (value) => {
    state.d = value;
    rerender();
  });

  renderChipGroup(els.judgementChips, JUDGEMENT_OPTIONS, state.j, (value) => {
    state.j = value;
    rerender();
  });

  renderActiveFilters();
}

function matchesSearch(entry, query) {
  if (!query) return true;

  const haystack = [
    entry.work,
    entry.medium,
    entry.division,
    entry.judgement,
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
    const matchWork = state.w === "all" || entry.work === state.w;
    const matchDivision = state.d === "all" || entry.division === state.d;
    const matchJudgement = state.j === "all" || entry.judgement === state.j;
    const matchQuery = matchesSearch(entry, state.q);
    return matchMedium && matchWork && matchDivision && matchJudgement && matchQuery;
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
    els.entryList.innerHTML = '<p class="empty-state">条件に一致する記事はありません。4軸の条件か検索語を調整してください。</p>';
    return;
  }

  els.entryList.innerHTML = filtered
    .map(
      (entry) => `
        <article class="entry-card">
          <div class="entry-head">
            <h3 class="entry-title"><a href="${buildTermUrl(entry.id)}">${escapeHtml(entry.itemTitle)}</a></h3>
            <span class="tag-pill">${escapeHtml(entry.division)}</span>
          </div>
          <p class="entry-meta">${escapeHtml(entry.work)} / ${escapeHtml(entry.medium)} / ${escapeHtml(entry.judgement)}</p>
          <p class="entry-summary">${escapeHtml(shorten(entry.overview, 120))}</p>
          <div class="entry-tags">
            <span class="tag-pill">${escapeHtml(entry.division)}</span>
            <span class="tag-pill">${escapeHtml(entry.judgement)}</span>
            ${entry.tags.slice(0, 3).map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <a class="button ghost entry-card-link" href="${buildTermUrl(entry.id)}">記事詳細へ</a>
        </article>
      `
    )
    .join("");
}

function syncQuery() {
  updateUrlQuery({
    q: state.q,
    m: state.m,
    w: state.w,
    d: state.d,
    j: state.j
  });
}

function rerender() {
  const filtered = getFilteredEntries();
  renderFilterControls();
  renderSummary(filtered);
  renderList(filtered);
  syncQuery();
}

function resetFilters() {
  state.q = "";
  state.m = "all";
  state.w = "all";
  state.d = "all";
  state.j = "all";

  if (els.searchInput) els.searchInput.value = "";
  if (els.workInput) els.workInput.value = "";

  rerender();
}

function handleWorkInput() {
  if (!els.workInput) return;

  const value = els.workInput.value.trim();
  state.w = value ? normalizeOption(value, ["all", ...workOptions]) : "all";
  rerender();
}

function initEvents() {
  if (els.searchInput) {
    els.searchInput.addEventListener("input", (event) => {
      state.q = event.target.value.trim();
      rerender();
    });
  }

  if (els.workInput) {
    els.workInput.addEventListener("input", handleWorkInput);
    els.workInput.addEventListener("change", handleWorkInput);
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

  const options = getAxisOptions(entries);
  workOptions = options.workOptions.slice(1);
  parseState(options);
  renderWorkOptions(workOptions);

  if (els.searchInput) {
    els.searchInput.value = state.q;
  }

  if (els.workInput && state.w !== "all") {
    els.workInput.value = state.w;
  }

  initEvents();
  rerender();
}

void init();
