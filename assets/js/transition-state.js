export const TRANSITION_STATE_VERSION = 1;
// Bump when step/check meaning changes so old completion is never silently reused.
export const TRANSITION_GUIDE_VERSION = "officer-transition-guide-2";
export const TRANSITION_STORAGE_PREFIX = "asmeHubTransitionProgressV1:";
export const TRANSITION_STATUSES = ["not_started", "in_progress", "blocked", "complete"];
export const TRANSITION_CHECK_STATUSES = ["not_checked", "checking", "passed", "failed", "unable", "needs_recheck"];

export function emptyProgress(year) {
  return { version: TRANSITION_STATE_VERSION, guideVersion: TRANSITION_GUIDE_VERSION, year, savedAt: null, steps: {}, checks: {} };
}

export function storageKey(year) {
  if (!/^\d{4}-(\d{4})$/.test(year) || Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1) {
    throw new Error("Invalid transition year.");
  }
  return `${TRANSITION_STORAGE_PREFIX}${year}`;
}

export function parseProgress(value, year, steps, checks) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== TRANSITION_STATE_VERSION) {
    throw new Error("This progress file uses an unsupported version or format.");
  }
  if (value.year !== year) throw new Error("This file belongs to a different transition year.");
  if (value.guideVersion !== TRANSITION_GUIDE_VERSION) throw new Error("This progress file belongs to a different guide version. Review the guide and start fresh for this version.");
  if (!value.steps || typeof value.steps !== "object" || Array.isArray(value.steps)) {
    throw new Error("This progress file has no valid steps.");
  }
  if (!value.checks || typeof value.checks !== "object" || Array.isArray(value.checks)) {
    throw new Error("This progress file has no valid manual checks.");
  }
  const allowed = new Set(steps.map((step) => step.id));
  const allowedChecks = new Set(checks.map((check) => check.id));
  const checkState = {};
  for (const [id, status] of Object.entries(value.checks)) {
    if (!allowedChecks.has(id) || !TRANSITION_CHECK_STATUSES.includes(status)) {
      throw new Error("This progress file contains an unknown check or check status.");
    }
    if (status !== "not_checked") checkState[id] = status;
  }
  const stepState = {};
  for (const [id, status] of Object.entries(value.steps)) {
    if (!allowed.has(id) || !TRANSITION_STATUSES.includes(status)) {
      throw new Error("This progress file contains an unknown step or status.");
    }
    if (status !== "not_started") stepState[id] = status;
  }
  for (const step of steps) {
    if (step.needs.some((id) => stepState[id] !== "complete") &&
      checks.some((check) => check.step === step.id && checkState[check.id] === "passed")) {
      throw new Error(`Passed check for ${step.id} has an incomplete prerequisite.`);
    }
    if (stepState[step.id] !== "complete") continue;
    if (step.needs.some((id) => stepState[id] !== "complete")) {
      throw new Error(`Completed ${step.id} has an incomplete prerequisite.`);
    }
    if (checks.some((check) => check.step === step.id && checkState[check.id] !== "passed")) {
      throw new Error(`Completed ${step.id} has an unchecked manual check.`);
    }
  }
  return {
    version: TRANSITION_STATE_VERSION,
    guideVersion: TRANSITION_GUIDE_VERSION,
    year,
    savedAt: typeof value.savedAt === "string" && !Number.isNaN(Date.parse(value.savedAt)) ? value.savedAt : null,
    steps: stepState,
    checks: checkState,
  };
}

export function exportProgress(progress, steps, checks) {
  const checked = parseProgress(progress, progress.year, steps, checks);
  return JSON.stringify({
    kind: "asme-officer-transition-progress",
    version: checked.version,
    guideVersion: checked.guideVersion,
    year: checked.year,
    savedAt: checked.savedAt,
    steps: checked.steps,
    checks: checked.checks,
  }, null, 2);
}

export function importProgress(text, year, steps, checks) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error("Choose a valid JSON progress file."); }
  if (value?.kind !== "asme-officer-transition-progress") throw new Error("This is not an ASME transition progress file.");
  return parseProgress(value, year, steps, checks);
}

export function reconcileProgress(progress, steps, checks) {
  const next = { ...progress, steps: { ...progress.steps }, checks: { ...progress.checks } };
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of steps) {
      if (step.needs.some((id) => next.steps[id] !== "complete")) {
        for (const check of checks.filter((item) => item.step === step.id)) {
          if (next.checks[check.id] === "passed") {
            next.checks[check.id] = "needs_recheck";
            changed = true;
          }
        }
      }
      if (next.steps[step.id] !== "complete") continue;
      if (step.needs.some((id) => next.steps[id] !== "complete") ||
        checks.some((check) => check.step === step.id && next.checks[check.id] !== "passed")) {
        next.steps[step.id] = "in_progress";
        for (const check of checks.filter((item) => item.step === step.id)) {
          if (next.checks[check.id] === "passed") next.checks[check.id] = "needs_recheck";
        }
        changed = true;
      }
    }
  }
  return next;
}
