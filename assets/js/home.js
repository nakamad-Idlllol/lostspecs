import {
  buildCategoriesUrl,
  buildEntriesUrl,
  buildTermUrl,
  countWorks,
  escapeHtml,
  loadEntries,
  shorten,
  syncFooterMeta,
  uniqueStrings
} from "./data.js";

const els = {
  metricCount: document.getElementById("metricCount"),
  metricWorks: document.getElementById("metricWorks"),
  metricMedia: document.getElementById("metricMedia"),
  classificationGrid: document.getElementById("classificationGrid"),
  recentList: document.getElementById("recentList")
};

function renderError(message) {
  if (els.classificationGrid) {
    els.classificationGrid.innerHTML = `<p class="empty-state">カテゴリの読み込みに失敗しました: ${escapeHtml(message)}</p>`;
  }
  if (els.recentList) {
    els.recentList.innerHTML = `<li class="empty-state">項目の読み込みに失敗しました: ${escapeHtml(message)}</li>`;
  }
  if (els.metricCount) els.metricCount.textContent = "-";
  if (els.metricWorks) els.metricWorks.textContent = "-";
  if (els.metricMedia) els.metricMedia.textContent = "-";
}

function renderMetrics(entries) {
  if (els.metricCount) {
    els.metricCount.textContent = String(entries.length);
  }
  if (els.metricWorks) {
    els.metricWorks.textContent = String(countWorks(entries));
  }
  if (els.metricMedia) {
    els.metricMedia.textContent = String(uniqueStrings(entries.map((entry) => entry.medium)).length);
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
          <h3>${escapeHtml(classification)}</h3>
          <p class="class-count">${items.length}件</p>
          <p class="muted">代表例: ${escapeHtml(items[0].itemTitle)}</p>
          <div class="class-actions">
            <a href="${categoryUrl}" class="button ghost">カテゴリを見る</a>
            <a href="${entriesUrl}" class="button ghost">項目一覧へ</a>
          </div>
        </article>
      `;
    })
    .join("");

  els.classificationGrid.innerHTML = cards || `<p class="empty-state">カテゴリデータがありません。</p>`;
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
            <p>${escapeHtml(shorten(entry.evaluation, 88))}</p>
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
    renderMetrics(entries);
    renderClassificationCards(entries);
    renderRecentEntries(entries);
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
  }
}

void init();
