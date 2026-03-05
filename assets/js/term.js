import {
  buildEntriesUrl,
  buildTermUrl,
  escapeHtml,
  loadEntries,
  syncFooterMeta
} from "./data.js";

const els = {
  breadcrumbCurrent: document.getElementById("breadcrumbCurrent"),
  termArticle: document.getElementById("termArticle"),
  relatedList: document.getElementById("relatedList"),
  termError: document.getElementById("termError")
};

function getEntryIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("id") || "").trim();
}

function renderError(message) {
  if (els.termError) {
    els.termError.textContent = message;
    els.termError.classList.remove("hidden");
  }
}

function renderNotFound() {
  if (els.breadcrumbCurrent) {
    els.breadcrumbCurrent.textContent = "未登録の用語";
  }
  if (els.termArticle) {
    els.termArticle.innerHTML = `
      <p class="empty-state">
        指定された用語は見つかりませんでした。<a href="entries.html">用語一覧</a>から再度選択してください。
      </p>
    `;
  }
  if (els.relatedList) {
    els.relatedList.innerHTML = `<li class="empty-state">関連エントリを表示できません。</li>`;
  }
  document.title = "用語が見つかりません | 未回収設定WEB辞典";
}

function renderTerm(entry) {
  if (els.breadcrumbCurrent) {
    els.breadcrumbCurrent.textContent = entry.itemTitle;
  }
  if (!els.termArticle) return;

  const sourceHtml = entry.sources
    .map((source) => {
      const label = escapeHtml(source.label || source.url || "参考リンク");
      const url = escapeHtml(source.url || "#");
      return `<li><a href="${url}" target="_blank" rel="noreferrer">${label}</a></li>`;
    })
    .join("");

  const tagHtml = entry.tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("");

  els.termArticle.innerHTML = `
    <header class="term-head">
      <div class="entry-tags">${tagHtml}</div>
      <h2>${escapeHtml(entry.itemTitle)}</h2>
      <p class="term-workline">${escapeHtml(entry.work)} / ${escapeHtml(entry.medium)}</p>
      <a class="button ghost" href="${buildEntriesUrl({ c: entry.classification })}">同じ分類を一覧で見る</a>
    </header>

    <section class="meta-grid">
      <article class="meta-box">
        <p class="meta-key">分類</p>
        <p class="meta-value">${escapeHtml(entry.classification)}</p>
      </article>
      <article class="meta-box">
        <p class="meta-key">現在タグ</p>
        <p class="meta-value">${escapeHtml(entry.status)}</p>
      </article>
      <article class="meta-box">
        <p class="meta-key">初出</p>
        <p class="meta-value">${escapeHtml(entry.firstAppearance)}</p>
      </article>
      <article class="meta-box">
        <p class="meta-key">運用メモ</p>
        <p class="meta-value">${escapeHtml(entry.note)}</p>
      </article>
    </section>

    <section class="term-block">
      <h3>作中で示された事実</h3>
      <p>${escapeHtml(entry.factShown)}</p>
    </section>

    <section class="term-block">
      <h3>その後の扱い（事実ベース）</h3>
      <p>${escapeHtml(entry.factAfter)}</p>
    </section>

    <section class="term-block">
      <h3>評価 / 整理方針（解釈欄）</h3>
      <p>${escapeHtml(entry.evaluation)}</p>
    </section>

    <section class="term-block">
      <h3>参考リンク</h3>
      <ul class="source-list">${sourceHtml || "<li>参考リンクは登録されていません。</li>"}</ul>
    </section>
  `;

  document.title = `${entry.itemTitle} | 未回収設定WEB辞典`;
}

function renderRelated(entries, current) {
  if (!els.relatedList) return;

  const related = entries
    .filter(
      (entry) =>
        entry.id !== current.id &&
        (entry.work === current.work || entry.classification === current.classification)
    )
    .slice(0, 8);

  if (!related.length) {
    els.relatedList.innerHTML = `<li class="empty-state">関連エントリはまだありません。</li>`;
    return;
  }

  els.relatedList.innerHTML = related
    .map(
      (entry) => `
        <li>
          <a class="related-link" href="${buildTermUrl(entry.id)}">
            <p class="related-link-title">${escapeHtml(entry.itemTitle)}</p>
            <p class="related-link-meta">${escapeHtml(entry.work)} / ${escapeHtml(entry.classification)}</p>
          </a>
        </li>
      `
    )
    .join("");
}

async function init() {
  syncFooterMeta();

  const id = getEntryIdFromUrl();
  if (!id) {
    renderError("URLに用語IDが指定されていません。");
    renderNotFound();
    return;
  }

  let entries = [];
  try {
    entries = await loadEntries();
  } catch (error) {
    renderError(error instanceof Error ? error.message : String(error));
    renderNotFound();
    return;
  }

  const current = entries.find((entry) => entry.id === id);
  if (!current) {
    renderNotFound();
    return;
  }

  renderTerm(current);
  renderRelated(entries, current);
}

void init();
