import test from "node:test";
import assert from "node:assert/strict";
import { ANNUAL_HANDOFF_TYPE, annualLinkStorageKey, googleAnnualLink, validateAnnualLinkDraft, importAnnualLinkDraft, annualSettingsDraft, reopenAnnualChecks } from "../assets/js/annual-link-draft.js";
import { reconcileProgress, emptyProgress, parseProgress } from "../assets/js/transition-state.js";
import { TRANSITION_STEPS, TRANSITION_CHECKS } from "../assets/js/transition-steps.js";

const year = "2027-2028";
const id = "annual_points_1234567890123456";
const sheet = (value) => `https://docs.google.com/spreadsheets/d/${value}/edit`;
const handoff = (links = {}) => ({ schema: 1, type: ANNUAL_HANDOFF_TYPE, year, links });

test("strict Google resource types, editor and actual respondent URLs", () => {
  assert.equal(googleAnnualLink("pointsMaster", id), sheet(id));
  assert.equal(googleAnnualLink("pointsMaster", sheet(id) + "?usp=sharing#gid=3"), sheet(id));
  assert.equal(googleAnnualLink("attendanceFormRespondent", `https://docs.google.com/forms/d/e/${id}/viewform`), `https://docs.google.com/forms/d/e/${id}/viewform`);
  for (const url of ["https://docs.google.com.evil.test/spreadsheets/d/" + id + "/edit", "http://docs.google.com/spreadsheets/d/" + id + "/edit", "https://user@docs.google.com/spreadsheets/d/" + id + "/edit", `https://docs.google.com/forms/d/${id}/edit`, "javascript:alert(1)", "https://docs.google.com/spreadsheets/d/short/edit", `https://docs.google.com/spreadsheets/d/${id}/export`]) {
    assert.throws(() => googleAnnualLink("pointsMaster", url));
  }
  assert.throws(() => googleAnnualLink("attendanceFormRespondent", `https://docs.google.com/forms/d/${id}/edit`));
  assert.throws(() => googleAnnualLink("attendanceFormEditor", `https://docs.google.com/forms/d/e/${id}/viewform`));
  assert.throws(() => googleAnnualLink("annualFolder", sheet(id)));
});

test("imports reject mismatched schema/type/year, malformed values and unknown fields", () => {
  for (const value of [null, [], { ...handoff(), schema: 2 }, { ...handoff(), type: "copy-result" }, { ...handoff(), year: "2028-2029" }, handoff({ pointsMaster: { url: sheet(id) } }), handoff({ secret: "text" })]) {
    assert.throws(() => importAnnualLinkDraft(JSON.stringify(value), year));
  }
  assert.throws(() => importAnnualLinkDraft("{bad", year));
  assert.throws(() => importAnnualLinkDraft(" ".repeat(100001), year));
  assert.throws(() => annualLinkStorageKey("2027-2029"));
});

test("rejects source/template copies and conflicting annual file identity", () => {
  const config = { templates: { sources: { pointsMaster: { editUrl: sheet(id) } } } };
  assert.throws(() => validateAnnualLinkDraft(handoff({ pointsExport: sheet(id) }), year, config), /template/);
  assert.throws(() => validateAnnualLinkDraft(handoff({ pointsMaster: sheet(id), pointsExport: sheet(id) }), year), /distinct/);
  const form = `https://docs.google.com/forms/d/${id}`;
  assert.doesNotThrow(() => validateAnnualLinkDraft(handoff({ attendanceFormEditor: form + "/edit", attendanceFormRespondent: form + "/viewform" }), year));
});

test("per-year persistence round trip is separate from existing progress, no readiness claims survive", () => {
  const original = { ...handoff({ pointsMaster: id }), checks: { V02: "passed" }, isActive: true, isCurrent: true, ownerVerified: true };
  const saved = validateAnnualLinkDraft(original, year);
  assert.deepEqual(importAnnualLinkDraft(JSON.stringify(saved), year), saved);
  assert.equal(saved.checks, undefined);
  assert.equal(saved.ownerVerified, undefined);
  assert.notEqual(annualLinkStorageKey(year), annualLinkStorageKey("2028-2029"));
  assert.match(annualLinkStorageKey(year), /^asmeHubAnnualLinksV1:/);
  assert.throws(() => importAnnualLinkDraft(JSON.stringify({ version: 1, guideVersion: "officer-transition-guide-3", year, steps: {}, checks: {} }), year));
});

