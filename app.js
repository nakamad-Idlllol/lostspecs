const entries = [
  {
    id: "pkmn-gs-ball",
    work: "ポケットモンスター（アニメ・ジョウト編）",
    medium: "アニメ",
    itemTitle: "GSボール",
    classification: "作中要素",
    status: "未回収（本編）",
    tags: ["未回収（本編）", "外部説明あり"],
    firstAppearance: "アニメ オレンジ諸島〜ジョウト編（継続要素）",
    factShown: "作中で特別なボールとして強く導入され、主要導線として扱われる。",
    factAfter: "本編の物語上で明確な決着まで描かれず、途中で扱いが薄くなる。",
    evaluation: "本編未回収の代表例として有名。後年の関係者インタビューで事情説明が語られることがある。",
    note: "サイト上では『本編内の扱い』と『外部説明』を分けて整理する想定。",
    sources: [
      { label: "Bulbapedia: GS Ball", url: "https://bulbapedia.bulbagarden.net/wiki/GS_Ball" },
      { label: "PokeBeach interview (Masamitsu Hidaka)", url: "https://www.pokebeach.com/2008/07/second-pokemon-interview-with-masamitsu-hidaka-many-interesting-points" }
    ]
  },
  {
    id: "pkmn-bw-unaired-plasma",
    work: "ポケットモンスター ベストウイッシュ",
    medium: "アニメ",
    itemTitle: "ロケット団VSプラズマ団（未放送2話）",
    classification: "制作都合",
    status: "制作都合で未使用",
    tags: ["制作都合で未使用", "未放送", "外部説明あり"],
    firstAppearance: "BW023 / BW024（未放送扱い）",
    factShown: "予告・番組情報などで放送予定として提示されたエピソードが存在した。",
    factAfter: "本放送では欠番/未放送となり、予定されていた流れがそのまま消失した。",
    evaluation: "作中の未回収というより、制作・放送都合で未使用化した重要導線の例。",
    note: "分類を『制作都合』に分けることで、通常の伏線未回収と混同しにくくする。",
    sources: [
      { label: "Bulbapedia: BW023 (unaired)", url: "https://bulbapedia.bulbagarden.net/wiki/BW023_%28unaired%29" },
      { label: "Bulbapedia: BW024 (unaired)", url: "https://bulbapedia.bulbagarden.net/wiki/BW024_%28unaired%29" }
    ]
  },
  {
    id: "digimon02-dark-ocean-dagomon",
    work: "デジモンアドベンチャー02",
    medium: "アニメ",
    itemTitle: "ダゴモン／ダークオーシャン（ヒカリ周辺）",
    classification: "作中要素",
    status: "未回収候補",
    tags: ["未回収候補", "解釈が分かれる"],
    firstAppearance: "第13話付近（ダークオーシャン関連）",
    factShown: "不穏な異空間・存在が強く示され、今後の主軸に関わりそうな提示がある。",
    factAfter: "本筋全体では明確な説明や決着が十分に与えられないと感じる視聴者が多い。",
    evaluation: "知名度の高い『未消化感』例。断定は避け、『候補』とする運用が無難。",
    note: "この種の項目は『作中事実』と『視聴者評価』の境界を明示する。",
    sources: [
      { label: "Wikimon: Digimon Adventure 02", url: "https://wikimon.net/Digimon_Adventure_02" },
      { label: "Wikimon: Episode 13", url: "https://wikimon.net/Digimon_Adventure_02_-_Episode_13" },
      { label: "Wikimon: Dagomon", url: "https://wikimon.net/Dagomon" }
    ]
  },
  {
    id: "digimon02-daemon-dark-ocean",
    work: "デジモンアドベンチャー02",
    medium: "アニメ",
    itemTitle: "デーモン軍団のダークオーシャン送り",
    classification: "作中要素",
    status: "未回収候補",
    tags: ["未回収候補", "解釈が分かれる"],
    firstAppearance: "後半（第43話付近）",
    factShown: "強敵の処理先としてダークオーシャンが再登場し、重大要素として再接続される。",
    factAfter: "以後、その先の顛末が本編内で十分に追跡されないと解釈されやすい。",
    evaluation: "前項とセットで扱うか、個別エントリにするかは設計次第。",
    note: "本試作では検索しやすさを優先して個別化。",
    sources: [
      { label: "Wikimon: Episode 43", url: "https://wikimon.net/Digimon_Adventure_02_-_Episode_43" },
      { label: "Wikimon: World of Darkness / Dark Ocean", url: "https://wikimon.net/World_of_Darkness" }
    ]
  },
  {
    id: "digimon-tri-dark-gennai",
    work: "デジモンアドベンチャー tri.",
    medium: "アニメ",
    itemTitle: "ダークジェンナイ（謎の男）の逃走・再利用示唆",
    classification: "作中要素",
    status: "未回収候補",
    tags: ["未回収候補", "解釈が分かれる"],
    firstAppearance: "tri. シリーズ中盤以降",
    factShown: "敵対的存在として継続登場し、終盤でも完全決着感の弱い処理になる。",
    factAfter: "本編完結時点で、視聴者によっては再利用示唆が残ったように見える。",
    evaluation: "『未回収』断定より『未消化感あり』として扱う方が安全。",
    note: "tri. は複数論点が多いため、1項目1論点に分解するのが管理しやすい。",
    sources: [
      { label: "Wikimon: Digimon Adventure tri.", url: "https://wikimon.net/Digimon_Adventure_tri." },
      { label: "Wikimon: Mysterious Man", url: "https://wikimon.net/Mysterious_Man" }
    ]
  },
  {
    id: "digimon-tri-himekawa",
    work: "デジモンアドベンチャー tri.",
    medium: "アニメ",
    itemTitle: "姫川マキ＋ダークオーシャン周辺の処理",
    classification: "作中要素",
    status: "解釈が分かれる",
    tags: ["解釈が分かれる", "未回収候補"],
    firstAppearance: "tri. シリーズ通期",
    factShown: "過去・喪失・行動動機に関わる重要人物として描かれる。",
    factAfter: "終盤の処理が説明不足/象徴的と受け取られやすく、評価が割れやすい。",
    evaluation: "強い断定を避ける代表例。『解釈が分かれる』タグの見本に向く。",
    note: "議論を呼びやすい項目なので、サイトでは断言調を抑える。",
    sources: [
      { label: "Wikimon: Digimon Adventure tri.", url: "https://wikimon.net/Digimon_Adventure_tri." },
      { label: "Wikimon: Bakumon (Adventure)", url: "https://wikimon.net/Bakumon_%28Adventure%29" }
    ]
  },
  {
    id: "dragonball-launch",
    work: "ドラゴンボール（原作 / アニメ）",
    medium: "漫画/アニメ",
    itemTitle: "ランチの長期離脱（継続要素の消失）",
    classification: "人物要素",
    status: "外部説明あり",
    tags: ["人物要素", "外部説明あり", "保留（定義依存）"],
    firstAppearance: "初期から継続登場",
    factShown: "主要サブキャラとして登場し、性格変化ギミックも繰り返し使われる。",
    factAfter: "後半では出番が大きく減り、物語上の継続要素としてほぼ消える。",
    evaluation: "『設定』というより人物運用の話。カテゴリ設計の確認用サンプル。",
    note: "このサイトで人物要素を含むなら採用、含まないなら除外候補。",
    sources: [
      { label: "CBR: What Happened to Launch?", url: "https://www.cbr.com/dbz-what-happened-to-dragon-ball-launch/" }
    ]
  },
  {
    id: "jojo5-fugo",
    work: "ジョジョの奇妙な冒険 第5部 黄金の風",
    medium: "漫画",
    itemTitle: "フーゴ離脱（構想変更の文脈で語られる例）",
    classification: "制作都合",
    status: "構想変更",
    tags: ["構想変更", "外部説明あり"],
    firstAppearance: "第5部中盤の離脱",
    factShown: "チームメンバーとして行動していたが、途中で離脱し再合流しない。",
    factAfter: "作中上は離脱処理で完了するが、外部情報で構想変更文脈が語られることがある。",
    evaluation: "作中未回収より『制作・作者構想の変更』カテゴリの典型例。",
    note: "外部発言ソースの扱いを厳格化する必要がある。",
    sources: [
      { label: "JoJo Wiki (Fandom): Pannacotta Fugo", url: "https://jojo.fandom.com/wiki/Pannacotta_Fugo" }
    ]
  },
  {
    id: "jojolion-flashback-man",
    work: "ジョジョの奇妙な冒険 第8部 ジョジョリオン",
    medium: "漫画",
    itemTitle: "いわゆる Flashback Man（記憶の男）",
    classification: "作中要素",
    status: "未回収候補",
    tags: ["未回収候補", "解釈が分かれる"],
    firstAppearance: "序盤の記憶関連描写",
    factShown: "印象的な人物像が提示され、読者に後続回収を予感させる描写がある。",
    factAfter: "本編完結時点で正体・位置づけが明示されないと受け取られることが多い。",
    evaluation: "本テーマの有名例。断定調の表現は避けつつ収録しやすい。",
    note: "ページ名は俗称と説明名を併記するのが検索上有利。",
    sources: [
      { label: "JoJo Wiki (Fandom): Unnamed Characters", url: "https://jojo.fandom.com/wiki/Unnamed_Characters" }
    ]
  },
  {
    id: "jojolion-ch83-flashforward",
    work: "ジョジョの奇妙な冒険 第8部 ジョジョリオン",
    medium: "漫画",
    itemTitle: "第83話フラッシュフォワードの扱い",
    classification: "作中要素",
    status: "解釈が分かれる",
    tags: ["解釈が分かれる", "未回収候補"],
    firstAppearance: "第83話",
    factShown: "先の時間軸を示すような描写が置かれ、後半展開の予告として機能する。",
    factAfter: "完結時の整合性について読者間で評価・解釈差が大きい。",
    evaluation: "『未回収』断定より、議論対象として整理する用途に向く。",
    note: "論点が広がりやすいので、根拠欄に具体的な比較観点を持たせたい。",
    sources: [
      { label: "JoJo's Bizarre Encyclopedia: JJL Chapter 83", url: "https://jojowiki.com/JJL_Chapter_83" }
    ]
  }
];

