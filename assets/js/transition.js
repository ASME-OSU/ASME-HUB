import { TRANSITION_CHECKS, TRANSITION_STEPS } from "./transition-steps.js";
import { emptyProgress, exportProgress, importProgress, parseProgress, reconcileProgress, storageKey, TRANSITION_CHECK_STATUSES, TRANSITION_STATUSES } from "./transition-state.js";

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
  let progress = emptyProgress(yearSelect.value);
  let currentIndex = 0;
  let opener = null;

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
    if (pending.length) return `Cannot continue: required manual ${pending.map((check) => `${check.id} (${checkLabels[checkOf(check.id)]})`).join(", ")} must be recorded as passed after checking the real systems.`;
    if (statusOf(step.id) !== "complete") return `Mark ${step.id} complete and confirm the officer-reported result before continuing.`;
    return "";
  }
  function readYear() {
    const year = yearSelect.value;
    try {
      const raw = localStorage.getItem(storageKey(year));
      progress = raw ? parseProgress(JSON.parse(raw), year, TRANSITION_STEPS, TRANSITION_CHECKS) : emptyProgress(year);
      say(raw ? "Progress loaded from this device. Reconfirm private evidence before activation." : "No local progress for this year yet.");
    } catch (error) {
      progress = emptyProgress(year);
      say(`Local progress could not be loaded: ${error.message} Existing saved data was not changed.`, true);
    }
    currentIndex = firstIncomplete();
    render();
  }
  function save(next, focusControl) {
    const candidate = { ...next, savedAt: new Date().toISOString() };
    try {
      localStorage.setItem(storageKey(candidate.year), JSON.stringify(candidate));
      progress = candidate;
      say("Saved on this device. This is an officer-marked status, not automated verification.");
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
    card.append(node("h4", "", "Manual confirmation"), node("p", "transition-manual-check", step.check));
    for (const check of checksFor(step)) {
      const label = node("label", "transition-check-control", `${check.id} · ${check.title}`);
      const select = node("select");
      select.dataset.transitionControl = check.id;
      select.setAttribute("aria-label", `${check.id} manual check: ${check.title}`);
      TRANSITION_CHECK_STATUSES.forEach((value) => select.add(new Option(checkLabels[value], value)));
      select.value = checkOf(check.id);
      select.addEventListener("change", () => {
        const value = select.value;
        const missing = unmet(step);
        if (value === "passed" && missing.length) {
          say(`Complete ${missing.join(", ")} before recording ${check.id} as passed.`, true);
          select.value = checkOf(check.id);
          return;
        }
        if (value === "passed" && !window.confirm(`Record ${check.id} as officer-reported Passed? Confirm the actual check and private evidence outside this device. This is not automated verification.`)) {
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
          say(missing.length ? `Complete ${missing.join(", ")} first.` : `Record manual ${pending.map((check) => check.id).join(", ")} as passed before marking ${step.id} complete.`, true);
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
      const imported = importProgress(await file.text(), yearSelect.value, TRANSITION_STEPS, TRANSITION_CHECKS);
      const candidate = { ...imported, savedAt: new Date().toISOString() };
      localStorage.setItem(storageKey(candidate.year), JSON.stringify(candidate));
      progress = candidate;
      currentIndex = firstIncomplete();
      render();
      say("Imported into this device. Reconfirm all private checks before any activation; imported status is not verification.");
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
      checksFor(step).forEach((check) => card.append(node("p", "", `${check.id} · ${check.title}: ${checkLabels[checkOf(check.id)]}`)));
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
  document.addEventListener("transition:year-updated", render);
  readYear();
}
