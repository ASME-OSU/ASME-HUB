export const TRANSITION_STATE_VERSION = 2;
// Changed meaning always reopens earlier confirmations.
export const TRANSITION_GUIDE_VERSION = "officer-transition-guide-7";
export const TRANSITION_PREVIOUS_GUIDE_VERSIONS = [2, 3, 4, 5, 6].map(version => `officer-transition-guide-${version}`);
export const TRANSITION_LEGACY_STORAGE_PREFIX = "asmeHubTransitionProgressV1:";
export const TRANSITION_STORAGE_PREFIX = "asmeHubTransitionProgressV2:";
export const TRANSITION_STATUSES = ["not_started", "in_progress", "blocked", "failed", "skipped", "complete"];
export const TRANSITION_CHECK_STATUSES = ["not_checked", "checking", "passed", "failed", "unable", "skipped", "needs_recheck"];
export const MIN_TRANSITION_START_YEAR = 2000;
export const MAX_TRANSITION_START_YEAR = 2199;
const record = value => value && typeof value === "object" && !Array.isArray(value);
const runIdPattern = /^[A-Za-z0-9_-]{1,100}$/;

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
export function createTransitionRun(name, mode = "rehearsal", id = globalThis.crypto?.randomUUID?.() || `run-${Date.now()}-${Math.random().toString(36).slice(2)}`) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120 || !["rehearsal", "production"].includes(mode) || typeof id !== "string" || !runIdPattern.test(id)) throw new Error("Give the run a name (up to 120 characters) and choose rehearsal or production.");
  return { id, name: name.trim(), mode };
}
export function emptyProgress(year, run = createTransitionRun(`Legacy preparation ${year}`, "rehearsal", "legacy")) {
  storageKey(year, run.id);
  return { version: TRANSITION_STATE_VERSION, guideVersion: TRANSITION_GUIDE_VERSION, year, run: createTransitionRun(run.name, run.mode, run.id), savedAt: null, steps: {}, checks: {}, reasons: {}, notes: {} };
}
export function launchEligibility(progress, steps, checks) {
  const missing = steps.filter(step => !step.launch && progress.steps[step.id] !== "complete").map(step => step.id);
  const unchecked = checks.filter(check => progress.checks[check.id] !== "passed").map(check => check.id);
  const eligible = progress.run?.mode === "production" && !missing.length && !unchecked.length;
  return { eligible, missing, unchecked, reason: eligible ? "Required production checks are reported passed. Coordinator approval and current private evidence are still required before launch." : progress.run?.mode !== "production" ? "NO-GO: rehearsal evidence never authorizes a production launch. Create a separate production run and perform the real checks." : `NO-GO: production prerequisites need completion${missing.length ? ` (${missing.join(", ")})` : ""}${unchecked.length ? `; manual checks need to pass (${unchecked.join(", ")})` : ""}.` };
}
export function progressSummary(progress, steps, checks) {
  const stepCounts = Object.fromEntries(TRANSITION_STATUSES.map(status => [status, steps.filter(step => (progress.steps[step.id] || "not_started") === status).length]));
  const checkCounts = Object.fromEntries(TRANSITION_CHECK_STATUSES.map(status => [status, checks.filter(check => (progress.checks[check.id] || "not_checked") === status).length]));
  const disposed = stepCounts.complete + stepCounts.skipped + stepCounts.failed + stepCounts.blocked;
  return { stepCounts, checkCounts, disposed, finished: disposed === steps.length, launch: launchEligibility(progress, steps, checks) };
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
  for (const step of steps) if (next.steps[step.id] === "complete" && checks.some(check => check.step === step.id && next.checks[check.id] !== "passed")) throw new Error(`Completed ${step.id} has an unchecked manual check.`);
  if (next.steps.T05 === "complete" && !launchEligibility(next, steps, checks).eligible) throw new Error("Completed T05 has incomplete production prerequisites or belongs to a rehearsal.");
  if (value.savedAt !== null && (typeof value.savedAt !== "string" || Number.isNaN(Date.parse(value.savedAt)))) throw new Error("This progress file has an invalid save time.");
  next.savedAt = value.savedAt;
  return next;
}
export function migrateProgress(value, year, steps, checks) {
  if (!TRANSITION_PREVIOUS_GUIDE_VERSIONS.includes(value?.guideVersion) && value?.version !== 1) return parseProgress(value, year, steps, checks);
  if (![1, TRANSITION_STATE_VERSION].includes(value?.version) || !TRANSITION_PREVIOUS_GUIDE_VERSIONS.includes(value?.guideVersion)) throw new Error("This progress file uses an unsupported version or guide.");
  if(value.year!==year)throw new Error('This file belongs to a different transition year.');
  const oldSteps=new Set(Array.from({length:16},(_,i)=>'T'+String(i+1).padStart(2,'0'))), oldChecks=new Set(checks.map(c=>c.id));
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
  if (value.savedAt !== null && (typeof value.savedAt !== 'string' || Number.isNaN(Date.parse(value.savedAt)))) throw new Error('Invalid legacy save time.');
  for (const [id, status] of [...Object.entries(value.steps), ...Object.entries(value.checks)]) if (status === 'skipped' && !value.reasons?.[id]?.trim()) throw new Error(`Skipped ${id} needs a reason.`);
  const base = value.version === 1 ? emptyProgress(year) : emptyProgress(year, value.run);
  const groups = {T01:['T01','T02'],T02:['T03','T04','T05','T06','T07','T09','T10'],T03:['T08'],T04:['T11','T12','T13'],T05:['T14','T15','T16']};
  const candidate = { ...base, savedAt: value.savedAt, checks: {}, steps: {}, reasons: {}, notes: {} };
  for (const [id, oldIds] of Object.entries(groups)) {
    if (oldIds.some(old => value.steps?.[old] && value.steps[old] !== 'not_started')) candidate.steps[id] = 'in_progress';
    const history = oldIds.filter(old => value.steps?.[old] || value.notes?.[old] || value.reasons?.[old]).map(old => `${old}: ${value.steps?.[old] || 'not_started'}; ${value.reasons?.[old] || ''} ${value.notes?.[old] || ''}`).join('\n');
    if(history)candidate.notes[id] = ('Earlier 16-step evidence requires recheck. Original record retained separately.\n'+history).slice(0,2000);
  }
  for(const check of checks) {
    const status=value.checks?.[check.id];
    if(status) candidate.checks[check.id]=status==='passed'?'needs_recheck':status;
    if(value.reasons?.[check.id])candidate.reasons[check.id]=value.reasons[check.id];
    if(value.notes?.[check.id])candidate.notes[check.id]=value.notes[check.id];
  }
  // Validate old status data before reopening completion; old runs cannot grant production readiness.
  for (const [id, status] of Object.entries(candidate.steps || {})) if (status === "complete") candidate.steps = { ...candidate.steps, [id]: "in_progress" };
  for (const [id, status] of Object.entries(candidate.checks || {})) if (status === "passed") candidate.checks = { ...candidate.checks, [id]: "needs_recheck" };
  return parseProgress(candidate, year, steps, checks);
}
export function exportProgress(progress, steps, checks) { return JSON.stringify({ kind: "asme-officer-transition-progress", ...parseProgress(progress, progress.year, steps, checks) }, null, 2); }
export function importProgress(text, year, steps, checks) {
  if (typeof text !== "string" || text.length > 100_000) throw new Error("Progress files must be under 100 KB.");
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
    if (next.steps[step.id] === "complete" && checks.some(check => check.step === step.id && next.checks[check.id] !== "passed")) next.steps[step.id] = "in_progress";
  }
  if (next.steps.T05 === "complete" && !launchEligibility(next, steps, checks).eligible) next.steps.T05 = "in_progress";
  return next;
}
