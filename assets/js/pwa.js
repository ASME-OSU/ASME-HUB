(() => {
  "use strict";

  const installButtons = Array.from(document.querySelectorAll("[data-install-app]"));
  const iosInstallHint = document.getElementById("ios-install-hint");
  let deferredInstallPrompt = null;

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

  const setInstallButtonsVisible = (visible) => {
    installButtons.forEach((button) => {
      button.hidden = !visible;
    });
  };

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          document.documentElement.dataset.pwaReady = "true";
        })
        .catch((error) => {
          document.documentElement.dataset.pwaReady = "false";
          console.warn("The ASME Officer Hub service worker could not be registered.", error);
        });
    });
  }

  if (isAppleMobile && !isStandalone && iosInstallHint) {
    iosInstallHint.hidden = false;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (!isStandalone) setInstallButtonsVisible(true);
  });

  installButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;

      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      setInstallButtonsVisible(false);
    });
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    setInstallButtonsVisible(false);
    if (iosInstallHint) iosInstallHint.hidden = true;
  });
})();
