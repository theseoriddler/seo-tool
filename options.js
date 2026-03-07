(function () {
  "use strict";

  const input = document.getElementById("apikey");
  const saveBtn = document.getElementById("save");
  const clearBtn = document.getElementById("clear");
  const status = document.getElementById("status");

  function showStatus(msg, type) {
    status.textContent = msg;
    status.className = type;
    setTimeout(() => { status.textContent = ""; }, 3000);
  }

  // Load saved key
  chrome.storage.local.get("serpApiKey", (result) => {
    if (result.serpApiKey) {
      input.value = result.serpApiKey;
    }
  });

  saveBtn.addEventListener("click", () => {
    const key = input.value.trim();
    if (!key) {
      showStatus("Please enter an API key.", "error");
      return;
    }
    chrome.storage.local.set({ serpApiKey: key }, () => {
      showStatus("API key saved.", "success");
    });
  });

  clearBtn.addEventListener("click", () => {
    chrome.storage.local.remove("serpApiKey", () => {
      input.value = "";
      showStatus("API key removed.", "success");
    });
  });
})();