test("settings mapping excludes private-only fields and stays inactive/noncurrent", () => {
  const links = { pointsMaster: id, pointsExport: "annual_export_1234567890123456", budgetTracker: "annual_budget_1234567890123456", budgetExport: "budget_export_1234567890123456", annualFolder: `https://drive.google.com/drive/folders/annual_folder_1234567890123456`, attendanceFormEditor: `https://docs.google.com/forms/d/annual_form_123456789012345678/edit` };
  const draft = annualSettingsDraft(handoff(links));
  assert.equal(draft.attendanceSheetUrl, sheet(links.pointsExport));
  assert.equal(draft.pointsMasterUrl, sheet(id));
  assert.equal(draft.attendanceFormUrl, "");
  assert.equal(draft.isActive, false);
  assert.equal(draft.isCurrent, false);
  assert.equal(draft.annualFolder, undefined);
  assert.equal(draft.attendanceFormEditor, undefined);
  assert.throws(() => annualSettingsDraft(handoff(links), { currentAcademicYear: year }), /current Hub year/);
  assert.throws(() => annualSettingsDraft(handoff(links), { dataSources: { [year]: { isCurrent: true } } }), /current Hub year/);
});

const completedProgress = () => ({ ...emptyProgress(year), steps: Object.fromEntries(TRANSITION_STEPS.map(({ id }) => [id, "complete"])), checks: Object.fromEntries(TRANSITION_CHECKS.map(({ id }) => [id, "passed"])) });

test("first Points link preserves earlier access and annual-folder progress", () => {
  const prior = completedProgress();
  const next = reconcileProgress(reopenAnnualChecks(prior, ["pointsMaster"], {}), TRANSITION_STEPS, TRANSITION_CHECKS);
  assert.equal(next.steps.T02, "complete");
  assert.equal(next.steps.T04, "complete");
  assert.equal(next.checks.V10, "passed");
  assert.equal(next.steps.T05, "in_progress");
  assert.equal(next.steps.T09, "complete");
  assert.equal(next.steps.T15, "in_progress");
  assert.equal(prior.steps.T05, "complete");
  assert.doesNotThrow(() => parseProgress(next, year, TRANSITION_STEPS, TRANSITION_CHECKS));
});

test("Form entry invalidates connection, scoring and settings without unrelated budget checks", () => {
  const next = reconcileProgress(reopenAnnualChecks(completedProgress(), ["attendanceFormEditor"], {}), TRANSITION_STEPS, TRANSITION_CHECKS);
  for (const key of ["V02", "V03", "V04", "V07"]) assert.equal(next.checks[key], "needs_recheck", key);
  assert.equal(next.checks.V06, "passed");
  assert.equal(next.steps.T05, "complete");
  assert.equal(next.steps.T07, "complete");
  assert.equal(next.steps.T02, "complete");
});

test("replacing a saved resource requires incoming access checks again", () => {
  const next = reconcileProgress(reopenAnnualChecks(completedProgress(), ["budgetExport"], { budgetExport: sheet(id) }), TRANSITION_STEPS, TRANSITION_CHECKS);
  assert.equal(next.steps.T02, "in_progress");
  assert.equal(next.checks.V10, "needs_recheck");
  assert.equal(next.checks.V06, "needs_recheck");
  assert.equal(next.checks.V01, "passed");
});

test("unchanged links and unknown keys preserve progress", () => {
  const prior = completedProgress();
  assert.deepEqual(reopenAnnualChecks(prior, []), prior);
  assert.deepEqual(reopenAnnualChecks(prior, ["unknown"]), prior);
});
