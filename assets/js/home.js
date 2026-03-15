import {
  buildCategoriesUrl,
  buildEntriesUrl,
  buildTermUrl,
  escapeHtml,
  loadEntries,
  shorten,
  syncFooterMeta
} from "./data.js";

const POPULAR_ENTRY_IDS = [
  1,
  3,
  9,
  8
];

const els = {
  popularList: document.getElementById("popularList"),
  classificationGrid: document.getElementById("classificationGrid"),
  recentList: document.getElementById("recentList")
};

function renderError(message) {
  if (els.popularList) {
    els.popularList.innerHTML = `<li class="empty-state">人気記事の読み込みに失敗しました: ${escapeHtml(message)}</li>`;
  }
  if (els.classificationGrid) {
    els.classificationGrid.innerHTML = `<p class="empty-state">カテゴリの読み込みに失敗しました: ${escapeHtml(message)}</p>`;
  }
  if (els.recentList) {
    els.recentList.innerHTML = `<li class="empty-state">項目の読み込みに失敗しました: ${escapeHtml(message)}</li>`;
  }
}

function renderClassificationCards(entries) {
  if (!els.classificationGrid) return;

  const grouped = new Map();
  entries.forEach((entry) => {
    const items = grouped.get(entry.classification) || [];
    items.push(entry);
    grouped.set(entry.classification, items);
  });

  const cards = [...grouped.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([classification, items]) => {
      const categoryUrl = buildCategoriesUrl({ c: classification });
      const entriesUrl = buildEntriesUrl({ c: classification });
      return `
        <article class="class-card">
          <h3><a class="class-title-link" href="${categoryUrl}">${escapeHtml(classification)}</a></h3>
          <p class="class-count">${items.length}件</p>
          <div class="class-actions">
            <a href="${entriesUrl}" class="button ghost">このカテゴリの一覧へ</a>
          </div>
        </article>
      `;
    })
    .join("");

  els.classificationGrid.innerHTML = cards || `<p class="empty-state">カテゴリデータがありません。</p>`;
}

function renderPopularEntries(entries) {
  if (!els.popularList) return;

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const items = POPULAR_ENTRY_IDS
    .map((id) => byId.get(id))
    .filter(Boolean)
    .slice(0, 4);

  if (!items.length) {
    els.popularList.innerHTML = `<li class="empty-state">表示できる項目がありません。</li>`;
    return;
  }

  els.popularList.innerHTML = items
    .map(
      (entry) => `
        <li>
          <article class="featured-item">
            <p class="featured-meta">${escapeHtml(entry.work)} / ${escapeHtml(entry.medium)}</p>
            <h3><a href="${buildTermUrl(entry.id)}">${escapeHtml(entry.itemTitle)}</a></h3>
            <p>${escapeHtml(shorten(entry.overview, 72))}</p>
          </article>
        </li>
      `
    )
    .join("");
}

function renderRecentEntries(entries) {
  if (!els.recentList) return;

  const items = entries.slice(0, 8);
  if (!items.length) {
    els.recentList.innerHTML = `<li class="empty-state">表示できる項目がありません。</li>`;
    return;
  }

  els.recentList.innerHTML = items
    .map(
      (entry) => `
        <li>
          <article class="recent-item">
            <h3><a href="${buildTermUrl(entry.id)}">${escapeHtml(entry.itemTitle)}</a></h3>
            <p>${escapeHtml(entry.work)} / ${escapeHtml(entry.medium)}</p>
            <p>${escapeHtml(shorten(entry.overview, 88))}</p>
          </article>
        </li>
      `
    )
    .join("");
}

async function init() {
  syncFooterMeta();
  try {
    const entries = await loadEntries();
    renderPopularEntries(entries);
    renderClassificationCards(entries);
    renderRecentEntries(entries);
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
  }
}

void init();
