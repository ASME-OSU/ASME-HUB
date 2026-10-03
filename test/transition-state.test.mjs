import test from "node:test";
import assert from "node:assert/strict";
import { TRANSITION_CHECKS, TRANSITION_STEPS } from "../assets/js/transition-steps.js";
import { emptyProgress, exportProgress, importProgress, parseProgress, reconcileProgress, storageKey } from "../assets/js/transition-state.js";

const year = "2027-2028";
const read = (value, selected = year) => parseProgress(value, selected, TRANSITION_STEPS, TRANSITION_CHECKS);
const restore = (text, selected = year) => importProgress(text, selected, TRANSITION_STEPS, TRANSITION_CHECKS);

test("year keys isolate progress and export contains only bounded status data", () => {
  assert.notEqual(storageKey(year), storageKey("2028-2029"));
  const progress = { ...emptyProgress(year), savedAt: "2026-09-27T12:00:00.000Z", steps: { T01: "complete", T02: "blocked" } };
  const text = exportProgress(progress, TRANSITION_STEPS, TRANSITION_CHECKS);
  assert.deepEqual(restore(text).steps, progress.steps);
  assert.deepEqual(Object.keys(JSON.parse(text)).sort(), ["checks", "guideVersion", "kind", "savedAt", "steps", "version", "year"]);
  assert.throws(() => restore(text, "2028-2029"), /different transition year/);
});

test("malformed and incompatible imports are rejected without accepting partial state", () => {
  assert.throws(() => restore("{"), /valid JSON/);
  const base = JSON.parse(exportProgress(emptyProgress(year), TRANSITION_STEPS, TRANSITION_CHECKS));
  assert.throws(() => restore(JSON.stringify({ ...base, version: 2 })), /unsupported version/);
  assert.throws(() => restore(JSON.stringify({ ...base, guideVersion: "old" })), /different guide version/);
  assert.throws(() => restore(JSON.stringify({ ...base, steps: { T99: "complete" } })), /unknown step/);
  assert.throws(() => restore(JSON.stringify({ ...base, checks: { V02: "automatic_pass" } })), /unknown check/);
});

test("a completed step cannot bypass prerequisites or separate manual checks", () => {
  const base = emptyProgress(year);
  assert.throws(() => read({ ...base, steps: { T08: "complete" } }), /incomplete prerequisite/);
  assert.throws(() => read({ ...base, steps: { T01: "complete", T03: "complete" } }), /unchecked manual check/);
  assert.deepEqual(read({ ...base, steps: { T01: "complete", T03: "complete" }, checks: { V01: "passed" } }).steps,
    { T01: "complete", T03: "complete" });
});

test("revoking an upstream step invalidates dependent completion and passed checks", () => {
  const previous = {
    ...emptyProgress(year),
    steps: { T01: "complete", T02: "complete", T04: "complete" },
    checks: { V10: "passed" },
  };
  const changed = reconcileProgress({ ...previous, steps: { ...previous.steps, T01: "in_progress" } }, TRANSITION_STEPS, TRANSITION_CHECKS);
  assert.equal(changed.steps.T02, "in_progress");
  assert.equal(changed.steps.T04, "in_progress");
  assert.equal(changed.checks.V10, "needs_recheck");
  assert.equal(previous.checks.V10, "passed");
});

test("checks in drafted steps also become stale when prerequisites are reopened", () => {
  const progress = { ...emptyProgress(year), steps: { T01: "in_progress", T02: "in_progress" }, checks: { V10: "passed" } };
  assert.throws(() => read(progress), /incomplete prerequisite/);
  const repaired = reconcileProgress(progress, TRANSITION_STEPS, TRANSITION_CHECKS);
  assert.equal(repaired.checks.V10, "needs_recheck");
  assert.equal(read(repaired).checks.V10, "needs_recheck");
});

