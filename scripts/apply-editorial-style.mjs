import fs from "node:fs";
import path from "node:path";
import { applyEditorialStyleToEntries } from "./lib/editorial-style.mjs";

const entriesPath = path.resolve(process.cwd(), "entries.json");
const entries = JSON.parse(fs.readFileSync(entriesPath, "utf8"));
const nextEntries = applyEditorialStyleToEntries(entries);

fs.writeFileSync(entriesPath, `${JSON.stringify(nextEntries, null, 2)}\n`, "utf8");
console.log(`[OK] applied editorial style to ${nextEntries.length} entries`);
