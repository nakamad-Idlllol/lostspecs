const SITE_META = {
  version: "0.4.1",
  updatedAt: "2026-02-23"
};

let entries = [];

const state = {
  search: "",
  medium: "all",
  tag: "all",
  classification: "all",
  selectedId: null
};

const els = {
  searchInput: document.getElementById("searchInput"),
  mediumChips: document.getElementById("mediumChips"),
  tagChips: document.getElementById("tagChips"),
  classChips: document.getElementById("classChips"),
  entryList: document.getElementById("entryList"),
  resultSummary: document.getElementById("resultSummary"),
  resetBtn: document.getElementById("resetBtn"),
  detailEmpty: document.getElementById("detailEmpty"),
  detailCard: document.getElementById("detailCard"),
  metricCount: document.getElementById("metricCount"),
  metricWorks: document.getElementById("metricWorks"),
  entryItemTemplate: document.getElementById("entryItemTemplate"),
  siteVersionCompact: document.getElementById("siteVersionCompact"),
  siteVersionSpec: document.getElementById("siteVersionSpec"),
  siteVersionText: document.getElementById("siteVersionText"),
  siteUpdatedAt: document.getElementById("siteUpdatedAt")
};

function classificationKey(label) {
  if (label === "制作都合") return "production";
  if (label === "作中要素") return "story";
  if (label === "人物要素") return "character";
  return "other";
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeOption(value, options) {
  return options.includes(value) ? value : "all";
}

function getUrlState() {
  const params = new URLSearchParams(window.location.search);
  const mediaOptions = ["all", ...unique(entries.map((e) => e.medium))];
  const tagOptions = ["all", ...unique(entries.flatMap((e) => e.tags))];
  const classOptions = ["all", ...unique(entries.map((e) => e.classification))];
  const selectedId = params.get("e");

  return {
    search: params.get("q") ?? "",
    medium: normalizeOption(params.get("m") ?? "all", mediaOptions),
    tag: normalizeOption(params.get("t") ?? "all", tagOptions),
    classification: normalizeOption(params.get("c") ?? "all", classOptions),
    selectedId
  };
}

function syncUrlState() {
  const params = new URLSearchParams();
  if (state.search) params.set("q", state.search);
  if (state.medium !== "all") params.set("m", state.medium);
  if (state.tag !== "all") params.set("t", state.tag);
  if (state.classification !== "all") params.set("c", state.classification);
  if (state.selectedId) params.set("e", state.selectedId);

  const query = params.toString();
  const hash = window.location.hash;
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
}

function createChip(container, label, value, getter, setter) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  button.dataset.value = value;
  if (getter() === value) {
    button.classList.add("active");
  }
  button.addEventListener("click", () => {
    setter(value);
  });
  container.append(button);
}

function renderFilterChips() {
  els.mediumChips.innerHTML = "";
  els.tagChips.innerHTML = "";
  els.classChips.innerHTML = "";

  const mediaOptions = ["all", ...unique(entries.map((e) => e.medium))];
  const tagOptions = ["all", ...unique(entries.flatMap((e) => e.tags))];
  const classOptions = ["all", ...unique(entries.map((e) => e.classification))];

  mediaOptions.forEach((opt) => {
    createChip(
      els.mediumChips,
      opt === "all" ? "すべて" : opt,
      opt,
      () => state.medium,
      (value) => {
        state.medium = value;
        rerender();
      }
    );
  });

  tagOptions.forEach((opt) => {
    createChip(
      els.tagChips,
      opt === "all" ? "すべて" : opt,
      opt,
      () => state.tag,
      (value) => {
        state.tag = value;
        rerender();
      }
    );
  });

  classOptions.forEach((opt) => {
    createChip(
      els.classChips,
      opt === "all" ? "すべて" : opt,
      opt,
      () => state.classification,
      (value) => {
        state.classification = value;
        rerender();
      }
    );
  });
}

