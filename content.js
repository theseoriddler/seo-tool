// SERP Feature Analyzer — Content Script
// Detects Google SERP features and measures their pixel height.

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Selector / detection config — easy to update in one place
  // ---------------------------------------------------------------------------
  const FEATURE_DETECTORS = [
    {
      name: "AI Overview",
      detect: () => {
        const selectors = [
          "[data-attrid='wa:/tbm=youchat']",
          "#m-x-content",
          ".aimod",
          "[jscontroller='BB2wVe']",
          "div[data-sgrd]",
          "#aig",
          "[data-q][jscontroller][data-md]",
        ];
        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          if (els.length) return Array.from(els);
        }
        // Fallback: look for the heading text "AI Overview"
        const headings = document.querySelectorAll("h2, [role='heading']");
        for (const h of headings) {
          if (/ai overview/i.test(h.textContent)) {
            const container =
              h.closest("[data-sgrd]") ||
              h.closest("[jscontroller]") ||
              h.parentElement;
            if (container) return [container];
          }
        }
        return [];
      },
    },
    {
      name: "Sponsored Ads",
      detect: () => {
        const ads = document.querySelectorAll(
          "#tads, #tadsb, #bottomads, .commercial-unit-desktop-top, .commercial-unit-desktop-bottom, .cu-container"
        );
        return Array.from(ads);
      },
    },
    {
      name: "Shopping / Products",
      detect: () => {
        const els = document.querySelectorAll(
          ".commercial-unit-desktop-rhs, .cu-container .pla-unit-container, [data-enable_product_traversal], .sh-sr__shop-result-group, [data-merchant_id]"
        );
        const carousels = document.querySelectorAll(".top-pla-group-inner");
        return Array.from(new Set([...els, ...carousels]));
      },
    },
    {
      name: "Knowledge Panel",
      detect: () => {
        const els = document.querySelectorAll(
          ".kp-wholepage, .knowledge-panel, #rhs .kp-wholepage, #wp-tabs-container, [data-attrid] .kno-rdesc"
        );
        if (!els.length) {
          const rhs = document.querySelectorAll("#rhs .g-blk");
          return Array.from(rhs);
        }
        return Array.from(els);
      },
    },
    {
      name: "Featured Snippet",
      detect: () => {
        const els = document.querySelectorAll(
          ".c2xzTb, .g.kno-kp, .xpdopen .ifM9O, [data-attrid='wa:/description'], .IZ6rdc"
        );
        return Array.from(els);
      },
    },
    {
      name: "People Also Ask",
      detect: () => {
        const els = document.querySelectorAll(
          "[data-sgrd] .related-question-pair, .related-question-pair, [jsname='yEVEwb'], div[data-initq]"
        );
        if (els.length) {
          const container =
            els[0].closest("[data-initq]") ||
            els[0].closest(".g") ||
            els[0].closest("[jscontroller]");
          if (container) return [container];
        }
        return Array.from(els);
      },
    },
    {
      name: "Video Carousel",
      detect: () => {
        const els = document.querySelectorAll(
          "[data-surl] .RzdJxc, .dXiKIc, video-voyager, #search .vid-kp, .P94G9b"
        );
        if (els.length) {
          const container =
            els[0].closest(".g") || els[0].closest("[jscontroller]");
          if (container) return [container];
        }
        return Array.from(els);
      },
    },
    {
      name: "Image Pack",
      detect: () => {
        const els = document.querySelectorAll(
          "#imagebox_bigimages, .img-brk, .islrtb, g-scrolling-carousel[data-lpage]"
        );
        return Array.from(els);
      },
    },
    {
      name: "Local Pack",
      detect: () => {
        const els = document.querySelectorAll(
          ".VkpGBb, [data-local_refinements_ct], .cXedhc, #lu_map, .AEprdc"
        );
        return Array.from(els);
      },
    },
    {
      name: "Reddit / Forums",
      detect: () => [],
      domainMatch:
        /reddit\.com|quora\.com|stackexchange\.com|stackoverflow\.com/i,
    },
  ];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getElementHeight(el) {
    const rect = el.getBoundingClientRect();
    return rect.height;
  }

  function removeNested(elements) {
    return elements.filter(
      (el, _i, arr) => !arr.some((other) => other !== el && other.contains(el))
    );
  }

  // ---------------------------------------------------------------------------
  // Main analysis
  // ---------------------------------------------------------------------------

  function analyzeSERP() {
    const results = {};
    const claimedElements = new Set();

    // 1. Detect each named feature
    for (const detector of FEATURE_DETECTORS) {
      let elements = detector.detect();
      elements = removeNested(elements);
      elements = elements.filter((el) => {
        for (const claimed of claimedElements) {
          if (claimed.contains(el) || el.contains(claimed)) return false;
        }
        return true;
      });

      let totalHeight = 0;
      for (const el of elements) {
        totalHeight += getElementHeight(el);
        claimedElements.add(el);
      }

      if (totalHeight > 0) {
        results[detector.name] = totalHeight;
      }
    }

    // 2. Detect organic results & Reddit/Forum by scanning result blocks
    const organicContainers = document.querySelectorAll(
      "#search .g:not(.g .g), #rso > div > .g, #rso > .g, #rso > div > div > .g"
    );
    const redditDetector = FEATURE_DETECTORS.find(
      (d) => d.name === "Reddit / Forums"
    );
    let organicHeight = 0;
    let redditHeight = 0;

    for (const el of organicContainers) {
      let dominated = false;
      for (const claimed of claimedElements) {
        if (claimed.contains(el) || el.contains(claimed)) {
          dominated = true;
          break;
        }
      }
      if (dominated) continue;

      const link = el.querySelector("a[href]");
      const href = link ? link.href : "";

      if (redditDetector.domainMatch && redditDetector.domainMatch.test(href)) {
        redditHeight += getElementHeight(el);
      } else {
        organicHeight += getElementHeight(el);
      }
      claimedElements.add(el);
    }

    if (organicHeight > 0) results["Organic Results"] = organicHeight;
    if (redditHeight > 0) results["Reddit / Forums"] = redditHeight;

    // 3. Calculate total SERP height
    const searchContainer =
      document.querySelector("#rso") ||
      document.querySelector("#search") ||
      document.body;
    const totalHeight = searchContainer.scrollHeight || searchContainer.offsetHeight;

    // "Other" is the remainder
    const accountedHeight = Object.values(results).reduce((a, b) => a + b, 0);
    const otherHeight = Math.max(0, totalHeight - accountedHeight);
    if (otherHeight > 0) results["Other"] = otherHeight;

    // 4. Convert to percentages
    const finalTotal = Object.values(results).reduce((a, b) => a + b, 0);
    const percentages = {};
    for (const [key, val] of Object.entries(results)) {
      percentages[key] = Math.round((val / finalTotal) * 1000) / 10;
    }

    return percentages;
  }

  // ---------------------------------------------------------------------------
  // Message listener — popup requests data
  // ---------------------------------------------------------------------------

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "ANALYZE_SERP") {
      const data = analyzeSERP();
      sendResponse({ success: true, data });
    }
    return true;
  });
})();
