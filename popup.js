(function () {
  "use strict";

  const COLORS = {
    "AI Overview": "#7c3aed",
    "Sponsored Ads": "#ef4444",
    "Shopping / Products": "#f59e0b",
    "Knowledge Panel": "#3b82f6",
    "Featured Snippet": "#06b6d4",
    "People Also Ask": "#10b981",
    "Videos": "#f43f5e",
    "Image Pack": "#8b5cf6",
    "Local Pack": "#14b8a6",
    "Reddit / Forums": "#ff4500",
    "Organic Results": "#22c55e",
    "Social Media": "#0ea5e9",
    "Top Stories": "#f97316",
    Other: "#6b7280",
  };

  const FALLBACK_COLORS = [
    "#e879f9", "#fb923c", "#a3e635", "#38bdf8", "#c084fc",
  ];

  const FORUM_DOMAINS = [
    "reddit.com", "quora.com", "stackexchange.com", "stackoverflow.com",
  ];

  const SOCIAL_DOMAINS = [
    "facebook.com", "instagram.com", "twitter.com", "x.com",
    "linkedin.com", "pinterest.com",
  ];

  const VIDEO_DOMAINS = [
    "youtube.com", "youtu.be", "vimeo.com", "dailymotion.com", "tiktok.com",
  ];

  function getColor(name, index) {
    return COLORS[name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  }

  // ---------------------------------------------------------------------------
  // SVG pie chart
  // ---------------------------------------------------------------------------

  function polarToCartesian(angle) {
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }

  function createPieChart(data) {
    const svg = document.getElementById("pie");
    svg.innerHTML = "";

    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, e) => s + e[1], 0);
    if (total === 0) return;

    let currentAngle = -Math.PI / 2;

    entries.forEach(([name, value], i) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      const start = polarToCartesian(currentAngle);
      const end = polarToCartesian(currentAngle + sliceAngle);
      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );

      if (sliceAngle >= 2 * Math.PI - 0.001) {
        path.setAttribute(
          "d",
          "M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0 Z"
        );
      } else {
        path.setAttribute(
          "d",
          [
            "M 0 0",
            `L ${start.x} ${start.y}`,
            `A 1 1 0 ${largeArc} 1 ${end.x} ${end.y}`,
            "Z",
          ].join(" ")
        );
      }

      path.setAttribute("fill", getColor(name, i));
      path.setAttribute("stroke", "#1a1a2e");
      path.setAttribute("stroke-width", "0.01");

      const title = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "title"
      );
      title.textContent = `${name}: ${value}%`;
      path.appendChild(title);

      svg.appendChild(path);
      currentAngle += sliceAngle;
    });
  }

  // ---------------------------------------------------------------------------
  // Legend
  // ---------------------------------------------------------------------------

  function createLegend(data) {
    const ul = document.getElementById("legend");
    ul.innerHTML = "";

    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

    entries.forEach(([name, value], i) => {
      const li = document.createElement("li");

      const left = document.createElement("span");
      left.className = "legend-left";

      const swatch = document.createElement("span");
      swatch.className = "legend-color";
      swatch.style.backgroundColor = getColor(name, i);

      const label = document.createElement("span");
      label.className = "legend-name";
      label.textContent = name;

      left.appendChild(swatch);
      left.appendChild(label);

      const val = document.createElement("span");
      val.className = "legend-value";
      val.textContent = value + "%";

      li.appendChild(left);
      li.appendChild(val);
      ul.appendChild(li);
    });
  }

  // ---------------------------------------------------------------------------
  // SerpAPI response → counts
  // ---------------------------------------------------------------------------

  function domainMatch(url, domains) {
    try {
      const hostname = new URL(url).hostname;
      return domains.some((d) => hostname.includes(d));
    } catch {
      return false;
    }
  }

  function countResults(json, headings) {
    const counts = {};

    function add(name, n) {
      if (n > 0) counts[name] = (counts[name] || 0) + n;
    }

    // AI Overview
    if (json.ai_overview) add("AI Overview", 1);

    // Ads
    if (json.ads) add("Sponsored Ads", json.ads.length);

    // Shopping — only count if heading detected on page
    if (headings.shopping) {
      if (json.shopping_results) {
        add("Shopping / Products", json.shopping_results.length);
      } else if (json.immersive_products) {
        add("Shopping / Products", json.immersive_products.length);
      } else {
        add("Shopping / Products", 1);
      }
    }

    // Knowledge Panel — if "Images" heading on page, it's actually an image section
    if (json.knowledge_graph) {
      if (headings.images) {
        add("Image Pack", 1);
      } else if (json.knowledge_graph.title) {
        add("Knowledge Panel", 1);
      }
    }

    // Featured Snippet
    if (json.answer_box) add("Featured Snippet", 1);

    // People Also Ask
    if (json.related_questions) add("People Also Ask", json.related_questions.length);

    // Videos
    if (json.video_results) add("Videos", json.video_results.length);
    if (json.inline_videos) add("Videos", json.inline_videos.length);
    if (json.short_videos) add("Videos", json.short_videos.length);

    // Image Pack
    if (json.inline_images) add("Image Pack", json.inline_images.length);


    // Local Pack — only count if "Places" heading exists on page
    if (headings.places && json.local_results && json.local_results.places) {
      add("Local Pack", json.local_results.places.length);
    }

    // Top Stories
    if (json.top_stories) add("Top Stories", json.top_stories.length);

    // Discussions & Forums
    if (json.discussions_and_forums) add("Reddit / Forums", json.discussions_and_forums.length);

    // Organic Results — split into organic, reddit/forums, social
    if (json.organic_results) {
      for (const result of json.organic_results) {
        const link = result.link || "";
        if (domainMatch(link, FORUM_DOMAINS)) {
          add("Reddit / Forums", 1);
        } else if (domainMatch(link, VIDEO_DOMAINS)) {
          add("Videos", 1);
        } else if (domainMatch(link, SOCIAL_DOMAINS)) {
          add("Social Media", 1);
        } else {
          add("Organic Results", 1);
        }
      }
    }

    return counts;
  }

  function toPercentages(counts) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return {};
    const pct = {};
    for (const [key, val] of Object.entries(counts)) {
      pct[key] = Math.round((val / total) * 1000) / 10;
    }
    return pct;
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  const errorEl = document.getElementById("error");
  const chartArea = document.getElementById("chart-area");
  const loadingEl = document.getElementById("loading");
  const noKeyEl = document.getElementById("no-key");

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
    loadingEl.classList.add("hidden");
    chartArea.classList.add("hidden");
    noKeyEl.classList.add("hidden");
  }

  function showChart(data) {
    loadingEl.classList.add("hidden");
    noKeyEl.classList.add("hidden");
    chartArea.classList.remove("hidden");
    createPieChart(data);
    createLegend(data);
  }

  // Settings links
  document.getElementById("settings-link").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  const openSettingsBtn = document.getElementById("open-settings");
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Extract query from Google search URL
  function getSearchQuery(url) {
    try {
      const params = new URL(url).searchParams;
      return params.get("q") || "";
    } catch {
      return "";
    }
  }

  // Main flow
  chrome.storage.local.get("serpApiKey", (result) => {
    const apiKey = result.serpApiKey;

    if (!apiKey) {
      noKeyEl.classList.remove("hidden");
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url || !tab.url.includes("google.com/search")) {
        showError("Navigate to a Google search results page first.");
        return;
      }

      const query = getSearchQuery(tab.url);
      if (!query) {
        showError("Could not detect search query.");
        return;
      }

      loadingEl.classList.remove("hidden");

      // Get page headings from content script
      chrome.tabs.sendMessage(tab.id, { type: "DETECT_HEADINGS" }, (headingResponse) => {
        const headings = (headingResponse && headingResponse.success)
          ? headingResponse.headings
          : {};

        console.log("Page headings:", headings);

        const apiUrl =
          "https://serpapi.com/search.json?" +
          new URLSearchParams({
            q: query,
            api_key: apiKey,
            engine: "google",
            hl: "en",
          }).toString();

        fetch(apiUrl)
          .then((res) => {
            if (!res.ok) {
              if (res.status === 401) throw new Error("Invalid API key. Check your settings.");
              throw new Error("API error: " + res.status);
            }
            return res.json();
          })
          .then((json) => {
            console.log("SerpAPI raw response:", json);
            const counts = countResults(json, headings);
            if (Object.keys(counts).length === 0) {
              showError("No results found.");
              return;
            }
            const pct = toPercentages(counts);
            showChart(pct);
          })
          .catch((err) => {
            showError(err.message || "Failed to fetch data.");
          });
      });
    });
  });
})();
