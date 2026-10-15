import { TRANSITION_OFFICER_COPY, TRANSITION_OFFICER_QUESTIONS, TRANSITION_CHECKS, TRANSITION_STEPS, TRANSITION_TEST_CASES, TRANSITION_TEST_IDENTITIES } from "./transition-steps.js?v=20261015d";
import { checkApplies, createTransitionRun, progressSummary, launchEligibility, parseProgress, TRANSITION_LEGACY_STORAGE_PREFIX, emptyProgress, exportProgress, importProgress, migrateProgress, reconcileProgress, storageKey, transitionYear, transitionYearChoices, TRANSITION_STORAGE_PREFIX, TRANSITION_PREVIOUS_GUIDE_VERSIONS, validTransitionYear, TRANSITION_CHECK_STATUSES, TRANSITION_STATUSES } from "./transition-state.js?v=20261015d";
import { ANNUAL_HANDOFF_TYPE, PRIVATE_RECORD_FIELDS, ANNUAL_LINK_FIELDS, MOCK_ANNUAL_FIELDS, annualLinkStorageKey, importAnnualLinkDraft, validateAnnualLinkDraft, reopenAnnualChecks, reviewAnnualLinkImport } from "./annual-link-draft.js?v=20261015d";

import { createAnnualSetupClient } from "./annual-setup-api.js?v=20261015d";

