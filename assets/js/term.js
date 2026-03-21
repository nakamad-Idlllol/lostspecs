import {
  buildTermUrl,
  escapeHtml,
  loadEntries,
  syncFooterMeta
} from "./data.js?v=20260321b";

const els = {
  breadcrumbCurrent: document.getElementById("breadcrumbCurrent"),
  termArticle: document.getElementById("termArticle"),
  articleTocDesktop: document.getElementById("articleTocDesktop"),
  articleTocMobile: document.getElementById("articleTocMobile"),
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

function renderTocFallback(message) {
  const html = `<li class="empty-state">${escapeHtml(message)}</li>`;
  if (els.articleTocDesktop) els.articleTocDesktop.innerHTML = html;
  if (els.articleTocMobile) els.articleTocMobile.innerHTML = html;
}

function renderNotFound() {
  if (els.breadcrumbCurrent) {
    els.breadcrumbCurrent.textContent = "記事が見つかりません";
  }

  if (els.termArticle) {
    els.termArticle.innerHTML = `
      <p class="empty-state">
        指定された記事は見つかりませんでした。<a href="entries.html">記事一覧</a>から探してください。
      </p>
    `;
  }

  if (els.relatedList) {
    els.relatedList.innerHTML = '<li class="empty-state">関連項目は表示できません。</li>';
  }

  renderTocFallback("表示できる目次がありません。");
  document.title = "記事が見つかりません | 未回収設定・ロアアーカイブ";
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

function renderToc(sections) {
  const html = buildTocHtml(sections);
  const fallback = '<li class="empty-state">表示できる目次がありません。</li>';

  if (els.articleTocDesktop) {
    els.articleTocDesktop.innerHTML = html || fallback;
  }
  if (els.articleTocMobile) {
    els.articleTocMobile.innerHTML = html || fallback;
  }
}

function renderTimeline(entry) {
  if (!Array.isArray(entry.timeline) || !entry.timeline.length) {
    return "<p>年表情報はまだ整理されていません。</p>";
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

function buildSections(entry) {
  const sourceHtml = entry.sources
    .map((source) => {
      const label = escapeHtml(source.label || source.url || "出典リンク");
      const url = escapeHtml(source.url || "#");
      return `<li><a href="${url}" target="_blank" rel="noreferrer">${label}</a></li>`;
    })
    .join("");

  return [
    { id: "overview", title: "概要", body: `<p>${escapeHtml(entry.overview)}</p>` },
    { id: "depiction", title: "作中での描写", body: `<p>${escapeHtml(entry.depiction)}</p>` },
    { id: "unresolved", title: "未回収とされるポイント", body: `<p>${escapeHtml(entry.unresolvedPoints)}</p>` },
    { id: "reception", title: "反応・受け止められ方", body: `<p>${escapeHtml(entry.reception)}</p>` },
    { id: "external", title: "外部資料・補足", body: `<p>${escapeHtml(entry.externalContext)}</p>` },
    { id: "interpretation", title: "解釈・考察", body: `<p>${escapeHtml(entry.interpretation)}</p>` },
    { id: "future", title: "今後の可能性", body: `<p>${escapeHtml(entry.futurePossibility)}</p>` },
    { id: "discussion", title: "論点", body: `<p>${escapeHtml(entry.discussionPoints)}</p>` },
    { id: "timeline", title: "年表", body: renderTimeline(entry) },
    { id: "sources", title: "出典", body: `<ul class="source-list">${sourceHtml || "<li>出典は登録されていません。</li>"}</ul>` }
  ];
}

function renderTerm(entry) {
  if (els.breadcrumbCurrent) {
    els.breadcrumbCurrent.textContent = entry.itemTitle;
  }
  if (!els.termArticle) return;

  const sections = buildSections(entry);
  const tagHtml = entry.tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("");

  renderToc(sections);

  els.termArticle.innerHTML = `
    <header class="term-head">
      <p class="term-kicker">記事ページ</p>
      <div class="entry-tags">${tagHtml}</div>
      <h2>${escapeHtml(entry.itemTitle)}</h2>
      <p class="term-workline">${escapeHtml(entry.work)} / ${escapeHtml(entry.medium)}</p>
      <p class="term-summary">${escapeHtml(entry.status)}</p>
    </header>

    <section class="meta-strip">
      <article class="meta-box">
        <p class="meta-key">媒体</p>
        <p class="meta-value">${escapeHtml(entry.medium)}</p>
      </article>
      <article class="meta-box">
        <p class="meta-key">分別</p>
        <p class="meta-value">${escapeHtml(entry.division)}</p>
      </article>
      <article class="meta-box">
        <p class="meta-key">判別</p>
        <p class="meta-value">${escapeHtml(entry.judgement)}</p>
      </article>
      <article class="meta-box">
        <p class="meta-key">初出</p>
        <p class="meta-value">${escapeHtml(entry.firstAppearance)}</p>
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

  document.title = `${entry.itemTitle} | 未回収設定・ロアアーカイブ`;
}

function scoreRelated(entry, current) {
  let score = 0;

  if (entry.work === current.work) {
    score += 10;
  }

  if (entry.division === current.division) {
    score += 4;
  }

  if (entry.judgement === current.judgement) {
    score += 4;
  }

  const sharedTags = entry.tags.filter((tag) => current.tags.includes(tag));
  score += sharedTags.length;

  return { score, sharedTags };
}

function renderRelated(entries, current) {
  if (!els.relatedList) return;

  const related = entries
    .filter((entry) => entry.id !== current.id)
    .map((entry) => ({ entry, ...scoreRelated(entry, current) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.itemTitle.localeCompare(b.entry.itemTitle, "ja");
    })
    .slice(0, 8);

  if (!related.length) {
    els.relatedList.innerHTML = '<li class="empty-state">関連項目はまだありません。</li>';
    return;
  }

  els.relatedList.innerHTML = related
    .map(({ entry, sharedTags }) => {
      const axisBits = [];
      if (entry.work === current.work) axisBits.push("同作品");
      if (entry.division === current.division) axisBits.push(`分別: ${entry.division}`);
      if (entry.judgement === current.judgement) axisBits.push(`判別: ${entry.judgement}`);
      if (!axisBits.length && sharedTags.length) {
        axisBits.push(`補助タグ: ${sharedTags.join(" / ")}`);
      }
      const sharedLabel = axisBits.length ? axisBits.join(" / ") : entry.medium;
      return `
        <li>
          <a class="related-link" href="${buildTermUrl(entry.id)}">
            <p class="related-link-title">${escapeHtml(entry.itemTitle)}</p>
            <p class="related-link-meta">${escapeHtml(entry.work)} / ${escapeHtml(sharedLabel)}</p>
          </a>
        </li>
      `;
    })
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
