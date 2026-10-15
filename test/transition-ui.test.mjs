import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import * as state from "../assets/js/transition-state.js";
import * as definitions from "../assets/js/transition-steps.js";
import * as links from "../assets/js/annual-link-draft.js";
import "../assets/js/shared-resources.js";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const source = readFileSync(new URL("../assets/js/transition.js", import.meta.url), "utf8").replace(/^import .*;\n/gm, "");

class Element {
  constructor(tag = "div") { this.tagName = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.attrs = {}; this.value = ""; this._text = ""; this.className = ""; this.classList = { toggle() {}, add() {}, remove() {} }; this.isConnected = true; }
  get childElementCount() { return this.children.length; }
  set textContent(value) { this._text = String(value); }
  get textContent() { return this._text + this.children.map(child => child.textContent || "").join(" "); }
  append(...children) { for (const child of children) { child.remove?.(); child.parent = this; this.children.push(child); } }
  prepend(child) { child.remove?.(); child.parent = this; this.children.unshift(child); }
  before(child) { const parent = this.parent; if (!parent) return; child.remove?.(); child.parent = parent; parent.children.splice(parent.children.indexOf(this), 0, child); }
  replaceChildren(...children) { this.children.forEach(child => child.parent = null); this.children = []; this._text = ""; this.append(...children); }
  remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
  add(option) { this.append(option); if (!this.value) this.value = option.value; }
  setAttribute(name, value) { this.attrs[name] = value; }
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  async emit(name, options = {}) { for (const callback of this.listeners[name] || []) await callback({ target: this, preventDefault() {}, ...options }); }
  click() { return this.emit("click"); }
  setCustomValidity() {} reportValidity() {} focus() {} showModal() { this.open = true; } close() { this.open = false; }
  querySelector(selector) { return this.find(element => selector.startsWith(".") ? element.className.split(" ").includes(selector.slice(1)) : selector.startsWith("[data-transition-control=") ? element.dataset.transitionControl === selector.match(/"([^"]+)"/)[1] : element.tagName === selector); }
  find(predicate) { for (const child of this.children) { if (predicate(child)) return child; const found = child.find?.(predicate); if (found) return found; } return null; }
}
function browser(existing = new Map(), resourceSnapshot = [], failSelection = false, setupClient = null) {
  const ids = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], new Element()]));
  const $ = id => { assert.ok(ids.has(id), `Production HTML must provide ${id}`); return ids.get(id); };
  const dialog = $("transition-dialog");
  const body = new Element(); body.className = "transition-dialog-body";
  const tools = $("transition-progress-tools"); tools.className = "transition-tools";
  dialog.append(body); body.append($("transition-saved-tools")); $("transition-saved-tools").append(tools);
  $("transition-run-mode").value = "production";
  const localStorage = { get length() { return existing.size; }, key: index => [...existing.keys()][index], getItem: key => existing.get(key) ?? null, setItem: (key, value) => { if (failSelection && key.startsWith("asmeHubTransitionSelectedRunV2:")) throw new Error("Selection storage unavailable"); existing.set(key, value); }, removeItem: key => existing.delete(key) };
  const documentListeners = new Map();
  const dispatched = [];
  const document = { getElementById: $, createElement: tag => new Element(tag), createElementNS: (_ns, tag) => new Element(tag), activeElement: null, body: new Element(), addEventListener(name, callback) { documentListeners.set(name, callback); }, dispatchEvent(event) { dispatched.push(event); documentListeners.get(event.type)?.(event); } };
  const window = { ASME_SHARED_RESOURCES: globalThis.ASME_SHARED_RESOURCES, ASME_TRANSITION_RESOURCE_SNAPSHOT: !Array.isArray(resourceSnapshot) ? resourceSnapshot : null, ASME_TRANSITION_RESOURCES: Array.isArray(resourceSnapshot) ? resourceSnapshot : resourceSnapshot.resources, ASME_HUB_CONFIG: { currentAcademicYear: "2026-2027" }, addEventListener() {}, print() {} };
  if (setupClient) window.ASME_HUB_CONFIG.annualProvisioner = { api: { clientId: "fixture", deploymentId: "fixture", scopes: [] } };
  const context = { ...state, ...definitions, ...links, createAnnualSetupClient: () => setupClient, document, window, localStorage, Option: function(text, value) { const node = new Element("option"); node.textContent = text; node.value = value; return node; }, Date, URL, Blob, setTimeout: () => {}, CustomEvent: function(type, options) { this.type=type; this.detail=options?.detail; } };
  vm.runInNewContext(source, context, { filename: "transition.js" });
  const control = id => $("transition-steps").querySelector(`[data-transition-control="${id}"]`);
  const go = async id => { $("transition-step-picker").value = id; await $("transition-step-picker").emit("change"); };
  const choose = async (id, value) => { const element = control(id); assert.ok(element, `Rendered control ${id}`); element.value = value; await element.emit("change"); };
  const reason = async (id, text) => {
    const form = $("transition-steps").find(node => node.className === "transition-evidence" && node.dataset.evidenceId === id);
    assert.ok(form, `Evidence form ${id}`); form.find(node => node.tagName === "textarea").value = text; await form.emit("submit");
  };
  const saved = () => { const id = $("transition-run").value; return JSON.parse(existing.get(state.storageKey("2027-2028", id))); };
  return { $, go, choose, reason, saved, existing, document, window, dispatched };
}

const mockHandoff = () => ({schema:1,type:links.ANNUAL_HANDOFF_TYPE,year:"2027-2028",links:{pointsMaster:"annual_points_1234567890123456",pointsExport:"annual_export_1234567890123456",budgetTracker:"annual_budget_1234567890123456",budgetExport:"budget_export_1234567890123456",annualFolder:"https://drive.google.com/drive/folders/annual_folder_1234567890123456",attendanceFormEditor:"https://docs.google.com/forms/d/annual_form_123456789012345678/edit",attendanceFormRespondent:"https://docs.google.com/forms/d/e/annual_respondent_1234567890123456/viewform"},mock:{controlCenterUrl:"https://docs.google.com/spreadsheets/d/private_mock_center_1234567890/edit",scriptProjectUrl:"https://script.google.com/home/projects/private_mock_script_1234567890/edit"}});

test('annual setup step exposes installed chapter screen and concise five-step route',async()=>{
 const ui=browser();ui.window.ASME_HUB_CONFIG.annualProvisioner={url:'https://script.google.com/macros/s/chapter_setup/exec'};await ui.go('T02');
 assert.ok(ui.$('transition-steps').find(node=>node.href==='https://script.google.com/macros/s/chapter_setup/exec?year=2027-2028&mode=production'));
 assert.match(ui.$('transition-steps').textContent,/Prepare this year’s files/);assert.match(ui.$('transition-steps').textContent,/Copy setup results/);assert.match(ui.$('transition-steps').textContent,/asmeohiostate@gmail.com must be the only Google account signed in/);assert.ok(ui.$('transition-steps').find(n=>n.tagName==='summary'&&n.textContent.startsWith('Manual fallback:')));
 await ui.go('T05');assert.match(ui.$('transition-steps').textContent,/Config!B5 to LIVE/);
 ui.window.ASME_HUB_CONFIG.annualProvisioner.url='https://evil.example/macros/s/chapter_setup/exec';await ui.go('T02');
 assert.equal(ui.$('transition-steps').find(node=>node.href==='https://evil.example/macros/s/chapter_setup/exec'),null);
});
async function importMock(ui, value=mockHandoff()) {
 await ui.go("T02"); const input=ui.$("transition-dialog").find(node=>node.tagName==="input"&&node.type==="file");
 const text=JSON.stringify(value);input.files=[{size:text.length,text:async()=>text}];await input.emit("change");
}
const reviewMock=ui=>ui.$("transition-steps").find(node=>node.tagName==="button"&&node.textContent==="Compare saved links with setup summary").click();

