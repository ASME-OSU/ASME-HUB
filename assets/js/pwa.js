(() => {
  "use strict";

  const installButtons = Array.from(document.querySelectorAll("[data-install-app]"));
  const iosInstallHint = document.getElementById("ios-install-hint");
  const updateNotice = document.getElementById("app-update-notice");
  const updateMessage = document.getElementById("app-update-message");
  const updateReload = document.getElementById("app-update-reload");
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
    let currentController = navigator.serviceWorker.controller;
    let updateNoticeShown = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      const nextController = navigator.serviceWorker.controller;
      if (!nextController || nextController === currentController) return;
      const replacedController = Boolean(currentController);
      currentController = nextController;
      if (!replacedController || updateNoticeShown) return;
      updateNoticeShown = true;
      if (updateNotice && updateMessage) {
        updateNotice.hidden = false;
        updateMessage.textContent = "A Hub update is ready. Save your notes and finish Annual Setup before reloading.";
      }
    });
    updateReload?.addEventListener("click", () => window.location.reload());

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
        .then((registration) => registration.update())
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
