function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function ensureSentence(text) {
  const value = cleanText(text);
  if (!value) return "";
  return /[。.!?]$/.test(value) ? value : `${value}。`;
}

function trimSentenceEnd(text) {
  return cleanText(text).replace(/[。.!?]+$/g, "");
}

function itemReference(entry) {
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  if (tags.includes("人物")) return "この人物";
  if (tags.includes("アイテム")) return "このアイテム";
  if (tags.includes("場所")) return "この場所";
  if (tags.includes("エピソード")) return "このエピソード";
  return "この要素";
}

function buildHook(entry) {
  const firstAppearance = trimSentenceEnd(entry.firstAppearance);
  const work = entry.work;

  if (/(場面|回)$/.test(firstAppearance)) {
    return `『${work}』には、${firstAppearance}がある。`;
  }

  if (
    /(段階|頃|とき|到達後|到達時|発売時|終盤|中盤|序盤|前半|後半|以降|進行後|完結時|最終局面)$/.test(firstAppearance)
  ) {
    return `『${work}』では、${firstAppearance}に${itemReference(entry)}が表に出る。`;
  }

  return `『${work}』には、${firstAppearance}がある。`;
}

function pickAftermathDetail(entry) {
  const timeline = Array.isArray(entry.appearanceTimeline) ? entry.appearanceTimeline : [];
  if (timeline.length >= 2) {
    return timeline[timeline.length - 1]?.detail ?? "";
  }
  return entry.unresolvedPoints || entry.depiction || entry.firstAppearanceDetail || "";
}

function pickDescriptor(entry) {
  const status = cleanText(entry.status);
  const tags = Array.isArray(entry.tags) ? entry.tags : [];

  if (status.includes("制作都合")) return "制作都合で残った要素";
  if (status.includes("未放送")) return "未放送のまま残る要素";
  if (status.includes("未回収")) return "未回収要素";
  if (status.includes("解釈")) return "解釈が分かれる要素";
  if (tags.includes("外部説明あり")) return "外部補足込みで語られる要素";
  return "謎めいた要素";
}

function buildOverview(entry) {
  const hook = buildHook(entry);
  const aftermath = ensureSentence(`この要素は、その後、${trimSentenceEnd(pickAftermathDetail(entry))}`);
  const descriptor = ensureSentence(`${entry.itemTitle}は、${pickDescriptor(entry)}のひとつとして名前が挙がる`);
  return `${hook}\n\n${aftermath}${descriptor}`;
}

function touchLeadDetail(entry) {
  return ensureSentence(entry.firstAppearanceDetail);
}

export function applyEditorialStyleToEntry(entry) {
  return {
    ...entry,
    firstAppearanceDetail: touchLeadDetail(entry),
    overview: buildOverview(entry)
  };
}

export function applyEditorialStyleToEntries(entries) {
  return entries.map((entry) => applyEditorialStyleToEntry(entry));
}