test("start and continue checklist keep internal modes and identities while simplifying visible setup", async () => {
 const ui = browser(); ui.$("transition-run-mode").value = "rehearsal"; await ui.$("transition-run-form").emit("submit");
 assert.ok(html.indexOf('id="transition-year-setup"') < html.indexOf('id="transition-run-form"'));
 assert.match(html, /<option value="production">Real handoff<\/option><option value="rehearsal">Practice \(maintainer review\)<\/option>/);
 assert.match(html, /<details class="transition-run-advanced"><summary>Checklist details and advanced controls<\/summary>[\s\S]*?id="transition-run-id"/);
 await ui.$("transition-run-form").emit("submit");
 const practice = ui.saved();
 assert.equal(practice.run.mode, "rehearsal");
 assert.match(practice.run.name, /^Practice 2027-2028/);
 assert.doesNotMatch(ui.$("transition-run-context").textContent, new RegExp(practice.run.id));
 assert.match(ui.$("transition-run-id").textContent, new RegExp(practice.run.id));
 await ui.go("T04");
 assert.equal(ui.$("transition-year-setup").hidden, false);
 await ui.$("transition-run-continue").click();
 assert.equal(ui.$("transition-step-picker").value, "T01");
 ui.$("transition-run-mode").value = "production";
 await ui.$("transition-run-form").emit("submit");
 assert.equal(ui.saved().run.mode, "production");
 assert.notEqual(ui.saved().run.id, practice.run.id);
 assert.match(ui.$("transition-run-context").textContent, /Real handoff/);
 ui.$("transition-run").value = practice.run.id;
 await ui.$("transition-run").emit("change");
 assert.equal(ui.saved().run.id, practice.run.id);
 assert.equal(ui.$("transition-run-mode").value, "rehearsal");
});

test("private record URL controls hide production records in practice and retain saved private data", async () => {
 const ui = browser(); ui.$("transition-run-mode").value = "rehearsal"; await ui.$("transition-run-form").emit("submit");
 await ui.$("transition-run-form").emit("submit");
 const field = (label) => ui.$("transition-dialog").find(node => node.tagName === "label" && node.textContent.startsWith(label));
 assert.equal(field("Approved communications record link").hidden, true);
 assert.equal(field("Coordinator launch approval record link").hidden, true);
 assert.equal(field("Reviewer sign-off record link").hidden, false);
 assert.equal(field("Recovery notes document link").hidden, false);
 const access = field("Access contact record link");
 assert.equal(access.find(node => node.tagName === "input").type, "url");
 assert.match(access.textContent, /President[\s\S]*Paste its link, not a name or email/);
 assert.match(ui.$("transition-dialog").textContent, /Step 2 saves all seven links/);
 const handoff = mockHandoff();
 handoff.records = { acceptanceUrl: "https://example.org/private-review", rollbackUrl: "https://example.org/private-recovery", approvalUrl: "https://example.org/private-production-approval" };
 await importMock(ui, handoff);
 const form = ui.$("transition-dialog").find(node => node.id === "transition-annual-links-form");
 await form.emit("submit");
 const draftRunId=ui.saved().run.id;
 const draft = JSON.parse(ui.existing.get(`${links.annualLinkStorageKey("2027-2028")}:${draftRunId}`));
 assert.equal(draft.records.approvalUrl, handoff.records.approvalUrl);
 ui.$("transition-run-mode").value = "production";
 await ui.$("transition-run-form").emit("submit");
 assert.equal(field("Approved communications record link").hidden, false);
 assert.equal(field("Coordinator launch approval record link").hidden, false);
 assert.equal(field("Incoming officer acceptance record link").hidden, false);
 assert.equal(field("Rollback record link").hidden, false);
 assert.match(field("Rollback record link").textContent,/previous year and settings.*restore operator.*restore actions.*stop criteria/);
 const practiceEntry=[...ui.existing.entries()].find(([key,value])=>key.startsWith(state.TRANSITION_STORAGE_PREFIX)&&JSON.parse(value).run?.mode==="rehearsal"&&JSON.parse(value).run.id===draftRunId);
 ui.$("transition-run").value=JSON.parse(practiceEntry[1]).run.id;await ui.$("transition-run").emit("change");
 const reload=browser(ui.existing);const recovery=reload.$("transition-dialog").find(node=>node.tagName==="label"&&node.textContent.startsWith("Recovery notes document link"));
 assert.equal(recovery.find(node=>node.tagName==="input").value,handoff.records.rollbackUrl);
 assert.doesNotMatch(recovery.textContent,/launch rollback plan/);
});

test("rehearsal review opens only its private provisioner-owned source and never transfers to legacy save",async()=>{
 const ui=browser(); ui.$("transition-run-mode").value = "rehearsal"; await ui.$("transition-run-form").emit("submit");ui.$("transition-run-name").value="Private fixture";await ui.$("transition-run-form").emit("submit");await importMock(ui);await reviewMock(ui);
 const key=links.annualLinkStorageKey("2027-2028")+":"+ui.saved().run.id;
 const draft=JSON.parse(ui.existing.get(key));assert.equal(draft.mock.controlCenterUrl,mockHandoff().mock.controlCenterUrl);
 assert.equal(ui.dispatched.filter(event=>event.type==="transition:annual-settings-draft").length,0);
 assert.equal(ui.$("transition-steps").find(node=>node.href===draft.mock.controlCenterUrl)?.target,"_blank");
 assert.match(ui.$("transition-steps").textContent,/only saves links in this browser/);
 const exported=state.exportProgress(ui.saved(),definitions.TRANSITION_STEPS,definitions.TRANSITION_CHECKS);
 assert.doesNotMatch(exported,/private_mock_center|private_mock_script|annual_points/);
 await ui.$("transition-print").click();assert.doesNotMatch(ui.$("transition-print-sheet").textContent,/private_mock_center|private_mock_script|annual_points/);
 const reload=browser(ui.existing);await reload.go("T02");assert.ok(reload.$("transition-steps").find(node=>node.href===draft.mock.controlCenterUrl));
 reload.$("transition-run-name").value="Other fixture";await reload.$("transition-run-form").emit("submit");await reload.go("T02");
 assert.equal(reload.$("transition-steps").find(node=>node.href===draft.mock.controlCenterUrl),null);
 assert.equal(JSON.parse(ui.existing.get(key)).mock.controlCenterUrl,draft.mock.controlCenterUrl);
});

test("mock review requires seven links and a separate center; stale context cannot overwrite newer run evidence",async()=>{
 const a=browser();a.$("transition-run-mode").value="rehearsal";a.$("transition-run-name").value="Mock context";await a.$("transition-run-form").emit("submit");await a.go("T02");await reviewMock(a);assert.match(a.$("transition-steps").textContent,/Enter all seven/);
 await importMock(a);await reviewMock(a);const b=browser(a.existing);await b.go("T02");
 const centerInput=ui=>ui.$("transition-saved-tools").find(node=>node.tagName==="label"&&node.textContent.startsWith("Private mock Control Center")).find(node=>node.tagName==="input");
 centerInput(a).value="https://docs.google.com/spreadsheets/d/new_private_mock_center_1234567890/edit";await reviewMock(a);
 const key=links.annualLinkStorageKey("2027-2028")+":"+a.saved().run.id,newer=a.existing.get(key);await reviewMock(b);
 assert.equal(a.existing.get(key),newer);assert.match(b.$("transition-steps").textContent,/changed in another tab/);
});

test("real handoff compares supplied receipt locally and rejects private mock context",async()=>{
 const ui=browser(); ui.$("transition-run-mode").value = "rehearsal"; await ui.$("transition-run-form").emit("submit");ui.$("transition-run-name").value="Production review";ui.$("transition-run-mode").value="production";await ui.$("transition-run-form").emit("submit");
 await importMock(ui);const action=()=>ui.$("transition-steps").find(node=>node.tagName==="button"&&node.textContent==="Compare saved links with setup summary");await action().click();
 assert.match(ui.$("transition-steps").textContent,/Real handoff cannot use the mock context/);assert.equal(ui.dispatched.filter(e=>e.type==="transition:annual-settings-draft").length,0);
 const value=mockHandoff();delete value.mock;await importMock(ui,value);await action().click();
 assert.equal(ui.dispatched.filter(e=>e.type==="transition:annual-settings-draft").length,0);
 assert.match(ui.$("transition-steps").textContent,/Links saved on this device/);
 assert.equal(Object.keys(JSON.parse(ui.existing.get(links.annualLinkStorageKey("2027-2028")+":"+ui.saved().run.id)).links).length,7);
});