function matchesSearch(entry, search) {
  if (!search) return true;
  const haystack = [
    entry.work,
    entry.itemTitle,
    entry.classification,
    entry.status,
    ...entry.tags,
    entry.factShown,
    entry.factAfter,
    entry.evaluation,
    entry.note
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(search.toLowerCase());
}

function getFilteredEntries() {
  return entries.filter((entry) => {
    const mediumOk = state.medium === "all" || entry.medium === state.medium;
    const tagOk = state.tag === "all" || entry.tags.includes(state.tag);
    const classOk = state.classification === "all" || entry.classification === state.classification;
    const searchOk = matchesSearch(entry, state.search);
    return mediumOk && tagOk && classOk && searchOk;
  });
}

function renderList(filtered) {
  els.entryList.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "条件に一致するエントリはありません。タグか検索条件を緩めてください。";
    els.entryList.append(empty);
    return;
  }

  filtered.forEach((entry, index) => {
    const fragment = els.entryItemTemplate.content.cloneNode(true);
    const button = fragment.querySelector(".entry-item");
    const indexBadge = fragment.querySelector(".index-badge");
    const classBadge = fragment.querySelector(".class-badge");
    const title = fragment.querySelector(".entry-title");
    const work = fragment.querySelector(".entry-work");
    const tagRow = fragment.querySelector(".tag-row");
    const summary = fragment.querySelector(".entry-summary");

    button.dataset.id = entry.id;
    if (state.selectedId === entry.id) {
      button.classList.add("active");
    }

    indexBadge.textContent = String(index + 1).padStart(2, "0");
    classBadge.textContent = entry.classification;
    classBadge.dataset.kind = classificationKey(entry.classification);
    title.textContent = entry.itemTitle;
    work.textContent = `${entry.work} / ${entry.medium}`;
    summary.textContent = `${entry.status} | ${entry.evaluation}`;

    entry.tags.slice(0, 3).forEach((tag) => {
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.textContent = tag;
      tagRow.append(pill);
    });

    button.addEventListener("click", () => {
      state.selectedId = entry.id;
      rerender(false);
    });

    els.entryList.append(fragment);
  });
}

function renderSummary(filtered) {
  const works = new Set(filtered.map((e) => e.work));
  els.resultSummary.textContent = `${filtered.length}件 / ${works.size}作品`;
}

function renderMetrics() {
  els.metricCount.textContent = String(entries.length);
  els.metricWorks.textContent = String(new Set(entries.map((e) => e.work)).size);
}

function renderSiteMeta() {
  if (els.siteVersionCompact) els.siteVersionCompact.textContent = SITE_META.version;
  if (els.siteVersionSpec) els.siteVersionSpec.textContent = SITE_META.version;
  if (els.siteVersionText) els.siteVersionText.textContent = SITE_META.version;
  if (els.siteUpdatedAt) {
    els.siteUpdatedAt.dateTime = SITE_META.updatedAt;
    els.siteUpdatedAt.textContent = SITE_META.updatedAt;
  }
}

function renderLoadMessage(message) {
  els.resultSummary.textContent = "読込中";
  els.entryList.innerHTML = "";
  const box = document.createElement("div");
  box.className = "empty-list";
  box.textContent = message;
  els.entryList.append(box);
  els.detailEmpty.classList.remove("hidden");
  els.detailCard.classList.add("hidden");
  els.detailCard.innerHTML = "";
}

function renderLoadError(error) {
  const isFileProtocol = window.location.protocol === "file:";
  const suffix = isFileProtocol
    ? "（file:// では JSON 読込が失敗する場合があります。ローカルサーバー経由で開いてください）"
    : "";
  renderLoadMessage(`データ読み込みに失敗しました。${error.message}${suffix}`);
  els.resultSummary.textContent = "読込失敗";
}

function validateEntriesShape(data) {
  if (!Array.isArray(data)) {
    throw new Error("entries.json は配列である必要があります");
  }

  const requiredFields = [
    "id",
    "work",
    "medium",
    "itemTitle",
    "classification",
    "status",
    "tags",
    "firstAppearance",
    "factShown",
    "factAfter",
    "evaluation",
    "note",
    "sources"
  ];
  const seenIds = new Set();

  data.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`entries[${index}] がオブジェクトではありません`);
    }

    requiredFields.forEach((field) => {
      if (!(field in entry)) {
        throw new Error(`entries[${index}] に必須項目 ${field} がありません`);
      }
    });

    if (typeof entry.id !== "string" || !entry.id.trim()) {
      throw new Error(`entries[${index}].id が不正です`);
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`重複IDを検出しました: ${entry.id}`);
    }
    seenIds.add(entry.id);

    if (!Array.isArray(entry.tags)) {
      throw new Error(`entries[${index}].tags は配列である必要があります`);
    }
    if (!Array.isArray(entry.sources)) {
      throw new Error(`entries[${index}].sources は配列である必要があります`);
    }
  });

  return data;
}

