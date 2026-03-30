import fs from "node:fs";
import path from "node:path";

const entriesPath = path.resolve(process.cwd(), "entries.json");
const entries = JSON.parse(fs.readFileSync(entriesPath, "utf8"));

const firstAppearanceMap = {
  1: "オレンジ諸島編終盤、GSボールが特別な品としてサトシたちに託される場面",
  2: "BW023・BW024として放送予定が告知された段階",
  3: "第13話付近、ヒカリがダークオーシャンへ引き込まれる回",
  4: "終盤のデーモン軍団戦で、送り先としてダークオーシャンが再提示される場面",
  5: "tri.中盤、謎の男としてダークジェンナイが姿を見せる場面",
  6: "tri.序盤から中盤、姫川マキが過去の事件を背負う大人側人物として前面に出る場面",
  7: "初期ドラゴンボールで、ランチが亀仙人の家周辺の常連として定着していた頃",
  8: "第5部中盤、フーゴがボート上でブチャラティたちと別れる場面",
  9: "物語序盤、記憶の違和感に絡んで謎の男が回想風に現れる場面",
  10: "第83話冒頭のフラッシュフォワード場面",
  11: "ミアレシティ到達後、ノースサイドストリートのオフィス2階で起こるイベント",
  12: "13番道路でカロス発電所外周に到達したとき",
  13: "本編終盤、イーライ逃亡後に欠落として浮かび上がる段階",
  14: "序盤、MiraとLifehold探索が主目標として提示される段階",
  15: "ゲーム内の隠しイベントやEntry Number Seventeenに触れた場面",
  16: "冒頭、輸血治療の導入でPalebloodが目的語として現れる場面",
  17: "探索中、ライフブラッドの部屋や護符に初めて触れる場面",
  18: "中盤、映像ログやメタ的な手がかりからOLD_DATAの存在が浮かぶ場面",
  19: "χ系譜で黒い箱の存在が示され、KHIIIでも捜索対象として再提示される段階",
  20: "発売時点の本編終盤で、説明不足が一気に目立つ段階",
  21: "Disc1からDisc2へ移った瞬間の構成変化",
  22: "探索中、罪と赦しに関するアイテム説明やNPC台詞に触れる場面",
  23: "中盤、加持がネルフ地下や組織の裏側を探っていると分かる場面",
  24: "TV版中盤、キュゥべえがシステムの目的を語る場面",
  25: "キメラアント編終盤、ジャイロが危険人物として強調されるモノローグ",
  26: "連載中の地獄言及や劇場版周辺で、その存在自体が見える段階",
  27: "終盤、始祖ユミルと脊髄生物の描写が接続される場面",
  28: "第四次忍界大戦終盤、六道忍具が本格使用される場面",
  29: "初期から中盤、髑髏の騎士が異様な過去を匂わせながら現れる場面",
  30: "序盤、シババワが『地球がヤバい』と予言を示す場面"
};

const firstAppearanceDetailMap = {
  4: "デーモン軍団の処理先としてダークオーシャンが使われ、前半の謎空間が後半で再び重要そうに接続される。"
};

const outsideTimelineIndexes = {
  1: [3],
  2: [3],
  5: [2],
  6: [2],
  7: [2],
  8: [2],
  9: [2],
  10: [2],
  11: [2],
  12: [2],
  13: [1, 2],
  14: [2],
  15: [1, 2],
  16: [2],
  17: [2],
  18: [2],
  19: [2],
  21: [2],
  22: [1, 2],
  23: [2],
  24: [2],
  25: [2],
  26: [1, 2],
  27: [2],
  28: [2],
  29: [2]
};

const nextEntries = entries.map((entry) => {
  const anchor = firstAppearanceMap[entry.id];
  if (!anchor) {
    throw new Error(`初出アンカーが未定義です: ${entry.id}`);
  }

  const legacyTimeline = Array.isArray(entry.timeline) ? entry.timeline : [];
  const outsideIndexes = new Set(outsideTimelineIndexes[entry.id] ?? []);

  const appearanceTimeline = legacyTimeline.filter((_, index) => !outsideIndexes.has(index));
  const outsideTimeline = legacyTimeline.filter((_, index) => outsideIndexes.has(index));

  return {
    ...entry,
    firstAppearance: anchor,
    firstAppearanceDetail: firstAppearanceDetailMap[entry.id] ?? legacyTimeline[0]?.detail ?? "",
    appearanceTimeline,
    outsideTimeline
  };
});

for (const entry of nextEntries) {
  delete entry.timeline;
}

fs.writeFileSync(entriesPath, `${JSON.stringify(nextEntries, null, 2)}\n`, "utf8");
console.log(`[OK] normalized appearance fields for ${nextEntries.length} entries`);