test("five-step mock UI permits skips and later checks but denies activation", async()=>{
 const ui=browser(); ui.$("transition-run-mode").value = "rehearsal"; await ui.$("transition-run-form").emit("submit");ui.$("transition-run-name").value="Five-step rehearsal";await ui.$("transition-run-form").emit("submit");
 await ui.go("T02");await ui.choose("T02","skipped");assert.equal(ui.saved().steps.T02,undefined);
 await ui.reason("T02","Mock setup skipped");await ui.choose("T02","skipped");assert.equal(ui.$("transition-next").disabled,false);assert.equal(ui.$("transition-dialog").dataset.mockMode,"true");
 await ui.$("transition-next").click();assert.equal(ui.$("transition-step-picker").value,"T03");
 await ui.go("T04");for (const check of definitions.TRANSITION_CHECKS.filter(c => c.step === "T04" && state.checkApplies(c, "rehearsal"))) await ui.choose(check.id,"passed");await ui.choose("T04","complete");
 await ui.go("T05");await ui.choose("T05","complete");assert.equal(ui.saved().steps.T05,undefined);assert.match(ui.$("transition-status").textContent,/NO-GO/);
 await ui.reason("T05","NO-GO; cleanup recorded privately");await ui.choose("T05","skipped");
 const reload=browser(ui.existing);assert.equal(reload.saved().steps.T02,"skipped");assert.equal(reload.saved().steps.T04,"complete");
});

test("UI imports into a new run, preserves corrupt originals, and rejects malformed import without writes", async () => {
  const key = state.storageKey("2027-2028", "damaged");
  const existing = new Map([[key, "{broken"], ["asmeHubTransitionSelectedRunV2:2027-2028", "damaged"]]);
  const ui = browser(existing);
  assert.match(ui.$("transition-status").textContent, /Existing saved data was not changed/);
  const before = [...existing.entries()];
  await ui.go("T01"); await ui.choose("T01", "complete");
  assert.deepEqual([...existing.entries()], before);
  const input = ui.$("transition-import");
  input.files = [{ size: 7, text: async () => "garbage" }]; await input.emit("change");
  assert.deepEqual([...existing.entries()], before);
  const exported = state.exportProgress(state.emptyProgress("2027-2028", state.createTransitionRun("Imported rehearsal", "rehearsal", "incoming")), definitions.TRANSITION_STEPS, definitions.TRANSITION_CHECKS);
  input.files = [{ size: exported.length, text: async () => exported }]; await input.emit("change");
  assert.equal(existing.get(key), "{broken");
  assert.notEqual(ui.saved().run.id, "incoming");
  assert.notEqual(ui.saved().run.id, "damaged");
  assert.equal(ui.saved().run.name, "Imported rehearsal (import)");
});

test("legacy UI migration preserves the original and saves a separate recheck run", async () => {
  const old = JSON.stringify({ version: 1, guideVersion: "officer-transition-guide-5", year: "2027-2028", savedAt: null, steps: { T01: "complete" }, checks: {} });
  const key = `${state.TRANSITION_LEGACY_STORAGE_PREFIX}2027-2028`;
  const existing = new Map([[key, old]]);
  const ui = browser(existing);
  assert.match(ui.$("transition-status").textContent, /Guide updated/);
  await ui.go("T01"); await ui.choose("V20", "passed"); await ui.choose("T01", "complete");
  assert.equal(existing.get(key), old);
  assert.equal(ui.saved().run.mode, "rehearsal");
  assert.equal(ui.saved().run.id, "legacy");
});


test("guide uses reviewed shared-resource references and updates ordinary editor links without a second fetch", async () => {
  const ui = browser(new Map(), [{ id: "officer-handoff", title: "Private officer handoff", url: "https://drive.google.com/drive/folders/reviewed" }, { id: "handoff-checklist", title: "Private checklist", url: "javascript:invalid" }]);
  await ui.go("T01");
  assert.match(ui.$("transition-steps").textContent, /Private officer handoff/);
  assert.doesNotMatch(ui.$("transition-steps").textContent, /Private checklist/);
  ui.document.dispatchEvent({ type: "transition:resources-updated", detail: { resources: [{ id: "website-editor", title: "WordPress normal editor", url: "https://org.osu.edu/asme/wp-admin/" }] } });
  await ui.go("T04");
  assert.match(ui.$("transition-steps").textContent, /WordPress normal editor/);
  assert.equal(ui.$("transition-steps").find(node => node.href === "https://org.osu.edu/asme/wp-admin/")?.target, "_blank");
});

test("annual-link drafts stay isolated between same-year runs", async () => {
  const ui = browser(); ui.$("transition-run-mode").value = "rehearsal"; await ui.$("transition-run-form").emit("submit");
  ui.$("transition-run-name").value = "Copy set A"; await ui.$("transition-run-form").emit("submit");
  const a = ui.saved().run.id;
  await ui.go("T02");
  const label = ui.$("transition-saved-tools").find(node => node.tagName === "label" && node.textContent.startsWith("Points Master (officer edit link)"));
  assert.equal(ui.$("transition-steps").find(node => node === label), null);
  const editor = label.parent;
  const details = editor.parent;
  assert.equal(editor.id, "transition-annual-links-form");
  assert.equal(details.parent, ui.$("transition-saved-tools"));
  const edit = ui.$("transition-steps").find(node => node.tagName === "button" && node.textContent === "Edit saved links");
  await edit.click();
  assert.equal(details.open, true);
  assert.match(ui.$("transition-saved-tools-context").textContent, /Copy set A.*2027–2028.*Practice/);
  label.find(node => node.tagName === "input").value = "https://docs.google.com/spreadsheets/d/abcdefghijklmnopqrstuvwxyz123456789/edit";
  const form = ui.$("transition-dialog").find(node => node.id === "transition-annual-links-form");
  await form.emit("submit");
  const key = `${links.annualLinkStorageKey("2027-2028")}:${a}`;
  assert.match(ui.existing.get(key), /abcdefghijklmnopqrstuvwxyz/);
  await ui.go("T04");
  assert.equal(label.parent, editor);
  assert.equal(details.parent, ui.$("transition-saved-tools"));
  assert.ok(ui.$("transition-steps").find(n => n.tagName === "ol" && n.className === "transition-procedure"));
  assert.ok(ui.$("transition-steps").find(n => n.className === "transition-confirmation"));
  ui.$("transition-run-name").value = "Copy set B"; await ui.$("transition-run-form").emit("submit");
  await ui.go("T02");
  const bLabel = ui.$("transition-saved-tools").find(node => node.tagName === "label" && node.textContent.startsWith("Points Master (officer edit link)"));
  assert.equal(bLabel.find(node => node.tagName === "input").value, "");
  assert.equal(bLabel, label);
  assert.match(ui.$("transition-saved-tools-context").textContent, /Copy set B.*2027–2028.*Practice/);
  assert.match(ui.existing.get(key), /abcdefghijklmnopqrstuvwxyz/);
});


test("two tabs of one run preserve newer evidence and require explicit reload before another save", async () => {
 const a=browser();a.$("transition-run-name").value="Concurrent run";await a.$("transition-run-form").emit("submit");
 const b=browser(a.existing);
 await a.go("T01");await a.reason("T01","Saved by first tab");
 await b.go("T01");await b.reason("T01","Stale second-tab overwrite");
 assert.equal(a.saved().reasons.T01,"Saved by first tab");
 assert.match(b.$("transition-status").textContent,/changed in another browser tab/);
 await b.$("transition-run-reload").click();
 assert.equal(b.saved().reasons.T01,"Saved by first tab");
 await b.reason("T01","Reconciled after reload");
 assert.equal(a.saved().reasons.T01,"Reconciled after reload");
});

