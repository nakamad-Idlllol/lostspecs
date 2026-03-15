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

function getSelectedTag(allTags) {
  const params = new URLSearchParams(window.location.search);
  const selected = (params.get("t") || "").trim();
  if (!selected || !allTags.includes(selected)) {
    return "all";
  }
  return selected;
}

function groupByTag(entries) {
  const grouped = new Map();

  entries.forEach((entry) => {
    entry.tags.forEach((tag) => {
      const items = grouped.get(tag) || [];
      items.push(entry);
      grouped.set(tag, items);
    });
  });

  return [...grouped.entries()].sort((a, b) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length;
    return a[0].localeCompare(b[0], "ja");
  });
}

function renderTagGrid(groups, selectedTag) {
  if (!els.categoryGrid) return;

  if (!groups.length) {
    els.categoryGrid.innerHTML = '<p class="empty-state">タグがまだありません。</p>';
    return;
  }

  els.categoryGrid.innerHTML = groups
    .map(([tag, items]) => {
      const openThis = `categories.html?t=${encodeURIComponent(tag)}`;
      const openEntries = buildEntriesUrl({ t: tag });
      const activeClass = selectedTag === tag ? " category-card-active" : "";

      return `
        <article class="category-card${activeClass}">
          <h3><a class="category-title-link" href="${openThis}">${escapeHtml(tag)}</a></h3>
          <p class="category-count">${items.length}件</p>
          <p class="muted">最新: ${escapeHtml(items[0].itemTitle)}</p>
          <div class="category-actions">
            <a class="button ghost" href="${openEntries}">このタグの記事一覧へ</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTagEntries(entries, selectedTag) {
  if (!els.categoryEntries || !els.categoryEntriesTitle || !els.openEntriesLink) return;

  const filtered = selectedTag === "all" ? entries : entries.filter((entry) => entry.tags.includes(selectedTag));

  if (selectedTag === "all") {
    els.categoryEntriesTitle.textContent = "タグ別の記事";
    els.openEntriesLink.href = "entries.html";
  } else {
    els.categoryEntriesTitle.textContent = `タグ別の記事: ${selectedTag}`;
    els.openEntriesLink.href = buildEntriesUrl({ t: selectedTag });
  }

  if (!filtered.length) {
    els.categoryEntries.innerHTML = '<p class="empty-state">該当する記事はありません。</p>';
    return;
  }

  els.categoryEntries.innerHTML = filtered
    .map((entry) => {
      const primaryTag = entry.tags[0] ?? "";
      return `
        <article class="entry-card">
          <div class="entry-head">
            <h3 class="entry-title"><a href="${buildTermUrl(entry.id)}">${escapeHtml(entry.itemTitle)}</a></h3>
            ${primaryTag ? `<span class="tag-pill">${escapeHtml(primaryTag)}</span>` : ""}
          </div>
          <p class="entry-meta">${escapeHtml(entry.work)} / ${escapeHtml(entry.medium)}</p>
          <p class="entry-summary">${escapeHtml(entry.status)}</p>
          <a class="button ghost" href="${buildTermUrl(entry.id)}">記事詳細へ</a>
        </article>
      `;
    })
    .join("");
}

function renderError(message) {
  if (els.categoryGrid) {
    els.categoryGrid.innerHTML = `<p class="empty-state">タグの読み込みに失敗しました: ${escapeHtml(message)}</p>`;
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

  const groups = groupByTag(entries);
  const tags = groups.map(([tag]) => tag);
  const selectedTag = getSelectedTag(tags);

  renderTagGrid(groups, selectedTag);
  renderTagEntries(entries, selectedTag);
}

void init();
