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