test("shared reference refresh preserves unsaved reason and observation controls", async () => {
 const ui=browser();await ui.go("T01");
 const form=ui.$("transition-steps").find(node=>node.className==="transition-evidence");
 const input=form.find(node=>node.tagName==="textarea");input.value="Unsubmitted reason";
 ui.document.dispatchEvent({type:"transition:resources-updated",detail:{resources:[{id:"officer-handoff",title:"Refreshed handoff",url:"https://example.org/handoff"}]}});
 assert.equal(ui.$("transition-steps").find(node=>node.className==="transition-evidence"),form);
 assert.equal(input.value,"Unsubmitted reason");
 assert.match(ui.$("transition-steps").textContent,/Refreshed handoff/);
});

test("guide resolves shared handoff references for its target year independently of dashboard selection", async () => {
 const reference=(year,url)=>({resource_id:"officer-handoff",label:`Handoff ${year}`,url,category:"Operations",roles:"all",sort_order:1,enabled:true,academic_year:year});
 const ui=browser(new Map(),{resources:[{id:"officer-handoff",title:"Dashboard old handoff",url:"https://example.org/old"}],defaults:[],records:[reference("2026-2027","https://example.org/old"),reference("2027-2028","https://example.org/target")]});
 await ui.go("T01");
 assert.equal(ui.$("transition-steps").find(node=>node.href==="https://example.org/target")?.target,"_blank");
 assert.equal(ui.$("transition-steps").find(node=>node.href==="https://example.org/old"),null);
});


test("a stale same-run annual link form cannot replace a newer draft even when its own fields were unchanged", async () => {
 const a=browser();a.$("transition-run-name").value="Concurrent links";await a.$("transition-run-form").emit("submit");
 const b=browser(a.existing);await a.go("T02");await b.go("T02");
 const findInput=ui=>ui.$("transition-saved-tools").find(node=>node.tagName==="label"&&node.textContent.startsWith("Points Master (officer edit link)")).find(node=>node.tagName==="input");
 const submit=ui=>ui.$("transition-dialog").find(node=>node.id==="transition-annual-links-form").emit("submit");
 findInput(a).value="https://docs.google.com/spreadsheets/d/newestAnnualPointsMaster1234567890/edit";await submit(a);
 const key=`${links.annualLinkStorageKey("2027-2028")}:${a.saved().run.id}`,newest=a.existing.get(key);
 await submit(b); // stale empty fields matched b's old in-memory baseline, but not current storage
 assert.equal(a.existing.get(key),newest);
 assert.match(b.$("transition-steps").textContent,/Annual links changed in another tab/);
});

test("clearing a legacy annual draft masks it for the migrated run and preserves the old original", async () => {
 const year="2027-2028";
 const legacyProgress=JSON.stringify({version:1,guideVersion:"officer-transition-guide-5",year,savedAt:null,steps:{},checks:{}});
 const original=JSON.stringify({schema:1,type:links.ANNUAL_HANDOFF_TYPE,year,links:{pointsMaster:"https://docs.google.com/spreadsheets/d/legacyAnnualPointsMaster1234567890/edit"}});
 const existing=new Map([[`${state.TRANSITION_LEGACY_STORAGE_PREFIX}${year}`,legacyProgress],[links.annualLinkStorageKey(year),original]]);
 const ui=browser(existing);await ui.go("T02");
 const clear=ui.$("transition-dialog").find(node=>node.tagName==="button"&&node.textContent==="Clear saved links for this run");await clear.click();
 assert.equal(existing.get(links.annualLinkStorageKey(year)),original);
 const reload=browser(existing);await reload.go("T02");
 const label=reload.$("transition-saved-tools").find(node=>node.tagName==="label"&&node.textContent.startsWith("Points Master (officer edit link)"));
 assert.equal(label.find(node=>node.tagName==="input").value,"");
});


test('named sixteen-step production migration preserves raw original and cannot authorize launch', async()=>{
 const old={version:2,guideVersion:'officer-transition-guide-6',year:'2027-2028',run:state.createTransitionRun('Historical production','production','older'),savedAt:null,steps:Object.fromEntries(Array.from({length:16},(_,i)=>['T'+String(i+1).padStart(2,'0'),'complete'])),checks:Object.fromEntries(definitions.TRANSITION_CHECKS.filter(c=>Number(c.id.slice(1))<=10).map(c=>[c.id,'passed'])),reasons:{},notes:{T16:'Historical cleanup receipt'}};
 const raw=JSON.stringify(old),key=state.storageKey(old.year,'older');
 const existing=new Map([[key,raw]]),ui=browser(existing);
 assert.equal(existing.get(key),raw);await ui.go('T05');await ui.choose('T05','complete');assert.equal(existing.get(key),raw);
 await ui.go('T01');await ui.choose('V20','passed');
 assert.equal(existing.get(key+':officer-transition-guide-6-backup'),raw);
 assert.equal(ui.saved().steps.T05,'in_progress');assert.equal(ui.saved().checks.V01,'needs_recheck');
 assert.match(ui.saved().notes.T05,/Historical cleanup receipt/);
});

test('saved imports and new runs remain usable when only selection storage fails',async()=>{
 const ui=browser(new Map(),[],true);ui.$('transition-run-name').value='Discoverable run';await ui.$('transition-run-form').emit('submit');assert.equal(ui.saved().run.name,'Discoverable run');
 const originalKey=state.storageKey('2027-2028',ui.saved().run.id),original=ui.existing.get(originalKey);
 const production={...state.emptyProgress('2027-2028',state.createTransitionRun('Ready record','production','incoming')),steps:Object.fromEntries(definitions.TRANSITION_STEPS.map(s=>[s.id,'complete'])),checks:Object.fromEntries(definitions.TRANSITION_CHECKS.map(c=>[c.id,'passed']))};
 const text=state.exportProgress(production,definitions.TRANSITION_STEPS,definitions.TRANSITION_CHECKS),input=ui.$('transition-import');input.files=[{size:text.length,text:async()=>text}];await input.emit('change');
 assert.equal(ui.existing.get(originalKey),original);assert.equal(ui.saved().run.name,'Ready record (import)');assert.equal(ui.saved().steps.T05,'in_progress');assert.equal(ui.saved().checks.V10,'needs_recheck');assert.doesNotMatch(ui.$('transition-status').textContent,/Import failed/);
});

test('empty-string annual corruption is protected and backed up by explicit clear',async()=>{
 const progress=state.emptyProgress('2027-2028',state.createTransitionRun('Damaged annual draft','rehearsal','draft')),key=links.annualLinkStorageKey(progress.year)+':draft';
 const existing=new Map([[state.storageKey(progress.year,'draft'),JSON.stringify(progress)],[key,'']]),ui=browser(existing);await ui.go('T02');
 const form=ui.$('transition-dialog').find(node=>node.id==='transition-annual-links-form');await form.emit('submit');assert.equal(existing.get(key),'');assert.match(ui.$('transition-steps').textContent,/unreadable/);
 const clear=ui.$('transition-dialog').find(node=>node.tagName==='button'&&node.textContent==='Clear saved links for this run');await clear.click();
 assert.ok([...existing].some(([k,v])=>k.startsWith(key+':corrupt-backup-')&&v===''));
 assert.equal(existing.has(key),false);
});

test('new instructions render the five-case table in guide and print without cross-run links', async()=>{
 const ui=browser(); ui.$("transition-run-mode").value = "rehearsal"; await ui.$("transition-run-form").emit("submit"); ui.$('transition-run-name').value='MOCK copy review'; await ui.$('transition-run-form').emit('submit');
 await importMock(ui); await reviewMock(ui); await ui.go('T03');
 const table=ui.$('transition-steps').find(node=>node.tagName==='table'); assert.ok(table);
 assert.match(table.textContent,/missing-profile exception OPEN/);
 assert.ok(ui.$('transition-steps').find(node=>node.href?.includes('annual_points_1234567890123456')));
 await ui.$('transition-print').click(); assert.match(ui.$('transition-print-sheet').textContent,/Five fictional check-in submissions/);
 assert.match(ui.$('transition-print-sheet').textContent,/cleanup: Not checked/);
 ui.$('transition-run-name').value='Other MOCK'; await ui.$('transition-run-form').emit('submit'); await ui.go('T03');
 assert.equal(ui.$('transition-steps').find(node=>node.href?.includes('annual_points_1234567890123456')),null);
});