const state = {
  search: "",
  medium: "all",
  tag: "all",
  classification: "all",
  selectedId: null
};

const els = {
  searchInput: document.getElementById("searchInput"),
  mediumChips: document.getElementById("mediumChips"),
  tagChips: document.getElementById("tagChips"),
  classChips: document.getElementById("classChips"),
  entryList: document.getElementById("entryList"),
  resultSummary: document.getElementById("resultSummary"),
  resetBtn: document.getElementById("resetBtn"),
  detailEmpty: document.getElementById("detailEmpty"),
  detailCard: document.getElementById("detailCard"),
  metricCount: document.getElementById("metricCount"),
  metricWorks: document.getElementById("metricWorks"),
  entryItemTemplate: document.getElementById("entryItemTemplate")
};

function classificationKey(label) {
  if (label === "制作都合") return "production";
  if (label === "作中要素") return "story";
  if (label === "人物要素") return "character";
  return "other";
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeOption(value, options) {
  return options.includes(value) ? value : "all";
}

function getUrlState() {
  const params = new URLSearchParams(window.location.search);
  const mediaOptions = ["all", ...unique(entries.map((e) => e.medium))];
  const tagOptions = ["all", ...unique(entries.flatMap((e) => e.tags))];
  const classOptions = ["all", ...unique(entries.map((e) => e.classification))];
  const selectedId = params.get("e");

  return {
    search: params.get("q") ?? "",
    medium: normalizeOption(params.get("m") ?? "all", mediaOptions),
    tag: normalizeOption(params.get("t") ?? "all", tagOptions),
    classification: normalizeOption(params.get("c") ?? "all", classOptions),
    selectedId
  };
}

function syncUrlState() {
  const params = new URLSearchParams();
  if (state.search) params.set("q", state.search);
  if (state.medium !== "all") params.set("m", state.medium);
  if (state.tag !== "all") params.set("t", state.tag);
  if (state.classification !== "all") params.set("c", state.classification);
  if (state.selectedId) params.set("e", state.selectedId);

  const query = params.toString();
  const hash = window.location.hash;
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
}

function createChip(container, label, value, getter, setter) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  button.dataset.value = value;
  if (getter() === value) {
    button.classList.add("active");
  }
  button.addEventListener("click", () => {
    setter(value);
  });
  container.append(button);
}

