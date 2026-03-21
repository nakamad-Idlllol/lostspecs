import fs from "node:fs";
import path from "node:path";

const OUTPUT_PATH = path.resolve(process.cwd(), "analytics-config.json");

function main() {
  const websiteId = process.env.UMAMI_WEBSITE_ID?.trim() || "";
  const scriptUrl = process.env.UMAMI_SCRIPT_URL?.trim() || "https://cloud.umami.is/script.js";
  const hostUrl = process.env.UMAMI_HOST_URL?.trim() || "";
  const domains = process.env.UMAMI_DOMAINS?.trim() || "";

  const config = {
    enabled: Boolean(websiteId),
    websiteId: websiteId || null,
    scriptUrl: websiteId ? scriptUrl : null,
    hostUrl: websiteId && hostUrl ? hostUrl : null,
    domains: websiteId && domains ? domains : null,
    generatedAt: new Date().toISOString()
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`[analytics] wrote ${path.relative(process.cwd(), OUTPUT_PATH)} (${config.enabled ? "enabled" : "disabled"})`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