test('private checklist and receipt links survive reload but stay out of progress and print',async()=>{
 const ui=browser(); ui.$("transition-run-mode").value = "rehearsal"; await ui.$("transition-run-form").emit("submit"); ui.$('transition-run-name').value='Private records'; await ui.$('transition-run-form').emit('submit');
 const bundle=mockHandoff();bundle.records={checklistUrl:'https://docs.google.com/document/d/private_checklist/edit',receiptUrl:'https://docs.google.com/document/d/private_receipt/edit'};
 await importMock(ui,bundle);await reviewMock(ui);await ui.go('T01');
 assert.ok(ui.$('transition-steps').find(node=>node.href===bundle.records.checklistUrl));
 const reload=browser(ui.existing);await reload.go('T02');assert.ok(reload.$('transition-steps').find(node=>node.href===bundle.records.receiptUrl));
 assert.doesNotMatch(state.exportProgress(reload.saved(),definitions.TRANSITION_STEPS,definitions.TRANSITION_CHECKS),/private_receipt|private_checklist/);
 await reload.$('transition-print').click();assert.doesNotMatch(reload.$('transition-print-sheet').textContent,/private_receipt|private_checklist/);
});

test('disposed blockers and skipped activation visibly retain missing rehearsal closeout',async()=>{
 const ui=browser(); ui.$("transition-run-mode").value = "rehearsal"; await ui.$("transition-run-form").emit("submit");ui.$('transition-run-name').value='Blocked MOCK';await ui.$('transition-run-form').emit('submit');
 for(const step of definitions.TRANSITION_STEPS){await ui.go(step.id);if(step.id==='T05'){await ui.reason('T05','Rehearsal only');await ui.choose('T05','skipped');}else await ui.choose(step.id,'blocked');}
 assert.match(ui.$('transition-summary').textContent,/Open the unfinished steps to resolve their blockers/);
 assert.equal(ui.saved().steps.T05,'skipped');
 assert.match(ui.$('transition-summary').textContent,/Cleanup: Not checked yet. Reviewer acceptance: Not checked yet/);
 assert.match(ui.$('transition-readiness').textContent,/Private rehearsal not complete/);
});

test('rehearsal UI shows scoped GO without production approvals and keeps optional notes collapsed',async()=>{
 const p={...state.emptyProgress('2027-2028',state.createTransitionRun('Completed MOCK','rehearsal','finished')),steps:Object.fromEntries(definitions.TRANSITION_STEPS.map(s=>[s.id,s.launch?'skipped':'complete'])),checks:Object.fromEntries(definitions.TRANSITION_CHECKS.filter(c=>state.checkApplies(c,'rehearsal')).map(c=>[c.id,'passed'])),reasons:{T05:'Rehearsal only'}};
 const existing=new Map([[state.storageKey(p.year,p.run.id),JSON.stringify(p)],['asmeHubTransitionSelectedRunV2:2027-2028',p.run.id]]);
 const ui=browser(existing);assert.match(ui.$('transition-readiness').textContent,/GO — private rehearsal complete/);assert.match(ui.$('transition-launch-summary').textContent,/production activation excluded/);
 await ui.go('T03');assert.equal(ui.$('transition-steps').find(n=>n.dataset.transitionControl==='V12'),null);
 assert.match(ui.$('transition-steps').textContent,/Production checks — not part of this rehearsal/);
 assert.doesNotMatch(ui.$('transition-steps').textContent,/V20 disposition|disposition reason/);
 const optional=ui.$('transition-steps').find(n=>n.className==='transition-evidence-details');assert.equal(optional.open,false);
 await ui.$('transition-print').click();assert.match(ui.$('transition-print-sheet').textContent,/GO — private rehearsal complete/);assert.match(ui.$('transition-print-sheet').textContent,/not required for this rehearsal/);
 assert.equal(ui.saved().checks.V12,undefined);
});

test('choosing skip opens one plain-language reason and saving it records the skip',async()=>{
 const ui=browser();ui.$('transition-run-name').value='Skip flow MOCK';await ui.$('transition-run-form').emit('submit');await ui.go('T02');await ui.choose('T02','skipped');assert.notEqual(ui.saved().steps.T02,'skipped');
 const opened=ui.$('transition-steps').find(n=>n.className==='transition-evidence-details'&&n.open);assert.ok(opened);assert.match(opened.textContent,/Why are you skipping this/);
 await ui.reason('T02','Retained prepared bundle');assert.equal(ui.saved().steps.T02,'skipped');assert.equal(ui.saved().reasons.T02,'Retained prepared bundle');
});

test("new officer checklists default to real handoff without fictional exercise gates", async () => {
  const ui = browser();
  assert.equal(ui.$("transition-run-mode").value, "production");
  await ui.$("transition-run-form").emit("submit");
  assert.equal(ui.saved().run.mode, "production");
  assert.equal(ui.$("transition-checklist-options").open, false);
  await ui.go("T03");
  assert.equal(ui.$("transition-steps").find(node => node.className === "transition-test-cases"), null);
  for (const id of ["V03", "V04", "V23", "V24", "V25", "V26"]) {
    assert.equal(state.checkApplies(definitions.TRANSITION_CHECKS.find(check => check.id === id), "production"), false);
  }
  assert.doesNotMatch(ui.$("transition-readiness").textContent, /NO-GO|V\d\d/);
});

test("Guide 9 migration keeps practice mode and evidence while reopening changed real handoff reviews", () => {
  for (const mode of ["production", "rehearsal"]) {
    const old = state.emptyProgress("2027-2028", state.createTransitionRun("Existing checklist", mode, "saved-run"));
    old.guideVersion = "officer-transition-guide-9";
    for (const check of definitions.TRANSITION_CHECKS) old.checks[check.id] = "passed";
    for (const step of definitions.TRANSITION_STEPS) old.steps[step.id] = "complete";
    if (mode === "rehearsal") { old.steps.T05 = "skipped"; old.reasons.T05 = "Rehearsal only"; }
    old.notes.T01 = "Existing access evidence";
    const upgraded = state.migrateProgress(old, old.year, definitions.TRANSITION_STEPS, definitions.TRANSITION_CHECKS);
    assert.equal(upgraded.run.mode, mode);
    assert.equal(upgraded.notes.T01, old.notes.T01);
    assert.equal(upgraded.checks.V16, mode === "production" ? "needs_recheck" : "passed");
    assert.equal(upgraded.steps.T05, mode === "production" ? "in_progress" : "skipped");
    assert.equal(old.guideVersion, "officer-transition-guide-9");
    assert.equal(old.checks.V16, "passed");
  }
});

 test("empty real-handoff receipt action cannot dispatch or imply verified links", async()=>{
 const ui=browser();await ui.go("T02");await reviewMock(ui);
 assert.match(ui.$("transition-steps").textContent,/Enter all seven supplied annual links/);
 assert.equal(ui.dispatched.filter(e=>e.type==="transition:annual-settings-draft").length,0);
 const form=ui.$("transition-dialog").find(n=>n.id==="transition-annual-links-form");await form.emit("submit");
 assert.match(ui.$("transition-dialog").textContent,/Empty link list saved on this device. No links, access or readiness were verified/);
 });

test("officer action links stay direct while technical help collapses and missing links consolidate",async()=>{
 const ui=browser();await ui.go("T02");
 const step=ui.$("transition-steps");
 const help=step.find(n=>n.tagName==="details"&&n.children.some(c=>c.tagName==="summary"&&c.textContent==="More help for this step"));
 assert.ok(help);assert.equal(Boolean(help.open),false);
 assert.ok(help.find(n=>n.tagName==="a"&&n.href.endsWith("annual-points-setup.md")));
 const warnings=[];function walk(n){if(n.className==="transition-warning"&&n.textContent.startsWith("Missing for this checklist:"))warnings.push(n);for(const c of n.children)walk(c);}walk(step);
 assert.equal(warnings.length,1);assert.match(warnings[0].textContent,/President/);
});

