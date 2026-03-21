export const DIVISION_OPTIONS = ["人物", "アイテム", "場所", "エピソード", "演出", "組織", "設定", "境界事例"];
export const JUDGEMENT_OPTIONS = ["未回収", "要判断", "制作事情", "外部補足"];

const PRODUCTION_MARKERS = ["制作都合", "構想変更", "未放送", "制作都合で未使用"];
const UNRESOLVED_MARKERS = ["未回収"];
const PENDING_MARKERS = ["解釈が分かれる", "境界事例"];
const EXTERNAL_MARKERS = ["外部説明あり"];

function hasMarker(entry, markers) {
  return [entry.status, ...entry.tags].some((value) => markers.some((marker) => String(value).includes(marker)));
}

export function deriveDivision(entry) {
  return DIVISION_OPTIONS.find((label) => entry.tags.includes(label)) || "設定";
}

export function deriveJudgement(entry) {
  if (hasMarker(entry, PRODUCTION_MARKERS)) return "制作事情";
  if (hasMarker(entry, UNRESOLVED_MARKERS)) return "未回収";
  if (hasMarker(entry, PENDING_MARKERS)) return "要判断";
  if (hasMarker(entry, EXTERNAL_MARKERS)) return "外部補足";
  return "要判断";
}

export function enrichEntry(entry) {
  return {
    ...entry,
    division: deriveDivision(entry),
    judgement: deriveJudgement(entry)
  };
}

export function getEntryAxes(entry) {
  return {
    medium: entry.medium,
    work: entry.work,
    division: entry.division ?? deriveDivision(entry),
    judgement: entry.judgement ?? deriveJudgement(entry)
  };
}
