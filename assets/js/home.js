import {
  buildTermUrl,
  escapeHtml,
  loadEntries,
  shorten,
  syncFooterMeta
} from "./data.js?v=20260321b";
import { selectFallbackPopularEntries } from "./popularity.js?v=20260321b";

const els = {
  popularList: document.getElementById("popularList"),
  recentList: document.getElementById("recentList")
};

function renderError(message) {
  if (els.popularList) {
    els.popularList.innerHTML = `<li class="empty-state">人気記事の読み込みに失敗しました: ${escapeHtml(message)}</li>`;
  }
  if (els.recentList) {
    els.recentList.innerHTML = `<li class="empty-state">項目の読み込みに失敗しました: ${escapeHtml(message)}</li>`;
  }
}

async function loadPopularEntries() {
  const response = await fetch("popular-entries.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`popular-entries.json の取得に失敗しました (HTTP ${response.status})`);
  }
  return response.json();
}

function renderPopularEntries(entries, popularData) {
  if (!els.popularList) return;

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const items = Array.isArray(popularData?.items)
    ? popularData.items
        .map((item) => byId.get(item.id))
        .filter(Boolean)
        .slice(0, 4)
    : selectFallbackPopularEntries(entries).map((item) => item.entry);

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

  const items = [...entries]
    .sort((a, b) => b.id - a.id)
    .slice(0, 8);
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
    const [entries, popularData] = await Promise.all([
      loadEntries(),
      loadPopularEntries().catch(() => null)
    ]);
    renderPopularEntries(entries, popularData);
    renderRecentEntries(entries);
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
  }
}

void init();
