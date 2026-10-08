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
function browser(existing = new Map(), resourceSnapshot = [], failSelection = false) {
  const ids = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], new Element()]));
  const $ = id => { assert.ok(ids.has(id), `Production HTML must provide ${id}`); return ids.get(id); };
  const dialog = $("transition-dialog");
  const body = new Element(); body.className = "transition-dialog-body";
  const tools = new Element(); tools.className = "transition-tools";
  dialog.append(body); body.append(tools);
  $("transition-run-mode").value = "rehearsal";
  const localStorage = { get length() { return existing.size; }, key: index => [...existing.keys()][index], getItem: key => existing.get(key) ?? null, setItem: (key, value) => { if (failSelection && key.startsWith("asmeHubTransitionSelectedRunV2:")) throw new Error("Selection storage unavailable"); existing.set(key, value); }, removeItem: key => existing.delete(key) };
  const documentListeners = new Map();
  const dispatched = [];
  const document = { getElementById: $, createElement: tag => new Element(tag), createElementNS: (_ns, tag) => new Element(tag), activeElement: null, body: new Element(), addEventListener(name, callback) { documentListeners.set(name, callback); }, dispatchEvent(event) { dispatched.push(event); documentListeners.get(event.type)?.(event); } };
  const window = { ASME_SHARED_RESOURCES: globalThis.ASME_SHARED_RESOURCES, ASME_TRANSITION_RESOURCE_SNAPSHOT: !Array.isArray(resourceSnapshot) ? resourceSnapshot : null, ASME_TRANSITION_RESOURCES: Array.isArray(resourceSnapshot) ? resourceSnapshot : resourceSnapshot.resources, ASME_HUB_CONFIG: { currentAcademicYear: "2026-2027" }, addEventListener() {}, print() {} };
  const context = { ...state, ...definitions, ...links, document, window, localStorage, Option: function(text, value) { const node = new Element("option"); node.textContent = text; node.value = value; return node; }, Date, URL, Blob, setTimeout: () => {}, CustomEvent: function(type, options) { this.type=type; this.detail=options?.detail; } };
  vm.runInNewContext(source, context, { filename: "transition.js" });
  const control = id => $("transition-steps").querySelector(`[data-transition-control="${id}"]`);
  const go = async id => { $("transition-step-picker").value = id; await $("transition-step-picker").emit("change"); };
  const choose = async (id, value) => { const element = control(id); assert.ok(element, `Rendered control ${id}`); element.value = value; await element.emit("change"); };
  const reason = async (id, text) => {
    const form = $("transition-steps").find(node => node.className === "transition-evidence" && node.textContent.startsWith(`${id} disposition`));
    assert.ok(form, `Evidence form ${id}`); form.find(node => node.tagName === "textarea").value = text; await form.emit("submit");
  };
  const saved = () => { const id = $("transition-run").value; return JSON.parse(existing.get(state.storageKey("2027-2028", id))); };
  return { $, go, choose, reason, saved, existing, document, window, dispatched };
}

const mockHandoff = () => ({schema:1,type:links.ANNUAL_HANDOFF_TYPE,year:"2027-2028",links:{pointsMaster:"annual_points_1234567890123456",pointsExport:"annual_export_1234567890123456",budgetTracker:"annual_budget_1234567890123456",budgetExport:"budget_export_1234567890123456",annualFolder:"https://drive.google.com/drive/folders/annual_folder_1234567890123456",attendanceFormEditor:"https://docs.google.com/forms/d/annual_form_123456789012345678/edit",attendanceFormRespondent:"https://docs.google.com/forms/d/e/annual_respondent_1234567890123456/viewform"},mock:{controlCenterUrl:"https://docs.google.com/spreadsheets/d/private_mock_center_1234567890/edit",scriptProjectUrl:"https://script.google.com/home/projects/private_mock_script_1234567890/edit"}});
async function importMock(ui, value=mockHandoff()) {
 await ui.go("T02"); const input=ui.$("transition-dialog").find(node=>node.tagName==="input"&&node.type==="file");
 const text=JSON.stringify(value);input.files=[{size:text.length,text:async()=>text}];await input.emit("change");
}
const reviewMock=ui=>ui.$("transition-steps").find(node=>node.tagName==="button"&&node.textContent==="Review private mock settings").click();

test("rehearsal review opens only its private provisioner-owned source and never transfers to legacy save",async()=>{
 const ui=browser();ui.$("transition-run-name").value="Private fixture";await ui.$("transition-run-form").emit("submit");await importMock(ui);await reviewMock(ui);
 const key=links.annualLinkStorageKey("2027-2028")+":"+ui.saved().run.id;
 const draft=JSON.parse(ui.existing.get(key));assert.equal(draft.mock.controlCenterUrl,mockHandoff().mock.controlCenterUrl);
 assert.equal(ui.dispatched.filter(event=>event.type==="transition:annual-settings-draft").length,0);
 assert.equal(ui.$("transition-steps").find(node=>node.href===draft.mock.controlCenterUrl)?.target,"_blank");
 assert.match(ui.$("transition-steps").textContent,/does not save a Google row or run the provisioner/);
 const exported=state.exportProgress(ui.saved(),definitions.TRANSITION_STEPS,definitions.TRANSITION_CHECKS);
 assert.doesNotMatch(exported,/private_mock_center|private_mock_script|annual_points/);
 await ui.$("transition-print").click();assert.doesNotMatch(ui.$("transition-print-sheet").textContent,/private_mock_center|private_mock_script|annual_points/);
 const reload=browser(ui.existing);await reload.go("T02");assert.ok(reload.$("transition-steps").find(node=>node.href===draft.mock.controlCenterUrl));
 reload.$("transition-run-name").value="Other fixture";await reload.$("transition-run-form").emit("submit");await reload.go("T02");
 assert.equal(reload.$("transition-steps").find(node=>node.href===draft.mock.controlCenterUrl),null);
 assert.equal(JSON.parse(ui.existing.get(key)).mock.controlCenterUrl,draft.mock.controlCenterUrl);
});