test("final review names pending reviews by step and jumps to the selected work",async()=>{
 const ui=browser();await ui.go("T05");
 const section=ui.$("transition-steps").find(n=>n.className==="transition-pending-reviews");
 assert.ok(section);assert.match(section.textContent,/Reviews still needed/);
 const first=definitions.TRANSITION_STEPS[0];
 const jump=section.find(n=>n.tagName==="button"&&n.textContent.includes(first.productionTitle||first.title));
 assert.ok(jump);await jump.click();assert.equal(ui.$("transition-step-picker").value,"T01");
});

// A mode-specific route must not hide the cleanup safeguards supplied by the guide.
test('Real handoff activation is explicit in the screen and printout',async()=>{
 const ui=browser();await ui.go('T05');
 const screen=ui.$('transition-steps').textContent;
 assert.match(screen,/Config!B5 to LIVE/);assert.doesNotMatch(screen,/skip activation with the reason Rehearsal only/);
 await ui.$('transition-print').click();
 for(const text of [screen,ui.$('transition-print-sheet').textContent]) {
  assert.match(text,/is_active=TRUE and is_current=TRUE/);
  assert.match(text,/previous year’s is_current to FALSE/);
  assert.match(text,/approved Form intake state/);
  assert.match(text,/rollback plan/);
 }
});

test('Practice cleanup screen includes the closed-intake and formula-preservation procedure',async()=>{
 const ui=browser();ui.$('transition-run-mode').value='rehearsal';await ui.$('transition-run-form').emit('submit');await ui.go('T05');
 const text=ui.$('transition-steps').textContent;assert.match(text,/previews and backs up MOCK attendance/);assert.match(text,/every Events form_open checkbox FALSE/);assert.match(text,/Never clear formula tabs/);await ui.$('transition-print').click();assert.match(ui.$('transition-print-sheet').textContent,/previews and backs up MOCK attendance/);
});

test('progress advances on passed reviews, ignores blockers, and falls when a review needs recheck', async () => {
 const ui=browser(); await ui.go('T01');
 const total=definitions.TRANSITION_STEPS.length+definitions.TRANSITION_CHECKS.filter(c=>state.checkApplies(c,'production')).length;
 assert.equal(ui.$('transition-progress').max,total);
 assert.equal(ui.$('transition-progress').value,0);
 await ui.choose('V20','passed');
 assert.equal(ui.$('transition-progress').value,1);
 assert.match(ui.$('transition-completion').textContent,new RegExp(`1/${total} tasks complete`));
 await ui.choose('T01','blocked'); assert.equal(ui.$('transition-progress').value,1);
 await ui.choose('V20','needs_recheck'); assert.equal(ui.$('transition-progress').value,0);
 assert.match(ui.$('transition-progress-help').textContent,/Read next step does not complete work/);
});

test('reset starts at zero, preserves the old checklist and copies saved links; cancel changes nothing', async () => {
 const ui=browser(); await ui.$('transition-run-form').emit('submit');
 await ui.choose('V20','passed'); await ui.reason('T01','Original evidence');
 await importMock(ui); await ui.$('transition-dialog').find(n=>n.id==='transition-annual-links-form').emit('submit');
 const original=ui.saved(),key=state.storageKey('2027-2028',original.run.id),raw=ui.existing.get(key);
 const linksKey=`${links.annualLinkStorageKey('2027-2028')}:${original.run.id}`,linkRaw=ui.existing.get(linksKey);
 await ui.$('transition-reset').click(); await ui.$('transition-reset-cancel').click();
 assert.equal(ui.saved().run.id,original.run.id); assert.equal(ui.existing.get(key),raw);
 await ui.$('transition-reset').click(); await ui.$('transition-reset-confirm').click();
 const fresh=ui.saved(); assert.notEqual(fresh.run.id,original.run.id); assert.equal(fresh.run.mode,original.run.mode);
 assert.deepEqual(fresh.steps,{});assert.deepEqual(fresh.checks,{});assert.deepEqual(fresh.notes,{});assert.deepEqual(fresh.reasons,{});
 assert.equal(ui.$('transition-progress').value,0);assert.equal(ui.$('transition-step-picker').value,'T01');
 assert.equal(ui.existing.get(key),raw); assert.equal(ui.existing.get(linksKey),linkRaw);
 assert.equal(ui.existing.get(`${links.annualLinkStorageKey('2027-2028')}:${fresh.run.id}`),linkRaw);
 ui.$('transition-run').value=original.run.id; await ui.$('transition-run').emit('change'); assert.deepEqual(ui.saved(),original);
});

test('reset refuses stale evidence and stale annual links from another tab',async()=>{
 for(const changed of ['progress','links']) {
  const ui=browser(); await ui.$('transition-run-form').emit('submit');const before=ui.saved();
  await ui.$('transition-reset').click();
  const key=changed==='progress'?state.storageKey('2027-2028',before.run.id):`${links.annualLinkStorageKey('2027-2028')}:${before.run.id}`;
  ui.existing.set(key,changed==='progress'?JSON.stringify({...before,notes:{T01:'Newer evidence'}}):JSON.stringify(mockHandoff()));
  const newest=ui.existing.get(key);await ui.$('transition-reset-confirm').click();
  assert.equal(ui.$('transition-run').value,before.run.id);assert.equal(ui.existing.get(key),newest);
  assert.match(ui.$('transition-status').textContent,/changed in another tab/);
 }
});

test('reset preserves a year-only legacy checklist in the selector with its historical bytes',async()=>{
 const year='2027-2028',raw=JSON.stringify({version:1,guideVersion:'officer-transition-guide-5',year,savedAt:null,steps:{T01:'complete'},checks:{},notes:{T01:'Historical observation'}});
 const oldKey=`${state.TRANSITION_LEGACY_STORAGE_PREFIX}${year}`,ui=browser(new Map([[oldKey,raw]]));
 const oldId=ui.$('transition-run').value;
 await ui.$('transition-reset').click();await ui.$('transition-reset-confirm').click();
 assert.notEqual(ui.saved().run.id,oldId);
 assert.ok(ui.$('transition-run').children.some(n=>n.value===oldId));
 assert.equal(ui.existing.get(oldKey),raw);
 assert.equal(ui.existing.get(state.storageKey(year,oldId)+':officer-transition-guide-5-backup'),raw);
 ui.$('transition-run').value=oldId;await ui.$('transition-run').emit('change');
 assert.match(ui.saved().notes.T01,/Historical observation/);
});

test('Step 1 owns setup controls and Start uses typed year without a separate Use year click',async()=>{
 const ui=browser();await ui.go('T01');assert.ok(ui.$('transition-steps').find(n=>n===ui.$('transition-checklist-options')));
 ui.$('transition-year').value='2028';await ui.$('transition-run-form').emit('submit');
 const runId=ui.$('transition-run').value;assert.equal(JSON.parse(ui.existing.get(state.storageKey('2028-2029',runId))).year,'2028-2029');
 await ui.go('T02');assert.equal(ui.$('transition-steps').find(n=>n===ui.$('transition-checklist-options')),null);
 assert.equal(ui.$('transition-checklist-options').parent,ui.$('transition-setup-home'));
});

test('setup result paste saves seven links with existing private records; rejects wrong year and Practice in real handoff',async()=>{
 const ui=browser();ui.$('transition-run-mode').value='rehearsal';await ui.$('transition-run-form').emit('submit');await importMock(ui,{...mockHandoff(),records:{checklistUrl:'https://example.org/checklist'}});
 await ui.$('transition-dialog').find(n=>n.id==='transition-annual-links-form').emit('submit');
 const key=`${links.annualLinkStorageKey('2027-2028')}:${ui.saved().run.id}`;
 const paste=async value=>{await ui.go('T02');const form=ui.$('transition-steps').find(n=>n.className==='transition-setup-transfer');form.find(n=>n.tagName==='textarea').value=JSON.stringify(value);await form.emit('submit');};
 await paste(mockHandoff());assert.equal(Object.keys(JSON.parse(ui.existing.get(key)).links).length,7);assert.equal(JSON.parse(ui.existing.get(key)).records.checklistUrl,'https://example.org/checklist');
 const before=ui.existing.get(key);await paste({...mockHandoff(),year:'2028-2029'});assert.equal(ui.existing.get(key),before);assert.match(ui.$('transition-status').textContent,/selected transition year/);
 ui.$('transition-run-mode').value='production';await ui.$('transition-run-form').emit('submit');await paste(mockHandoff());assert.match(ui.$('transition-status').textContent,/Practice files/);
});

