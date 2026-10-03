import { TRANSITION_CHECKS, TRANSITION_STEPS } from "./transition-steps.js?v=20261003b";
import { emptyProgress, exportProgress, importProgress, migrateProgress, reconcileProgress, storageKey, transitionYear, transitionYearChoices, TRANSITION_STORAGE_PREFIX, validTransitionYear, TRANSITION_CHECK_STATUSES, TRANSITION_STATUSES } from "./transition-state.js?v=20261003b";
import { ANNUAL_HANDOFF_TYPE, ANNUAL_LINK_FIELDS, annualLinkStorageKey, importAnnualLinkDraft, validateAnnualLinkDraft, reopenAnnualChecks } from "./annual-link-draft.js?v=20261002a";

const section = document.getElementById("transition");
if (section) {
  const $ = (id) => document.getElementById(id);
  const dialog = $("transition-dialog");
  const list = $("transition-steps");
  const yearInput = $("transition-year");
  const yearSetup = $("transition-year-setup");
  // The year panel is detached on later steps; retain its datalist across reloads.
  const yearOptions = $("transition-year-options");
  let selectedYear = "";
  const statusLine = $("transition-status");
  const byId = new Map(TRANSITION_STEPS.map((step) => [step.id, step]));
  const statusLabels = { not_started: "Not started", in_progress: "In progress", blocked: "Blocked", complete: "Complete — officer marked" };
  const checkLabels = { not_checked: "Not checked", checking: "Checking", passed: "Passed — officer reported", failed: "Failed", unable: "Unable to verify", needs_recheck: "Needs recheck" };
  const roleLabels = { president: "President", vice_president: "Vice President", treasurer: "Treasurer", secretary: "Secretary / points", social_chair: "Social Chair", webmaster: "Webmaster", ecouncil: "E-Council Representative", advisor: "Advisor" };
  let previousGuideRaw = null;
  let unreadableProgress = false;
  const migrationNotice = "Guide updated: earlier completed steps are now In progress, and passed checks are now Needs recheck. Other statuses were retained. Review the revised instructions before confirming them again.";
  function populateTransitionYears(preferred = selectedYear) {
    const saved = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(TRANSITION_STORAGE_PREFIX)) {
          const year = key.slice(TRANSITION_STORAGE_PREFIX.length);
          if (validTransitionYear(year)) saved.push(year);
        }
      }
    } catch { /* The guide remains usable when browser storage is unavailable. */ }
    const config = window.ASME_HUB_CONFIG || {};
    const current = config.currentAcademicYear || "2026-2027";
    const configured = [...Object.keys(config.dataSources || {}), ...(config.registeredTransitionYears || [])];
    const choices = transitionYearChoices(configured, [...saved, preferred], current);
    const nextStart = Math.min(Number(current.slice(0, 4)) + 1, 2199);
    const selected = validTransitionYear(preferred) ? preferred : transitionYear(nextStart);
    yearOptions.replaceChildren(...choices.map((year) => new Option(year.replace("-", "–"), year.slice(0, 4))));
    selectedYear = selected;
    yearInput.value = selected.slice(0, 4);
  }
  populateTransitionYears();
  let progress = emptyProgress(selectedYear);
  let currentIndex = 0;
  let opener = null;
  const annualInputs = new Map();
  const annualLabels = new Map();
  const stepLinks = { T04: ["annualFolder"], T05: ["pointsMaster"], T06: ["attendanceFormEditor", "attendanceFormRespondent"], T07: ["pointsExport"], T09: ["budgetTracker", "budgetExport"] };
  const setupGuide = ["annual-points-setup.md", "Open response wiring and event setup instructions"];
  const financeGuide = ["finance-settings-launch.md", "Open finance, settings and launch examples"];
  const communicationsGuide = ["communications-rollover.md", "Open calendar, newsletter and public-page instructions"];
  const stepGuides = { T01: [["README.md", "Open the current officer documentation index"]], T03: [setupGuide], T05: [setupGuide], T06: [setupGuide], T07: [setupGuide], T08: [setupGuide], T09: [setupGuide, financeGuide], T10: [financeGuide], T11: [communicationsGuide], T12: [communicationsGuide], T13: [communicationsGuide], T14: [financeGuide], T15: [financeGuide], T16: [financeGuide] };
  function resourceRow(url, title, description, kind = "document") {
    const row = node("div", `transition-resource transition-resource-${kind}`);
    const tile = node("span", "transition-resource-icon");
    tile.setAttribute("aria-hidden", "true");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#icon-${kind === "sheet" ? "chart" : kind === "guide" ? "check-square" : "link"}`);
    svg.append(use);
    tile.append(svg);
    const copy = node("div", "transition-resource-copy");
    copy.append(node("strong", "", title), node("small", "", description));
    const link = node("a", "secondary-button", kind === "guide" ? "View guide ↗" : "Open link ↗");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", title);
    row.append(tile, copy, link);
    return row;
  }
  function appendGuideLinks(card, step, rows = false) {
    for (const [filename, title] of stepGuides[step.id] || []) {
      const url = `https://github.com/ASME-OSU/ASME-HUB/blob/main/docs/officer-transition/${filename}`;
      if (rows) card.append(resourceRow(url, title.replace(/^Open (?:the )?/, "").replace(/^./, (letter) => letter.toUpperCase()), "Read the detailed procedure and worked examples.", "guide"));
      else {
        const link = node("a", "secondary-button", title);
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(link);
      }
    }
  }
  let unreadableAnnualLinks = false;
  let savedAnnualLinks = {};
  const annualTools = node("details", "transition-tools");
  const annualSummary = node("summary", "", "New-year draft links");
  annualTools.append(annualSummary);
  annualTools.append(node("p", "", "These are the new year's draft links entered in the steps above. Expand this section to review or change them together, or import the private automation's link handoff. Link checks cover format and known template identities; officers still check Google access, privacy and business results."));
  annualTools.append(node("p", "", "Saved links stay in this browser's local storage, visible to anyone using this browser profile. Use a private officer device. Progress exports and printing exclude these links. Review every link before adding it to the publicly readable Google Control Center."));
  const annualForm = node("form", "settings-grid");
  annualForm.id = "transition-annual-links-form";
  for (const [key, title, description] of ANNUAL_LINK_FIELDS) {
    const label = node("label", "transition-check-control", title);
    const input = node("input");
    input.type = "text";
    input.inputMode = "url";
    input.autocomplete = "off";
    input.placeholder = "Paste the copied Google link";
    input.setAttribute("form", annualForm.id);
    input.setAttribute("aria-label", title);
    label.append(input, node("small", "", description));
    annualInputs.set(key, input);
    annualLabels.set(key, label);
    annualForm.append(label);
  }
  const annualActions = node("div", "transition-toolbar");
  const annualSave = node("button", "secondary-button", "Check and save links on this device");
  annualSave.type = "submit";
  annualSave.setAttribute("form", annualForm.id);
  const annualImportLabel = node("label", "secondary-button file-button", "Import automation links");
  const annualImport = node("input");
  annualImport.type = "file";
  annualImport.accept = "application/json,.json";
  annualImportLabel.append(annualImport);
  const annualSettings = node("button", "secondary-button", "Prepare Year Settings draft");
  annualSettings.type = "button";
  const annualClear = node("button", "secondary-button", "Remove saved links from this device");
  annualClear.type = "button";
  annualActions.append(annualSave, annualImportLabel, annualSettings, annualClear);
  const annualMessage = node("p", "transition-status");
  annualMessage.setAttribute("role", "status");
  annualMessage.setAttribute("aria-live", "polite");
  annualTools.append(annualForm, annualActions, annualMessage);
  dialog.querySelector(".transition-tools").before(annualTools);
  const currentTools = node("details", "transition-tools");
  const currentSummary = node("summary", "", "Current Hub settings");
  const currentSettings = node("button", "secondary-button", "View current Hub settings");
  currentSettings.type = "button";
  currentSettings.addEventListener("click", () => document.dispatchEvent(new CustomEvent("transition:current-settings")));
  currentTools.append(currentSummary, node("p", "", "The current year uses the shared Google Control Center settings. Review those separately from the new-year draft below."), currentSettings);
  annualTools.before(currentTools);
  function annualSay(message, error = false) {
    annualMessage.textContent = message;
    annualMessage.classList.toggle("is-error", error);
  }
  function annualDraft() {
    return validateAnnualLinkDraft({ schema: 1, type: ANNUAL_HANDOFF_TYPE, year: selectedYear,
      links: Object.fromEntries([...annualInputs].map(([key, input]) => [key, input.value])) }, selectedYear, window.ASME_HUB_CONFIG);
  }
  function fillAnnualLinks(draft) {
    for (const [key, input] of annualInputs) input.value = draft?.links[key] || "";
  }
  function readAnnualLinks() {
    fillAnnualLinks(null);
    unreadableAnnualLinks = false;
    savedAnnualLinks = {};
    try {
      const text = localStorage.getItem(annualLinkStorageKey(selectedYear));
      if (text) fillAnnualLinks(importAnnualLinkDraft(text, selectedYear, window.ASME_HUB_CONFIG));
      savedAnnualLinks = annualDraft().links;
      annualSay(text ? "Annual link draft loaded from this device. Confirm the actual files and checks before use." : "No saved annual links for this year.");
    } catch (error) { unreadableAnnualLinks = true; annualSay(`Saved links could not be read: ${error.message} Existing saved data is preserved. Import a valid handoff or explicitly remove saved links before saving.`, true); }
  }
  function saveAnnualLinks() {
    if (unreadableAnnualLinks) throw new Error("Existing saved links are unreadable. Import a valid handoff or remove saved links before saving.");
    const draft = annualDraft();
    const changedKeys = ANNUAL_LINK_FIELDS.map(([key]) => key).filter((key) => (draft.links[key] || "") !== (savedAnnualLinks[key] || ""));
    const candidate = reconcileProgress(reopenAnnualChecks(progress, changedKeys, savedAnnualLinks), TRANSITION_STEPS, TRANSITION_CHECKS);
    const reopened = Object.entries(progress.steps).some(([id, state]) => state === "complete" && candidate.steps[id] === "in_progress") ||
      Object.entries(progress.checks).some(([id, state]) => state === "passed" && candidate.checks[id] === "needs_recheck");
    if (changedKeys.length && !save(candidate)) throw new Error("Could not save the required manual recheck status. Annual links were not saved.");
    localStorage.setItem(annualLinkStorageKey(draft.year), JSON.stringify(draft));
    savedAnnualLinks = draft.links;
    fillAnnualLinks(draft);
    annualSay(`Link format checked and draft saved on this device.${reopened ? " Affected completed steps and checks need review." : ""} Check Google access and connections in Google Drive and Forms.`);
    return draft;
  }
  annualForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try { saveAnnualLinks(); } catch (error) { annualSay(`Links were not saved: ${error.message}`, true); }
  });
  annualImport.addEventListener("change", async () => {
    const file = annualImport.files?.[0];
    annualImport.value = "";
    if (!file) return;
    const importedYear = selectedYear;
    try {
      if (file.size > 100_000) throw new Error("Annual link files must be under 100 KB.");
      const draft = importAnnualLinkDraft(await file.text(), importedYear, window.ASME_HUB_CONFIG);
      if (selectedYear !== importedYear) throw new Error("The selected year changed while reading this file. Import again for the intended year.");
      fillAnnualLinks(draft);
      unreadableAnnualLinks = false;
      annualSay("Imported link draft for review. Choose Check and save to retain it on this device. Creation results do not certify ownership, privacy or readiness; Form respondent links must come from the actual Form.");
    } catch (error) { annualSay(`Import failed: ${error.message} Existing fields and saved links were not changed.`, true); }
  });
  function prepareAnnualSettings() {
    try {
      const draft = saveAnnualLinks();
      document.dispatchEvent(new CustomEvent("transition:annual-settings-draft", { detail: { draft, report: (error) => {
        if (error) annualSay(error, true);
        else dialog.close();
      } } }));
    } catch (error) { annualSay(`Cannot prepare settings: ${error.message}`, true); }
  }
  annualSettings.addEventListener("click", prepareAnnualSettings);
  annualClear.addEventListener("click", () => {
    try {
      const removedKeys = Object.keys(savedAnnualLinks).filter((key) => savedAnnualLinks[key]);
      if (removedKeys.length && !save(reconcileProgress(reopenAnnualChecks(progress, removedKeys, savedAnnualLinks), TRANSITION_STEPS, TRANSITION_CHECKS))) throw new Error("Could not save required recheck status.");
      localStorage.removeItem(annualLinkStorageKey(selectedYear));
      fillAnnualLinks(null);
      savedAnnualLinks = {};
      unreadableAnnualLinks = false;
      annualSay("Annual links removed from this device. Google files and settings were not changed.");
    } catch { annualSay("Could not remove local links. Check browser storage.", true); }
  });

  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }
  function statusOf(id) { return progress.steps[id] || "not_started"; }
  function checkOf(id) { return progress.checks[id] || "not_checked"; }
  function checksFor(step) { return TRANSITION_CHECKS.filter((check) => check.step === step.id); }
  function unmet(step) { return step.needs.filter((id) => statusOf(id) !== "complete"); }
  function unchecked(step) { return checksFor(step).filter((check) => checkOf(check.id) !== "passed"); }
  function firstIncomplete() {
    const index = TRANSITION_STEPS.findIndex((step) => statusOf(step.id) !== "complete");
    return index < 0 ? TRANSITION_STEPS.length - 1 : index;
  }
  function say(message, error = false) {
    statusLine.textContent = message;
    statusLine.classList.toggle("is-error", error);
  }
  function blockingReason(step) {
    const missingEarlier = TRANSITION_STEPS.slice(0, currentIndex).filter((entry) => statusOf(entry.id) !== "complete");
    if (missingEarlier.length) return `Complete earlier step ${missingEarlier[0].id} before continuing.`;
    const missing = unmet(step);
    if (missing.length) return `Complete prerequisite ${missing.join(", ")} before continuing.`;
    const pending = unchecked(step);
    if (pending.length) return `Cannot continue: required manual checks ${pending.map((check) => `${check.title} (${checkLabels[checkOf(check.id)]})`).join(", ")} must be recorded as passed after checking the real systems.`;
    if (statusOf(step.id) !== "complete") return `Mark ${step.id} complete before continuing.`;
    return "";
  }
  function readYear() {
    const year = selectedYear;
    previousGuideRaw = null;
    unreadableProgress = false;
    yearInput.value = year.slice(0, 4);
    try {
      const raw = localStorage.getItem(storageKey(year));
      const parsed = raw ? JSON.parse(raw) : null;
      previousGuideRaw = ["officer-transition-guide-2", "officer-transition-guide-3"].includes(parsed?.guideVersion) ? raw : null;
      progress = raw ? migrateProgress(parsed, year, TRANSITION_STEPS, TRANSITION_CHECKS) : emptyProgress(year);
      say(previousGuideRaw ? migrationNotice + " Your previous saved file is preserved until you save; a backup will be kept on this device." : raw ? "Progress loaded from this device. Reconfirm the real checks before activation." : "No local progress for this year yet.");
    } catch (error) {
      unreadableProgress = true;
      previousGuideRaw = null;
      progress = emptyProgress(year);
      say(`Local progress could not be loaded: ${error.message} Existing saved data was not changed.`, true);
    }
    currentIndex = firstIncomplete();
    readAnnualLinks();
    render();
  }
  function save(next, focusControl) {
    if (unreadableProgress) {
      say("Saved progress could not be read and will not be overwritten. Import a valid progress file or choose another year.", true);
      render();
      return false;
    }
    const candidate = { ...next, savedAt: new Date().toISOString() };
    try {
      if (previousGuideRaw) localStorage.setItem(`${storageKey(candidate.year)}:${JSON.parse(previousGuideRaw).guideVersion}-backup`, previousGuideRaw);
      localStorage.setItem(storageKey(candidate.year), JSON.stringify(candidate));
      previousGuideRaw = null;
      progress = candidate;
      say("Saved on this device. Officers perform the checks in the real systems; the Hub records their reported results.");
      if (currentIndex > firstIncomplete()) currentIndex = firstIncomplete();
      render();
      list.querySelector(`[data-transition-control="${focusControl}"]`)?.focus();
      return true;
    } catch {
      say("Could not save on this device. Your last saved progress is unchanged. Check browser storage before leaving.", true);
      render();
      list.querySelector(`[data-transition-control="${focusControl}"]`)?.focus();
      return false;
    }
  }
  function render() {
    $("transition-export").disabled = unreadableProgress;
    const step = TRANSITION_STEPS[currentIndex];
    const completed = TRANSITION_STEPS.filter((entry) => statusOf(entry.id) === "complete").length;
    const current = window.ASME_HUB_CONFIG?.currentAcademicYear || "2026-2027";
    currentSummary.textContent = `Current Hub settings · ${current.replace("-", "–")}`;
    annualSummary.textContent = `New-year draft links · ${selectedYear.replace("-", "–")} · saved on this device`;
    $("transition-active-year").textContent = current.replace("-", "–");
    $("transition-guide-year").textContent = selectedYear.replace("-", "–");
    $("transition-change-year").hidden = currentIndex === 0;
    $("transition-saved-at").textContent = progress.savedAt ? new Date(progress.savedAt).toLocaleString() : "Never";
    $("transition-position").textContent = `Step ${currentIndex + 1} of ${TRANSITION_STEPS.length}`;
    $("transition-completion").textContent = `${Math.round(completed / TRANSITION_STEPS.length * 100)}% complete`;
    const meter = $("transition-progress");
    meter.max = TRANSITION_STEPS.length;
    meter.value = completed;
    meter.setAttribute("aria-label", `${completed} of ${TRANSITION_STEPS.length} transition steps completed; viewing step ${currentIndex + 1}`);
    $("transition-summary").textContent = "Progress and reported checks are saved on this device.";
    $("transition-launch-summary").textContent = `${selectedYear.replace("-", "–")}: ${completed} of ${TRANSITION_STEPS.length} steps complete on this device.`;
    // Keep the same canonical fields when moving between step cards.
    for (const label of annualLabels.values()) annualForm.append(label);
    annualTools.append(annualMessage);
    yearSetup.remove();
    yearSetup.hidden = step.id !== "T01";
    list.replaceChildren();
    const card = node("article", "transition-step");
    card.id = `transition-${step.id}`;
    const heading = node("div", "transition-step-heading");
    const identity = node("div", "transition-step-identity");
    identity.append(node("span", "transition-step-badge", step.id));
    const title = node("div", "transition-step-title");
    title.append(node("h3", "", step.title), node("p", "transition-owner", `Responsible: ${step.roles.map((role) => roleLabels[role] || role).join(", ")}`));
    identity.append(title);
    const pill = node("span", "transition-step-state", statusLabels[statusOf(step.id)]);
    pill.dataset.state = statusOf(step.id);
    heading.append(identity, pill);
    card.append(heading);
    card.append(node("p", "transition-prerequisites", `Prerequisites: ${step.needs.length ? step.needs.map((id) => `${id} ${byId.get(id).title}`).join("; ") : "None"}`));
    card.append(node("h4", "", "What you need to do"));
    const procedure = node("ol", "transition-procedure");
    for (const action of step.action.split(/(?<=[.!?])\s+(?=[A-Z])/u)) procedure.append(node("li", "", action));
    card.append(procedure);
    const resources = node("section", "transition-resources");
    appendGuideLinks(resources, step, true);
    if (step.resource) {
      const url = window.ASME_HUB_CONFIG?.[step.resource]?.editUrl;
      if (url && /^https:\/\//.test(url)) resources.append(resourceRow(url, step.resource === "templates" ? "Google Drive Templates folder" : "Google Hub Control Center", "Open the chapter's shared source and review its contents."));
    }
    for (const key of step.templateActions || []) {
      const source = window.ASME_HUB_CONFIG?.templates?.sources?.[key];
      if (source?.editUrl && /^https:\/\//.test(source.editUrl)) resources.append(resourceRow(source.editUrl, `${source.title} template`, "Open the template and make a copy for this year.", key === "attendanceForm" ? "document" : "sheet"));
    }
    if (resources.childElementCount) {
      resources.prepend(node("h4", "", "Links and resources"));
      card.append(resources);
    }
    if (step.id === "T01") card.append(yearSetup);
    if (stepLinks[step.id] || step.id === "T10") {
      const panel = node("section", "transition-inline-links");
      panel.append(node("h4", "", step.id === "T10" ? "Review and save the new year's settings" : "Save for next year"));
      panel.append(node("p", "", "Saving checks link format and known template IDs, then retains the draft on this device. Check file permissions and connections in Google Drive and Forms."));
      for (const key of stepLinks[step.id] || []) panel.append(annualLabels.get(key));
      const action = node("button", "secondary-button", step.id === "T10" ? "Review new-year settings" : "Check and save links on this device");
      if (step.id === "T10") {
        action.type = "button";
        action.addEventListener("click", prepareAnnualSettings);
        panel.append(node("p", "", "Review the inactive draft in Year Settings. Open the authorized annual save page to transfer the draft directly. You can also download a Google save file. Google verifies the copied files and connections, saves an inactive row and reads it back. If that service is not connected, use Edit shared settings and Compare with Google."));
      } else { action.type = "submit"; action.setAttribute("form", annualForm.id); }
      panel.append(action, annualMessage);
      card.append(panel);
    }
    const confirmation = node("section", "transition-confirmation");
    card.append(confirmation);
    confirmation.append(node("h4", "", "Manual confirmation"), node("p", "transition-manual-check", step.check));
    if (checksFor(step).length) confirmation.append(node("p", "", "Perform these checks in the named services, then record your result below. The Hub does not check them automatically."));
    for (const check of checksFor(step)) {
      const label = node("label", "transition-check-control", check.title);
      const select = node("select");
      select.dataset.transitionControl = check.id;
      select.setAttribute("aria-label", `Manual check: ${check.title}`);
      TRANSITION_CHECK_STATUSES.forEach((value) => select.add(new Option(checkLabels[value], value)));
      select.value = checkOf(check.id);
      select.addEventListener("change", () => {
        const value = select.value;
        const missing = unmet(step);
        if (value === "passed" && missing.length) {
          say(`Complete ${missing.join(", ")} before recording this check as passed.`, true);
          select.value = checkOf(check.id);
          return;
        }
        const checks = { ...progress.checks };
        if (value === "not_checked") delete checks[check.id]; else checks[check.id] = value;
        save(reconcileProgress({ ...progress, checks }, TRANSITION_STEPS, TRANSITION_CHECKS), check.id);
      });
      label.append(select);
      confirmation.append(label);
    }
    const control = node("label", "transition-status-control", "Officer progress");
    const select = node("select");
    select.dataset.transitionControl = step.id;
    select.setAttribute("aria-label", `${step.id} officer progress`);
    TRANSITION_STATUSES.forEach((value) => select.add(new Option(statusLabels[value], value)));
    select.value = statusOf(step.id);
    select.addEventListener("change", () => {
      const value = select.value;
      if (value === "complete") {
        const missing = unmet(step);
        const pending = unchecked(step);
        if (missing.length || pending.length) {
          say(missing.length ? `Complete ${missing.join(", ")} first.` : `Record manual ${pending.map((check) => check.title).join(", ")} as passed before marking ${step.id} complete.`, true);
          select.value = statusOf(step.id);
          return;
        }
      }
      const steps = { ...progress.steps };
      if (value === "not_started") delete steps[step.id]; else steps[step.id] = value;
      save(reconcileProgress({ ...progress, steps }, TRANSITION_STEPS, TRANSITION_CHECKS), step.id);
    });
    control.append(select);
    confirmation.append(control);
    const reason = blockingReason(step);
    list.append(card);
    $("transition-back").disabled = currentIndex === 0;
    $("transition-next").textContent = currentIndex === TRANSITION_STEPS.length - 1 ? "Finish review" : "Next step";
    $("transition-next").setAttribute("aria-disabled", reason ? "true" : "false");
    $("transition-next-reason").textContent = reason || (currentIndex === TRANSITION_STEPS.length - 1 ? "All steps are officer-marked complete. Confirm authoritative evidence before any activation." : "Ready for the next step.");
  }
  function go(index) {
    currentIndex = index;
    render();
    dialog.querySelector(".transition-dialog-body").scrollTop = 0;
    list.querySelector("h3")?.setAttribute("tabindex", "-1");
    list.querySelector("h3")?.focus();
  }
  function open() {
    opener = document.activeElement;
    currentIndex = firstIncomplete();
    render();
    dialog.showModal();
    $("transition-close").focus();
  }
  $("transition-open").addEventListener("click", open);
  $("transition-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { if (opener?.isConnected) opener.focus(); });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  $("transition-back").addEventListener("click", () => { if (currentIndex > 0) go(currentIndex - 1); });
  $("transition-change-year").addEventListener("click", () => { go(0); yearInput.focus(); });
  $("transition-next").addEventListener("click", () => {
    const reason = blockingReason(TRANSITION_STEPS[currentIndex]);
    if (reason) { say(reason, true); $("transition-next-reason").focus(); return; }
    if (currentIndex < TRANSITION_STEPS.length - 1) go(currentIndex + 1);
    else say("All steps are officer-marked complete. Verify private evidence before any authorized activation.");
  });
  $("transition-next-reason").tabIndex = -1;
  yearInput.addEventListener("input", () => yearInput.setCustomValidity(""));
  $("transition-year-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const year = transitionYear(yearInput.value);
      populateTransitionYears(year);
      readYear();
    } catch (error) { yearInput.setCustomValidity(error.message); yearInput.reportValidity(); say(error.message, true); }
  });
  $("transition-export").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([exportProgress(progress, TRANSITION_STEPS, TRANSITION_CHECKS)], { type: "application/json" }));
    const link = node("a");
    link.href = url;
    link.download = `asme-transition-progress-${progress.year}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say("Exported year, guide version, step/check statuses, and save time only. Keep the file in an appropriate handoff location.");
  });
  const sharedSettingsUrl = window.ASME_HUB_CONFIG?.sharedSettings?.editUrl;
  if (sharedSettingsUrl) $("transition-control-center").href = sharedSettingsUrl;
  $("transition-import").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error("Progress files must be under 100 KB.");
      const text = await file.text();
      const imported = importProgress(text, selectedYear, TRANSITION_STEPS, TRANSITION_CHECKS);
      const migrated = ["officer-transition-guide-2", "officer-transition-guide-3"].includes(JSON.parse(text).guideVersion);
      const candidate = { ...imported, savedAt: new Date().toISOString() };
      if (previousGuideRaw) localStorage.setItem(`${storageKey(candidate.year)}:${JSON.parse(previousGuideRaw).guideVersion}-backup`, previousGuideRaw);
      if (migrated) localStorage.setItem(`${storageKey(candidate.year)}:${JSON.parse(text).guideVersion}-import-backup`, text);
      localStorage.setItem(storageKey(candidate.year), JSON.stringify(candidate));
      previousGuideRaw = null;
      unreadableProgress = false;
      progress = candidate;
      currentIndex = firstIncomplete();
      render();
      say(migrated ? migrationNotice + " The imported original was backed up on this device." : "Imported into this device. Reconfirm all real checks before activation; imported status is not verification.");
    } catch (error) {
      say(`Import failed: ${error.message} Existing progress was not changed.`, true);
    }
  });
  function buildPrintSheet() {
    const sheet = $("transition-print-sheet");
    sheet.replaceChildren(node("h1", "", `Officer transition checklist · ${selectedYear.replace("-", "–")}`));
    sheet.append(node("p", "", "Officer-marked local status. Reconfirm real systems and private evidence before activation."));
    for (const step of TRANSITION_STEPS) {
      const card = node("article", "transition-print-step");
      card.append(node("h2", "", `${step.id} · ${step.title} — ${statusLabels[statusOf(step.id)]}`));
      card.append(node("p", "", `Responsible: ${step.roles.map((role) => roleLabels[role] || role).join(", ")}`));
      card.append(node("p", "", `Prerequisites: ${step.needs.join(", ") || "None"}`));
      card.append(node("p", "", step.action), node("p", "", `Manual check: ${step.check}`));
      appendGuideLinks(card, step);
      checksFor(step).forEach((check) => card.append(node("p", "", `${check.title}: ${checkLabels[checkOf(check.id)]}`)));
      sheet.append(card);
    }
  }
  $("transition-print").addEventListener("click", () => {
    buildPrintSheet();
    document.body.classList.add("transition-print");
    $("transition-print-sheet").hidden = false;
    window.print();
  });
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("transition-print");
    $("transition-print-sheet").hidden = true;
  });
  document.addEventListener("transition:year-updated", () => {
    populateTransitionYears();
    render();
  });
  readYear();
}
