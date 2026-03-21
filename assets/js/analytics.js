function getCanonicalPageview() {
  const pathname = window.location.pathname.replace(/\\/g, "/");
  const page = pathname.split("/").pop() || "index.html";

  if (!page || page === "index.html") {
    return { url: "/", title: "トップ" };
  }

  if (page === "entries.html") {
    return { url: "/entries", title: "記事一覧" };
  }

  if (page === "categories.html") {
    return { url: "/browse", title: "分類から探す" };
  }

  if (page === "term.html") {
    const id = new URLSearchParams(window.location.search).get("id");
    return {
      url: id ? `/term/${encodeURIComponent(id)}` : "/term",
      title: document.title
    };
  }

  return { url: pathname || "/", title: document.title };
}

function createTrackerScript(config) {
  const script = document.createElement("script");
  script.defer = true;
  script.src = config.scriptUrl;
  script.dataset.websiteId = config.websiteId;
  script.dataset.autoTrack = "false";

  if (config.hostUrl) {
    script.dataset.hostUrl = config.hostUrl;
  }

  if (config.domains) {
    script.dataset.domains = config.domains;
  }

  return script;
}

function trackPageview() {
  if (!window.umami?.track) return;
  const pageview = getCanonicalPageview();
  window.umami.track((props) => ({
    ...props,
    url: pageview.url,
    title: pageview.title
  }));
}

async function initAnalytics() {
  let config = null;

  try {
    const response = await fetch("analytics-config.json", { cache: "no-store" });
    if (!response.ok) return;
    config = await response.json();
  } catch {
    return;
  }

  if (!config?.enabled || !config.scriptUrl || !config.websiteId) {
    return;
  }

  const script = createTrackerScript(config);
  script.addEventListener("load", trackPageview, { once: true });
  document.head.append(script);
}

void initAnalytics();
