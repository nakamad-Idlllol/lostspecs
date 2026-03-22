import {
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
  categoryGrid: document.getElementById("categoryGrid")
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

function renderError(message) {
  if (!els.categoryGrid) return;

  els.categoryGrid.innerHTML = `<p class="empty-state">分類データの読み込みに失敗しました: ${escapeHtml(message)}</p>`;
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
}

void init();
