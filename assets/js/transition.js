import { TRANSITION_CHECKS, TRANSITION_STEPS, TRANSITION_TEST_CASES } from "./transition-steps.js?v=20261009b";
import { checkApplies, createTransitionRun, progressSummary, launchEligibility, parseProgress, TRANSITION_LEGACY_STORAGE_PREFIX, emptyProgress, exportProgress, importProgress, migrateProgress, reconcileProgress, storageKey, transitionYear, transitionYearChoices, TRANSITION_STORAGE_PREFIX, TRANSITION_PREVIOUS_GUIDE_VERSIONS, validTransitionYear, TRANSITION_CHECK_STATUSES, TRANSITION_STATUSES } from "./transition-state.js?v=20261009b";
import { ANNUAL_HANDOFF_TYPE, PRIVATE_RECORD_FIELDS, ANNUAL_LINK_FIELDS, MOCK_ANNUAL_FIELDS, annualLinkStorageKey, importAnnualLinkDraft, validateAnnualLinkDraft, reopenAnnualChecks } from "./annual-link-draft.js?v=20261009b";

const section = document.getElementById("transition");
if (section) {
  const $ = (id) => document.getElementById(id);
  const dialog = $("transition-dialog");
  const list = $("transition-steps");
  const yearInput = $("transition-year");
  const yearSetup = $("transition-year-setup");
  // Keep the year choice above the checklist controls on every step.
  const yearOptions = $("transition-year-options");
  let selectedYear = "";
  let selectedRunId = "";
  const statusLine = $("transition-status");
  const byId = new Map(TRANSITION_STEPS.map((step) => [step.id, step]));
  const statusLabels = { not_started: "Not started", in_progress: "In progress", blocked: "Blocked", failed: "Failed", skipped: "Skipped — reason recorded", complete: "Complete — officer marked" };
  const checkLabels = { not_checked: "Not checked", checking: "Checking", passed: "Passed — officer reported", failed: "Failed", unable: "Unable to verify", needs_recheck: "Needs recheck", skipped: "Skipped — reason recorded" };
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
    yearInput.value = selected.slice(0, 4);
  }
  populateTransitionYears();
  let progress = emptyProgress(selectedYear);
  const runSelectionKey = year => `asmeHubTransitionSelectedRunV2:${year}`;
  const annualRunKey = () => `${annualLinkStorageKey(selectedYear)}:${selectedRunId}`;
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
    if (progress.run.mode === "rehearsal") {
      if (key === "acceptanceUrl") return "Reviewer sign-off record link";
      if (key === "rollbackUrl") return "Recovery notes document link";
    }
    return title;
  }
  function privateRecordDescription(key) {
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
  const financeGuide = ["finance-settings-launch.md", "Open finance, settings and launch examples"];
  const communicationsGuide = ["communications-rollover.md", "Open calendar, newsletter and public-page instructions"];
  const stepGuides = { T01: [["README.md", "Officer instructions and current checklist template"]], T02: [setupGuide, financeGuide], T03: [setupGuide, financeGuide], T04: [communicationsGuide], T05: [financeGuide] };
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
  const annualSummary = node("summary", "", "New-year draft links");
  annualTools.append(annualSummary);
  annualTools.append(node("p", "", "Paste full HTTPS links to the private records supplied by the President or technical maintainer, such as https://docs.google.com/document/d/…/edit. These fields take document or folder links, not names or email addresses. Link checks cover format and known template identities; officers still check Google access, privacy and business results."));
  annualTools.append(node("p", "", "Import automation links fills this checklist's private link list from a JSON file. Ask the technical maintainer for the annual link handoff JSON for this year and attempt (type: asme-annual-link-handoff). The readable setup receipt explains the files and settings; it is a separate document. Importing links does not run setup or change Google."));
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
  const annualImportLabel = node("label", "secondary-button file-button", "Import automation links");
  const annualImport = node("input");
  annualImport.type = "file";
  annualImport.accept = "application/json,.json";
  annualImportLabel.append(annualImport);
  const annualSettings = node("button", "secondary-button", "Prepare Year Settings draft");
  annualSettings.type = "button";
  const annualClear = node("button", "secondary-button", "Clear saved links for this run");
  annualClear.type = "button";
  const annualExport = node("button", "secondary-button", "Download private link bundle");
  annualExport.type = "button";
  annualExport.addEventListener("click", () => {
    try {
      assertAnnualDraftUnchanged();
      if (unreadableAnnualLinks || !observedAnnualRaw) throw new Error("Save and review this run’s link list first.");
      const draft = importAnnualLinkDraft(observedAnnualRaw, selectedYear, window.ASME_HUB_CONFIG);
      const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }));
      const link = node("a"); link.href = url; link.download = `asme-private-links-${selectedYear}-${selectedRunId}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      annualSay("Private bundle download requested. Open the downloaded JSON and verify its year and links; restore it into an isolated rehearsal to verify recovery. This click is not recovery evidence.");
    } catch (error) { annualSay(error.message, true); }
  });
  annualActions.append(annualSave, annualImportLabel, annualExport, annualSettings, annualClear);
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
    annualSay(`Link format checked and draft saved on this device.${reopened ? " Affected completed steps and checks need review." : ""} Check Google access and connections in Google Drive and Forms.`);
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
      const draft = importAnnualLinkDraft(await file.text(), importedYear, window.ASME_HUB_CONFIG);
      if (selectedYear !== importedYear || selectedRunId !== importedRunId) throw new Error("The selected year or run changed while reading this file. Import again for the intended run.");
      fillAnnualLinks(draft);
      unreadableAnnualLinks = false;
      annualSay("Imported link draft for review. Choose Save private link list on this device to retain it on this device. Creation results do not certify ownership, privacy or readiness; Form respondent links must come from the actual Form.");
    } catch (error) { annualSay(`Import failed: ${error.message} Existing fields and saved links were not changed.`, true); }
  });
  function prepareAnnualSettings() {
    try {
      const preview = annualDraft();
      if (progress.run.mode === "rehearsal" && (Object.keys(preview.links).length !== ANNUAL_LINK_FIELDS.length || !preview.mock?.controlCenterUrl)) throw new Error("Enter all seven annual links and the private copied Control Center from this run’s provisioner receipt first.");
      if (progress.run.mode !== "rehearsal" && preview.mock) throw new Error("Private mock references belong to a Rehearsal run. Production settings cannot use the mock context.");
      const draft = saveAnnualLinks();
      if (progress.run.mode === "rehearsal") {
        annualSay("Private mock draft saved. Open the private mock Control Center below and compare the selected year’s exact row with this run’s provisioner receipt: copied links, goal, calendar, dates and inactive/noncurrent flags. Record V07 only after fresh Google readback. This review does not save a Google row or run the provisioner.");
        render();
        return;
      }
      document.dispatchEvent(new CustomEvent("transition:annual-settings-draft", { detail: { draft, report: (error) => {
        if (error) annualSay(error, true);
        else dialog.close();
      } } }));
    } catch (error) { annualSay(`Cannot prepare settings: ${error.message}`, true); }
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

  function node(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }
  function statusOf(id) { return progress.steps[id] || "not_started"; }
  function checkOf(id) { return progress.checks[id] || "not_checked"; }
  function titleFor(check) { return progress.run.mode === "rehearsal" ? check.rehearsalTitle || check.title : check.title; }
  function instructionsFor(step) {
    if (step.id === "T05" && progress.run.mode === "rehearsal") return ["Keep the Form and mock events closed, Points in TESTING, and the copied year inactive. Open this run’s private checklist to review the fictional items and recovery record.", "Record the reviewer’s decision to retain or remove the listed test items. Preserve formula tabs and exception evidence, then confirm the safe settings again.", "The President or named practice reviewer records sign-off in the private checklist. Example: “Keep the five fictional responses and two closed MOCK events privately; recovery files opened correctly; practice accepted on [date].” Skip activation with the reason Rehearsal only. This sign-off does not approve a real launch."];
    if (step.id === "T01" && progress.run.mode === "rehearsal") return ["The President leads this private rehearsal, with the team contributing checks. Choose your target year and start a Practice checklist. You can give this attempt an optional name. The live dashboard year stays unchanged.", "Use your approved test account to open every copied tool. Record that account, the rehearsal lead and a recovery plan in this run’s private checklist. Keep this rehearsal’s files private.", "Ask the President through asme@osu.edu for a filled checklist for this year, the technical maintainer’s name and the private link-bundle JSON. Say your role, target year and whether this is Practice or Real handoff. Save the supplied record links below. Until they arrive, mark Blocked; you can still read later steps and do local calendar practice. The shared start page is guidance, not this year’s completed checklist."];
    return (step.instructions || [step.action]).filter((text, index) => progress.run.mode !== "rehearsal" || !(step.id === "T04" && [2,4,5,6].includes(index)) && !text.startsWith("Production launch:"));
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
    return missing.length ? `Dependency warning: ${missing.join(", ")} is incomplete. You may read and record this independent observation; it does not complete those prerequisites.` : "";
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
          say("Ready for Practice. Start a checklist for this year, or record your first result to save this attempt on this device.");
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
  function appendEvidence(parent, id) {
    const skipped = pendingSkipId === id || progress.steps[id] === "skipped" || progress.checks[id] === "skipped";
    const details = node("details", "transition-evidence-details");
    details.open = skipped;
    details.append(node("summary", "", skipped ? "Explain why this is skipped" : "Add a note or evidence"));
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
        if (url.protocol === "https:" && !url.username && !url.password) resources.append(resourceRow(url.href, id === "handoff-checklist" ? "Shared start page — request this year’s checklist" : reference.title || id, step.id === "T01" ? "Shared start page or folder. It explains how to obtain this year’s filled checklist; it is not your saved checklist or an approval." : "Open the normal chapter editor with your authorized account."));
      } catch { /* Malformed references never become guide links. */ }
    }
    appendGuideLinks(resources, step, true);
    if (step.id === "T01") resources.append(resourceRow("https://github.com/ASME-OSU/ASME-HUB/blob/main/docs/officer-transition/private-run-checklist-template.md", "Current five-step checklist template", "The President copies and fills this for your chosen year. An empty template does not supply copied tools or approvals.", "guide"));
    if (step.id === "T04") {
      resources.append(resourceRow("https://org.osu.edu/asme/calendar/", "Public Events Calendar", "Use the generated event list’s Upcoming dates button. The embedded Google calendar below it is a separate live view."));
      resources.append(resourceRow("https://github.com/ASME-OSU/ASME-HUB/blob/main/docs/officer-transition/recovery-practice.md", "Backup and restore practice — exact steps", "Download and restore Hub progress, separate private links and editable newsletter draft in a separate browser profile.", "guide"));
    }
    if (step.resource) {
      const url = window.ASME_HUB_CONFIG?.[step.resource]?.editUrl;
      if (url && /^https:\/\//.test(url)) resources.append(resourceRow(url, step.resource === "templates" ? "Google Drive Templates folder" : "Google Hub Control Center", "Open the chapter's shared source and review its contents."));
    }
    for (const key of progress.run.mode === "rehearsal" ? [] : step.templateActions || []) {
      const source = window.ASME_HUB_CONFIG?.templates?.sources?.[key];
      if (source?.editUrl && /^https:\/\//.test(source.editUrl)) resources.append(resourceRow(source.editUrl, `${source.title} template`, "Review the clean source. The provisioner creates the annual copies.", key === "attendanceForm" ? "document" : "sheet"));
    }
    if (step.id === "T02" && progress.run.mode === "rehearsal") {
      // Only saved, validated references appear as actions. They never alter Google permissions.
      if (savedAnnualLinks.controlCenterUrl) resources.append(resourceRow(savedAnnualLinks.controlCenterUrl, "Open copied Control Center", "Compare this run’s provisioner-created inactive row with its private receipt.", "sheet"));
      if (savedAnnualLinks.scriptProjectUrl) resources.append(resourceRow(savedAnnualLinks.scriptProjectUrl, "Mock provisioner Apps Script project", "Optional technical maintainer guide: execution belongs to the maintainer."));
    }
    for (const [key, title, stepId] of PRIVATE_RECORD_FIELDS.filter(([key, , id]) => id === step.id && privateRecordApplies(key))) {
      if (savedAnnualLinks[key]) resources.append(resourceRow(savedAnnualLinks[key], privateRecordTitle(key, title), "Saved for this run. Verify year, owner, access and contents; a link alone is not approval."));
      else resources.append(node("p", "transition-warning", `${privateRecordTitle(key, title)}: not supplied for this checklist. Ask the President for the current record and its HTTPS link; paste it under this checklist’s private links. Mark Blocked until supplied.`));
    }
    const annualResources = step.id === "T02" ? ANNUAL_LINK_FIELDS.map(([key,title]) => [key,title]) : step.id === "T03" ? [["pointsMaster", "Copied Points Master → README"], ["attendanceFormEditor", "Copied Form editor"], ["attendanceFormRespondent", "Respondent test link"], ["pointsExport", "Copied Points Export"], ["budgetTracker", "Copied Budget Tracker → Start Here"], ["budgetExport", "Copied Budget Export"]] : [];
    for (const [key, title] of annualResources) {
      if (savedAnnualLinks[key]) resources.append(resourceRow(savedAnnualLinks[key], title, "Selected run’s saved copy. Select the named tab inside the workbook; no tab ID is assumed.", "sheet"));
      else resources.append(node("p", "transition-warning", `${title}: no saved link for this run. Obtain the setup receipt from the maintainer; do not reuse last year’s files.`));
    }
    if (resources.childElementCount) resources.prepend(node("h4", "", "Links and resources"));
    resources.hidden = !resources.childElementCount;
  }
  function render() {
    $("transition-export").disabled = unreadableProgress;
    const step = TRANSITION_STEPS[currentIndex];
    const summary = progressSummary(progress, TRANSITION_STEPS, TRANSITION_CHECKS);
    const completed = summary.stepCounts.complete;
    populateRuns();
    $("transition-run-context").textContent = `Current checklist: ${progress.run.name} · ${selectedYear.replace("-", "–")} · ${runModeLabel(progress.run.mode)}. Notes and private links belong to this attempt.`;
    $("transition-run-id").textContent = `Checklist identifier: ${progress.run.id}`;
    $("transition-run-mode").value = progress.run.mode;
    $("transition-readiness").textContent = progress.run.mode === "rehearsal" ? summary.rehearsal.reason : summary.launch.reason;
    $("transition-step-picker").replaceChildren(...TRANSITION_STEPS.map(entry => new Option(`${entry.id} · ${entry.title} · ${statusLabels[statusOf(entry.id)]}`, entry.id)));
    $("transition-step-picker").value = step.id;
    const current = window.ASME_HUB_CONFIG?.currentAcademicYear || "2026-2027";
    currentSummary.textContent = `Current Hub settings · ${current.replace("-", "–")}`;
    annualSummary.textContent = `${progress.run.mode === "rehearsal" ? "Private mock run links" : "New-year draft links"} · ${selectedYear.replace("-", "–")} · saved on this device`;
    annualSettings.textContent = progress.run.mode === "rehearsal" ? "Check saved bundle against receipt" : "Prepare Year Settings draft";
    $("transition-active-year").textContent = current.replace("-", "–");
    $("transition-guide-year").textContent = selectedYear.replace("-", "–");
    $("transition-change-year").hidden = currentIndex === 0;
    $("transition-saved-at").textContent = progress.savedAt ? new Date(progress.savedAt).toLocaleString() : "Never";
    $("transition-position").textContent = `Step ${currentIndex + 1} of ${TRANSITION_STEPS.length}`;
    $("transition-completion").textContent = `${summary.disposed}/${TRANSITION_STEPS.length} steps have a recorded status`;
    const meter = $("transition-progress");
    meter.max = TRANSITION_STEPS.length;
    meter.value = summary.disposed;
    meter.setAttribute("aria-label", `${summary.disposed} steps have a recorded status; ${completed} passed; viewing step ${currentIndex + 1}`);
    $("transition-summary").textContent = `${progress.run.mode === "rehearsal" ? "Private rehearsal" : "Production run"}: ${completed} of ${TRANSITION_STEPS.length} steps complete. Cleanup: ${checkLabels[checkOf("V16")]}. ${progress.run.mode === "rehearsal" ? "Reviewer acceptance" : "Incoming acceptance"}: ${checkLabels[checkOf("V17")]}. ${summary.stepCounts.blocked || summary.stepCounts.failed ? "Open the unfinished steps to resolve their blockers." : "Results are saved on this device."}`;
    $("transition-launch-summary").textContent = `${progress.run.name} · ${selectedYear.replace("-", "–")}: ${summary.disposed}/${TRANSITION_STEPS.length} steps recorded · ${progress.run.mode === "rehearsal" ? summary.rehearsal.eligible ? "GO — private rehearsal complete; production activation excluded" : "Private rehearsal not complete" : summary.launch.eligible ? "production prerequisites reported passed; coordinator approval required" : "Production NO-GO"}.`;
    // Keep the same canonical fields when moving between step cards.
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
    list.replaceChildren();
    const card = node("article", "transition-step");
    card.id = `transition-${step.id}`;
    const heading = node("div", "transition-step-heading");
    const identity = node("div", "transition-step-identity");
    identity.append(node("span", "transition-step-badge", step.id));
    const title = node("div", "transition-step-title");
    title.append(node("h3", "", step.title), node("p", "transition-owner", `President leads; team checks: ${step.roles.map((role) => roleLabels[role] || role).join(", ")}`));
    identity.append(title);
    const pill = node("span", "transition-step-state", statusLabels[statusOf(step.id)]);
    pill.dataset.state = statusOf(step.id);
    heading.append(identity, pill);
    card.append(heading);
    card.append(node("p", "transition-prerequisites", `Prerequisites: ${step.needs.length ? step.needs.map((id) => `${id} ${byId.get(id).title}`).join("; ") : "None"}`));
    card.append(node("h4", "", "What you need to do"));
    const procedure = node("ol", "transition-procedure");
    for (const action of instructionsFor(step)) procedure.append(node("li", "", action));
    card.append(procedure);
    if (step.id === "T02") card.append(node("p", "transition-manual-check", "A setup receipt is the technical maintainer’s list of copied files and checked settings. Example note: I opened all seven supplied links for 2027–2028; the Form opened the Points Master response tab listed in the receipt. If a link or receipt is missing, ask the President for the bundle rather than copying last year’s files."));
    if (step.id === "T03") card.append(node("p", "transition-manual-check", "Why two response checks? You check that all five submissions arrived in the named tab. The technical maintainer checks the other response tabs in the same copied workbook. Example note: Five MOCK rows arrived in the receipt’s tab; [maintainer] confirmed the other response tabs contain none of these rows on [date]."));
    if (step.id === "T04") {
      const recovery = node("details", "transition-tools");
      recovery.append(node("summary", "", "Practice restoring the three backup files"));
      const tasks = node("ol", "transition-procedure");
      for (const text of ["In the Hub’s Save, import, and reference tools, choose Export progress. Expand Private mock run links (Practice) or New-year draft links (Real handoff), then choose Download private link bundle. In Newsletter Builder, choose Templates → Export Draft .json. Keep all three downloads.", "In Downloads, open each JSON with TextEdit without changing it. Compare the progress year, name and notes; the separate bundle’s year and links; and the newsletter state and content with your working screens.", "Chrome profile menu → Add → Continue without an account → name it ASME recovery practice. Open the same Hub and builder there; use your authorized dashboard password. Keep the original profile open.", "In the new profile select the same year. Import progress into a separate Practice checklist, then Import automation links and Save private link list on this device. Check the returned year, notes and seven links. Changed links reopen checks; confirm only what you rechecked.", "In the new builder use Templates → Import Draft .json. Compare subject, preheader, content and Desktop/Mobile previews. Return to the original profile and confirm its checklist and issue are intact. Record what matched; do not send the practice issue."]) tasks.append(node("li", "", text));
      recovery.append(tasks); card.append(recovery);
    }
    appendTestCases(card, step);
    const resources = node("section", "transition-resources");
    resources.id = "transition-step-resources";
    appendStepResources(resources, step);
    card.append(resources);
    if (stepLinks[step.id] || step.id === "T02") {
      const panel = node("section", "transition-inline-links");
      panel.append(node("h4", "", step.id === "T02" && progress.run.mode === "rehearsal" ? "Review the private mock settings" : step.id === "T02" ? "Review and save the new year's settings" : "Save for next year"));
      panel.append(node("p", "", "This saves your links here. It does not read or change Google. Link format and known template IDs are checked; verify permissions and connections in Google."));
      for (const key of stepLinks[step.id] || []) panel.append(annualLabels.get(key));
      if (step.id === "T02" && progress.run.mode === "rehearsal") for (const label of mockLabels.values()) panel.append(label);
      const action = node("button", "secondary-button", step.id === "T02" ? progress.run.mode === "rehearsal" ? "Check saved bundle against receipt" : "Review new-year settings" : "Save private link list on this device");
      if (step.id === "T02") {
        action.type = "button";
        action.addEventListener("click", prepareAnnualSettings);
        panel.append(node("p", "", progress.run.mode === "rehearsal" ? "Ask the technical maintainer for this run’s readable setup receipt, then enter its seven returned links and copied Control Center. Review the existing inactive row directly in that private Center against the saved receipt. Keep the mock files private. This route does not use the legacy annual save page or the chapter’s current settings." : "Production Year Settings is a separate workflow. The legacy annual save service does not adopt provisioner-created rows or verify proxy/central-pointer templates. For a provisioner-owned year, compare its receipt with the exact Google Control Center row directly and record V07; do not send it to the legacy writer. Use the authorized annual save page only for its separately configured supported workflow."));
      } else { action.type = "submit"; action.setAttribute("form", annualForm.id); }

      panel.append(annualSave, action, annualMessage);
      card.append(panel);
    }
    const confirmation = node("section", "transition-confirmation");
    card.append(confirmation);
    confirmation.append(node("h4", "", "Check results"), node("p", "transition-manual-check", step.id === "T01" && progress.run.mode === "rehearsal" ? "Record the rehearsal lead, test account and recovery plan. Check that every copied tool opens and the private checklist matches this run." : step.check));
    if (checksFor(step).length) confirmation.append(node("p", "", "Perform these checks in the named services, then record your result below. The Hub does not check them automatically."));
    const productionChecks = node("details", "transition-production-checks");
    productionChecks.append(node("summary", "", "Production checks — not part of this rehearsal"));
    let hasProductionChecks = false;
    for (const check of checksFor(step)) {
      if (!checkApplies(check, progress.run.mode)) {
        productionChecks.append(node("p", "transition-manual-check", `${check.title} — Not applicable to this rehearsal.`));
        hasProductionChecks = true;
        continue;
      }
      const label = node("label", "transition-check-control", titleFor(check));
      const select = node("select");
      select.dataset.transitionControl = check.id;
      select.setAttribute("aria-label", `Manual check: ${titleFor(check)}`);
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
      confirmation.append(label);
      appendEvidence(confirmation, check.id);
    }
    if (hasProductionChecks) confirmation.append(productionChecks);
    const control = node("label", "transition-status-control", "Step status");
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
        if (pending.length || (step.launch && !launchEligibility(progress, TRANSITION_STEPS, TRANSITION_CHECKS).eligible)) {
          say(step.launch ? launchEligibility(progress, TRANSITION_STEPS, TRANSITION_CHECKS).reason : `Record manual ${pending.map(titleFor).join(", ")} as passed before marking ${step.id} complete.`, true);
          select.value = statusOf(step.id);
          return;
        }
      }
      if (value === "skipped" && !progress.reasons[step.id]) { pendingSkipId = step.id; render(); say("Add a short reason to save this skip."); return; }
      const steps = { ...progress.steps };
      if (value === "not_started") delete steps[step.id]; else steps[step.id] = value;
      save(reconcileProgress({ ...progress, steps }, TRANSITION_STEPS, TRANSITION_CHECKS, progress), step.id);
    });
    control.append(select);
    confirmation.append(control);
    appendEvidence(confirmation, step.id);
    const reason = blockingReason(step);
    list.append(card);
    $("transition-back").disabled = currentIndex === 0;
    $("transition-next").textContent = currentIndex === TRANSITION_STEPS.length - 1 ? "Finish review" : "Next step";
    const mockMode = progress.run.mode === "rehearsal";
    dialog.dataset.mockMode = String(mockMode);
    $("transition-next").disabled = false;
    $("transition-next").setAttribute("aria-disabled", "false");
    $("transition-next-reason").textContent = reason || (currentIndex === TRANSITION_STEPS.length - 1 ? "Record cleanup and reviewer acceptance here. Rehearsal activation stays skipped." : "You may read the next step and record its own result.");
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
  $("transition-step-picker").addEventListener("change", event => go(TRANSITION_STEPS.findIndex(step => step.id === event.target.value)));
  $("transition-run-reload").addEventListener("click", () => readYear(selectedRunId));
  $("transition-run-continue").addEventListener("click", () => {
    // Selection already loads the record; continue focuses its first unfinished step.
    go(firstIncomplete());
  });
  $("transition-run").addEventListener("change", event => {
    try { localStorage.setItem(runSelectionKey(selectedYear), event.target.value); readYear(); } catch { say("Could not select the saved run. Check browser storage.", true); }
  });
  $("transition-run-form").addEventListener("submit", event => {
    event.preventDefault();
    try {
      const mode = $("transition-run-mode").value;
      const name = $("transition-run-name").value.trim() || `${runModeLabel(mode)} ${selectedYear} · ${new Date().toLocaleDateString()}`;
      const candidate = emptyProgress(selectedYear, createTransitionRun(name, mode));
      localStorage.setItem(storageKey(selectedYear, candidate.run.id), JSON.stringify(candidate));
      try { localStorage.setItem(runSelectionKey(selectedYear), candidate.run.id); } catch { /* The saved run remains discoverable. */ }
      $("transition-run-name").value = "";
      readYear(candidate.run.id);
      say(`Started a ${runModeLabel(mode)} checklist for ${selectedYear.replace("-", "–")}. This attempt has its own notes and private links; the current Hub year is unchanged.`);
    } catch (error) { say(`Could not start checklist: ${error.message}`, true); }
  });
  $("transition-next").addEventListener("click", () => {
    if (currentIndex < TRANSITION_STEPS.length - 1) go(currentIndex + 1);
    else { const summary = progressSummary(progress, TRANSITION_STEPS, TRANSITION_CHECKS); say(progress.run.mode === "rehearsal" ? summary.rehearsal.reason : summary.launch.reason); }
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
    link.download = `asme-transition-progress-${progress.year}-${progress.run.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say("Exported run identity, mode, year, versions, step/check statuses, reasons, notes and save time. Annual-link draft fields are excluded; notes and references are included. Keep the file in an appropriate handoff location.");
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
    if (step.id !== "T03") return;
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
    sheet.append(node("p", "", progress.run.mode === "rehearsal" ? summary.rehearsal.reason : summary.launch.reason), node("p", "", `Activation: ${statusLabels[statusOf("T05")]}; cleanup: ${checkLabels[checkOf("V16")]}; incoming acceptance: ${checkLabels[checkOf("V17")]}. Private link bundle is separate from this record.`));
    for (const step of TRANSITION_STEPS) {
      const card = node("article", "transition-print-step");
      card.append(node("h2", "", `${step.id} · ${step.title} — ${statusLabels[statusOf(step.id)]}`));
      card.append(node("p", "", `President leads; team checks: ${step.roles.map((role) => roleLabels[role] || role).join(", ")}`));
      card.append(node("p", "", `Prerequisites: ${step.needs.join(", ") || "None"}`));
      for (const instruction of instructionsFor(step)) card.append(node("p", "", instruction));
      if (step.id === "T02") card.append(node("p", "transition-manual-check", "A setup receipt is the technical maintainer’s list of copied files and checked settings. Example note: I opened all seven supplied links for 2027–2028; the Form opened the Points Master response tab listed in the receipt. If a link or receipt is missing, ask the President for the bundle rather than copying last year’s files."));
    if (step.id === "T03") card.append(node("p", "transition-manual-check", "Why two response checks? You check that all five submissions arrived in the named tab. The technical maintainer checks the other response tabs in the same copied workbook. Example note: Five MOCK rows arrived in the receipt’s tab; [maintainer] confirmed the other response tabs contain none of these rows on [date]."));
    if (step.id === "T04") {
      const recovery = node("details", "transition-tools");
      recovery.append(node("summary", "", "Practice restoring the three backup files"));
      const tasks = node("ol", "transition-procedure");
      for (const text of ["In the Hub’s Save, import, and reference tools, choose Export progress. Expand Private mock run links (Practice) or New-year draft links (Real handoff), then choose Download private link bundle. In Newsletter Builder, choose Templates → Export Draft .json. Keep all three downloads.", "In Downloads, open each JSON with TextEdit without changing it. Compare the progress year, name and notes; the separate bundle’s year and links; and the newsletter state and content with your working screens.", "Chrome profile menu → Add → Continue without an account → name it ASME recovery practice. Open the same Hub and builder there; use your authorized dashboard password. Keep the original profile open.", "In the new profile select the same year. Import progress into a separate Practice checklist, then Import automation links and Save private link list on this device. Check the returned year, notes and seven links. Changed links reopen checks; confirm only what you rechecked.", "In the new builder use Templates → Import Draft .json. Compare subject, preheader, content and Desktop/Mobile previews. Return to the original profile and confirm its checklist and issue are intact. Record what matched; do not send the practice issue."]) tasks.append(node("li", "", text));
      recovery.append(tasks); card.append(recovery);
    }
    appendTestCases(card, step);
      card.append(node("p", "", `Manual check: ${step.check}`));
      appendGuideLinks(card, step);
      checksFor(step).forEach((check) => card.append(node("p", "", `${titleFor(check)}: ${checkApplies(check, progress.run.mode) ? checkLabels[checkOf(check.id)] : "Production only; not required for this rehearsal"}`)));
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
