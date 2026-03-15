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
  infoFacts: document.getElementById("infoFacts"),
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
    els.breadcrumbCurrent.textContent = "記事が見つかりません";
  }

  if (els.termArticle) {
    els.termArticle.innerHTML = `
      <p class="empty-state">
        指定された記事は見つかりませんでした。<a href="entries.html">用語一覧</a>から探し直してください。
      </p>
    `;
  }

  if (els.infoFacts) {
    els.infoFacts.innerHTML = `
      <div class="info-row">
        <dt>状態</dt>
        <dd>記事未検出</dd>
      </div>
    `;
  }

  if (els.relatedList) {
    els.relatedList.innerHTML = `<li class="empty-state">関連項目は表示できません。</li>`;
  }

  document.title = "記事が見つかりません | 未回収設定・没設定大百科";
}

function buildTocHtml(sections) {
  return sections
    .map(
      (section) => `
        <li>
          <a class="toc-link" href="#${section.id}">${escapeHtml(section.title)}</a>
        </li>
      `
    )
    .join("");
}

function renderInfoFacts(entry) {
  if (!els.infoFacts) return;

  const rows = [
    ["分類", entry.classification],
    ["状態", entry.status],
    ["初出", entry.firstAppearance],
    ["媒体", entry.medium],
    ["出典数", `${entry.sources.length}件`]
  ];

  els.infoFacts.innerHTML = rows
    .map(
      ([key, value]) => `
        <div class="info-row">
          <dt>${escapeHtml(key)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `
    )
    .join("");
}

function renderTimeline(entry) {
  if (!Array.isArray(entry.timeline) || !entry.timeline.length) {
    return `<p>年表情報はまだ整理されていません。</p>`;
  }

  return `
    <ol class="timeline-list">
      ${entry.timeline
        .map(
          (item) => `
            <li class="timeline-item">
              <p class="timeline-label">${escapeHtml(item.label)}</p>
              <p class="timeline-detail">${escapeHtml(item.detail)}</p>
            </li>
          `
        )
        .join("")}
    </ol>
  `;
}

function renderTerm(entry) {
  if (els.breadcrumbCurrent) {
    els.breadcrumbCurrent.textContent = entry.itemTitle;
  }
  if (!els.termArticle) return;

  const sourceHtml = entry.sources
    .map((source) => {
      const label = escapeHtml(source.label || source.url || "出典リンク");
      const url = escapeHtml(source.url || "#");
      return `<li><a href="${url}" target="_blank" rel="noreferrer">${label}</a></li>`;
    })
    .join("");

  const tagHtml = entry.tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("");

  const sections = [
    {
      id: "overview",
      title: "概要",
      body: `<p>${escapeHtml(entry.overview)}</p>`
    },
    {
      id: "depiction",
      title: "作中での描写",
      body: `<p>${escapeHtml(entry.depiction)}</p>`
    },
    {
      id: "unresolved",
      title: "未回収とされるポイント",
      body: `<p>${escapeHtml(entry.unresolvedPoints)}</p>`
    },
    {
      id: "reception",
      title: "反応・受け止められ方",
      body: `<p>${escapeHtml(entry.reception)}</p>`
    },
    {
      id: "external",
      title: "外部資料・補足",
      body: `<p>${escapeHtml(entry.externalContext)}</p>`
    },
    {
      id: "interpretation",
      title: "解釈・考察",
      body: `<p>${escapeHtml(entry.interpretation)}</p>`
    },
    {
      id: "future",
      title: "今後の可能性",
      body: `<p>${escapeHtml(entry.futurePossibility)}</p>`
    },
    {
      id: "discussion",
      title: "論点",
      body: `<p>${escapeHtml(entry.discussionPoints)}</p>`
    },
    {
      id: "timeline",
      title: "年表",
      body: renderTimeline(entry)
    },
    {
      id: "sources",
      title: "出典",
      body: `<ul class="source-list">${sourceHtml || "<li>出典は登録されていません。</li>"}</ul>`
    }
  ];

  renderInfoFacts(entry);

  els.termArticle.innerHTML = `
    <header class="term-head">
      <p class="term-kicker">用語記事</p>
      <div class="entry-tags">${tagHtml}</div>
      <h2>${escapeHtml(entry.itemTitle)}</h2>
      <p class="term-workline">${escapeHtml(entry.work)} / ${escapeHtml(entry.medium)}</p>
      <p class="term-summary">${escapeHtml(entry.status)}</p>
      <div class="term-actions">
        <a class="button ghost" href="${buildEntriesUrl({ c: entry.classification })}">同カテゴリの一覧へ</a>
        <a class="button ghost" href="${buildEntriesUrl({ q: entry.work })}">同作品で探す</a>
      </div>
    </header>

    <section class="term-toc-box" aria-labelledby="termTocTitle">
      <div class="term-toc-head">
        <h3 id="termTocTitle">目次</h3>
      </div>
      <ol class="toc-list toc-list-inline">
        ${buildTocHtml(sections)}
      </ol>
    </section>

    <section class="meta-strip">
      <article class="meta-box">
        <p class="meta-key">分類</p>
        <p class="meta-value">${escapeHtml(entry.classification)}</p>
      </article>
      <article class="meta-box">
        <p class="meta-key">状態</p>
        <p class="meta-value">${escapeHtml(entry.status)}</p>
      </article>
      <article class="meta-box">
        <p class="meta-key">初出</p>
        <p class="meta-value">${escapeHtml(entry.firstAppearance)}</p>
      </article>
      <article class="meta-box">
        <p class="meta-key">タグ</p>
        <p class="meta-value">${escapeHtml(entry.tags.join(" / "))}</p>
      </article>
    </section>

    ${sections
      .map(
        (section) => `
          <section id="${section.id}" class="term-section">
            <h3>${escapeHtml(section.title)}</h3>
            ${section.body}
          </section>
        `
      )
      .join("")}
  `;

  document.title = `${entry.itemTitle} | 未回収設定・没設定大百科`;
}

function renderRelated(entries, current) {
  if (!els.relatedList) return;

  const sameWork = entries.filter((entry) => entry.id !== current.id && entry.work === current.work);
  const sameClass = entries.filter(
    (entry) =>
      entry.id !== current.id &&
      entry.work !== current.work &&
      entry.classification === current.classification
  );

  const related = [...sameWork, ...sameClass].slice(0, 8);

  if (!related.length) {
    els.relatedList.innerHTML = `<li class="empty-state">関連項目はまだありません。</li>`;
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
    renderError("URL に記事IDがありません。");
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

  const current = entries.find((entry) => String(entry.id) === id);
  if (!current) {
    renderNotFound();
    return;
  }

  renderTerm(current);
  renderRelated(entries, current);
}

void init();