const section = document.getElementById("transition");
if (section) {
  const $ = (id) => document.getElementById(id);
  const dialog = $("transition-dialog");
  const list = $("transition-steps");
  const yearInput = $("transition-year");
  const yearSetup = $("transition-year-setup");
  const setupOptions = $("transition-checklist-options");
  const setupHome = $("transition-setup-home");
  // Step 1 owns setup; the header links back to it from later steps.
  const yearOptions = $("transition-year-options");
  const selectedYearKey = "asmeHubTransitionSelectedYearV2";
  let selectedYear = "";
  try {
    const savedYear = localStorage.getItem(selectedYearKey);
    if (validTransitionYear(savedYear)) selectedYear = savedYear;
    else if (savedYear === null) {
      // Older releases did not remember the viewed year. Restore the latest
      // validated saved checklist rather than showing a different year at zero.
      let latest = -Infinity;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(TRANSITION_STORAGE_PREFIX)) continue;
        const suffix = key.slice(TRANSITION_STORAGE_PREFIX.length), parts = suffix.split(":");
        if (parts.length !== 2 || !validTransitionYear(parts[0])) continue;
        try {
          const original = JSON.parse(localStorage.getItem(key));
          if (original.run?.id !== parts[1]) continue;
          const saved = migrateProgress(original, parts[0], TRANSITION_STEPS, TRANSITION_CHECKS);
          const stamp = Date.parse(saved.savedAt);
          if (stamp > latest) { latest = stamp; selectedYear = saved.year; }
        } catch { /* Preserve malformed records; they cannot select a year. */ }
      }
    }
  } catch { /* Use the next year when storage is unavailable. */ }
  let selectedRunId = "";
  const statusLine = $("transition-status");
  const byId = new Map(TRANSITION_STEPS.map((step) => [step.id, step]));
  const statusLabels = { not_started: "Not started", in_progress: "In progress", blocked: "Blocked", failed: "Failed", skipped: "Skipped — reason recorded", complete: "Complete — officer marked" };
  const checkLabels = { not_checked: "Not yet", checking: "Checking now", passed: "Yes — checked", failed: "Needs fixing", unable: "Need help", needs_recheck: "Check again", skipped: "Does not apply — add a reason" };
  const roleLabels = { president: "President", vice_president: "Vice President", treasurer: "Treasurer", secretary: "Secretary / points", social_chair: "Social Chair", webmaster: "Webmaster", ecouncil: "E-Council Representative", advisor: "Advisor" };
  let pendingSkipId = null;
  let previousGuideRaw = null;
  let unreadableProgress = false;
  let observedProgressRaw = null;
  let observedLegacyRaw = null;
  const migrationNotice = "Guide updated: earlier confirmations require review. Saved confirmations need review under the mode-specific checklist. Original evidence remains available. The original record is preserved separately.";
  function populateTransitionYears(preferred = selectedYear) {
    const saved = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const prefix = [TRANSITION_STORAGE_PREFIX, TRANSITION_LEGACY_STORAGE_PREFIX].find(candidate => key?.startsWith(candidate));
        if (prefix) {
          const year = key.slice(prefix.length).split(":")[0];
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
    try { localStorage.setItem(selectedYearKey, selected); } catch { /* The current view remains usable. */ }
    yearInput.value = selected.slice(0, 4);
  }
  populateTransitionYears();
  let progress = emptyProgress(selectedYear);
  const runSelectionKey = year => `asmeHubTransitionSelectedRunV2:${year}`;
  const annualRunKey = () => `${annualLinkStorageKey(selectedYear)}:${selectedRunId}`;
  let annualSetupClient = null;
  let annualSetupPending = false;
  const annualSetupSessions = new Map();
  let currentIndex = 0;
  let opener = null;
  let guideResourceSnapshot = window.ASME_TRANSITION_RESOURCE_SNAPSHOT || null;
  let guideResources = window.ASME_TRANSITION_RESOURCES || [];
  const guideResourceIds = { T01: ["officer-handoff", "handoff-checklist"], T04: ["newsletter-builder", "events-calendar", "calendar-editor", "website-editor"] };
  const recordInputs = new Map();
  const recordLabels = new Map();
  const runModeLabel = mode => mode === "production" ? "Real handoff" : mode === "rehearsal" ? "Practice" : "Needs review";
  function privateRecordApplies(key) {
    return progress.run.mode !== "rehearsal" || !["communicationsUrl", "approvalUrl"].includes(key);
  }
  function privateRecordTitle(key, title) {
    if (progress.run.mode === "production" && key === "cleanupUrl") return "Prior-year records and data review link";
    if (progress.run.mode === "rehearsal") {
      if (key === "acceptanceUrl") return "Reviewer sign-off record link";
      if (key === "rollbackUrl") return "Recovery notes document link";
    }
    return title;
  }
  function privateRecordDescription(key) {
    if (progress.run.mode === "production" && key === "cleanupUrl") return "Ask the President for the record of prior-year archive, inherited test-data decisions and approved access changes.";
    if (progress.run.mode === "rehearsal" && key === "acceptanceUrl") return "Ask the President or assigned practice reviewer for a dated sign-off. Example: ‘Alex reviewed the practice on October 9; access is still blocked.’";
    if (progress.run.mode === "rehearsal" && key === "rollbackUrl") return "Ask the technical maintainer for the practice recovery notes. Example: which test files were removed, which backups were restored, and what still needs attention.";
    return PRIVATE_RECORD_FIELDS.find(([id]) => id === key)?.[3] || "Ask the President or technical maintainer for this private record's link.";
  }
  const annualInputs = new Map();
  const annualLabels = new Map();
  const mockInputs = new Map();
  const mockLabels = new Map();
  const stepLinks = { T02: ["annualFolder", "pointsMaster", "attendanceFormEditor", "attendanceFormRespondent", "pointsExport", "budgetTracker", "budgetExport"] };
  const setupGuide = ["annual-points-setup.md", "Open response wiring and event setup instructions"];
  const budgetPracticeGuide = ["student-walkthrough.md#practice-budget-check", "Practice budget check — inputs and comparison"];
  const financeGuide = ["finance-settings-launch.md", "Open finance, settings and launch examples"];
  const communicationsGuide = ["communications-rollover.md", "Open calendar, newsletter and public-page instructions"];
  const studentGuide = (anchor) => [`student-walkthrough.md#${anchor}`, "Student walkthrough — current steps and examples"];
  const stepGuides = { T01: [studentGuide("1-choose-your-year"), ["README.md", "Officer instructions and current checklist template"]], T02: [studentGuide("2-prepare-this-years-files"), setupGuide, financeGuide], T03: [studentGuide("3-check-attendance-and-finances"), setupGuide, financeGuide], T04: [communicationsGuide], T05: [financeGuide] };
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
  let observedAnnualRaw = null;
  let observedLegacyAnnualRaw = null;
  let corruptAnnualRaw = null;
  let savedAnnualLinks = {};
  const annualTools = node("details", "transition-tools");
  const annualSummary = node("summary", "", "Saved links");
  annualTools.append(annualSummary);
  annualTools.append(node("p", "", "Review this checklist's copied-tool and record links here. Paste full HTTPS document or folder links supplied by the President or technical maintainer, not names or email addresses."));
  annualTools.append(node("p", "", "Step 2 saves all seven links from connected Annual Setup automatically. Its manual fallback also lets you paste setup results. You can enter links here or import a saved backup. The setup summary explains the files and their settings. Saving links does not complete your checks."));
  annualTools.append(node("p", "", "Use a private officer browser profile: anyone using it can see saved links. Progress exports and printing exclude these links; download the private links backup separately. Only approved public values belong in the current Hub Control Center."));
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
  for (const [key, title, description] of MOCK_ANNUAL_FIELDS) {
    const label = node("label", "transition-check-control", title);
    const input = node("input");
    input.type = "text"; input.inputMode = "url"; input.autocomplete = "off";
    input.setAttribute("form", annualForm.id); input.setAttribute("aria-label", title);
    label.append(input, node("small", "", description));
    mockInputs.set(key, input); mockLabels.set(key, label); annualForm.append(label);
  }
  for (const [key, title] of PRIVATE_RECORD_FIELDS) {
    const label = node("label", "transition-check-control");
    const heading = node("span", "", privateRecordTitle(key, title));
    const input = node("input"); input.type = "url"; input.autocomplete = "off";
    input.placeholder = "Paste the private document or folder HTTPS link";
    input.setAttribute("form", annualForm.id); input.setAttribute("aria-label", privateRecordTitle(key, title));
    const help = node("small", "", privateRecordDescription(key));
    label.append(heading, input, help);
    recordInputs.set(key, input); recordLabels.set(key, { label, heading, help }); annualForm.append(label);
  }
  const annualActions = node("div", "transition-toolbar");
  const annualSave = node("button", "secondary-button", "Save private link list on this device");
  annualSave.type = "submit";
  annualSave.setAttribute("form", annualForm.id);
  const annualImportLabel = node("label", "secondary-button file-button", "Import private links backup");
  const annualImport = node("input");
  annualImport.type = "file";
  annualImport.accept = "application/json,.json";
  annualImportLabel.append(annualImport);
  const annualSettings = node("button", "secondary-button", "Compare saved links with setup summary");
  annualSettings.type = "button";
  const annualClear = node("button", "secondary-button", "Clear saved links for this run");
  annualClear.type = "button";
  const annualExport = node("button", "secondary-button", "Download private links backup");
  annualExport.type = "button";
  annualExport.addEventListener("click", () => {
    try {
      assertAnnualDraftUnchanged();
      if (unreadableAnnualLinks || !observedAnnualRaw) throw new Error("Save and review this run’s link list first.");
      const draft = importAnnualLinkDraft(observedAnnualRaw, selectedYear, window.ASME_HUB_CONFIG);
      const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }));
      const link = node("a"); link.href = url; link.download = `asme-private-links-${selectedYear}-${selectedRunId}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      annualSay(progress.run.mode === "production" ? "Private links backup download requested. Keep the file with the Hub progress and newsletter backups. Ask the maintainer for the recovery readiness record." : "Private links backup download requested. Open the JSON text backup and compare year and all seven links with Saved links; restore it into an isolated rehearsal to verify recovery. This click is not recovery evidence.");
    } catch (error) { annualSay(error.message, true); }
  });
  annualActions.append(annualSave, annualImportLabel, annualExport, annualSettings, annualClear);
  const annualMessage = node("p", "transition-status");
  let stepAnnualMessage = null;
  annualMessage.setAttribute("role", "status");
  annualMessage.setAttribute("aria-live", "polite");
  annualTools.append(annualForm, annualActions, annualMessage);
  $("transition-progress-tools").before(annualTools);
  const currentTools = node("details", "transition-tools");
  const currentSummary = node("summary", "", "Current Hub reference");
  const currentSettings = node("button", "secondary-button", "View current Hub settings");
  currentSettings.type = "button";
  currentSettings.addEventListener("click", () => document.dispatchEvent(new CustomEvent("transition:current-settings")));
  currentTools.append(currentSummary, node("p", "", "This reference opens the chapter's current shared settings. For this checklist's copied tools, use Saved links above."), currentSettings, $("transition-control-center"));
  $("transition-saved-tools").append(currentTools);
  function annualSay(message, error = false) {
    annualMessage.textContent = message;
    annualMessage.classList.toggle("is-error", error);
    if (stepAnnualMessage) {
      stepAnnualMessage.textContent = message;
      stepAnnualMessage.classList.toggle("is-error", error);
    }
  }
  function annualDraft() {
    return validateAnnualLinkDraft({ schema: 1, type: ANNUAL_HANDOFF_TYPE, year: selectedYear,
      links: Object.fromEntries([...annualInputs].map(([key, input]) => [key, input.value])),
      records: Object.fromEntries([...recordInputs].map(([key, input]) => [key, input.value])),
      mock: Object.fromEntries([...mockInputs].map(([key, input]) => [key, input.value])) }, selectedYear, window.ASME_HUB_CONFIG);
  }
  const draftReferences = draft => ({ ...draft.links, ...draft.mock, ...draft.records });
  function fillAnnualLinks(draft) {
    for (const [key, input] of recordInputs) input.value = draft?.records?.[key] || "";
    for (const [key, input] of annualInputs) input.value = draft?.links[key] || "";
    for (const [key, input] of mockInputs) input.value = draft?.mock?.[key] || "";
  }
  function readAnnualLinks() {
    fillAnnualLinks(null);
    unreadableAnnualLinks = false;
    savedAnnualLinks = {};
    observedAnnualRaw = null;
    observedLegacyAnnualRaw = null;
    corruptAnnualRaw = null;
    try {
      observedAnnualRaw = localStorage.getItem(annualRunKey());
      observedLegacyAnnualRaw = selectedRunId === "legacy" && observedAnnualRaw === null ? localStorage.getItem(annualLinkStorageKey(selectedYear)) : null;
      const text = observedAnnualRaw ?? observedLegacyAnnualRaw;
      if (text !== null) fillAnnualLinks(importAnnualLinkDraft(text, selectedYear, window.ASME_HUB_CONFIG));
      savedAnnualLinks = draftReferences(annualDraft());
      annualSay(text !== null ? "Annual link draft loaded from this device. Confirm the actual files and checks before use." : "No saved annual links for this year.");
    } catch (error) { unreadableAnnualLinks = true; corruptAnnualRaw = observedAnnualRaw ?? observedLegacyAnnualRaw; annualSay(`Saved links could not be read: ${error.message} Existing saved data is preserved. Import a valid handoff or explicitly remove saved links before saving.`, true); }
  }
  function assertAnnualDraftUnchanged() {
    if (localStorage.getItem(annualRunKey()) !== observedAnnualRaw || (observedLegacyAnnualRaw !== null && localStorage.getItem(annualLinkStorageKey(selectedYear)) !== observedLegacyAnnualRaw)) throw new Error("Annual links changed in another tab. Reload saved run and review the newer draft before changing it.");
  }
  function saveAnnualLinks() {
    assertAnnualDraftUnchanged();
    if (unreadableAnnualLinks) throw new Error("Existing saved links are unreadable. Import a valid handoff or remove saved links before saving.");
    const draft = annualDraft();
    const references = draftReferences(draft);
    const changedKeys = [...ANNUAL_LINK_FIELDS, ...MOCK_ANNUAL_FIELDS, ...PRIVATE_RECORD_FIELDS].map(([key]) => key).filter((key) => (references[key] || "") !== (savedAnnualLinks[key] || ""));
    const candidate = reconcileProgress(reopenAnnualChecks(progress, changedKeys, savedAnnualLinks), TRANSITION_STEPS, TRANSITION_CHECKS, progress);
    const reopened = Object.entries(progress.steps).some(([id, state]) => state === "complete" && candidate.steps[id] === "in_progress") ||
      Object.entries(progress.checks).some(([id, state]) => state === "passed" && candidate.checks[id] === "needs_recheck");
    if (changedKeys.length && !save(candidate)) throw new Error("Could not save the required manual recheck status. Annual links were not saved.");
    if (corruptAnnualRaw !== null) localStorage.setItem(`${annualRunKey()}:corrupt-backup-${Date.now()}`, corruptAnnualRaw);
    const savedRaw = JSON.stringify(draft);
    localStorage.setItem(annualRunKey(), savedRaw);
    observedAnnualRaw = savedRaw;
    observedLegacyAnnualRaw = null;
    corruptAnnualRaw = null;
    savedAnnualLinks = references;
    fillAnnualLinks(draft);
    annualSay(`${Object.values(references).some(Boolean) ? "Link format checked and draft saved on this device." : "Empty link list saved on this device. No links, access or readiness were verified."}${reopened ? " Affected completed steps and checks need review." : ""} Check Google access and connections in Google Drive and Forms.`);
    return draft;
  }
  annualForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try { saveAnnualLinks(); render(); } catch (error) { annualSay(`Links were not saved: ${error.message}`, true); }
  });
  annualImport.addEventListener("change", async () => {
    const file = annualImport.files?.[0];
    annualImport.value = "";
    if (!file) return;
    const importedYear = selectedYear;
    const importedRunId = selectedRunId;
    try {
      if (file.size > 100_000) throw new Error("Annual link files must be under 100 KB.");
      const draft = reviewAnnualLinkImport(importAnnualLinkDraft(await file.text(), importedYear, window.ASME_HUB_CONFIG));
      if (selectedYear !== importedYear || selectedRunId !== importedRunId) throw new Error("The selected year or run changed while reading this file. Import again for the intended run.");
      fillAnnualLinks(draft);
      unreadableAnnualLinks = false;
      annualSay("Imported draft replaces the displayed tool and record fields, including the private handoff folder. Review every replacement before saving; the JSON file is the importable link files, and the handoff folder is the folder containing your private records. Choose Save private link list on this device to retain it on this device. Creation results do not certify ownership, privacy or readiness; Form respondent links must come from the actual Form.");
    } catch (error) { annualSay(`Import failed: ${error.message} Existing fields and saved links were not changed.`, true); }
  });
  function prepareAnnualSettings() {
    try {
      const preview = annualDraft();
      if (Object.keys(preview.links).length !== ANNUAL_LINK_FIELDS.length) throw new Error("Enter all seven supplied annual links from this checklist’s setup summary first.");
      if (progress.run.mode === "rehearsal" && !preview.mock?.controlCenterUrl) throw new Error("Enter the private copied Control Center from this Practice summary first.");
      if (progress.run.mode !== "rehearsal" && preview.mock) throw new Error("Private mock references belong to Practice. Real handoff cannot use the mock context.");
      saveAnnualLinks();
      annualSay("Links saved on this device. Compare the actual inactive/noncurrent year row in the supplied Control Center with the setup summary: copied links, goal, calendar and dates. Reopen the Google sheet and compare its values before recording the settings review. This review only saves links in this browser.");
      render();
    } catch (error) { annualSay(`Cannot review saved links: ${error.message}`, true); }
  }
  annualSettings.addEventListener("click", prepareAnnualSettings);
  annualClear.addEventListener("click", () => {
    try {
      assertAnnualDraftUnchanged();
      const removedKeys = Object.keys(savedAnnualLinks).filter((key) => savedAnnualLinks[key]);
      if (removedKeys.length && !save(reconcileProgress(reopenAnnualChecks(progress, removedKeys, savedAnnualLinks), TRANSITION_STEPS, TRANSITION_CHECKS, progress))) throw new Error("Could not save required recheck status.");
      if (corruptAnnualRaw !== null) localStorage.setItem(`${annualRunKey()}:corrupt-backup-${Date.now()}`, corruptAnnualRaw);
      if (selectedRunId === "legacy") {
        observedAnnualRaw = JSON.stringify({ schema: 1, type: ANNUAL_HANDOFF_TYPE, year: selectedYear, links: {} });
        localStorage.setItem(annualRunKey(), observedAnnualRaw);
      } else { localStorage.removeItem(annualRunKey()); observedAnnualRaw = null; }
      observedLegacyAnnualRaw = null;
      corruptAnnualRaw = null;
      fillAnnualLinks(null);
      savedAnnualLinks = {};
      unreadableAnnualLinks = false;
      annualSay("Annual links cleared for this run. Any legacy original draft was preserved. Google files and settings were not changed.");
    } catch { annualSay("Could not remove local links. Check browser storage.", true); }
  });

  const disclosureState = new Map();
  function disclosure(label, className, key) {
    const item = node("details", className);
    const context = `${selectedYear}:${selectedRunId}:${TRANSITION_STEPS[currentIndex].id}:${key}`;
    item.open = disclosureState.get(context) || false;
    item.append(node("summary", "", label));
    item.addEventListener("toggle", () => disclosureState.set(context, item.open));
    return item;
  }
  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }
  function statusOf(id) { return progress.steps[id] || "not_started"; }
  function checkOf(id) { return progress.checks[id] || "not_checked"; }
  function titleFor(check) { return progress.run.mode === "rehearsal" ? check.rehearsalTitle || check.title : check.productionTitle || check.title; }
  function questionFor(check) {
    const text = TRANSITION_OFFICER_QUESTIONS[check.id];
    return typeof text === "string" ? text : text?.[progress.run.mode] || titleFor(check);
  }
  function stepTitle(step) { return progress.run.mode === "production" ? step.productionTitle || step.title : step.title; }
  function yearText(text) {
    const start = Number(selectedYear.slice(0, 4));
    return text.replaceAll("{fallEventDate}", `${start}-09-15`).replaceAll("{springEventDate}", `${start + 1}-01-15`);
  }
  function instructionsFor(step) {
    const actions = progress.run.mode === "production" ? step.productionInstructions || step.instructions : step.instructions;
    return (actions || [step.action]).map(yearText);
  }
  function checksFor(step) { return TRANSITION_CHECKS.filter((check) => check.step === step.id); }
  function unmet(step) { return step.needs.filter((id) => statusOf(id) !== "complete"); }
  function unchecked(step) { return checksFor(step).filter((check) => checkApplies(check, progress.run.mode) && checkOf(check.id) !== "passed"); }
  function firstIncomplete() {
    const index = TRANSITION_STEPS.findIndex((step) => !["complete", "skipped", "failed", "blocked"].includes(statusOf(step.id)));
    return index < 0 ? TRANSITION_STEPS.length - 1 : index;
  }
  function say(message, error = false) {
    statusLine.textContent = message;
    statusLine.classList.toggle("is-error", error);
  }
  function blockingReason(step) {
    const missing = unmet(step);
    return missing.length ? `Finish ${missing.map(id => stepTitle(byId.get(id))).join(", ")} before completing the handoff. You can still read ahead.` : "";
  }
  function savedRuns() {
    const runs = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(`${TRANSITION_STORAGE_PREFIX}${selectedYear}:`) || key.endsWith("-backup")) continue;
      const id = key.slice(`${TRANSITION_STORAGE_PREFIX}${selectedYear}:`.length);
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) continue;
      try { const value = JSON.parse(localStorage.getItem(key)); runs.push({ id, name: value.run?.name || `Unreadable run ${id}`, mode: value.run?.mode || "unknown" }); }
      catch { runs.push({ id, name: `Unreadable run ${id} — preserved`, mode: "unknown" }); }
    }
    return runs;
  }
  function populateRuns() {
    let runs = []; try { runs = savedRuns(); } catch { /* In-memory guide remains usable. */ }
    if (!runs.some(run => run.id === selectedRunId)) runs.push(progress.run);
    $("transition-run").replaceChildren(...runs.map(run => new Option(`${run.name} · ${runModeLabel(run.mode)}`, run.id)));
    $("transition-run").value = selectedRunId;
  }
  function readYear(preferredRunId = "") {
    observedProgressRaw = null;
    observedLegacyRaw = null;
    previousGuideRaw = null;
    unreadableProgress = false;
    yearInput.value = selectedYear.slice(0, 4);
    try {
      selectedRunId = preferredRunId || localStorage.getItem(runSelectionKey(selectedYear)) || savedRuns()[0]?.id || "";
      if (!selectedRunId) {
        const legacy = localStorage.getItem(`${TRANSITION_LEGACY_STORAGE_PREFIX}${selectedYear}`);
        if (legacy) {
          observedLegacyRaw = legacy;
          previousGuideRaw = legacy;
          progress = migrateProgress(JSON.parse(legacy), selectedYear, TRANSITION_STEPS, TRANSITION_CHECKS);
          selectedRunId = progress.run.id;
          say(migrationNotice + " Original legacy data remains preserved.");
        } else {
          progress = emptyProgress(selectedYear, createTransitionRun(`Preparation ${selectedYear}`));
          selectedRunId = progress.run.id;
          say("Choose your year in Step 1 to start or continue.");
        }
      } else {
        const raw = localStorage.getItem(storageKey(selectedYear, selectedRunId));
        observedProgressRaw = raw;
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed || parsed.run?.id !== selectedRunId) throw new Error("The saved run identity does not match its storage location.");
        previousGuideRaw = TRANSITION_PREVIOUS_GUIDE_VERSIONS.includes(parsed.guideVersion) ? raw : null;
        progress = migrateProgress(parsed, selectedYear, TRANSITION_STEPS, TRANSITION_CHECKS);
        say(previousGuideRaw ? migrationNotice : "Checklist loaded from this device. Reconfirm current evidence before activation.");
      }
    } catch (error) {
      unreadableProgress = true;
      progress = emptyProgress(selectedYear, createTransitionRun("Unreadable run — original preserved", "rehearsal", /^[A-Za-z0-9_-]{1,100}$/.test(selectedRunId) ? selectedRunId : "legacy"));
      selectedRunId = progress.run.id;
      say(`Local progress could not be loaded: ${error.message} Existing saved data was not changed. Create an isolated run to continue.`, true);
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
    try {
      const candidate = parseProgress({ ...next, savedAt: new Date().toISOString() }, selectedYear, TRANSITION_STEPS, TRANSITION_CHECKS);
      const key = storageKey(candidate.year, candidate.run.id);
      if (localStorage.getItem(key) !== observedProgressRaw || (observedLegacyRaw !== null && localStorage.getItem(`${TRANSITION_LEGACY_STORAGE_PREFIX}${candidate.year}`) !== observedLegacyRaw)) {
        say("This saved run changed in another browser tab. Your newer saved evidence was preserved. Choose Reload saved run before recording more results.", true);
        return false;
      }
      if (previousGuideRaw) localStorage.setItem(`${storageKey(candidate.year, candidate.run.id)}:${JSON.parse(previousGuideRaw).guideVersion}-backup`, previousGuideRaw);
      const savedRaw = JSON.stringify(candidate);
      localStorage.setItem(key, savedRaw);
      observedProgressRaw = savedRaw;
      observedLegacyRaw = null;
      // The run's data is already saved; a selection-pointer failure must not claim otherwise.
      try { localStorage.setItem(runSelectionKey(candidate.year), candidate.run.id); } catch { /* Saved run remains discoverable. */ }
      previousGuideRaw = null;
      progress = candidate;
      say("Saved on this device. Officers perform the checks in the real systems; the Hub records their reported results.");
      render();
      list.querySelector(`[data-transition-control="${focusControl}"]`)?.focus();
      return true;
    } catch (error) {
      say(`Could not save on this device: ${error.message}. Your last saved progress is unchanged. Check browser storage before leaving.`, true);
      render();
      list.querySelector(`[data-transition-control="${focusControl}"]`)?.focus();
      return false;
    }
  }
  function appendEvidence(parent, id, explanation = "") {
    const skipped = pendingSkipId === id || progress.steps[id] === "skipped" || progress.checks[id] === "skipped";
    const details = node("details", "transition-evidence-details");
    details.open = skipped;
    details.append(node("summary", "", skipped ? "Explain why this is skipped" : explanation ? "Details or add a note" : "Add a note or evidence"));
    if (explanation) details.append(node("p", "", explanation));
    const form = node("form", "transition-evidence");
    form.dataset.evidenceId = id;
    const reasonLabel = node("label", "transition-check-control", "Why are you skipping this?");
    reasonLabel.hidden = !skipped && !progress.reasons[id];
    const reason = node("textarea"); reason.maxLength = 2000; reason.value = progress.reasons[id] || "";
    reasonLabel.append(reason);
    const noteLabel = node("label", "transition-check-control", "What did you check? (optional)");
    const note = node("textarea"); note.maxLength = 2000; note.value = progress.notes[id] || "";
    noteLabel.append(note);
    const button = node("button", "secondary-button", skipped ? "Save skip reason" : "Save note"); button.type = "submit";
    form.append(reasonLabel, noteLabel, node("small", "", "A sentence is enough for a simple check: “I opened the folder but could not edit Points Master. The President will arrange access.” Add a screenshot or private checklist link for totals, errors or an approval. Exports and printing include notes; keep passwords and member or transaction details out."), button);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const reasons = { ...progress.reasons, [id]: reason.value.trim() };
      const notes = { ...progress.notes, [id]: note.value.trim() };
      if (skipped && !reasons[id]) { say("Add a short reason for skipping this item.", true); return; }
      const next = { ...progress, reasons, notes, steps: { ...progress.steps }, checks: { ...progress.checks } };
      if (pendingSkipId === id) (byId.has(id) ? next.steps : next.checks)[id] = "skipped";
      if (save(reconcileProgress(next, TRANSITION_STEPS, TRANSITION_CHECKS, progress), id)) pendingSkipId = null;
    });
    details.append(form);
    parent.append(details);
  }
  function appendGlossary(card, step) {
    const words = node("section", "transition-glossary");
    words.append(node("h4", "", "Words used here"), node("p", "", "Maintainer: the person who fixes and verifies these tools. Readiness record: their dated record naming owners and evidence for this run."));
    if (["T01", "T02"].includes(step.id)) words.append(node("p", "", "Control Center: the settings spreadsheet used by chapter tools. Export: a separate workbook of approved results; it is not automatically public or approved for sharing."));
    if (step.id === "T03") words.append(node("p", "", "Ledger: the current approved cash balance. Suppression: hiding member rows from the public leaderboard."));
    if (step.id === "T04") words.append(node("p", "", "Preheader: the preview line shown beside the subject in an email inbox."));
    const more = node("details");
    more.append(node("summary", "", "More meanings"));
    const definitions = node("dl");
    for (const [term, meaning] of [["Inactive", "Not enabled for use by chapter tools."], ["Current", "The year selected by chapter tools."], ["Consumer", "A tool reading the year’s settings or results: the Hub, website, Form or newsletter."], ["Suppression", "Hiding member rows; approved aggregate or status tabs can still contain data."], ["Export", "A separate workbook of approved results. Approval and permissions must be checked before sharing."], ["Ledger", "The current approved cash balance, before pending expenses."], ["Preheader", "The email inbox preview line, edited in Newsletter Settings."]]) definitions.append(node("dt", "", term), node("dd", "", meaning));
    more.append(definitions); words.append(more); card.append(words);
  }
  function appendSetupComparison(card) {
    const start = Number(selectedYear.slice(0, 4)), end = start + 1;
    const aid = node("section", "transition-setup-comparison");
    aid.append(node("h4", "", "Compare before recording the four reviews"), node("p", "", "Annual Setup → Optional backup and detailed settings shows expected values. Use its actual row number and file identities, then open and reload the actual files. A copied summary is not a fresh Google read."));
    const table = node("table", "transition-review-map");
    table.append(node("caption", "", "Step 2 review comparison"));
    const head = node("thead"), heading = node("tr");
    for (const label of ["Review", "Where to check", "Expected result", "Who checks it"]) { const cell = node("th", "", label); cell.setAttribute("scope", "col"); heading.append(cell); }
    head.append(heading); table.append(head);
    const body = node("tbody");
    const rows = [
      ["V01", "Maintainer’s dated annual readiness record", "Correct annual copies and canonical source review; imports and event-update readiness evidenced. The setup summary leaves clean-source, access, imports and approvals unverified.", "Maintainer supplies; officer confirms it applies to this run."],
      ["V02", "Form editor → Responses → View in Sheets; Points Master → Config B7 and B16", "Opens this year’s actual Points Master and tab; B7 matches that tab and B16 the Form ID. Fresh copy: zero responses, intake closed. Resumed copy: inventory preserved records; do not clear them.", "Officer compares; maintainer resolves mismatches and other-tab technical inspection."],
      ["V07", `${progress.run.mode === "rehearsal" ? "Copied " : ""}Control Center → Hub_Settings_Public; selected-year row A:T`, "Reload actual Google row. Year A and row A:T match summary; goal C, calendar J; is_active K = FALSE and is_current L = FALSE before launch.", "Officer compares; approved settings owner or maintainer resolves mismatches."],
      ["V21", "Annual Setup detailed summary; Points Config B2/B3/B5; both export Config B1; Budget Setup & Lists", `Seven links identify the actual copies. Points B2 = Fall ${start}; B3 = ${start}-${String(end).slice(-2)}; B5 = TESTING. Export B1 IDs match their working copies. Budget B4/B5 = ${start}-08-01 / ${end}-07-31; B11/B12 = ${start}-08-01 / ${start}-12-31; B13/B14 = ${end}-01-01 / ${end}-05-31.`, "Officer compares readable values; maintainer confirms technical evidence and errors."]
    ];
    for (const [id, ...cells] of rows) {
      const check = TRANSITION_CHECKS.find(entry => entry.id === id);
      const row = node("tr"); row.dataset.review = id;
      const name = node("th", "", titleFor(check)); name.setAttribute("scope", "row"); row.append(name);
      cells.forEach((value, index) => { const cell = node("td", "", value); cell.dataset.label = ["Where to check", "Expected result", "Who checks it"][index]; row.append(cell); });
      body.append(row);
    }
    table.append(body); aid.append(table, node("p", "transition-warning", "Missing or conflicting evidence: leave the affected review unpassed, set Step result to Blocked and record the issue. Ask the President to obtain the maintainer’s dated evidence; ask the approved settings owner to resolve settings mismatches."));
    card.append(aid);
  }
  function appendBackupExamples(parent) {
    const examples = node("section", "transition-backup-examples");
    examples.append(node("h5", "", "Compare expected and observed backup values"), node("p", "", "JSON is a text backup. Open each file with TextEdit without changing it. These are illustrative excerpts using fictional values, not complete import files. Compare your actual values with your working screens."));
    const year = selectedYear;
    for (const [name, expected, excerpt] of [
      ["Progress", "Expected: selected year, checklist name and one saved note. Observed: find year, run.name and notes.T01 in your downloaded file.", { year, run: { name: `Practice ${year} example` }, notes: { T01: "Practice reviewer confirmed folder access." } }],
      ["Private links", "Expected: the same year, all seven saved links and one full matching tool URL. Observed: compare every links entry with Saved links; this excerpt shows just one.", { year, links: { pointsMaster: "https://docs.google.com/spreadsheets/d/FICTIONAL_PRACTICE_MASTER/edit" } }],
      ["Newsletter draft", "Expected: Settings subject, preheader (inbox preview line) and one content item. Observed: compare state.fields and state.events with the editable draft.", { state: { fields: { "s-subject": "MOCK practice newsletter", "s-preheader": "Private practice preview" }, events: [{ title: "MOCK workshop" }] } }]
    ]) { examples.append(node("strong", "", name), node("p", "", expected), node("pre", "", JSON.stringify(excerpt, null, 2))); }
    examples.append(node("p", "", "If something differs, stop and ask the maintainer. Deeper schema/version checks belong to the maintainer. A matching text excerpt alone is not restoration evidence."));
    parent.append(examples);
  }
  function appendRecovery(card, step, printed = false) {
    if (step.id !== "T04" || progress.run.mode !== "rehearsal") return;
    const recovery = node(printed ? "section" : "details", "transition-tools");
    recovery.append(node(printed ? "h4" : "summary", "", "Practice restoring the three backup files"));
    const tasks = node("ol", "transition-procedure");
    for (const text of ["At the bottom of the Hub, open Saved links and backup tools. Under Progress backup and print, choose Export progress. Under Saved links, choose Download private links backup. In Newsletter Builder, choose Templates → Export Draft .json. Keep all three downloads.", "Open each JSON text backup and compare the expected and observed values below with your working screens.", "Chrome profile menu → Add → Continue without an account → name it ASME recovery practice. Open the same Hub and builder there; use your authorized dashboard password. Keep the original profile open.", "In the new profile select the same year and import progress into a separate Practice checklist. Step 1 → Start here → Saved checklist for this year → Continue checklist opens the restored checklist. Under Saved links and backup tools → Saved links, choose Import private links backup, then Save private link list on this device. Check the returned year, notes and seven links. Changed links reopen checks; confirm only what you rechecked.", "In the new builder use Templates → Import Draft .json. Compare subject, preheader, content and Desktop/Mobile previews. Return to the original profile and confirm its checklist and issue are intact. Record what matched; do not send the practice issue."]) tasks.append(node("li", "", text));
    recovery.append(tasks); appendBackupExamples(recovery); card.append(recovery);
  }
  function saveSetupResults(text) {
    assertAnnualDraftUnchanged();
    if (unreadableAnnualLinks) throw new Error("Reload and resolve the unreadable saved links first.");
    if (typeof text !== "string" || text.length > 100000) throw new Error("Setup results must be a text result under 100 KB.");
    const draft = importAnnualLinkDraft(text, selectedYear, window.ASME_HUB_CONFIG);
    const savedDraft = observedAnnualRaw ?? observedLegacyAnnualRaw;
    if (!draft.records && savedDraft) draft.records = importAnnualLinkDraft(savedDraft, selectedYear, window.ASME_HUB_CONFIG).records;
    if (Object.keys(draft.links).length !== ANNUAL_LINK_FIELDS.length) throw new Error("The setup result must contain all seven annual links.");
    if (progress.run.mode === "production" && draft.mock) throw new Error("These are Practice files. Return to Step 1 and choose Practice, or use the real year’s setup results.");
    if (progress.run.mode === "rehearsal" && !draft.mock) throw new Error("Practice requires results from a separate Practice workspace.");
    const before = [...annualInputs, ...mockInputs, ...recordInputs].map(([key, input]) => [key, input.value]);
    try { fillAnnualLinks(draft); saveAnnualLinks(); }
    catch (error) {
      const values = new Map(before);
      for (const [key, input] of [...annualInputs, ...mockInputs, ...recordInputs]) input.value = values.get(key);
      throw error;
    }
    render();
    say("Your seven links are saved. Open them below, check the year, then record what you verified. Saving links does not pass a review.");
  }
  function setupFieldsSnapshot() {
    return JSON.stringify([...annualInputs, ...mockInputs, ...recordInputs].map(([key, input]) => [key, input.value]));
  }
  function captureSetupContext() {
    assertAnnualDraftUnchanged();
    if (unreadableAnnualLinks || unreadableProgress) throw new Error("Reload and resolve unreadable saved checklist data before setup.");
    return { year: selectedYear, runId: selectedRunId, mode: progress.run.mode, raw: observedAnnualRaw, legacyRaw: observedLegacyAnnualRaw, fields: setupFieldsSnapshot() };
  }
  function assertSetupContext(context) {
    if (context.year !== selectedYear || context.runId !== selectedRunId || context.mode !== progress.run.mode) throw new Error("The selected year or checklist changed. No returned links were saved here. Return to the original checklist and reopen the same year’s setup.");
    if (context.raw !== observedAnnualRaw || context.legacyRaw !== observedLegacyAnnualRaw || context.fields !== setupFieldsSnapshot()) throw new Error("This checklist’s links changed during setup. No returned links were saved. Review the newer links before retrying the same year.");
    assertAnnualDraftUnchanged();
  }
  function appendConnectedSetup(card) {
    const apiConfig = window.ASME_HUB_CONFIG?.annualProvisioner?.api;
    if (!annualSetupClient && apiConfig) annualSetupClient = createAnnualSetupClient(apiConfig);
    const client = annualSetupClient;
    const key = `${selectedYear}:${selectedRunId}:${progress.run.mode}`;
    if (!annualSetupSessions.has(key)) annualSetupSessions.set(key, { config: null, message: "Use the chapter Google account to get started.", error: false, receipt: "" });
    const session = annualSetupSessions.get(key);
    const panel = node("section", "transition-connected-setup");
    panel.dataset.annualSetup = "connected";
    panel.append(node("h4", "", "Prepare this year’s files here"), node("p", "", `${selectedYear.replace("-", "–")} · ${runModeLabel(progress.run.mode)}`));
    const connect = node("button", "secondary-button", "Sign in with chapter Google account"); connect.type = "button";
    connect.disabled = annualSetupPending || !client?.ready;
    const goalLabel = node("label", "transition-check-control", "Member goal for this year");
    const goal = node("input"); goal.type = "number"; goal.min = "1"; goal.step = "1"; goal.required = true;
    goal.setAttribute("aria-label", "Annual member goal");
    goal.value = session.goal ?? session.config?.engagementGoal ?? "";
    goal.readOnly = Boolean(session.config?.existing);
    goal.disabled = annualSetupPending || !session.config;
    goal.addEventListener("input", () => { session.goal = goal.value; });
    goalLabel.append(goal, node("small", "", session.config?.existing ? "Saved goal. Ask the President if it needs changing." : "Each person counts once. Use the President’s approved goal."));
    panel.append(connect, goalLabel);
    const config = session.config;
    goalLabel.hidden = !config;
    connect.hidden = Boolean(config) && !session.error;
    if (config) {
      const workspace = node("details", "transition-tools");
      workspace.append(node("summary", "", "Workspace settings"));
      workspace.append(node("p", "", `Goal source: ${config.goalSource || "Saved chapter setup"}. Workspace: ${runModeLabel(config.workspaceMode)}. Calendar: ${config.calendarIcalUrl ? "saved chapter feed" : "no feed saved"}.`));
      if (/^[\w-]+$/.test(config.rootFolderId || "")) workspace.append(resourceRow(`https://drive.google.com/drive/folders/${config.rootFolderId}`, "Approved annual workspace folder", "Check this is the approved folder for this checklist’s purpose."));
      if (/^[\w-]+$/.test(config.controlCenterId || "")) workspace.append(resourceRow(`https://docs.google.com/spreadsheets/d/${config.controlCenterId}/edit`, "Approved Control Center", "Practice must use its own copied settings spreadsheet.", "sheet"));
      panel.append(workspace);
    }
    const create = node("button", "primary-button", "Create or reopen this year’s files"); create.type = "button";
    create.hidden = !config;
    create.disabled = annualSetupPending || !client?.ready || !config || config.workspaceMode !== progress.run.mode;
    const status = node("p", "transition-status", !client?.ready ? "Connected setup is not configured yet. Ask the maintainer to enable it, or open the manual fallback below." : session.message);
    status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite"); status.classList.toggle("is-error", session.error);
    panel.append(create, status);
    if (session.receipt) {
      const receipt = node("details", "transition-tools transition-backup-examples");
      receipt.append(node("summary", "", "Optional backup and detailed settings"), node("p", "", "Compare this setup summary with the actual files below. It does not certify permissions, clean sources or completed reviews."), node("pre", "", session.receipt));
      panel.append(receipt);
    }
    const finish = () => { annualSetupPending = false; render(); };
    connect.addEventListener("click", async () => {
      if (annualSetupPending || !client?.ready) return;
      try {
        const context = captureSetupContext();
        annualSetupPending = true; session.error = false; session.message = "Connecting to Google and loading the approved workspace…"; render();
        await client.connect();
        assertSetupContext(context);
        const loaded = await client.call("getAnnualSetupConfig", [context.year]);
        assertSetupContext(context);
        if (!loaded || typeof loaded !== "object" || Array.isArray(loaded)) throw new Error("Google returned an unreadable workspace. Ask the maintainer to check setup.");
        session.config = loaded; session.goal = loaded.engagementGoal; session.receipt = "";
        if (loaded.workspaceMode !== context.mode) throw new Error(`The President must confirm a separate ${runModeLabel(context.mode)} workspace before continuing. The saved workspace purpose does not match this checklist.`);
        if (!/^[\w-]+$/.test(loaded.rootFolderId || "") || !/^[\w-]+$/.test(loaded.controlCenterId || "") || !loaded.configRevision) { session.config = null; throw new Error("The saved workspace is incomplete. Ask the President or maintainer to confirm the folder and Control Center."); }
        session.message = loaded.existing ? "This year already has files. Reopen them using the saved member goal." : "Workspace loaded. Check the approved member goal, then create this year’s files.";
      } catch (error) { session.error = true; session.message = `${error.message || "Could not connect."} Choose Sign in again to reload the workspace, or retry after the maintainer resolves the issue.`; say(session.message, true); }
      finally { finish(); }
    });
    create.addEventListener("click", async () => {
      if (annualSetupPending || !client?.ready || !session.config) return;
      try {
        const context = captureSetupContext(), approved = session.config;
        if (approved.workspaceMode !== context.mode) throw new Error("The saved workspace purpose does not match this checklist. Ask the President to confirm it.");
        const approvedGoal = Number(approved.existing ? approved.engagementGoal : goal.value);
        if (!Number.isInteger(approvedGoal) || approvedGoal <= 0) throw new Error("Enter a positive whole-number member goal approved by the President.");
        const answers = { engagementGoal: approvedGoal, mode: context.mode, rootFolderId: approved.rootFolderId, controlCenterId: approved.controlCenterId, configRevision: approved.configRevision };
        annualSetupPending = true; session.error = false; session.receipt = ""; session.message = "Creating or reopening annual files. Keep the Hub open. If this stops, retry the same year to resume; do not create a second workspace."; render();
        const result = await client.call("runAnnualSetup", [context.year, answers]);
        assertSetupContext(context);
        if (!result || result.success !== true || result.targetYear !== context.year) throw new Error("Google did not confirm setup for the selected year. Reconnect and reopen the same year before retrying.");
        saveSetupResults(result.hubHandoff);
        session.receipt = typeof result.readableReceipt === "string" ? result.readableReceipt : "";
        session.config = { ...approved, existing: true, engagementGoal: approvedGoal, goalSource: "This year’s saved setup" }; session.goal = approvedGoal;
        session.message = "Files ready — all seven links are saved under Your files. The year stays inactive until approved.";
        say(session.message);
      } catch (error) { session.error = true; session.message = `${error.message || "Setup could not finish."} Setup may have created files: keep the same year and workspace when retrying. Sign in again if Google authorization expired.`; say(session.message, true); }
      finally { finish(); }
    });
    card.append(panel);
  }
  function appendStepResources(resources, step) {
    resources.replaceChildren();
    const references = guideResourceSnapshot && window.ASME_SHARED_RESOURCES?.resolve
      ? window.ASME_SHARED_RESOURCES.resolve(guideResourceSnapshot.defaults, guideResourceSnapshot.records, selectedYear, window.ASME_HUB_CONFIG?.dataSources?.[selectedYear] || {})
      : guideResources;
    for (const id of guideResourceIds[step.id] || []) {
      if (step.id === "T01" && savedAnnualLinks.checklistUrl && savedAnnualLinks.handoffUrl) continue;
      const reference = references.find(item => item.id === id);
      if (!reference || typeof reference.url !== "string") continue;
      try {
        const url = new URL(reference.url);
        if (url.protocol === "https:" && !url.username && !url.password) resources.append(resourceRow(url.href, id === "handoff-checklist" ? "Shared start page — request this year’s checklist" : reference.title || id, step.id === "T01" ? "Ask the President for your year’s filled checklist here." : "Open the normal chapter editor with your authorized account."));
      } catch { /* Malformed references never become guide links. */ }
    }
    const help = node("details", "transition-maintainer-resources");
    help.append(node("summary", "", "More help for this step"));
    appendGuideLinks(help, step, true);
    if (step.id === "T03" && progress.run.mode === "rehearsal") {
      const [filename, title] = budgetPracticeGuide;
      help.append(resourceRow(`https://github.com/ASME-OSU/ASME-HUB/blob/main/docs/officer-transition/${filename}`, title, "Follow the Practice-only plan, transaction and comparison procedure.", "guide"));
    }
    if (step.id === "T01") help.append(resourceRow("https://github.com/ASME-OSU/ASME-HUB/blob/main/docs/officer-transition/private-run-checklist-template.md", "Current five-step checklist template", "The President copies and fills this for your chosen year. An empty template does not supply copied tools or approvals.", "guide"));
    if (step.id === "T04") {
      resources.append(resourceRow("https://org.osu.edu/asme/calendar/", "Public Events Calendar", "Use the generated event list’s Upcoming dates button. The embedded Google calendar below it is a separate live view."));
      if (progress.run.mode === "rehearsal") help.append(resourceRow("https://github.com/ASME-OSU/ASME-HUB/blob/main/docs/officer-transition/recovery-practice.md", "Backup and restore practice — exact steps", "Download and restore Hub progress, separate private links and editable newsletter draft in a separate browser profile.", "guide"));
    }
    if (step.id === "T02") {
      try {
        const setupUrl = new URL(window.ASME_HUB_CONFIG?.annualProvisioner?.url || "");
        if (setupUrl.protocol === "https:" && setupUrl.hostname === "script.google.com" && /^\/macros\/s\/[\w-]+\/exec$/.test(setupUrl.pathname) && !setupUrl.username && !setupUrl.password) { setupUrl.searchParams.set("year", selectedYear); setupUrl.searchParams.set("mode", progress.run.mode); help.append(resourceRow(setupUrl.href, "Open Annual Setup — manual fallback", "First choose Chrome’s ASME profile and confirm asmeohiostate@gmail.com is the only Google account signed in. Select this checklist’s year, then answer its questions and copy the setup results.")); }
      } catch { /* No link is shown until the chapter setup screen is installed. */ }
      help.append(resourceRow("https://github.com/ASME-OSU/ASME-HUB/blob/main/integrations/apps-script/transition-simple/README.md", "Annual setup screen installation", "Install the setup screen once, then create each year from its form.", "guide"));
    }
    // Officers use the provisioner's annual copies rather than copying working files.
    if (step.id === "T02" && progress.run.mode === "rehearsal") {
      // Only saved, validated references appear as actions. They never alter Google permissions.
      if (savedAnnualLinks.controlCenterUrl) resources.append(resourceRow(savedAnnualLinks.controlCenterUrl, "Open copied Control Center", "Compare this run’s provisioner-created inactive row with its private summary.", "sheet"));
      if (savedAnnualLinks.scriptProjectUrl) resources.append(resourceRow(savedAnnualLinks.scriptProjectUrl, "Open Annual Provisioner project", "Editor option: run provisionReviewedAnnualYear with the chosen year, or use the installed setup screen."));
    }
    const missingLinks = [];
    for (const [key, title, stepId] of PRIVATE_RECORD_FIELDS.filter(([key, , id]) => id === step.id && privateRecordApplies(key))) {
      if (savedAnnualLinks[key]) resources.append(resourceRow(savedAnnualLinks[key], privateRecordTitle(key, title), "Check that this is the right year and you can open it."));
      else if (key !== "receiptUrl") missingLinks.push(privateRecordTitle(key, title));
    }
    const annualResources = step.id === "T02" ? ANNUAL_LINK_FIELDS.map(([key,title]) => [key,title]) : step.id === "T03" ? [["pointsMaster", "Copied Points Master → README"], ["attendanceFormEditor", "Copied Form editor"], ["attendanceFormRespondent", progress.run.mode === "production" ? "Attendance check-in link" : "Respondent test link"], ["pointsExport", "Copied Points Export"], ["budgetTracker", "Copied Budget Tracker → Start Here"], ["budgetExport", "Copied Budget Export"]] : [];
    for (const [key, title] of annualResources) {
      if (savedAnnualLinks[key]) resources.append(resourceRow(savedAnnualLinks[key], title, "Your saved copy for this year.", "sheet"));
      else missingLinks.push(title);
    }
    if (missingLinks.length) {
      resources.append(node("p", "transition-warning", step.id === "T03" ? "Some files are missing. Finish setup in Step 2, or ask the President for help." : "Some links are missing. Ask the President for help; see More help below."));
      help.append(node("p", "transition-warning", `Missing for this checklist: ${missingLinks.join("; ")}. Ask the President for these links and records. Leave affected reviews Blocked until supplied.`));
    }
    const seen = new Set();
    for (const parent of [resources, help]) for (const row of [...parent.children]) {
      const link = row.querySelector?.("a");
      if (!link?.href) continue;
      if (seen.has(link.href)) row.remove(); else seen.add(link.href);
    }
    if (help.childElementCount > 1) resources.append(help);
    if (resources.childElementCount) resources.prepend(node("h4", "", "Links and resources"));
    resources.hidden = !resources.childElementCount;
  }
  function render() {
    stepAnnualMessage = null;
    $("transition-export").disabled = unreadableProgress;
    $("transition-reset").disabled = unreadableProgress || unreadableAnnualLinks;
    $("transition-reset-confirmation").hidden = true;
    const step = TRANSITION_STEPS[currentIndex];
    const summary = progressSummary(progress, TRANSITION_STEPS, TRANSITION_CHECKS);
    const completed = summary.completedSteps;
    populateRuns();
    $("transition-run-context").textContent = `Current checklist: ${progress.run.name} · ${selectedYear.replace("-", "–")} · ${runModeLabel(progress.run.mode)}.`;
    $("transition-saved-tools-context").textContent = `These tools belong to ${progress.run.name} · ${selectedYear.replace("-", "–")} · ${runModeLabel(progress.run.mode)}. They use the same checklist selected above.`;
    $("transition-run-id").textContent = `Checklist identifier: ${progress.run.id}`;
    $("transition-run-mode").value = progress.run.mode;
    $("transition-readiness").textContent = progress.run.mode === "rehearsal" ? summary.rehearsal.reason : summary.launch.eligible ? "The required handoff reviews are recorded. Obtain the President’s launch approval before switching the year." : `Officer handoff: ${summary.launch.missing.length} setup steps and ${summary.launch.unchecked.length} reviews remain. Follow the steps below; record any access problem or error and ask the President for help.`;
    $("transition-step-picker").replaceChildren(...TRANSITION_STEPS.map(entry => new Option(`${entry.id} · ${stepTitle(entry)} · ${statusLabels[statusOf(entry.id)]}`, entry.id)));
    $("transition-step-picker").value = step.id;
    const current = window.ASME_HUB_CONFIG?.currentAcademicYear || "2026-2027";
    currentSummary.textContent = `Current Hub reference · ${current.replace("-", "–")}`;
    annualSummary.textContent = `Saved links · ${selectedYear.replace("-", "–")}`;
    annualSettings.textContent = "Compare saved links with setup summary";
    $("transition-active-year").textContent = current.replace("-", "–");
    $("transition-guide-year").textContent = selectedYear.replace("-", "–");
    $("transition-change-year").hidden = currentIndex === 0;
    $("transition-saved-at").textContent = progress.savedAt ? new Date(progress.savedAt).toLocaleString() : "Never";
    $("transition-position").textContent = `Current step · ${currentIndex + 1} of ${TRANSITION_STEPS.length}`;
    $("transition-completion").textContent = `${completed} of ${TRANSITION_STEPS.length} steps done`;
    const meter = $("transition-progress");
    meter.max = summary.totalItems;
    meter.value = summary.completedItems;
    meter.setAttribute("aria-label", `Checklist progress: ${summary.completedItems} of ${summary.totalItems} tasks complete`);
    meter.setAttribute("aria-valuetext", `${summary.checkCounts.passed} of ${summary.totalChecks} reviews passed; ${summary.completedSteps} of ${TRANSITION_STEPS.length} steps complete`);
    $("transition-progress-help").textContent = "Saved automatically on this device.";
    $("transition-summary").hidden = true;
    $("transition-readiness").hidden = step.id !== "T05";
    $("transition-summary").textContent = `${progress.run.mode === "rehearsal" ? "Private rehearsal" : "Officer handoff"}: ${completed} of ${TRANSITION_STEPS.length} steps ${progress.run.mode === "rehearsal" ? "finished (including the activation skip when practice is complete)" : "complete"}. ${progress.run.mode === "rehearsal" ? "Cleanup" : "Records and access review"}: ${checkLabels[checkOf("V16")]}. ${progress.run.mode === "rehearsal" ? "Reviewer acceptance" : "Incoming acceptance"}: ${checkLabels[checkOf("V17")]}. ${summary.stepCounts.blocked || summary.stepCounts.failed ? "Open the unfinished steps to resolve their blockers." : "Results are saved on this device."}`;
    $("transition-launch-summary").textContent = `${progress.run.name} · ${selectedYear.replace("-", "–")}: ${summary.completedItems}/${summary.totalItems} tasks complete · ${progress.run.mode === "rehearsal" ? summary.rehearsal.eligible ? "GO — private rehearsal complete; production activation excluded" : "Private rehearsal not complete" : summary.launch.eligible ? "production prerequisites reported passed; coordinator approval required" : "Handoff reviews incomplete"}.`;
    // One link editor stays at the bottom for the currently selected checklist.
    for (const label of annualLabels.values()) annualForm.append(label);
    for (const label of mockLabels.values()) { label.hidden = progress.run.mode !== "rehearsal"; annualForm.append(label); }
    for (const [key, title] of PRIVATE_RECORD_FIELDS) {
      const { label, heading, help } = recordLabels.get(key);
      label.hidden = !privateRecordApplies(key);
      heading.textContent = privateRecordTitle(key, title);
      help.textContent = privateRecordDescription(key);
      recordInputs.get(key).setAttribute("aria-label", privateRecordTitle(key, title));
    }
    annualTools.append(annualMessage);
    annualActions.prepend(annualSave);
    annualSettings.hidden = step.id === "T02";
    yearSetup.hidden = false;
    setupHome.append(setupOptions);
    list.replaceChildren();
    const card = node("article", "transition-step");
    card.id = `transition-${step.id}`;
    const heading = node("div", "transition-step-heading");
    const identity = node("div", "transition-step-identity");
    const badge = node("span", "transition-step-badge");
    badge.setAttribute("aria-hidden", "true");
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const iconUse = document.createElementNS("http://www.w3.org/2000/svg", "use");
    iconUse.setAttribute("href", `#icon-${["calendar", "download", "check-square", "calendar", "check-square"][currentIndex]}`);
    icon.append(iconUse); badge.append(icon); identity.append(badge);
    const title = node("div", "transition-step-title");
    title.append(node("h3", "", stepTitle(step)));
    identity.append(title);
    const pill = node("span", "transition-step-state", statusLabels[statusOf(step.id)]);
    pill.dataset.state = statusOf(step.id);
    heading.append(identity, pill);
    card.append(heading);
    if (step.id === "T01") card.append(setupOptions);
    const hasAnnualFiles = ANNUAL_LINK_FIELDS.every(([key]) => savedAnnualLinks[key]);
    const officerCopy = TRANSITION_OFFICER_COPY[step.id];
    card.append(node("p", "transition-step-intro", step.id === "T02" && hasAnnualFiles ? "Your links are saved. Open your files, then confirm the results." : officerCopy.intro));
    const shortActions = progress.run.mode === "rehearsal" ? officerCopy.practice || officerCopy.actions : officerCopy.actions;
    if (shortActions.length) {
      const actions = node("ol", "transition-short-actions");
      for (const action of shortActions) actions.append(node("li", "", action));
      card.append(actions);
    }
    const detail = disclosure(step.id === "T03" && progress.run.mode === "rehearsal" ? "Practice instructions — with your maintainer" : "Detailed instructions & troubleshooting", "transition-tools transition-detailed-help", "instructions");
    detail.append(node("p", "transition-owner", `Team: ${step.roles.map(role => roleLabels[role] || role).join(", ")}.`));
    detail.append(node("p", "", `Before this step: ${step.needs.length ? step.needs.map(id => stepTitle(byId.get(id))).join("; ") : "Nothing else needed"}.`));
    appendGlossary(detail, step);
    detail.append(node("h4", "", "Full instructions"));
    const procedure = node("ol", "transition-procedure");
    for (const action of instructionsFor(step)) procedure.append(node("li", "", action));
    detail.append(procedure);
    if (step.id === "T05") {
      const outstanding = node("section", "transition-pending-reviews");
      outstanding.append(node("h4", "", "Reviews still needed"));
      for (const entry of TRANSITION_STEPS) {
        const pending = TRANSITION_CHECKS.filter(check => check.step === entry.id && checkApplies(check, progress.run.mode) && checkOf(check.id) !== "passed");
        if (!pending.length && (entry.launch || statusOf(entry.id) === "complete")) continue;
        const group = node("section", "transition-pending-group");
        group.dataset.step = entry.id;
        group.append(node("h5", "", stepTitle(entry)));
        const reviews = node("ul");
        for (const review of pending) reviews.append(node("li", "", questionFor(review)));
        if (reviews.childElementCount) group.append(reviews);
        if (!entry.launch && statusOf(entry.id) !== "complete") group.append(node("p", "", "Record the step result after its tasks and reviews."));
        const jump = node("button", "secondary-button", `Review ${stepTitle(entry)}`);
        jump.type = "button";
        jump.addEventListener("click", () => go(TRANSITION_STEPS.indexOf(entry)));
        group.append(jump);
        outstanding.append(group);
      }
      if (outstanding.childElementCount > 1) card.append(outstanding);
    }
    if (step.id === "T02") {
      if (hasAnnualFiles && !annualSetupPending) {
        const again = disclosure("Reopen setup", "transition-tools", "reopen-setup");
        appendConnectedSetup(again); card.append(again);
      } else appendConnectedSetup(card);
      const fallback = node("details", "transition-tools");
      fallback.append(node("summary", "", "Manual fallback: open Annual Setup and paste results"));
      const transfer = node("form", "transition-setup-transfer");
      transfer.append(node("h4", "", "Bring your new links into the Hub"), node("p", "", "If connected setup is unavailable, open Annual Setup under More help for this step. Choose Copy setup results, paste here and save. This saves links, not completed checks."));
      const paste = node("textarea"); paste.setAttribute("aria-label", "Paste setup results"); paste.placeholder = "Paste the results copied from Annual Setup";
      const submit = node("button", "secondary-button", "Save setup results"); submit.type = "submit"; submit.disabled = annualSetupPending;
      transfer.append(paste, submit);
      transfer.addEventListener("submit", event => {
        event.preventDefault();
        if (annualSetupPending) { say("Wait for the current setup request before importing results.", true); return; }
        try { saveSetupResults(paste.value); }
        catch (error) { say(`Could not save setup results: ${error.message}`, true); }
      });
      fallback.append(transfer); detail.append(fallback);
    }
    appendRecovery(detail, step);
    appendTestCases(detail, step);
    const resources = node("section", "transition-resources");
    resources.id = "transition-step-resources";
    appendStepResources(resources, step);
    if (step.id === "T02") {
      const files = disclosure("Your files", "transition-tools transition-files", "files");
      files.hidden = !hasAnnualFiles;
      files.append(resources);
      card.append(files);
    } else card.append(resources);
    if (stepLinks[step.id] || step.id === "T02") {
      const panel = node("details", "transition-inline-links");
      panel.append(node("summary", "", "Optional: edit or restore links manually"));
      panel.append(node("p", "", "Use this only to correct a saved link or restore a links backup. Connected setup above saves the seven tool links automatically. Saving links does not complete a review."));
      const editLinks = node("button", "secondary-button", "Edit saved links");
      editLinks.type = "button";
      editLinks.addEventListener("click", () => {
        $("transition-saved-tools").open = true;
        annualTools.open = true;
        annualTools.scrollIntoView?.({ behavior: "smooth", block: "start" });
        annualInputs.get("pointsMaster").focus();
      });
      panel.append(editLinks);
      const action = node("button", "secondary-button", step.id === "T02" ? "Compare saved links with setup summary" : "Save private link list on this device");
      if (step.id === "T02") {
        action.type = "button";
        action.addEventListener("click", prepareAnnualSettings);
        panel.append(node("p", "", progress.run.mode === "rehearsal" ? "Open this checklist’s private copied Control Center from Saved links. Compare its inactive row with the setup summary, then record the settings review from the actual Google values." : "Open the Control Center linked in your setup summary. Compare your year’s actual row with the summary before recording the settings review. This action saves the supplied links on this device and does not change Google."));
      } else { action.type = "submit"; action.setAttribute("form", annualForm.id); }

      stepAnnualMessage = node("p", "transition-status", annualMessage.textContent);
      stepAnnualMessage.setAttribute("role", "status");
      stepAnnualMessage.setAttribute("aria-live", "polite");
      panel.append(action, stepAnnualMessage);
      detail.append(panel);
    }
    if (step.id === "T02") appendSetupComparison(detail);
    const confirmation = node("section", "transition-confirmation");
    confirmation.hidden = step.id === "T02" && !hasAnnualFiles;
    card.append(confirmation);
    confirmation.append(node("h4", "", "Did this work?"));
    const teamChecks = disclosure("", "transition-tools transition-team-checks", "team");
    const teamIds = new Set(["V01", "V02", "V03", "V05", "V07", "V11", "V12", "V13", "V14", "V15", "V19", "V22", "V23"]);
    const applicableTeam = checksFor(step).filter(check => teamIds.has(check.id) && checkApplies(check, progress.run.mode));
    teamChecks.children[0].textContent = `Confirm with your team (${applicableTeam.filter(check => checkOf(check.id) !== "passed").length} remaining)`;
    if (applicableTeam.some(check => pendingSkipId === check.id)) teamChecks.open = true;
    teamChecks.append(node("p", "", "Ask the President or maintainer to check these with you. Confirm only what has been checked."));
    const productionChecks = node("details", "transition-production-checks");
    productionChecks.append(node("summary", "", "Production checks — not part of this rehearsal"));
    let hasProductionChecks = false;
    if (step.launch && progress.run.mode === "rehearsal") confirmation.append(node("p", "transition-control-help", "Practice does not start a real year. After these checks pass, set Step result to Skipped and save a reason such as ‘Practice only — no launch’."));
    for (const check of checksFor(step)) {
      if (!checkApplies(check, progress.run.mode)) {
        if (progress.run.mode === "production") continue;
        productionChecks.append(node("p", "transition-manual-check", `${check.title} — Not applicable to this rehearsal.`));
        hasProductionChecks = true;
        continue;
      }
      const checkTarget = teamIds.has(check.id) ? teamChecks : confirmation;
      const label = node("label", "transition-check-control", questionFor(check));
      const select = node("select");
      select.dataset.transitionControl = check.id;
      select.setAttribute("aria-label", `Manual check: ${questionFor(check)}`);
      TRANSITION_CHECK_STATUSES.forEach((value) => select.add(new Option(checkLabels[value], value)));
      select.value = checkOf(check.id);
      select.addEventListener("change", () => {
        const value = select.value;
        const missing = unmet(step);
        if (value === "passed" && missing.length) {
          say(`Independent observation recorded with incomplete prerequisites: ${missing.join(", ")}. It does not establish launch readiness.`);
        }
        const reasons = { ...progress.reasons };
        if (value === "skipped" && !reasons[check.id]) { pendingSkipId = check.id; render(); say("Add a short reason to save this skip."); return; }
        const checks = { ...progress.checks };
        if (value === "not_checked") delete checks[check.id]; else checks[check.id] = value;
        save(reconcileProgress({ ...progress, checks, reasons }, TRANSITION_STEPS, TRANSITION_CHECKS, progress), check.id);
      });
      label.append(select);
      checkTarget.append(label);
      appendEvidence(checkTarget, check.id, titleFor(check));
    }
    if (applicableTeam.length) confirmation.append(teamChecks);
    if (hasProductionChecks) detail.append(productionChecks);
    card.append(detail);
    const control = node("label", "transition-status-control", "Step result");
    const select = node("select");
    select.dataset.transitionControl = step.id;
    select.setAttribute("aria-label", `${step.id} officer progress`);
    TRANSITION_STATUSES.forEach((value) => select.add(new Option(statusLabels[value], value)));
    select.value = statusOf(step.id);
    const recordStepResult = () => {
      const value = select.value;
      if (value === "complete") {
        const missing = unmet(step);
        const pending = unchecked(step);
        if (pending.length || (step.launch && !launchEligibility(progress, TRANSITION_STEPS, TRANSITION_CHECKS).eligible)) {
          say(step.launch ? launchEligibility(progress, TRANSITION_STEPS, TRANSITION_CHECKS).reason : `Confirm the remaining items before finishing this step.`, true);
          select.value = statusOf(step.id);
          return;
        }
      }
      if (value === "skipped" && !progress.reasons[step.id]) { pendingSkipId = step.id; render(); say("Add a short reason to save this skip."); return; }
      const steps = { ...progress.steps };
      if (value === "not_started") delete steps[step.id]; else steps[step.id] = value;
      save(reconcileProgress({ ...progress, steps }, TRANSITION_STEPS, TRANSITION_CHECKS, progress), step.id);
    };
    select.addEventListener("change", recordStepResult);
    const finish = node("button", "primary-button transition-finish-step", statusOf(step.id) === "complete" ? "Step complete" : "Mark step complete");
    finish.type = "button";
    finish.disabled = statusOf(step.id) === "complete" || unchecked(step).length > 0 || Boolean(step.launch && !launchEligibility(progress, TRANSITION_STEPS, TRANSITION_CHECKS).eligible);
    if (!(step.launch && progress.run.mode === "rehearsal")) {
      finish.addEventListener("click", () => { select.value = "complete"; recordStepResult(); });
      confirmation.append(finish, node("p", "transition-control-help", statusOf(step.id) === "complete" ? "This step is complete. Its results are saved on this device." : unchecked(step).length ? `${unchecked(step).length} confirmations left, including any team checks above.` : "All checks for this step are recorded. Mark the step complete when its tasks are finished."));
    }
    control.append(select);
    const otherResult = disclosure("Need help, skip, or add a note", "transition-tools", "step-result");
    otherResult.open = otherResult.open || pendingSkipId === step.id || ["blocked", "failed", "skipped"].includes(statusOf(step.id)) || Boolean(step.launch && progress.run.mode === "rehearsal");
    otherResult.append(control);
    appendEvidence(otherResult, step.id);
    confirmation.append(otherResult);
    const reason = blockingReason(step);
    list.append(card);
    $("transition-back").disabled = currentIndex === 0;
    $("transition-next").textContent = currentIndex === TRANSITION_STEPS.length - 1 ? "Review what remains" : "Read next step";
    const mockMode = progress.run.mode === "rehearsal";
    dialog.dataset.mockMode = String(mockMode);
    $("transition-next").disabled = false;
    $("transition-next").setAttribute("aria-disabled", "false");
    $("transition-next-reason").hidden = !reason;
    $("transition-next-reason").textContent = reason || (currentIndex === TRANSITION_STEPS.length - 1 ? mockMode ? "Record cleanup and reviewer acceptance here. Rehearsal activation stays skipped." : "Record incoming acceptance and the President’s separate launch decision. Finish review shows anything still needed." : "You may read the next step and record its own result.");
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
  $("transition-change-year").addEventListener("click", () => { $("transition-checklist-options").open = true; go(0); yearInput.focus(); });
  $("transition-step-picker").addEventListener("change", event => go(TRANSITION_STEPS.findIndex(step => step.id === event.target.value)));
  $("transition-run-reload").addEventListener("click", () => readYear(selectedRunId));
  $("transition-reset").addEventListener("click", () => {
    $("transition-reset-context").textContent = `Start ${progress.run.name} (${selectedYear.replace("-", "–")}, ${runModeLabel(progress.run.mode)}) again with no results or notes? Its saved links carry over. Your previous checklist stays available under Saved checklist for this year. Unsaved edits will not carry over. Google files and the active year are unchanged.`;
    $("transition-reset-confirmation").hidden = false;
    $("transition-reset-cancel").focus();
  });
  $("transition-reset-cancel").addEventListener("click", () => { $("transition-reset-confirmation").hidden = true; $("transition-reset").focus(); });
  $("transition-reset-confirm").addEventListener("click", () => {
    try {
      if (unreadableProgress || unreadableAnnualLinks) throw new Error("Reload and resolve the unreadable saved checklist or links first.");
      if (localStorage.getItem(storageKey(selectedYear, selectedRunId)) !== observedProgressRaw || (observedLegacyRaw !== null && localStorage.getItem(`${TRANSITION_LEGACY_STORAGE_PREFIX}${selectedYear}`) !== observedLegacyRaw)) throw new Error("This checklist changed in another tab. Reload saved checklist before resetting.");
      assertAnnualDraftUnchanged();
      // Older year-only records may exist only in memory after migration. Save
      // them (and the historical backup) so the original remains selectable.
      if (observedProgressRaw === null && !save(progress)) throw new Error("Could not preserve the previous checklist before restarting.");
      const candidate = emptyProgress(selectedYear, createTransitionRun(`${progress.run.name.slice(0, 100)} (restart)`, progress.run.mode));
      candidate.savedAt = new Date().toISOString();
      const linksRaw = observedAnnualRaw ?? observedLegacyAnnualRaw;
      // Copy only saved references; preserve the original checklist and its links.
      if (linksRaw !== null) localStorage.setItem(`${annualLinkStorageKey(selectedYear)}:${candidate.run.id}`, linksRaw);
      localStorage.setItem(storageKey(selectedYear, candidate.run.id), JSON.stringify(candidate));
      try { localStorage.setItem(runSelectionKey(selectedYear), candidate.run.id); } catch { /* New checklist is already saved and discoverable. */ }
      pendingSkipId = null;
      readYear(candidate.run.id);
      go(0);
      say("Progress reset to zero in a fresh checklist. Your previous results and notes remain under Saved checklist for this year. Saved links were copied; recheck them before recording results.");
    } catch (error) { say(`Could not reset progress: ${error.message} Your previous checklist is preserved.`, true); }
  });
  $("transition-run-continue").addEventListener("click", () => {
    try {
      const year = transitionYear(yearInput.value);
      if (year !== selectedYear) { populateTransitionYears(year); readYear(); }
    } catch (error) { yearInput.setCustomValidity(error.message); yearInput.reportValidity(); say(error.message, true); return; }
    // Continue also honors the typed year when change has not fired yet.
    $("transition-checklist-options").open = false;
    go(firstIncomplete());
  });
  $("transition-run").addEventListener("change", event => {
    try { localStorage.setItem(runSelectionKey(selectedYear), event.target.value); readYear(); } catch { say("Could not select the saved run. Check browser storage.", true); }
  });
  $("transition-run-form").addEventListener("submit", event => {
    event.preventDefault();
    try {
      const requestedYear = transitionYear(yearInput.value);
      if (requestedYear !== selectedYear) populateTransitionYears(requestedYear);
      const mode = $("transition-run-mode").value;
      const name = $("transition-run-name").value.trim() || `${runModeLabel(mode)} ${selectedYear} · ${new Date().toLocaleDateString()}`;
      const candidate = emptyProgress(selectedYear, createTransitionRun(name, mode));
      localStorage.setItem(storageKey(selectedYear, candidate.run.id), JSON.stringify(candidate));
      try { localStorage.setItem(runSelectionKey(selectedYear), candidate.run.id); } catch { /* The saved run remains discoverable. */ }
      $("transition-run-name").value = "";
      readYear(candidate.run.id);
      $("transition-checklist-options").open = false;
      go(0);
      say(`Started a ${runModeLabel(mode)} checklist for ${selectedYear.replace("-", "–")}. This attempt has its own notes and private links; the current Hub year is unchanged.`);
    } catch (error) { say(`Could not start checklist: ${error.message}`, true); }
  });
  $("transition-next").addEventListener("click", () => {
    if (currentIndex < TRANSITION_STEPS.length - 1) go(currentIndex + 1);
    else {
      const summary = progressSummary(progress, TRANSITION_STEPS, TRANSITION_CHECKS);
      const practice = summary.rehearsal;
      say(progress.run.mode === "rehearsal" && !practice.eligible ? `Practice incomplete: ${practice.missing.length} prerequisite steps and ${practice.unchecked.length} reviews remain. Use Reviews still needed below.${practice.closed ? "" : " Record activation as skipped with a reason after practice reviews pass."} Practice never authorizes production launch.` : progress.run.mode === "rehearsal" ? practice.reason : summary.launch.reason);
    }
  });
  $("transition-next-reason").tabIndex = -1;
  yearInput.addEventListener("input", () => yearInput.setCustomValidity(""));
  yearInput.addEventListener("change", () => {
    try {
      const year = transitionYear(yearInput.value);
      if (year !== selectedYear) { const purpose = $("transition-run-mode").value; populateTransitionYears(year); readYear(); go(0); $("transition-run-mode").value = purpose; }
    } catch (error) { yearInput.setCustomValidity(error.message); say(error.message, true); }
  });
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
    link.download = `asme-transition-progress-${progress.year}-${progress.run.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say("Progress text backup download requested. Compare year, run.name and a notes entry with the working checklist. Keep it with the separate private links and editable newsletter backups. Downloading does not verify recovery.");
  });
  const sharedSettingsUrl = window.ASME_HUB_CONFIG?.sharedSettings?.editUrl;
  if (sharedSettingsUrl) $("transition-control-center").href = sharedSettingsUrl;
  $("transition-import").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error("Progress files must be under 100 KB.");
      const intendedYear = selectedYear;
      const text = await file.text();
      if (selectedYear !== intendedYear) throw new Error("Selected year changed while reading. Import again.");
      const imported = importProgress(text, selectedYear, TRANSITION_STEPS, TRANSITION_CHECKS);
      const migrated = TRANSITION_PREVIOUS_GUIDE_VERSIONS.includes(JSON.parse(text).guideVersion);
      const candidate = { ...imported, run: createTransitionRun(`${imported.run.name.slice(0, 100)} (import)`, imported.run.mode), savedAt: new Date().toISOString() };
      if (migrated) localStorage.setItem(`${storageKey(candidate.year, candidate.run.id)}:${JSON.parse(text).guideVersion}-import-backup`, text);
      localStorage.setItem(storageKey(candidate.year, candidate.run.id), JSON.stringify(candidate));
      try { localStorage.setItem(runSelectionKey(candidate.year), candidate.run.id); } catch { /* The imported run is already safely saved. */ }
      previousGuideRaw = null;
      unreadableProgress = false;
      progress = candidate;
      observedProgressRaw = JSON.stringify(candidate);
      observedLegacyRaw = null;
      selectedRunId = candidate.run.id;
      readAnnualLinks();
      currentIndex = firstIncomplete();
      render();
      say(migrated ? migrationNotice + " The imported original was backed up on this device." : "Imported into a new isolated run. Existing runs were preserved. Imported production completions require recheck before activation.");
    } catch (error) {
      say(`Import failed: ${error.message} Existing progress was not changed.`, true);
    }
  });
  function appendTestCases(card, step) {
    if (step.id !== "T03" || progress.run.mode !== "rehearsal") return;
    card.append(node("p", "transition-manual-check", TRANSITION_TEST_IDENTITIES));
    const table = node("table", "transition-test-cases");
    table.append(node("caption", "", "Five fictional check-in submissions — private rehearsal"));
    const head = node("thead"), row = node("tr");
    for (const label of ["Submission", "Identity and profile choice", "Event", "Expected score"]) { const cell = node("th", "", label); cell.setAttribute("scope", "col"); row.append(cell); }
    head.append(row); table.append(head);
    const body = node("tbody");
    for (const cells of TRANSITION_TEST_CASES) { const row = node("tr"); for (const value of cells) row.append(node("td", "", value)); body.append(row); }
    table.append(body); card.append(table);
  }
  function buildPrintSheet() {
    const sheet = $("transition-print-sheet");
    sheet.replaceChildren(node("h1", "", `Officer transition checklist · ${selectedYear.replace("-", "–")} · ${progress.run.name} · ${progress.run.mode}`));
    const summary = progressSummary(progress, TRANSITION_STEPS, TRANSITION_CHECKS);
    sheet.append(node("p", "", progress.run.mode === "rehearsal" ? summary.rehearsal.reason : summary.launch.reason), node("p", "", `Activation: ${statusLabels[statusOf("T05")]}; cleanup: ${checkLabels[checkOf("V16")]}; incoming acceptance: ${checkLabels[checkOf("V17")]}. Private links backup is separate from this record.`));
    for (const step of TRANSITION_STEPS) {
      const card = node("article", "transition-print-step");
      card.append(node("h2", "", `${step.id} · ${stepTitle(step)} — ${statusLabels[statusOf(step.id)]}`));
      card.append(node("p", "", `President leads; team checks: ${step.roles.map((role) => roleLabels[role] || role).join(", ")}`));
      card.append(node("p", "", `Prerequisites: ${step.needs.join(", ") || "None"}`));
      appendGlossary(card, step);
      if (step.id === "T02") appendSetupComparison(card);
      const quickStart = progress.run.mode === "production" ? step.productionQuickStart || step.quickStart : step.quickStart;
      if (quickStart) card.append(node("p", "", yearText(quickStart)));
      for (const instruction of instructionsFor(step)) card.append(node("p", "", instruction));
      if (step.id === "T02") card.append(node("p", "transition-manual-check", "Annual Setup creates or reopens the attendance and budget files for your year. Connected setup saves all seven links here automatically; its detailed summary is optional. Keep last year’s files as records."));
    if (step.id === "T03" && progress.run.mode === "rehearsal") card.append(node("p", "transition-manual-check", "Why two response checks? You check that all five submissions arrived in the named tab. The technical maintainer checks the other response tabs in the same copied workbook. Example note: Five MOCK rows arrived in the summary’s tab; [maintainer] confirmed the other response tabs contain none of these rows on [date]."));
    appendRecovery(card, step, true);
    appendTestCases(card, step);
      card.append(node("p", "", `Manual check: ${progress.run.mode === "production" ? step.productionCheck : step.check}`));
      appendGuideLinks(card, step);
      checksFor(step).filter(check => progress.run.mode === "rehearsal" || checkApplies(check, "production")).forEach((check) => card.append(node("p", "", `${titleFor(check)}: ${checkApplies(check, progress.run.mode) ? checkLabels[checkOf(check.id)] : "Production only; not required for this rehearsal"}`)));
      for (const id of [step.id, ...checksFor(step).map(check => check.id)]) {
        if (progress.reasons[id]) card.append(node("p", "", `${id} reason: ${progress.reasons[id]}`));
        if (progress.notes[id]) card.append(node("p", "", `${id} evidence note: ${progress.notes[id]}`));
      }
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
  document.addEventListener("transition:resources-updated", event => {
    if (!Array.isArray(event.detail?.resources)) return;
    guideResources = event.detail.resources;
    if (Array.isArray(event.detail.defaults) && Array.isArray(event.detail.records)) guideResourceSnapshot = event.detail;
    const resources = list.querySelector(".transition-resources");
    if (resources) appendStepResources(resources, TRANSITION_STEPS[currentIndex]);
  });
  readYear();
}
