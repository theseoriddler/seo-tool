// SERP Feature Analyzer — Popup Script
// Renders a custom SVG pie chart from content script data.

(function () {
  "use strict";

  const COLORS = {
    "AI Overview": "#7c3aed",
    "Sponsored Ads": "#ef4444",
    "Shopping / Products": "#f59e0b",
    "Knowledge Panel": "#3b82f6",
    "Featured Snippet": "#06b6d4",
    "People Also Ask": "#10b981",
    "Video Carousel": "#f43f5e",
    "Image Pack": "#8b5cf6",
    "Local Pack": "#14b8a6",
    "Reddit / Forums": "#ff4500",
    "Organic Results": "#22c55e",
    Other: "#6b7280",
  };

  const FALLBACK_COLORS = [
    "#e879f9",
    "#fb923c",
    "#a3e635",
    "#38bdf8",
    "#c084fc",
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
  // Init
  // ---------------------------------------------------------------------------

  const errorEl = document.getElementById("error");
  const chartArea = document.getElementById("chart-area");
  const loadingEl = document.getElementById("loading");

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
    loadingEl.classList.add("hidden");
    chartArea.classList.add("hidden");
  }

  function showChart(data) {
    loadingEl.classList.add("hidden");
    chartArea.classList.remove("hidden");
    createPieChart(data);
    createLegend(data);
  }

  loadingEl.classList.remove("hidden");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url || !tab.url.includes("google.com/search")) {
      showError("Navigate to a Google search results page first.");
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: "ANALYZE_SERP" }, (response) => {
      if (chrome.runtime.lastError) {
        showError("Could not analyze page. Try refreshing the search page.");
        return;
      }
      if (!response || !response.success) {
        showError("No data returned. Try refreshing the search page.");
        return;
      }
      showChart(response.data);
    });
  });
})();
