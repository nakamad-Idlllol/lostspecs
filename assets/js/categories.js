import {
  buildEntriesUrl,
  buildTermUrl,
  escapeHtml,
  getAxisOptions,
  loadEntries,
  syncFooterMeta
} from "./data.js?v=20260321b";

const AXES = [
  { key: "medium", label: "媒体", param: "m" },
  { key: "work", label: "作品", param: "w" },
  { key: "division", label: "分別", param: "d" },
  { key: "judgement", label: "判別", param: "j" }
];

const els = {
  categoryGrid: document.getElementById("categoryGrid"),
  categoryEntriesTitle: document.getElementById("categoryEntriesTitle"),
  categoryEntries: document.getElementById("categoryEntries"),
  openEntriesLink: document.getElementById("openEntriesLink")
};

function getSelectedAxis(options) {
  const params = new URLSearchParams(window.location.search);

  for (const axis of AXES) {
    const value = (params.get(axis.param) || "").trim();
    const allowed = options[`${axis.key}Options`];
    if (value && allowed.includes(value)) {
      return { ...axis, value };
    }
  }

  return null;
}

function groupEntries(entries, axisKey) {
  const grouped = new Map();

  entries.forEach((entry) => {
    const value = entry[axisKey];
    const items = grouped.get(value) || [];
    items.push(entry);
    grouped.set(value, items);
  });

  return [...grouped.entries()].sort((a, b) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return a[0].localeCompare(b[0], "ja");
  });
}

function renderAxisGrid(entries, selected) {
  if (!els.categoryGrid) return;

  els.categoryGrid.innerHTML = AXES
    .map((axis) => {
      const groups = groupEntries(entries, axis.key);
      const links = groups
        .map(([value, items]) => {
          const href = `categories.html?${axis.param}=${encodeURIComponent(value)}`;
          const activeClass =
            selected && selected.param === axis.param && selected.value === value ? " category-link-active" : "";

          return `<a class="category-link${activeClass}" href="${href}">${escapeHtml(value)} (${items.length})</a>`;
        })
        .join("");

      return `
        <section class="axis-block">
          <div class="section-titlebar">
            <h3>${escapeHtml(axis.label)}</h3>
          </div>
          <div class="category-link-list">
            ${links || '<p class="empty-state">表示できる分類がありません。</p>'}
          </div>
        </section>
      `;
    })
    .join("");
}

function renderAxisEntries(entries, selected) {
  if (!els.categoryEntries || !els.categoryEntriesTitle || !els.openEntriesLink) return;

  const filtered = selected
    ? entries.filter((entry) => entry[selected.key] === selected.value)
    : [...entries].sort((a, b) => b.id - a.id).slice(0, 8);

  if (!selected) {
    els.categoryEntriesTitle.textContent = "分類別の記事";
    els.openEntriesLink.href = "entries.html";
  } else {
    els.categoryEntriesTitle.textContent = `${selected.label}: ${selected.value}`;
    els.openEntriesLink.href = buildEntriesUrl({ [selected.param]: selected.value });
  }

  if (!filtered.length) {
    els.categoryEntries.innerHTML = '<p class="empty-state">該当する記事はありません。</p>';
    return;
  }

  els.categoryEntries.innerHTML = filtered
    .map(
      (entry) => `
        <article class="entry-card">
          <div class="entry-head">
            <h3 class="entry-title"><a href="${buildTermUrl(entry.id)}">${escapeHtml(entry.itemTitle)}</a></h3>
            <span class="tag-pill">${escapeHtml(entry.division)}</span>
          </div>
          <p class="entry-meta">${escapeHtml(entry.work)} / ${escapeHtml(entry.medium)}</p>
          <p class="entry-summary">${escapeHtml(entry.judgement)}</p>
          <a class="button ghost" href="${buildTermUrl(entry.id)}">記事詳細へ</a>
        </article>
      `
    )
    .join("");
}

function renderError(message) {
  if (els.categoryGrid) {
    els.categoryGrid.innerHTML = `<p class="empty-state">分類データの読み込みに失敗しました: ${escapeHtml(message)}</p>`;
  }
  if (els.categoryEntries) {
    els.categoryEntries.innerHTML = `<p class="empty-state">記事の読み込みに失敗しました: ${escapeHtml(message)}</p>`;
  }
}

async function init() {
  syncFooterMeta();

  let entries = [];
  try {
    entries = await loadEntries();
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
    return;
  }

  const options = getAxisOptions(entries);
  const selected = getSelectedAxis(options);

  renderAxisGrid(entries, selected);
  renderAxisEntries(entries, selected);
}

void init();
