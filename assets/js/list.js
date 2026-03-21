import {
  buildTermUrl,
  escapeHtml,
  loadEntries,
  shorten,
  syncFooterMeta,
  updateUrlQuery
} from "./data.js?v=20260321b";

const PAGE_SIZE = 10;

const state = {
  page: 1
};

let entries = [];

const els = {
  resultSummary: document.getElementById("resultSummary"),
  entryList: document.getElementById("entryList"),
  paginationTop: document.getElementById("paginationTop"),
  paginationBottom: document.getElementById("paginationBottom")
};

function parseState() {
  const params = new URLSearchParams(window.location.search);
  const page = Number.parseInt(params.get("page") || "1", 10);
  state.page = Number.isInteger(page) && page > 0 ? page : 1;
}

function getSortedEntries() {
  return [...entries].sort((a, b) => b.id - a.id);
}

function getPagedEntries() {
  const sorted = getSortedEntries();
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(state.page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;

  state.page = currentPage;

  return {
    items: sorted.slice(start, start + PAGE_SIZE),
    total: sorted.length,
    totalPages,
    currentPage
  };
}

function renderSummary(total, currentPage, totalPages) {
  if (!els.resultSummary) return;

  els.resultSummary.textContent = `${total}件 / ${currentPage} / ${totalPages}ページ`;
}

function renderPagination(container, currentPage, totalPages) {
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const pageNumbers = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let page = start; page <= end; page += 1) {
    pageNumbers.push(page);
  }

  container.innerHTML = `
    <button type="button" class="button ghost pagination-button" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>前へ</button>
    <div class="pagination-pages">
      ${pageNumbers
        .map(
          (page) => `
            <button
              type="button"
              class="button ghost pagination-button${page === currentPage ? " pagination-button-active" : ""}"
              data-page="${page}"
              ${page === currentPage ? 'aria-current="page"' : ""}
            >
              ${page}
            </button>
          `
        )
        .join("")}
    </div>
    <button type="button" class="button ghost pagination-button" data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}>次へ</button>
  `;

  container.querySelectorAll(".pagination-button").forEach((button) => {
    button.addEventListener("click", () => {
      const page = Number.parseInt(button.dataset.page || "", 10);
      if (!Number.isInteger(page) || page < 1 || page > totalPages || page === currentPage) return;
      state.page = page;
      rerender();
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  });
}

function renderList(items) {
  if (!els.entryList) return;

  if (!items.length) {
    els.entryList.innerHTML = '<p class="empty-state">表示できる記事はありません。</p>';
    return;
  }

  els.entryList.innerHTML = items
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
          </div>
          <a class="button ghost entry-card-link" href="${buildTermUrl(entry.id)}">記事詳細へ</a>
        </article>
      `
    )
    .join("");
}

function syncQuery() {
  updateUrlQuery({
    page: state.page === 1 ? "" : String(state.page)
  });
}

function rerender() {
  const { items, total, totalPages, currentPage } = getPagedEntries();
  renderSummary(total, currentPage, totalPages);
  renderList(items);
  renderPagination(els.paginationTop, currentPage, totalPages);
  renderPagination(els.paginationBottom, currentPage, totalPages);
  syncQuery();
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
  parseState();

  try {
    entries = await loadEntries();
  } catch (error) {
    renderLoadError(error instanceof Error ? error.message : String(error));
    return;
  }

  rerender();
}

void init();