test("mock review requires seven links and a separate center; stale context cannot overwrite newer run evidence",async()=>{
 const a=browser();a.$("transition-run-name").value="Mock context";await a.$("transition-run-form").emit("submit");await a.go("T02");await reviewMock(a);assert.match(a.$("transition-steps").textContent,/Enter all seven/);
 await importMock(a);await reviewMock(a);const b=browser(a.existing);await b.go("T02");
 const centerInput=ui=>ui.$("transition-steps").find(node=>node.tagName==="label"&&node.textContent.startsWith("Private mock Control Center")).find(node=>node.tagName==="input");
 centerInput(a).value="https://docs.google.com/spreadsheets/d/new_private_mock_center_1234567890/edit";await reviewMock(a);
 const key=links.annualLinkStorageKey("2027-2028")+":"+a.saved().run.id,newer=a.existing.get(key);await reviewMock(b);
 assert.equal(a.existing.get(key),newer);assert.match(b.$("transition-steps").textContent,/changed in another tab/);
});

test("production retains its separate transfer action and rejects private mock context",async()=>{
 const ui=browser();ui.$("transition-run-name").value="Production review";ui.$("transition-run-mode").value="production";await ui.$("transition-run-form").emit("submit");
 await importMock(ui);const action=()=>ui.$("transition-steps").find(node=>node.tagName==="button"&&node.textContent==="Review new-year settings");await action().click();
 assert.match(ui.$("transition-steps").textContent,/Production settings cannot use the mock context/);assert.equal(ui.dispatched.filter(e=>e.type==="transition:annual-settings-draft").length,0);
 const value=mockHandoff();delete value.mock;await importMock(ui,value);await action().click();
 assert.equal(ui.dispatched.filter(e=>e.type==="transition:annual-settings-draft").length,1);
});

test("five-step mock UI permits skips and later checks but denies activation", async()=>{
 const ui=browser();ui.$("transition-run-name").value="Five-step rehearsal";await ui.$("transition-run-form").emit("submit");
 await ui.go("T02");await ui.choose("T02","skipped");assert.equal(ui.saved().steps.T02,undefined);
 await ui.reason("T02","Mock setup skipped");await ui.choose("T02","skipped");assert.equal(ui.$("transition-next").disabled,false);assert.equal(ui.$("transition-dialog").dataset.mockMode,"true");
 await ui.$("transition-next").click();assert.equal(ui.$("transition-step-picker").value,"T03");
 await ui.go("T04");await ui.choose("V08","passed");await ui.choose("V09","passed");await ui.choose("T04","complete");
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
  await ui.go("T01"); await ui.choose("V10", "passed"); await ui.choose("T01", "complete");
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
  const ui = browser();
  ui.$("transition-run-name").value = "Copy set A"; await ui.$("transition-run-form").emit("submit");
  const a = ui.saved().run.id;
  await ui.go("T02");
  const label = ui.$("transition-steps").find(node => node.tagName === "label" && node.textContent.startsWith("Points Master (officer edit link)"));
  label.find(node => node.tagName === "input").value = "https://docs.google.com/spreadsheets/d/abcdefghijklmnopqrstuvwxyz123456789/edit";
  const form = ui.$("transition-dialog").find(node => node.id === "transition-annual-links-form");
  await form.emit("submit");
  const key = `${links.annualLinkStorageKey("2027-2028")}:${a}`;
  assert.match(ui.existing.get(key), /abcdefghijklmnopqrstuvwxyz/);
  ui.$("transition-run-name").value = "Copy set B"; await ui.$("transition-run-form").emit("submit");
  await ui.go("T02");
  const bLabel = ui.$("transition-steps").find(node => node.tagName === "label" && node.textContent.startsWith("Points Master (officer edit link)"));
  assert.equal(bLabel.find(node => node.tagName === "input").value, "");
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
 const findInput=ui=>ui.$("transition-steps").find(node=>node.tagName==="label"&&node.textContent.startsWith("Points Master (officer edit link)")).find(node=>node.tagName==="input");
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
 const label=reload.$("transition-steps").find(node=>node.tagName==="label"&&node.textContent.startsWith("Points Master (officer edit link)"));
 assert.equal(label.find(node=>node.tagName==="input").value,"");
});


test('named sixteen-step production migration preserves raw original and cannot authorize launch', async()=>{
 const old={version:2,guideVersion:'officer-transition-guide-6',year:'2027-2028',run:state.createTransitionRun('Historical production','production','older'),savedAt:null,steps:Object.fromEntries(Array.from({length:16},(_,i)=>['T'+String(i+1).padStart(2,'0'),'complete'])),checks:Object.fromEntries(definitions.TRANSITION_CHECKS.map(c=>[c.id,'passed'])),reasons:{},notes:{T16:'Historical cleanup receipt'}};
 const raw=JSON.stringify(old),key=state.storageKey(old.year,'older');
 const existing=new Map([[key,raw]]),ui=browser(existing);
 assert.equal(existing.get(key),raw);await ui.go('T05');await ui.choose('T05','complete');assert.equal(existing.get(key),raw);
 await ui.go('T01');await ui.choose('V10','passed');
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