function renderFilterChips() {
  els.mediumChips.innerHTML = "";
  els.tagChips.innerHTML = "";
  els.classChips.innerHTML = "";

  const mediaOptions = ["all", ...unique(entries.map((e) => e.medium))];
  const tagOptions = ["all", ...unique(entries.flatMap((e) => e.tags))];
  const classOptions = ["all", ...unique(entries.map((e) => e.classification))];

  mediaOptions.forEach((opt) => {
    createChip(
      els.mediumChips,
      opt === "all" ? "すべて" : opt,
      opt,
      () => state.medium,
      (value) => {
        state.medium = value;
        rerender();
      }
    );
  });

  tagOptions.forEach((opt) => {
    createChip(
      els.tagChips,
      opt === "all" ? "すべて" : opt,
      opt,
      () => state.tag,
      (value) => {
        state.tag = value;
        rerender();
      }
    );
  });

  classOptions.forEach((opt) => {
    createChip(
      els.classChips,
      opt === "all" ? "すべて" : opt,
      opt,
      () => state.classification,
      (value) => {
        state.classification = value;
        rerender();
      }
    );
  });
}

function matchesSearch(entry, search) {
  if (!search) return true;
  const haystack = [
    entry.work,
    entry.itemTitle,
    entry.classification,
    entry.status,
    ...entry.tags,
    entry.factShown,
    entry.factAfter,
    entry.evaluation,
    entry.note
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(search.toLowerCase());
}

function getFilteredEntries() {
  return entries.filter((entry) => {
    const mediumOk = state.medium === "all" || entry.medium === state.medium;
    const tagOk = state.tag === "all" || entry.tags.includes(state.tag);
    const classOk = state.classification === "all" || entry.classification === state.classification;
    const searchOk = matchesSearch(entry, state.search);
    return mediumOk && tagOk && classOk && searchOk;
  });
}

function renderList(filtered) {
  els.entryList.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "条件に一致するエントリはありません。タグか検索条件を緩めてください。";
    els.entryList.append(empty);
    return;
  }

  filtered.forEach((entry, index) => {
    const fragment = els.entryItemTemplate.content.cloneNode(true);
    const button = fragment.querySelector(".entry-item");
    const indexBadge = fragment.querySelector(".index-badge");
    const classBadge = fragment.querySelector(".class-badge");
    const title = fragment.querySelector(".entry-title");
    const work = fragment.querySelector(".entry-work");
    const tagRow = fragment.querySelector(".tag-row");
    const summary = fragment.querySelector(".entry-summary");

    button.dataset.id = entry.id;
    if (state.selectedId === entry.id) {
      button.classList.add("active");
    }

    indexBadge.textContent = String(index + 1).padStart(2, "0");
    classBadge.textContent = entry.classification;
    classBadge.dataset.kind = classificationKey(entry.classification);
    title.textContent = entry.itemTitle;
    work.textContent = `${entry.work} / ${entry.medium}`;
    summary.textContent = `${entry.status} | ${entry.evaluation}`;

    entry.tags.slice(0, 3).forEach((tag) => {
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.textContent = tag;
      tagRow.append(pill);
    });

    button.addEventListener("click", () => {
      state.selectedId = entry.id;
      rerender(false);
    });

    els.entryList.append(fragment);
  });
}

