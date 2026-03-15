import {
  buildEntriesUrl,
  buildTermUrl,
  escapeHtml,
  loadEntries,
  syncFooterMeta
} from "./data.js";

const els = {
  categoryGrid: document.getElementById("categoryGrid"),
  categoryEntriesTitle: document.getElementById("categoryEntriesTitle"),
  categoryEntries: document.getElementById("categoryEntries"),
  openEntriesLink: document.getElementById("openEntriesLink")
};

function getSelectedCategory(allCategories) {
  const params = new URLSearchParams(window.location.search);
  const selected = (params.get("c") || "").trim();
  if (!selected || !allCategories.includes(selected)) {
    return "all";
  }
  return selected;
}

function groupByCategory(entries) {
  const grouped = new Map();
  entries.forEach((entry) => {
    const items = grouped.get(entry.classification) || [];
    items.push(entry);
    grouped.set(entry.classification, items);
  });
  return [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);
}

function renderCategoryGrid(groups, selectedCategory) {
  if (!els.categoryGrid) return;

  if (!groups.length) {
    els.categoryGrid.innerHTML = `<p class="empty-state">カテゴリデータがありません。</p>`;
    return;
  }

  els.categoryGrid.innerHTML = groups
    .map(([classification, items]) => {
      const openThis = `categories.html?c=${encodeURIComponent(classification)}`;
      const openEntries = buildEntriesUrl({ c: classification });
      const activeClass = selectedCategory === classification ? " category-card-active" : "";

      return `
        <article class="category-card${activeClass}">
          <h3><a class="category-title-link" href="${openThis}">${escapeHtml(classification)}</a></h3>
          <p class="category-count">${items.length}件</p>
          <p class="muted">代表例: ${escapeHtml(items[0].itemTitle)}</p>
          <div class="category-actions">
            <a class="button ghost" href="${openEntries}">このカテゴリの一覧へ</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCategoryEntries(entries, selectedCategory) {
  if (!els.categoryEntries || !els.categoryEntriesTitle || !els.openEntriesLink) return;

  const filtered =
    selectedCategory === "all"
      ? entries
      : entries.filter((entry) => entry.classification === selectedCategory);

  if (selectedCategory === "all") {
    els.categoryEntriesTitle.textContent = "カテゴリ別の項目";
    els.openEntriesLink.href = "entries.html";
  } else {
    els.categoryEntriesTitle.textContent = `カテゴリ別の項目: ${selectedCategory}`;
    els.openEntriesLink.href = buildEntriesUrl({ c: selectedCategory });
  }

  if (!filtered.length) {
    els.categoryEntries.innerHTML = `<p class="empty-state">該当する項目はありません。</p>`;
    return;
  }

  els.categoryEntries.innerHTML = filtered
    .map(
      (entry) => `
        <article class="entry-card">
          <div class="entry-head">
            <h3 class="entry-title"><a href="${buildTermUrl(entry.id)}">${escapeHtml(entry.itemTitle)}</a></h3>
            <span class="tag-pill">${escapeHtml(entry.classification)}</span>
          </div>
          <p class="entry-meta">${escapeHtml(entry.work)} / ${escapeHtml(entry.medium)}</p>
          <p class="entry-summary">${escapeHtml(entry.status)}</p>
          <a class="button ghost" href="${buildTermUrl(entry.id)}">記事詳細へ</a>
        </article>
      `
    )
    .join("");
}

function renderError(message) {
  if (els.categoryGrid) {
    els.categoryGrid.innerHTML = `<p class="empty-state">カテゴリの読み込みに失敗しました: ${escapeHtml(message)}</p>`;
  }
  if (els.categoryEntries) {
    els.categoryEntries.innerHTML = `<p class="empty-state">項目の読み込みに失敗しました: ${escapeHtml(message)}</p>`;
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

  const groups = groupByCategory(entries);
  const categories = groups.map(([classification]) => classification);
  const selectedCategory = getSelectedCategory(categories);

  renderCategoryGrid(groups, selectedCategory);
  renderCategoryEntries(entries, selectedCategory);
}

void init();
