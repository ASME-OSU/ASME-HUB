import test from "node:test";
import assert from "node:assert/strict";
import { ANNUAL_HANDOFF_TYPE, annualLinkStorageKey, googleAnnualLink, validateAnnualLinkDraft, importAnnualLinkDraft, annualSettingsDraft, reopenAnnualChecks, reviewAnnualLinkImport } from "../assets/js/annual-link-draft.js";
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

test("changed annual pointers recheck setup/scoring/communications and launch while preserving initial access",()=>{
 const next=reconcileProgress(reopenAnnualChecks(completedProgress(),["pointsMaster"],{}),TRANSITION_STEPS,TRANSITION_CHECKS);
 assert.equal(next.steps.T01,"complete");assert.equal(next.steps.T02,"in_progress");assert.equal(next.steps.T03,"in_progress");assert.equal(next.steps.T05,"in_progress");assert.equal(next.checks.V10,"passed");assert.equal(next.checks.V02,"needs_recheck");assert.doesNotThrow(()=>parseProgress(next,year,TRANSITION_STEPS,TRANSITION_CHECKS));
});
test("replacing a saved resource also rechecks incoming access",()=>{
 const next=reconcileProgress(reopenAnnualChecks(completedProgress(),["budgetExport"],{budgetExport:sheet(id)}),TRANSITION_STEPS,TRANSITION_CHECKS);
 assert.equal(next.steps.T01,"in_progress");assert.equal(next.checks.V10,"needs_recheck");assert.equal(next.checks.V06,"needs_recheck");
});
test("unchanged links and unknown keys preserve progress", () => {
  const prior = completedProgress();
  assert.deepEqual(reopenAnnualChecks(prior, []), prior);
  assert.deepEqual(reopenAnnualChecks(prior, ["unknown"]), prior);
});

test("optional private mock context validates editor types and excludes canonical or conflicting files",()=>{
 const center=sheet("mock_center_123456789012345678"),project="https://script.google.com/u/0/home/projects/mock_project_123456789012345678/edit";
 const value={...handoff({pointsMaster:id}),mock:{controlCenterUrl:center+"#gid=0",scriptProjectUrl:project+"?foo=bar"}};
 const checked=validateAnnualLinkDraft(value,year);assert.deepEqual(checked.mock,{controlCenterUrl:center,scriptProjectUrl:project});
 assert.deepEqual(importAnnualLinkDraft(JSON.stringify(checked),year),checked);
 assert.throws(()=>validateAnnualLinkDraft(value,year,{sharedSettings:{spreadsheetUrl:center}}),/separate copied/);
 assert.throws(()=>validateAnnualLinkDraft({...value,mock:{controlCenterUrl:sheet(id)}},year),/separate copied/);
 for(const mock of [[],{unknown:"url"},{controlCenterUrl:42},{scriptProjectUrl:"https://script.google.com/macros/s/deployment_123456789012345678/exec"},{scriptProjectUrl:"https://script.google.com.evil.test/home/projects/mock_project_123456789012345678/edit"}]) assert.throws(()=>validateAnnualLinkDraft({...value,mock},year));
 assert.throws(()=>annualSettingsDraft(checked),/legacy annual save/);
 assert.deepEqual(validateAnnualLinkDraft({...handoff(),mock:{controlCenterUrl:"",scriptProjectUrl:""}},year),handoff());
});

test("private mock context changes invalidate registry/access readiness",()=>{
 const prior=completedProgress(),next=reconcileProgress(reopenAnnualChecks(prior,["controlCenterUrl"],{controlCenterUrl:sheet(id)}),TRANSITION_STEPS,TRANSITION_CHECKS);
 assert.equal(next.steps.T01,"in_progress");assert.equal(next.steps.T02,"in_progress");assert.equal(next.steps.T05,"in_progress");assert.equal(next.checks.V07,"needs_recheck");assert.equal(next.checks.V10,"needs_recheck");
});

test("new packet import rejects bundle files as handoff folders while historical data remains readable", () => {
 const historical = {...handoff(), records:{handoffUrl:`https://drive.google.com/file/d/${id}/view`}};
 const loaded = importAnnualLinkDraft(JSON.stringify(historical), year);
 assert.equal(loaded.records.handoffUrl, historical.records.handoffUrl);
 assert.throws(() => reviewAnnualLinkImport(loaded), /folder URL/);
 const corrected = {...handoff(), records:{handoffUrl:`https://drive.google.com/drive/folders/${id}`}};
 assert.deepEqual(reviewAnnualLinkImport(importAnnualLinkDraft(JSON.stringify(corrected), year)), corrected);
 assert.deepEqual(reviewAnnualLinkImport(handoff()), handoff());
});