test('changing typed year lists its saved checklists and Continue loads them without creating another run',async()=>{
 const make=year=>state.emptyProgress(year,state.createTransitionRun('Saved '+year,'production',year));
 const a=make('2027-2028'),b=make('2028-2029');const existing=new Map([[state.storageKey(a.year,a.run.id),JSON.stringify(a)],[state.storageKey(b.year,b.run.id),JSON.stringify(b)]]);
 const ui=browser(existing);await ui.go('T01');const count=existing.size;
 ui.$('transition-year').value='2028';await ui.$('transition-year').emit('change');assert.equal(ui.$('transition-run').value,b.run.id);assert.equal(existing.size,count);
 ui.$('transition-year').value='2027';await ui.$('transition-run-continue').click();assert.equal(ui.$('transition-run').value,a.run.id);assert.equal(existing.size,count);
});

test('choose Practice before changing the year preserves the intended new-checklist purpose',async()=>{
 const ui=browser();await ui.go('T01');ui.$('transition-run-mode').value='rehearsal';ui.$('transition-year').value='2028';await ui.$('transition-year').emit('change');
 assert.equal(ui.$('transition-run-mode').value,'rehearsal');await ui.$('transition-run-form').emit('submit');
 const result=JSON.parse(ui.existing.get(state.storageKey('2028-2029',ui.$('transition-run').value)));assert.equal(result.run.mode,'rehearsal');
});

 test('completion button records the step only after its reviews and navigation does not advance progress',async()=>{
 const ui=browser();await ui.$('transition-run-form').emit('submit');
 const finish=()=>ui.$('transition-steps').find(n=>n.tagName==='button'&&n.textContent==='Mark step complete');
 assert.equal(finish().disabled,true);const before=ui.$('transition-progress').value;
 await ui.$('transition-next').emit('click');assert.equal(ui.$('transition-progress').value,before);await ui.go('T01');
 await ui.choose('V20','passed');assert.equal(finish().disabled,false);const reviews=ui.$('transition-progress').value;
 await finish().click();assert.equal(ui.saved().steps.T01,'complete');assert.equal(ui.$('transition-progress').value,reviews+1);
 });

test('reload keeps the selected non-default year and its saved progress',async()=>{
 const ui=browser();ui.$('transition-year').value='2040';ui.$('transition-run-mode').value='rehearsal';await ui.$('transition-run-form').emit('submit');await ui.choose('V20','passed');
 const again=browser(ui.existing);assert.equal(again.$('transition-guide-year').textContent,'2040–2041');assert.equal(again.$('transition-progress').value,1);assert.equal(again.$('transition-run-mode').value,'rehearsal');
});

test('first upgraded load restores latest valid saved year without a year pointer',async()=>{
 const ui=browser();ui.$('transition-year').value='2040';ui.$('transition-run-mode').value='rehearsal';await ui.$('transition-run-form').emit('submit');await ui.choose('V20','passed');
 ui.existing.delete('asmeHubTransitionSelectedYearV2');ui.existing.set(state.storageKey('2042-2043','bad'),JSON.stringify({year:'2042-2043',savedAt:'2099-01-01'}));
 const again=browser(ui.existing);assert.equal(again.$('transition-guide-year').textContent,'2040–2041');assert.equal(again.$('transition-progress').value,1);
});


test("student walkthrough is the first help destination for initial steps", async () => {
 const ui=browser();
 for (const [id,anchor] of [["T01","1-choose-your-year"],["T02","2-prepare-this-years-files"],["T03","3-check-attendance-and-finances"]]) {
  await ui.go(id);
  const help=ui.$("transition-steps").find(n=>n.className==="transition-maintainer-resources");
  const first=help.find(n=>n.tagName==="a");assert.ok(first.href.endsWith(`student-walkthrough.md#${anchor}`));
  const glossary=ui.$("transition-steps").find(n=>n.className==="transition-glossary");
  assert.ok(glossary.find(n=>n.tagName==="details"&&n.find(c=>c.tagName==="summary")));
 }
});

test("each Step 2 manual review has a comparison row in both modes without saving a pass", async () => {
 for (const mode of ["production","rehearsal"]) {
  const ui=browser();ui.$("transition-run-mode").value=mode;await ui.$("transition-run-form").emit("submit");await ui.go("T02");
  const map=ui.$("transition-steps").find(n=>n.className==="transition-review-map");
  const rows=map.find(n=>n.tagName==="tbody").children;
  const ids=definitions.TRANSITION_CHECKS.filter(c=>c.step==="T02"&&state.checkApplies(c,mode)).map(c=>c.id);
  assert.deepEqual(rows.map(n=>n.dataset.review).sort(),ids.sort());
  for (const row of rows) {assert.equal(row.children.length,4);assert.ok(row.children.every(n=>n.textContent.length));assert.equal(row.children[0].attrs.scope,"row");}
  assert.deepEqual(ui.saved().checks,{});
  assert.match(rows.find(n=>n.dataset.review==="V07").textContent,/A:T/);
  assert.match(rows.find(n=>n.dataset.review==="V21").textContent,/2027-08-01.*2028-07-31/);
  await ui.$("transition-print").click();assert.ok(ui.$("transition-print-sheet").find(n=>n.className==="transition-review-map"));
 }
});

test("selected-year Practice dates and explicit communications tasks match screen and print", async () => {
 for (const year of ["2027-2028","2035-2036"]) {
  const ui=browser();ui.$("transition-year").value=year.slice(0,4);ui.$("transition-run-mode").value="rehearsal";await ui.$("transition-run-form").emit("submit");
  await ui.go("T03");await ui.$("transition-print").click();
  const start=Number(year.slice(0,4));
  for (const text of [ui.$("transition-steps").textContent,ui.$("transition-print-sheet").textContent]) {
   assert.ok(text.includes(`${start}-09-15`));assert.ok(text.includes(`${start+1}-01-15`));assert.doesNotMatch(text,/\{(?:fall|spring)EventDate\}/);
  }
  await ui.go("T04");const procedure=ui.$("transition-steps").find(n=>n.className==="transition-procedure");
  assert.deepEqual(procedure.children.map(n=>n.textContent),definitions.TRANSITION_STEPS.find(s=>s.id==="T04").instructions);
  const title=definitions.TRANSITION_STEPS.find(s=>s.id==="T05").title;
  await ui.go("T05");assert.equal(ui.$("transition-steps").find(n=>n.tagName==="h3").textContent,title);
  assert.ok(ui.$("transition-step-picker").children.find(n=>n.value==="T05").textContent.includes(title));
  await ui.$("transition-print").click();assert.ok(ui.$("transition-print-sheet").find(n=>n.tagName==="h2"&&n.textContent.includes(title)));
 }
});

test("recovery aid uses current import control and parseable schema excerpts in screen and print", async () => {
 const ui=browser();ui.$("transition-run-mode").value="rehearsal";await ui.$("transition-run-form").emit("submit");await ui.go("T04");
 const label=ui.$("transition-dialog").find(n=>n.tagName==="label"&&n.textContent.startsWith("Import private links backup"));assert.equal(label.find(n=>n.tagName==="input").type,"file");
 const screen=ui.$("transition-steps").find(n=>n.className==="transition-backup-examples");
 const excerpts=screen.children.filter(n=>n.tagName==="pre").map(n=>JSON.parse(n.textContent));
 assert.equal(excerpts.length,3);assert.equal(excerpts[0].year,"2027-2028");assert.ok(excerpts[0].run.name);assert.ok(excerpts[0].notes.T01);
 assert.ok(new URL(excerpts[1].links.pointsMaster));assert.ok(excerpts[2].state.fields["s-subject"]);assert.ok(excerpts[2].state.fields["s-preheader"]);assert.ok(excerpts[2].state.events[0].title);
 await ui.$("transition-print").click();const print=ui.$("transition-print-sheet").find(n=>n.className==="transition-backup-examples");assert.equal(print.textContent,screen.textContent);
 await importMock(ui);await ui.$("transition-dialog").find(n=>n.id==="transition-annual-links-form").emit("submit");assert.equal(Object.keys(JSON.parse(ui.existing.get(`${links.annualLinkStorageKey("2027-2028")}:${ui.saved().run.id}`)).links).length,7);
});

