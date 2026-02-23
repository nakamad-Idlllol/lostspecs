import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.resolve(process.cwd(), "automation.config.json");

export function loadAutomationConfig() {
  const text = fs.readFileSync(CONFIG_PATH, "utf8");
  const config = JSON.parse(text);
  if (!config || typeof config !== "object") {
    throw new Error("automation.config.json の形式が不正です");
  }
  return config;
}

export function getAutomationConfigPath() {
  return CONFIG_PATH;
}
