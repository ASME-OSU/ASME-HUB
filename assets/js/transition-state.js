export const TRANSITION_STATE_VERSION = 2;
// Changed meaning always reopens earlier confirmations.
export const TRANSITION_GUIDE_VERSION = "officer-transition-guide-14";
export const TRANSITION_PREVIOUS_GUIDE_VERSIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(version => `officer-transition-guide-${version}`);
export const TRANSITION_LEGACY_STORAGE_PREFIX = "asmeHubTransitionProgressV1:";
export const TRANSITION_STORAGE_PREFIX = "asmeHubTransitionProgressV2:";
export const TRANSITION_STATUSES = ["not_started", "in_progress", "blocked", "failed", "skipped", "complete"];
export const TRANSITION_CHECK_STATUSES = ["not_checked", "checking", "passed", "failed", "unable", "skipped", "needs_recheck"];
export const MAX_TRANSITION_PROGRESS_BYTES = 1_000_000;
export const MIN_TRANSITION_START_YEAR = 2000;
export const MAX_TRANSITION_START_YEAR = 2199;
const record = value => value && typeof value === "object" && !Array.isArray(value);
const runIdPattern = /^[A-Za-z0-9_-]{1,100}$/;
const validSavedAt = value => value === null || (typeof value === "string" && value.length <= 128 && !Number.isNaN(Date.parse(value)));