test("transition start years are constrained, consecutive, and support distant future years", async () => {
  const { transitionYear, transitionYearChoices, validTransitionYear } = await import("../assets/js/transition-state.js");
  assert.equal(transitionYear(2000), "2000-2001");
  assert.equal(transitionYear("2199"), "2199-2200");
  assert.equal(transitionYear("2050"), "2050-2051");
  for (const value of ["", 1999, 2200, "2027.5", "2027-2028", "2e3", "NaN"]) {
    assert.throws(() => transitionYear(value), /whole starting year/);
  }
  for (const value of ["1999-2000", "2200-2201", "2027-2029", "2027–2028", null]) {
    assert.equal(validTransitionYear(value), false);
    assert.throws(() => storageKey(value), /Invalid transition year/);
  }
  assert.deepEqual(transitionYearChoices(["2026-2027", "2035-2036", "bad"], ["2050-2051", "2035-2036"], "2026-2027"),
    ["2026-2027", "2027-2028", "2035-2036", "2050-2051"]);
  assert.deepEqual(transitionYearChoices([], [], "2199-2200"), ["2199-2200"]);
  const future = { ...emptyProgress("2050-2051"), steps: { T01: "complete" } };
  assert.deepEqual(restore(exportProgress(future, TRANSITION_STEPS, TRANSITION_CHECKS), "2050-2051"), future);
  assert.throws(() => read({ ...future, year: "2050-2051" }, "2027-2028"), /different transition year/);
});

test("known prior guide progress migrates visibly to recheck without losing blocked work", async () => {
  const { migrateProgress, TRANSITION_GUIDE_VERSION } = await import("../assets/js/transition-state.js");
  const old = {
    ...emptyProgress(year), guideVersion: "officer-transition-guide-2", savedAt: "2026-09-30T12:00:00.000Z",
    steps: { T01: "complete", T02: "complete", T03: "blocked", T04: "in_progress" }, checks: { V10: "passed", V01: "unable" },
  };
  const migrated = migrateProgress(old, year, TRANSITION_STEPS, TRANSITION_CHECKS);
  assert.equal(migrated.guideVersion, TRANSITION_GUIDE_VERSION);
  assert.deepEqual(migrated.steps, { T01: "in_progress", T02: "in_progress", T03: "blocked", T04: "in_progress" });
  assert.deepEqual(migrated.checks, { V10: "needs_recheck", V01: "unable" });
  assert.equal(old.steps.T01, "complete");
  assert.equal(old.checks.V10, "passed");
  assert.equal(migrated.savedAt, old.savedAt);
  assert.deepEqual(read(migrated), migrated);
  const imported = restore(JSON.stringify({ ...old, kind: "asme-officer-transition-progress" }));
  assert.deepEqual(imported, migrated);
  assert.throws(() => migrateProgress({ ...old, year: "2028-2029" }, year, TRANSITION_STEPS, TRANSITION_CHECKS), /different transition year/);
  assert.throws(() => migrateProgress({ ...old, steps: { T03: "complete" } }, year, TRANSITION_STEPS, TRANSITION_CHECKS), /incomplete prerequisite/);
  assert.throws(() => migrateProgress({ ...old, guideVersion: "unknown" }, year, TRANSITION_STEPS, TRANSITION_CHECKS), /different guide version/);
});

test("manual check questions and resource actions use meaningful officer language", () => {
  assert.equal(TRANSITION_STEPS.length, 16);
  for (const step of TRANSITION_STEPS) {
    assert.ok(step.action.length > 50);
    assert.ok(step.check.length > 40);
    assert.doesNotMatch(step.check, /\bV\d{2}\b|consumer|private evidence/);
  }
  for (const check of TRANSITION_CHECKS) {
    assert.ok(check.title.endsWith("?"));
    assert.doesNotMatch(check.title, /\bV\d{2}\b|effective access|consumer|synthetic/);
  }
  assert.equal(TRANSITION_STEPS.find((step) => step.id === "T03").resource, "templates");
  assert.match(TRANSITION_STEPS.find((step) => step.id === "T02").action, /ASME OSU chapter Google account/);
});


test("mock feedback revision invalidates guide 3 confirmations and preserves the source", async () => {
  const { migrateProgress } = await import("../assets/js/transition-state.js");
  const original = { ...emptyProgress(year), guideVersion: "officer-transition-guide-3", steps: { T01: "complete", T02: "complete", T03: "blocked" }, checks: { V10: "passed", V01: "unable" } };
  const migrated = migrateProgress(original, year, TRANSITION_STEPS, TRANSITION_CHECKS);
  assert.equal(migrated.guideVersion, "officer-transition-guide-4");
  assert.equal(migrated.steps.T01, "in_progress");
  assert.equal(migrated.checks.V10, "needs_recheck");
  assert.equal(migrated.steps.T03, "blocked");
  assert.equal(migrated.checks.V01, "unable");
  assert.equal(original.checks.V10, "passed");
  assert.deepEqual(restore(JSON.stringify({ ...original, kind: "asme-officer-transition-progress" })), migrated);
});
