import { TRANSITION_CHECKS, TRANSITION_STEPS } from "./transition-steps.js?v=20260930c";
import { emptyProgress, exportProgress, importProgress, migrateProgress, reconcileProgress, storageKey, transitionYear, transitionYearChoices, TRANSITION_STORAGE_PREFIX, validTransitionYear, TRANSITION_CHECK_STATUSES, TRANSITION_STATUSES } from "./transition-state.js?v=20260930c";
import { ANNUAL_HANDOFF_TYPE, ANNUAL_LINK_FIELDS, annualLinkStorageKey, importAnnualLinkDraft, validateAnnualLinkDraft, reopenAnnualChecks } from "./annual-link-draft.js?v=20260930d";

const section = document.getElementById("transition");
if (section) {
  const $ = (id) => document.getElementById(id);
  const dialog = $("transition-dialog");
  const list = $("transition-steps");
  const yearSelect = $("transition-year");
  const statusLine = $("transition-status");
  const byId = new Map(TRANSITION_STEPS.map((step) => [step.id, step]));
  const statusLabels = { not_started: "Not started", in_progress: "In progress", blocked: "Blocked", complete: "Complete — officer marked" };
  const checkLabels = { not_checked: "Not checked", checking: "Checking", passed: "Passed — officer reported", failed: "Failed", unable: "Unable to verify", needs_recheck: "Needs recheck" };
  const roleLabels = { president: "President", vice_president: "Vice President", treasurer: "Treasurer", secretary: "Secretary / points", social_chair: "Social Chair", webmaster: "Webmaster", ecouncil: "E-Council Representative", advisor: "Advisor" };
  let previousGuideRaw = null;
  let unreadableProgress = false;
  const migrationNotice = "Guide updated: earlier completed steps are now In progress, and passed checks are now Needs recheck. Other statuses were retained. Review the revised instructions before confirming them again.";
  function populateTransitionYears(preferred = yearSelect.value) {
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
    yearSelect.replaceChildren(...choices.map((year) => new Option(year.replace("-", "–"), year)));
    yearSelect.value = selected;
    $("transition-start-year").value = selected.slice(0, 4);
  }
  populateTransitionYears();
  let progress = emptyProgress(yearSelect.value);
  let currentIndex = 0;
  let opener = null;
  const annualInputs = new Map();
  let unreadableAnnualLinks = false;
  let savedAnnualLinks = {};
  const annualTools = node("details", "transition-tools");
  annualTools.append(node("summary", "", "Annual links and automation handoff"));
  annualTools.append(node("p", "", "Paste this year's copied Google links or import the private automation's link handoff. Checks below validate link format and known template identities only. Google ownership, privacy, Form destination and public export contents still need officer checks."));
  annualTools.append(node("p", "", "Saved links stay in this browser's local storage, visible to anyone using this browser profile. Use a private officer device. Progress exports and printing exclude these links. Review every link before adding it to the publicly readable Google Control Center."));
  const annualForm = node("form", "settings-grid");
  annualForm.id = "transition-annual-links-form";
  for (const [key, title, mapping] of ANNUAL_LINK_FIELDS) {
    const label = node("label", "transition-check-control", title);
    const input = node("input");
    input.type = "text";
    input.inputMode = "url";
    input.autocomplete = "off";
    input.setAttribute("aria-label", title);
    label.append(input, node("small", "", `Destination: ${mapping}`));
    annualInputs.set(key, input);
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
  function annualSay(message, error = false) {
    annualMessage.textContent = message;
    annualMessage.classList.toggle("is-error", error);
  }
  function annualDraft() {
    return validateAnnualLinkDraft({ schema: 1, type: ANNUAL_HANDOFF_TYPE, year: yearSelect.value,
      links: Object.fromEntries([...annualInputs].map(([key, input]) => [key, input.value])) }, yearSelect.value, window.ASME_HUB_CONFIG);
  }
  function fillAnnualLinks(draft) {
    for (const [key, input] of annualInputs) input.value = draft?.links[key] || "";
  }
  function readAnnualLinks() {
    fillAnnualLinks(null);
    unreadableAnnualLinks = false;
    savedAnnualLinks = {};
    try {
      const text = localStorage.getItem(annualLinkStorageKey(yearSelect.value));
      if (text) fillAnnualLinks(importAnnualLinkDraft(text, yearSelect.value, window.ASME_HUB_CONFIG));
      savedAnnualLinks = annualDraft().links;
      annualSay(text ? "Annual link draft loaded from this device. Confirm the actual files and checks before use." : "No saved annual links for this year.");
    } catch (error) { unreadableAnnualLinks = true; annualSay(`Saved links could not be read: ${error.message} Existing saved data is preserved. Import a valid handoff or explicitly remove saved links before saving.`, true); }
  }
  annualForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      if (unreadableAnnualLinks) throw new Error("Existing saved links are unreadable. Import a valid handoff or remove saved links before saving.");
      const draft = annualDraft();
      const changed = JSON.stringify(draft.links) !== JSON.stringify(savedAnnualLinks);
      if (changed && !save(reconcileProgress(reopenAnnualChecks(progress), TRANSITION_STEPS, TRANSITION_CHECKS))) throw new Error("Could not save the required manual recheck status. Annual links were not saved.");
      localStorage.setItem(annualLinkStorageKey(draft.year), JSON.stringify(draft));
      savedAnnualLinks = draft.links;
      fillAnnualLinks(draft);
      annualSay(`Link format checked and draft saved on this device.${changed ? " Previous completed annual steps and passed checks were reopened for review." : ""} No Google save or verification was performed.`);
    } catch (error) { annualSay(`Links were not saved: ${error.message}`, true); }
  });
  annualImport.addEventListener("change", async () => {
    const file = annualImport.files?.[0];
    annualImport.value = "";
    if (!file) return;
    const selectedYear = yearSelect.value;
    try {
      if (file.size > 100_000) throw new Error("Annual link files must be under 100 KB.");
      const draft = importAnnualLinkDraft(await file.text(), selectedYear, window.ASME_HUB_CONFIG);
      if (yearSelect.value !== selectedYear) throw new Error("The selected year changed while reading this file. Import again for the intended year.");
      fillAnnualLinks(draft);
      unreadableAnnualLinks = false;
      annualSay("Imported link draft for review. Choose Check and save to retain it on this device. Creation results do not certify ownership, privacy or readiness; Form respondent links must come from the actual Form.");
    } catch (error) { annualSay(`Import failed: ${error.message} Existing fields and saved links were not changed.`, true); }
  });
  annualSettings.addEventListener("click", () => {
    try {
      const draft = annualDraft();
      document.dispatchEvent(new CustomEvent("transition:annual-settings-draft", { detail: { draft, report: (error) => {
        if (error) annualSay(error, true);
        else dialog.close();
      } } }));
    } catch (error) { annualSay(`Cannot prepare settings: ${error.message}`, true); }
  });
  annualClear.addEventListener("click", () => {
    try {
      localStorage.removeItem(annualLinkStorageKey(yearSelect.value));
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
    if (statusOf(step.id) !== "complete") return `Mark ${step.id} complete and confirm the officer-reported result before continuing.`;
    return "";
  }
  function readYear() {
    const year = yearSelect.value;
    previousGuideRaw = null;
    unreadableProgress = false;
    $("transition-start-year").value = year.slice(0, 4);
    try {
      const raw = localStorage.getItem(storageKey(year));
      const parsed = raw ? JSON.parse(raw) : null;
      previousGuideRaw = parsed?.guideVersion === "officer-transition-guide-2" ? raw : null;
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
      if (previousGuideRaw) localStorage.setItem(`${storageKey(candidate.year)}:guide-2-backup`, previousGuideRaw);
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
    $("transition-active-year").textContent = current.replace("-", "–");
    $("transition-guide-year").textContent = yearSelect.value.replace("-", "–");
    $("transition-saved-at").textContent = progress.savedAt ? new Date(progress.savedAt).toLocaleString() : "Never";
    $("transition-position").textContent = `Step ${currentIndex + 1} of ${TRANSITION_STEPS.length}`;
    $("transition-completion").textContent = `${completed} of ${TRANSITION_STEPS.length} complete`;
    const meter = $("transition-progress");
    meter.max = TRANSITION_STEPS.length;
    meter.value = completed;
    meter.setAttribute("aria-label", `${completed} of ${TRANSITION_STEPS.length} transition steps completed; viewing step ${currentIndex + 1}`);
    $("transition-summary").textContent = `Year ${yearSelect.value.replace("-", "–")} · ${completed} officer-marked complete. Follow the full sequence; some steps involve other roles.`;
    $("transition-launch-summary").textContent = `${yearSelect.value.replace("-", "–")}: ${completed} of ${TRANSITION_STEPS.length} steps complete on this device.`;
    list.replaceChildren();
    const card = node("article", "transition-step");
    card.id = `transition-${step.id}`;
    const heading = node("div", "transition-step-heading");
    heading.append(node("h3", "", `${step.id} · ${step.title}`), node("span", "transition-step-state", statusLabels[statusOf(step.id)]));
    card.append(heading);
    card.append(node("p", "transition-owner", `Responsible: ${step.roles.map((role) => roleLabels[role] || role).join(", ")}`));
    card.append(node("p", "transition-prerequisites", `Prerequisites: ${step.needs.length ? step.needs.map((id) => `${id} ${byId.get(id).title}`).join("; ") : "None"}`));
    card.append(node("h4", "", "Officer instructions"), node("p", "transition-action", step.action));
    if (["T05", "T06", "T07", "T09", "T10"].includes(step.id)) {
      const enterLinks = node("button", "secondary-button", "Enter annual links");
      enterLinks.type = "button";
      enterLinks.addEventListener("click", () => {
        annualTools.open = true;
        annualTools.scrollIntoView({ block: "start" });
        annualInputs.get(step.id === "T06" ? "attendanceFormEditor" : step.id === "T07" ? "pointsExport" : step.id === "T09" ? "budgetTracker" : "pointsMaster").focus({ preventScroll: true });
      });
      card.append(node("p", "", "Add the copied links in Annual links and automation handoff below. The guide checks their format and prepares an inactive Year Settings draft for review."), enterLinks);
    }
    if (step.resource) {
      const url = window.ASME_HUB_CONFIG?.[step.resource]?.editUrl;
      if (url && /^https:\/\//.test(url)) {
        const link = node("a", "secondary-button", step.resource === "templates" ? "Open Google Drive Templates folder" : "Open Google Hub Control Center");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(link);
      }
    }
    for (const key of step.templateActions || []) {
      const source = window.ASME_HUB_CONFIG?.templates?.sources?.[key];
      if (source?.editUrl && /^https:\/\//.test(source.editUrl)) {
        const link = node("a", "secondary-button", `Open ${source.title} template`);
        link.href = source.editUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        card.append(link);
      }
    }
    card.append(node("h4", "", "Manual confirmation"), node("p", "transition-manual-check", step.check));
    if (checksFor(step).length) card.append(node("p", "", "Perform these checks in the named services, then record your result below. The Hub does not check them automatically."));
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
        if (value === "passed" && !window.confirm(`Record “${check.title}” as Passed? Confirm you performed the check in the named service and recorded the result in the private handoff. The Hub does not perform this check.`)) {
          select.value = checkOf(check.id);
          return;
        }
        const checks = { ...progress.checks };
        if (value === "not_checked") delete checks[check.id]; else checks[check.id] = value;
        save(reconcileProgress({ ...progress, checks }, TRANSITION_STEPS, TRANSITION_CHECKS), check.id);
      });
      label.append(select);
      card.append(label);
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
        if (!window.confirm(`Mark ${step.id} complete on this device? Confirm its manual checks in the private workflow. This does not verify or activate the year.`)) {
          select.value = statusOf(step.id);
          return;
        }
      }
      const steps = { ...progress.steps };
      if (value === "not_started") delete steps[step.id]; else steps[step.id] = value;
      save(reconcileProgress({ ...progress, steps }, TRANSITION_STEPS, TRANSITION_CHECKS), step.id);
    });
    control.append(select);
    card.append(control);
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
  $("transition-next").addEventListener("click", () => {
    const reason = blockingReason(TRANSITION_STEPS[currentIndex]);
    if (reason) { say(reason, true); $("transition-next-reason").focus(); return; }
    if (currentIndex < TRANSITION_STEPS.length - 1) go(currentIndex + 1);
    else say("All steps are officer-marked complete. Verify private evidence before any authorized activation.");
  });
  $("transition-next-reason").tabIndex = -1;
  yearSelect.addEventListener("change", readYear);
  $("transition-year-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const year = transitionYear($("transition-start-year").value);
      populateTransitionYears(year);
      readYear();
    } catch (error) { say(error.message, true); }
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
      const imported = importProgress(text, yearSelect.value, TRANSITION_STEPS, TRANSITION_CHECKS);
      const migrated = JSON.parse(text).guideVersion === "officer-transition-guide-2";
      const candidate = { ...imported, savedAt: new Date().toISOString() };
      if (previousGuideRaw) localStorage.setItem(`${storageKey(candidate.year)}:guide-2-backup`, previousGuideRaw);
      if (migrated) localStorage.setItem(`${storageKey(candidate.year)}:guide-2-import-backup`, text);
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
    sheet.replaceChildren(node("h1", "", `Officer transition checklist · ${yearSelect.value.replace("-", "–")}`));
    sheet.append(node("p", "", "Officer-marked local status. Reconfirm real systems and private evidence before activation."));
    for (const step of TRANSITION_STEPS) {
      const card = node("article", "transition-print-step");
      card.append(node("h2", "", `${step.id} · ${step.title} — ${statusLabels[statusOf(step.id)]}`));
      card.append(node("p", "", `Responsible: ${step.roles.map((role) => roleLabels[role] || role).join(", ")}`));
      card.append(node("p", "", `Prerequisites: ${step.needs.join(", ") || "None"}`));
      card.append(node("p", "", step.action), node("p", "", `Manual check: ${step.check}`));
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