export function transitionYear(start) {
  const text = String(start).trim();
  if (!/^\d{4}$/.test(text) || Number(text) < MIN_TRANSITION_START_YEAR || Number(text) > MAX_TRANSITION_START_YEAR) throw new Error("Enter a whole starting year from 2000 through 2199.");
  return `${Number(text)}-${Number(text) + 1}`;
}
export function validTransitionYear(year) {
  return typeof year === "string" && /^\d{4}-\d{4}$/.test(year) && Number(year.slice(0, 4)) >= MIN_TRANSITION_START_YEAR && Number(year.slice(0, 4)) <= MAX_TRANSITION_START_YEAR && Number(year.slice(5)) === Number(year.slice(0, 4)) + 1;
}
export function transitionYearChoices(configured, saved, current) {
  const years = [...configured, ...saved].filter(validTransitionYear);
  if (validTransitionYear(current)) { years.push(current); if (Number(current.slice(0, 4)) < MAX_TRANSITION_START_YEAR) years.push(transitionYear(Number(current.slice(0, 4)) + 1)); }
  return [...new Set(years)].sort();
}
export function storageKey(year, runId = "legacy") {
  if (!validTransitionYear(year)) throw new Error("Invalid transition year.");
  if (typeof runId !== "string" || !runIdPattern.test(runId)) throw new Error("Invalid run identity.");
  return `${TRANSITION_STORAGE_PREFIX}${year}:${runId}`;
}
export function createTransitionRun(name, mode = "production", id = globalThis.crypto?.randomUUID?.() || `run-${Date.now()}-${Math.random().toString(36).slice(2)}`) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120 || !["rehearsal", "production"].includes(mode) || typeof id !== "string" || !runIdPattern.test(id)) throw new Error("Give the run a name (up to 120 characters) and choose rehearsal or production.");
  return { id, name: name.trim(), mode };
}
export function emptyProgress(year, run = createTransitionRun(`Legacy preparation ${year}`, "rehearsal", "legacy")) {
  storageKey(year, run.id);
  return { version: TRANSITION_STATE_VERSION, guideVersion: TRANSITION_GUIDE_VERSION, year, run: createTransitionRun(run.name, run.mode, run.id), savedAt: null, steps: {}, checks: {}, reasons: {}, notes: {} };
}
export function checkApplies(check, mode) {
  return !check.modes || check.modes.includes(mode);
}
export function rehearsalEligibility(progress, steps, checks) {
  const missing = steps.filter(step => !step.launch && progress.steps[step.id] !== "complete").map(step => step.id);
  const unchecked = checks.filter(check => checkApplies(check, "rehearsal") && progress.checks[check.id] !== "passed").map(check => check.id);
  const closed = progress.steps.T05 === "skipped" && Boolean(progress.reasons.T05?.trim());
  const eligible = progress.run?.mode === "rehearsal" && !missing.length && !unchecked.length && closed;
  return { eligible, missing, unchecked, closed, reason: eligible ? "GO — private rehearsal complete. Required practice checks, cleanup and reviewer acceptance are reported passed. Production activation remains excluded." : "Private rehearsal not complete. Finish the practice checks, cleanup and reviewer acceptance, then record activation as skipped for rehearsal." };
}
export function launchEligibility(progress, steps, checks) {
  const missing = steps.filter(step => !step.launch && progress.steps[step.id] !== "complete").map(step => step.id);
  const unchecked = checks.filter(check => checkApplies(check, "production") && progress.checks[check.id] !== "passed").map(check => check.id);
  const eligible = progress.run?.mode === "production" && !missing.length && !unchecked.length;
  return { eligible, missing, unchecked, reason: eligible ? "Required production checks are reported passed. Coordinator approval and current private evidence are still required before launch." : progress.run?.mode !== "production" ? "NO-GO: rehearsal evidence never authorizes a production launch. Create a separate production run and perform the real checks." : `NO-GO: ${missing.length} prerequisite ${missing.length === 1 ? "step" : "steps"} and ${unchecked.length} ${unchecked.length === 1 ? "review" : "reviews"} remain. Use Reviews still needed below.` };
}
export function progressSummary(progress, steps, checks) {
  const stepCounts = Object.fromEntries(TRANSITION_STATUSES.map(status => [status, steps.filter(step => (progress.steps[step.id] || "not_started") === status).length]));
  const checkCounts = Object.fromEntries(TRANSITION_CHECK_STATUSES.map(status => [status, checks.filter(check => checkApplies(check, progress.run?.mode) && (progress.checks[check.id] || "not_checked") === status).length]));
  const disposed = stepCounts.complete + stepCounts.skipped + stepCounts.failed + stepCounts.blocked;
  // A disposition is a recorded decision, not evidence that closeout succeeded.
  // Rehearsals may skip activation, but cleanup and incoming acceptance still need
  // their own passed observations before the record can be called finished.
  const rehearsal = rehearsalEligibility(progress, steps, checks);
  const launch = launchEligibility(progress, steps, checks);
  const finished = progress.run?.mode === "rehearsal" ? rehearsal.eligible : progress.steps.T05 === "complete" && launch.eligible;
  const applicableChecks = checks.filter(check => checkApplies(check, progress.run?.mode));
  // Practice closes activation by recording a reasoned skip after every review passes.
  const completedSteps = stepCounts.complete + (rehearsal.eligible ? 1 : 0);
  const totalItems = steps.length + applicableChecks.length;
  const completedItems = completedSteps + checkCounts.passed;
  return { stepCounts, checkCounts, disposed, finished, rehearsal, launch, completedSteps, completedItems, totalItems, totalChecks: applicableChecks.length };
}
export function parseProgress(value, year, steps, checks) {
  storageKey(year);
  if (!record(value) || value.version !== TRANSITION_STATE_VERSION) throw new Error("This progress file uses an unsupported version or format.");
  if (value.year !== year) throw new Error("This file belongs to a different transition year.");
  if (value.guideVersion !== TRANSITION_GUIDE_VERSION) throw new Error("This progress file belongs to a different guide version.");
  if (!record(value.run) || typeof value.run.id !== "string" || typeof value.run.name !== "string" || !["rehearsal", "production"].includes(value.run.mode)) throw new Error("This progress file has no valid run identity.");
  const run = createTransitionRun(value.run.name, value.run.mode, value.run.id);
  const next = emptyProgress(year, run);
  for (const [field, definitions, statuses] of [["steps", steps, TRANSITION_STATUSES], ["checks", checks, TRANSITION_CHECK_STATUSES]]) {
    if (!record(value[field])) throw new Error(`This progress file has no valid ${field}.`);
    const allowed = new Set(definitions.map(item => item.id));
    for (const [id, status] of Object.entries(value[field])) {
      if (!allowed.has(id) || !statuses.includes(status)) throw new Error(`This progress file contains an unknown ${field === "steps" ? "step" : "check"} or status.`);
      if (status !== statuses[0]) next[field][id] = status;
    }
  }
  const ids = new Set([...steps, ...checks].map(item => item.id));
  for (const field of ["reasons", "notes"]) {
    if (!record(value[field])) throw new Error(`This progress file has no valid ${field}.`);
    for (const [id, text] of Object.entries(value[field])) {
      if (!ids.has(id) || typeof text !== "string" || text.length > 2000) throw new Error(`This progress file contains invalid ${field}.`);
      if (text.trim()) next[field][id] = text.trim();
    }
  }
  for (const [id, status] of [...Object.entries(next.steps), ...Object.entries(next.checks)]) if (status === "skipped" && !next.reasons[id]) throw new Error(`Skipped ${id} needs a reason.`);
  for (const step of steps) if (next.steps[step.id] === "complete" && checks.some(check => check.step === step.id && checkApplies(check, next.run.mode) && next.checks[check.id] !== "passed")) throw new Error(`Completed ${step.id} has an unchecked manual check.`);
  if (next.steps.T05 === "complete" && !launchEligibility(next, steps, checks).eligible) throw new Error("Completed T05 has incomplete production prerequisites or belongs to a rehearsal.");
  if (!validSavedAt(value.savedAt)) throw new Error("This progress file has an invalid save time.");
  next.savedAt = value.savedAt;
  return next;
}
export function migrateProgress(value, year, steps, checks) {
  if (value?.guideVersion === TRANSITION_GUIDE_VERSION) return parseProgress(value, year, steps, checks);
  if ([9, 10, 11, 12, 13].some(version => value?.guideVersion === `officer-transition-guide-${version}`)) {
    // These named-run guides require all four maps. Spreading a missing or
    // malformed map below would silently turn damaged evidence into {}.
    for (const field of ["steps", "checks", "reasons", "notes"]) if (!record(value[field])) throw new Error(`This progress file has no valid ${field}.`);
  }
  if (value?.guideVersion === "officer-transition-guide-13") {
    const candidate = { ...value, guideVersion: TRANSITION_GUIDE_VERSION, steps: { ...value.steps }, checks: { ...value.checks }, reasons: { ...value.reasons }, notes: { ...value.notes } };
    // These checks now use the officer's own observations and the managed
    // connection workflow. Keep all unrelated results and every evidence note.
    const changed = ["V01", "V10", "V19", "V20", "V22", ...(value.run?.mode === "rehearsal" ? ["V17"] : [])];
    for (const id of changed) if (candidate.checks[id] && candidate.checks[id] !== "not_checked") candidate.checks[id] = "needs_recheck";
    for (const step of steps) if (candidate.steps[step.id] === "complete" && checks.some(check => check.step === step.id && checkApplies(check, candidate.run?.mode) && candidate.checks[check.id] !== "passed")) candidate.steps[step.id] = "in_progress";
    if (value.run?.mode === "rehearsal" && candidate.steps.T05 === "skipped" && candidate.checks.V17 === "needs_recheck") candidate.steps.T05 = "in_progress";
    if (candidate.steps.T05 === "complete" && !launchEligibility(candidate, steps, checks).eligible) candidate.steps.T05 = "in_progress";
    return reconcileProgress(parseProgress(candidate, year, steps, checks), steps, checks);
  }
  if (value?.guideVersion === "officer-transition-guide-12") {
    const candidate = { ...value, guideVersion: "officer-transition-guide-13", steps: { ...value.steps }, checks: { ...value.checks }, reasons: { ...value.reasons }, notes: { ...value.notes } };
    if (candidate.checks.V19 === "passed") candidate.checks.V19 = "needs_recheck";
    for (const id of ["T03", "T05"]) if (candidate.steps[id] === "complete") candidate.steps[id] = "in_progress";
    return migrateProgress(candidate, year, steps, checks);
  }
  if (value?.guideVersion === "officer-transition-guide-11") {
    const candidate = { ...value, guideVersion: "officer-transition-guide-12", steps: { ...value.steps }, checks: { ...value.checks }, reasons: { ...value.reasons }, notes: { ...value.notes } };
    if (candidate.checks.V10 === "passed") candidate.checks.V10 = "needs_recheck";
    for (const id of ["T03","T05"]) if (candidate.steps[id] === "complete") candidate.steps[id] = "in_progress";
    return migrateProgress(candidate, year, steps, checks);
  }
  if (["officer-transition-guide-9", "officer-transition-guide-10"].includes(value?.guideVersion)) {
    // Keep historical observations and mode; changed production criteria need
    // fresh review. Practice criteria and private evidence are unchanged.
    const candidate = { ...value, guideVersion: TRANSITION_GUIDE_VERSION, steps: { ...value.steps }, checks: { ...value.checks }, reasons: { ...value.reasons }, notes: { ...value.notes } };
    if (value.run?.mode === "production") {
      const changed = value.guideVersion === "officer-transition-guide-9" ? ["V16", "V22", "V19"] : ["V19"];
      for (const id of changed) if (candidate.checks[id] === "passed") candidate.checks[id] = "needs_recheck";
      for (const id of value.guideVersion === "officer-transition-guide-9" ? ["T02", "T04", "T05"] : ["T02", "T05"]) if (candidate.steps[id] === "complete") candidate.steps[id] = "in_progress";
    }
    candidate.guideVersion = "officer-transition-guide-11";
    return migrateProgress(candidate, year, steps, checks);
  }
  if (![1, TRANSITION_STATE_VERSION].includes(value?.version) || !TRANSITION_PREVIOUS_GUIDE_VERSIONS.includes(value?.guideVersion)) throw new Error("This progress file uses an unsupported version or guide.");
  if(value.year!==year)throw new Error('This file belongs to a different transition year.');
  const isFiveStepGuide = ['officer-transition-guide-7','officer-transition-guide-8'].includes(value.guideVersion);
  if (isFiveStepGuide && value.version !== TRANSITION_STATE_VERSION) throw new Error('Invalid guide 7 state version.');
  const oldSteps=new Set(Array.from({length:isFiveStepGuide?5:16},(_,i)=>'T'+String(i+1).padStart(2,'0')));
  const oldChecks=new Set(Array.from({length:value.guideVersion === 'officer-transition-guide-8' ? 26 : 10},(_,i)=>'V'+String(i+1).padStart(2,'0')));
  for(const [field,allowed,statuses] of [['steps',oldSteps,TRANSITION_STATUSES],['checks',oldChecks,TRANSITION_CHECK_STATUSES]]) {
    if(!record(value[field]))throw new Error('Invalid legacy '+field);
    for(const [id,status] of Object.entries(value[field]))if(!allowed.has(id)||!statuses.includes(status))throw new Error('Unknown '+(field==='checks'?'check':'step')+' or status.');
  }
  for (const field of ['reasons', 'notes']) {
    // Early year-only records did not have evidence fields; named runs did.
    if (value[field] === undefined && value.version === 1) continue;
    if (!record(value[field])) throw new Error('Invalid legacy evidence.');
    for (const [id, text] of Object.entries(value[field])) if ((!oldSteps.has(id) && !oldChecks.has(id)) || typeof text !== 'string' || text.length > 2000) throw new Error('Invalid legacy evidence.');
  }
  if (value.version === TRANSITION_STATE_VERSION && (!record(value.run) || typeof value.run.id !== 'string' || typeof value.run.name !== 'string' || !['rehearsal', 'production'].includes(value.run.mode))) throw new Error('Invalid legacy run identity.');
  if (!validSavedAt(value.savedAt)) throw new Error('Invalid legacy save time.');
  for (const [id, status] of [...Object.entries(value.steps), ...Object.entries(value.checks)]) if (status === 'skipped' && !value.reasons?.[id]?.trim()) throw new Error(`Skipped ${id} needs a reason.`);
  const base = value.version === 1 ? emptyProgress(year) : emptyProgress(year, value.run);
  const groups = isFiveStepGuide
    ? {T01:['T01'],T02:['T02'],T03:['T03'],T04:['T04'],T05:['T05']}
    : {T01:['T01','T02'],T02:['T03','T04','T05','T06','T07','T09','T10'],T03:['T08'],T04:['T11','T12','T13'],T05:['T14','T15','T16']};
  const candidate = { ...base, savedAt: value.savedAt, checks: {}, steps: {}, reasons: {}, notes: {} };
  for (const [id, oldIds] of Object.entries(groups)) {
    if (oldIds.some(old => value.steps?.[old] && value.steps[old] !== 'not_started')) candidate.steps[id] = 'in_progress';
    const history = oldIds.filter(old => value.steps?.[old] || value.notes?.[old] || value.reasons?.[old]).map(old => `${old}: ${value.steps?.[old] || 'not_started'}; ${value.reasons?.[old] || ''} ${value.notes?.[old] || ''}`).join('\n');
    if(history)candidate.notes[id] = (`Earlier ${isFiveStepGuide?'five':'sixteen'}-step evidence requires recheck. Original record retained separately.\n`+history).slice(0,2000);
  }
  for(const check of checks) {
    if (!oldChecks.has(check.id)) continue; // New observations never inherit an old combined result.
    const status=value.checks?.[check.id];
    if(status) candidate.checks[check.id]=status==='passed'?'needs_recheck':status;
    if(value.reasons?.[check.id])candidate.reasons[check.id]=value.reasons[check.id];
    if (status || value.notes?.[check.id]) candidate.notes[check.id] =
      (`Earlier ${check.id}: ${status || 'not_checked'}; ${value.notes?.[check.id] || ''}`).slice(0, 2000);
  }
  // Validate old status data before reopening completion; old runs cannot grant production readiness.
  for (const [id, status] of Object.entries(candidate.steps || {})) if (status === "complete") candidate.steps = { ...candidate.steps, [id]: "in_progress" };
  for (const [id, status] of Object.entries(candidate.checks || {})) if (status === "passed") candidate.checks = { ...candidate.checks, [id]: "needs_recheck" };
  return parseProgress(candidate, year, steps, checks);
}
export function exportProgress(progress, steps, checks) { return JSON.stringify({ kind: "asme-officer-transition-progress", ...parseProgress(progress, progress.year, steps, checks) }, null, 2); }
export function importProgress(text, year, steps, checks) {
  // A valid export can contain a 2,000-character note and reason for every
  // step and review. JSON escaping can expand each character to six bytes.
  if (typeof text !== "string" || text.length > MAX_TRANSITION_PROGRESS_BYTES || new TextEncoder().encode(text).length > MAX_TRANSITION_PROGRESS_BYTES) throw new Error("Progress files must be at most 1 MB.");
  let value; try { value = JSON.parse(text); } catch { throw new Error("Choose a valid JSON progress file."); }
  if (value?.kind !== "asme-officer-transition-progress") throw new Error("This is not an ASME transition progress file.");
  const next = migrateProgress(value, year, steps, checks);
  // Imported production observations must be reconfirmed on this device; no import grants launch.
  if (next.run.mode === "production") {
    for (const id of Object.keys(next.steps)) if (next.steps[id] === "complete") next.steps[id] = "in_progress";
    for (const id of Object.keys(next.checks)) if (next.checks[id] === "passed") next.checks[id] = "needs_recheck";
  }
  return next;
}
export function reconcileProgress(progress, steps, checks, previous = null) {
  const next = { ...progress, steps: { ...progress.steps }, checks: { ...progress.checks } };
  // A changed review can reopen its step just as an explicit step-status change
  // does. Identify that before propagating invalidation to dependent reviews.
  for (const step of steps) if (next.steps[step.id] === "complete" && checks.some(check => check.step === step.id && checkApplies(check, next.run.mode) && next.checks[check.id] !== "passed")) next.steps[step.id] = "in_progress";
  const invalidated = new Set(previous ? steps.filter(step => previous.steps[step.id] === "complete" && next.steps[step.id] !== "complete").map(step => step.id) : []);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of steps) if (!invalidated.has(step.id) && step.needs.some(id => invalidated.has(id))) { invalidated.add(step.id); changed = true; }
  }
  for (const step of steps) {
    if (invalidated.has(step.id)) {
      if (next.steps[step.id] === "complete") next.steps[step.id] = "in_progress";
      for (const check of checks.filter(item => item.step === step.id)) if (next.checks[check.id] === "passed") next.checks[check.id] = "needs_recheck";
    }
    if (next.steps[step.id] === "complete" && checks.some(check => check.step === step.id && checkApplies(check, next.run.mode) && next.checks[check.id] !== "passed")) next.steps[step.id] = "in_progress";
  }
  if (next.steps.T05 === "complete" && !launchEligibility(next, steps, checks).eligible) next.steps.T05 = "in_progress";
  return next;
}
