(function () {
  "use strict";

  function detectHeadings() {
    const headings = document.querySelectorAll("h2, h3, span, [role='heading']");
    const found = {};

    for (const h of headings) {
      const text = h.textContent.trim().toLowerCase();
      if (/^places$/.test(text)) found.places = true;
      if (/^popular products$/.test(text)) found.shopping = true;
      if (/^top stories$/.test(text)) found.topStories = true;
      if (/^people also ask$/.test(text)) found.peopleAlsoAsk = true;
      if (/^videos$/.test(text)) found.videos = true;
      if (/^images$/.test(text)) found.images = true;
      if (/^sponsored$/.test(text)) found.ads = true;
      if (/^ai overview$/.test(text)) found.aiOverview = true;
    }

    return found;
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "DETECT_HEADINGS") {
      sendResponse({ success: true, headings: detectHeadings() });
    }
    return true;
  });
})();