test("remaining-work action announces counts repeatedly and groups only applicable reviews", async () => {
 for (const [mode,count] of [["production",20],["rehearsal",16]]) {
  const ui=browser();ui.$("transition-run-mode").value=mode;await ui.$("transition-run-form").emit("submit");await ui.go("T05");
  const groups=ui.$("transition-steps").find(n=>n.className==="transition-pending-reviews");
  assert.equal(groups.children.filter(n=>n.className==="transition-pending-group").flatMap(n=>n.find(c=>c.tagName==="ul")?.children||[]).length,count);
  for(let repeat=0;repeat<2;repeat++) {await ui.$("transition-next").click();assert.ok(ui.$("transition-status").textContent.includes(`${count} reviews remain`));assert.ok(ui.$("transition-status").textContent.length<320);}
  const group=groups.children.find(n=>n.dataset.step==="T03");await group.find(n=>n.tagName==="button").click();assert.equal(ui.$("transition-step-picker").value,"T03");
 }
});


function connectedFixture(options = {}) {
 const config = { rootFolderId: "fixture_folder", controlCenterId: "fixture_center", configRevision: "revision-1", engagementGoal: 120, goalSource: "Saved chapter setup", workspaceMode: "production", existing: false, ...options.config };
 const handoff=mockHandoff();delete handoff.mock;
 const result={success:true,targetYear:"2027-2028",hubHandoff:JSON.stringify(handoff),readableReceipt:"Fixture setup summary"};
 const calls=[];
 const client={ready:true,connect:async()=>{},call:async(name,parameters)=>{calls.push({name,parameters});return name==="getAnnualSetupConfig"?config:options.run?options.run():result;}};
 return {client,config,result,calls};
}
const connectedPanel=ui=>ui.$("transition-steps").find(n=>n.dataset.annualSetup==="connected");
const setupButton=(ui,label)=>connectedPanel(ui).find(n=>n.tagName==="button"&&n.textContent===label);
const connectSetup=ui=>setupButton(ui,"Sign in with chapter Google account").click();
const runSetup=ui=>setupButton(ui,"Create or reopen this year’s files").click();
function deferredSetup() { let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve}; }

test("connected Annual Setup saves seven links and preserves manual review gating", async()=>{
 const fixture=connectedFixture();const ui=browser(new Map(),[],false,fixture.client);await ui.go("T02");
 await connectSetup(ui);
 const goal=connectedPanel(ui).find(n=>n.tagName==="input");assert.equal(goal.value,120);assert.equal(goal.readOnly,false);
 goal.value="135";await goal.emit("input");
 await runSetup(ui);
 assert.deepEqual(fixture.calls.map(c=>c.name),["getAnnualSetupConfig","runAnnualSetup"]);
 assert.equal(fixture.calls[1].parameters[0],"2027-2028");
 assert.deepEqual(JSON.parse(JSON.stringify(fixture.calls[1].parameters[1])),{engagementGoal:135,mode:"production",rootFolderId:"fixture_folder",controlCenterId:"fixture_center",configRevision:"revision-1"});
 const saved=JSON.parse(ui.existing.get(`${links.annualLinkStorageKey("2027-2028")}:${ui.saved().run.id}`));assert.equal(Object.keys(saved.links).length,7);assert.deepEqual(ui.saved().checks,{});
 assert.equal(connectedPanel(ui).find(n=>n.tagName==="input").readOnly,true);
 assert.ok(connectedPanel(ui).find(n=>n.tagName==="pre"&&n.textContent===fixture.result.readableReceipt));
});

test("connected setup rejects a changed checklist while retaining any native result for same-year retry", async()=>{
 const pending=deferredSetup(),fixture=connectedFixture({run:()=>pending.promise});const ui=browser(new Map(),[],false,fixture.client);await ui.go("T02");await connectSetup(ui);
 const original=ui.$("transition-run").value;const running=runSetup(ui);
 assert.equal(setupButton(ui,"Create or reopen this year’s files").disabled,true);
 ui.$("transition-run-name").value="Other checklist";await ui.$("transition-run-form").emit("submit");
 pending.resolve(fixture.result);await running;
 assert.notEqual(ui.saved().run.id,original);
 assert.equal([...ui.existing.keys()].filter(k=>k.startsWith(links.annualLinkStorageKey("2027-2028"))).length,0);
 assert.match(ui.$("transition-status").textContent,/selected year or checklist changed/);
});

test("connected setup preserves concurrent saved links and unsaved field edits", async()=>{
 for (const savedElsewhere of [true,false]) {
  const pending=deferredSetup(),fixture=connectedFixture({run:()=>pending.promise});const ui=browser(new Map(),[],false,fixture.client);await ui.go("T02");await connectSetup(ui);
  const running=runSetup(ui),key=`${links.annualLinkStorageKey("2027-2028")}:${ui.$("transition-run").value}`;
  const newer=JSON.stringify({schema:1,type:links.ANNUAL_HANDOFF_TYPE,year:"2027-2028",links:{}});
  const input=ui.$("transition-dialog").find(n=>n.tagName==="input"&&n.attrs["aria-label"]==="Points Master (officer edit link)");
  if (savedElsewhere) ui.existing.set(key,newer);else input.value="https://docs.google.com/spreadsheets/d/unsaved_private_edit/edit";
  pending.resolve(fixture.result);await running;
  if(savedElsewhere) assert.equal(ui.existing.get(key),newer);else {assert.equal(ui.existing.get(key),undefined);assert.ok(input.value.includes("unsaved_private_edit"));}
 }
});

test("connected setup blocks mismatched workspace and keeps existing annual goals readonly", async()=>{
 const mismatch=connectedFixture({config:{workspaceMode:"rehearsal"}});const ui=browser(new Map(),[],false,mismatch.client);await ui.go("T02");await connectSetup(ui);
 assert.equal(setupButton(ui,"Create or reopen this year’s files").disabled,true);await runSetup(ui);assert.equal(mismatch.calls.filter(c=>c.name==="runAnnualSetup").length,0);
 assert.match(connectedPanel(ui).textContent,/workspace purpose does not match/);
 const existing=connectedFixture({config:{existing:true,engagementGoal:88}});const resumed=browser(new Map(),[],false,existing.client);await resumed.go("T02");await connectSetup(resumed);
 const goal=connectedPanel(resumed).find(n=>n.tagName==="input");assert.equal(goal.readOnly,true);goal.value="999";await runSetup(resumed);assert.equal(existing.calls[1].parameters[1].engagementGoal,88);
});

test("connected setup failure restores controls and retry uses the same annual identities", async()=>{
 let attempts=0;const fixture=connectedFixture({run:()=>{if(++attempts===1)throw new Error("Authorization expired");return fixture.result;}});
 const ui=browser(new Map(),[],false,fixture.client);await ui.go("T02");await connectSetup(ui);await runSetup(ui);
 assert.equal(setupButton(ui,"Create or reopen this year’s files").disabled,false);assert.match(connectedPanel(ui).textContent,/same year and workspace/);
 await runSetup(ui);const calls=fixture.calls.filter(c=>c.name==="runAnnualSetup");assert.equal(calls.length,2);assert.deepEqual(calls[0].parameters,calls[1].parameters);
});


test("connected setup rejects results with a different year or Practice tool context", async()=>{
 for (const wrongYear of [true,false]) {
  const fixture=connectedFixture();if(wrongYear)fixture.result.targetYear="2028-2029";else fixture.result.hubHandoff=JSON.stringify(mockHandoff());
  const ui=browser(new Map(),[],false,fixture.client);await ui.go("T02");await connectSetup(ui);await runSetup(ui);
  assert.equal([...ui.existing.keys()].filter(k=>k.startsWith(links.annualLinkStorageKey("2027-2028"))).length,0);
  assert.equal(setupButton(ui,"Create or reopen this year’s files").disabled,false);
 }
});