async function loadEntries() {
  const response = await fetch("entries.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return validateEntriesShape(data);
}

function renderDetail(filtered) {
  let selected = filtered.find((e) => e.id === state.selectedId);
  if (!selected && filtered.length) {
    selected = filtered[0];
    state.selectedId = selected.id;
  }
  if (!selected) {
    els.detailEmpty.classList.remove("hidden");
    els.detailCard.classList.add("hidden");
    els.detailCard.innerHTML = "";
    return;
  }

  els.detailEmpty.classList.add("hidden");
  els.detailCard.classList.remove("hidden");

  const sourceItems = selected.sources
    .map(
      (source) =>
        `<li><a href="${source.url}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a></li>`
    )
    .join("");

  const tagPills = selected.tags
    .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
    .join("");

  els.detailCard.innerHTML = `
    <div class="detail-top">
      <div class="tag-row">${tagPills}</div>
      <h2>${escapeHtml(selected.itemTitle)}</h2>
      <div class="detail-workline">${escapeHtml(selected.work)} / ${escapeHtml(selected.medium)}</div>
    </div>
    <div class="detail-meta">
      <div class="meta-card">
        <span class="key">分類</span>
        <span class="value">${escapeHtml(selected.classification)}</span>
      </div>
      <div class="meta-card">
        <span class="key">現在タグ（仮）</span>
        <span class="value">${escapeHtml(selected.status)}</span>
      </div>
      <div class="meta-card">
        <span class="key">初出</span>
        <span class="value">${escapeHtml(selected.firstAppearance)}</span>
      </div>
      <div class="meta-card">
        <span class="key">運用メモ</span>
        <span class="value">${escapeHtml(selected.note)}</span>
      </div>
    </div>
    <section class="detail-section">
      <h3>作中で示された事実</h3>
      <p>${escapeHtml(selected.factShown)}</p>
    </section>
    <section class="detail-section">
      <h3>その後の扱い（事実ベース）</h3>
      <p>${escapeHtml(selected.factAfter)}</p>
    </section>
    <section class="detail-section">
      <h3>評価 / 整理方針（解釈欄）</h3>
      <p>${escapeHtml(selected.evaluation)}</p>
    </section>
    <section class="detail-section">
      <h3>参考リンク</h3>
      <ul class="source-list">${sourceItems}</ul>
    </section>
    <div class="footer-note">
      この試作は「一覧・検索・分類」の検証目的です。正式運用時は、出典形式（話数/巻数/URL）と断定表現の基準を固定してください。
    </div>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function rerender(rebuildChips = true) {
  const filtered = getFilteredEntries();

  if (rebuildChips) {
    renderFilterChips();
  } else {
    updateChipActiveStates();
  }
  renderSummary(filtered);
  renderDetail(filtered);
  renderList(filtered);
  syncUrlState();
}

function updateChipActiveStates() {
  document.querySelectorAll("#mediumChips .chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.value === state.medium);
  });
  document.querySelectorAll("#tagChips .chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.value === state.tag);
  });
  document.querySelectorAll("#classChips .chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.value === state.classification);
  });
}

function resetFilters() {
  state.search = "";
  state.medium = "all";
  state.tag = "all";
  state.classification = "all";
  els.searchInput.value = "";
  rerender();
}

function initEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    rerender(false);
  });

  els.resetBtn.addEventListener("click", resetFilters);
}

async function init() {
  renderSiteMeta();
  renderLoadMessage("データを読み込んでいます...");

  try {
    entries = await loadEntries();
  } catch (error) {
    console.error(error);
    renderLoadError(error instanceof Error ? error : new Error(String(error)));
    return;
  }

  Object.assign(state, getUrlState());
  els.searchInput.value = state.search;
  renderMetrics();
  initEvents();
  rerender();
}

void init();