function renderSummary(filtered) {
  const works = new Set(filtered.map((e) => e.work));
  els.resultSummary.textContent = `${filtered.length}件 / ${works.size}作品`;
}

function renderMetrics() {
  els.metricCount.textContent = String(entries.length);
  els.metricWorks.textContent = String(new Set(entries.map((e) => e.work)).size);
}

function renderDetail(filtered) {
  let selected = filtered.find((e) => e.id === state.selectedId);
  if (!selected && filtered.length) {
    selected = filtered[0];
    state.selectedId = selected.id;
  }
  if (!selected) {
    els.detailEmpty.classList.remove("hidden");
    els.detailCard.classList.add("hidden");
    els.detailCard.innerHTML = "";
    return;
  }

  els.detailEmpty.classList.add("hidden");
  els.detailCard.classList.remove("hidden");

  const sourceItems = selected.sources
    .map(
      (source) =>
        `<li><a href="${source.url}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a></li>`
    )
    .join("");

  const tagPills = selected.tags
    .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
    .join("");

  els.detailCard.innerHTML = `
    <div class="detail-top">
      <div class="tag-row">${tagPills}</div>
      <h2>${escapeHtml(selected.itemTitle)}</h2>
      <div class="detail-workline">${escapeHtml(selected.work)} / ${escapeHtml(selected.medium)}</div>
    </div>
    <div class="detail-meta">
      <div class="meta-card">
        <span class="key">分類</span>
        <span class="value">${escapeHtml(selected.classification)}</span>
      </div>
      <div class="meta-card">
        <span class="key">現在タグ（仮）</span>
        <span class="value">${escapeHtml(selected.status)}</span>
      </div>
      <div class="meta-card">
        <span class="key">初出</span>
        <span class="value">${escapeHtml(selected.firstAppearance)}</span>
      </div>
      <div class="meta-card">
        <span class="key">運用メモ</span>
        <span class="value">${escapeHtml(selected.note)}</span>
      </div>
    </div>
    <section class="detail-section">
      <h3>作中で示された事実</h3>
      <p>${escapeHtml(selected.factShown)}</p>
    </section>
    <section class="detail-section">
      <h3>その後の扱い（事実ベース）</h3>
      <p>${escapeHtml(selected.factAfter)}</p>
    </section>
    <section class="detail-section">
      <h3>評価 / 整理方針（解釈欄）</h3>
      <p>${escapeHtml(selected.evaluation)}</p>
    </section>
    <section class="detail-section">
      <h3>参考リンク</h3>
      <ul class="source-list">${sourceItems}</ul>
    </section>
    <div class="footer-note">
      この試作は「一覧・検索・分類」の検証目的です。正式運用時は、出典形式（話数/巻数/URL）と断定表現の基準を固定してください。
    </div>
  `;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function rerender(rebuildChips = true) {
  const filtered = getFilteredEntries();

  if (rebuildChips) {
    renderFilterChips();
  } else {
    updateChipActiveStates();
  }
  renderSummary(filtered);
  renderDetail(filtered);
  renderList(filtered);
  syncUrlState();
}

function updateChipActiveStates() {
  document.querySelectorAll("#mediumChips .chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.value === state.medium);
  });
  document.querySelectorAll("#tagChips .chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.value === state.tag);
  });
  document.querySelectorAll("#classChips .chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.value === state.classification);
  });
}

function resetFilters() {
  state.search = "";
  state.medium = "all";
  state.tag = "all";
  state.classification = "all";
  els.searchInput.value = "";
  rerender();
}

function initEvents() {
  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    rerender(false);
  });

  els.resetBtn.addEventListener("click", resetFilters);
}

function init() {
  Object.assign(state, getUrlState());
  els.searchInput.value = state.search;
  renderMetrics();
  initEvents();
  rerender();
}

init();
