import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const now = 1_800_000_000_000;
function productionSection(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `Production startup section: ${start}`);
  return source.slice(a, b);
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
function startup(stored) {
  const settings = deferred(), resources = deferred();
  const state = { now, focusCount: 0, dashboardLoads: 0, resourceReads: 0, gateVisibility: [] };
  const storage = new Map(stored === undefined ? [] : [['asmeHubUnlockedUntil', String(stored)]]);
  let gateHidden = true;
  const gate = {
    get hidden() { return gateHidden; },
    set hidden(value) { gateHidden = value; state.gateVisibility.push(!value); },
  };
  class Clock extends Date { static now() { return state.now; } }
  const context = {
    Date: Clock, Event,
    unlockStorageKey: 'asmeHubUnlockedUntil', roleStorageKey: 'role', themeStorageKey: 'theme', sidebarStorageKey: 'sidebar',
    config: {}, sharedSettingsReady: Promise.resolve(), dashboardLoadController: null, dashboardLoadGeneration: 0,
    localStorage: { getItem() { return null; } },
    sessionStorage: { getItem: key => storage.get(key) ?? null, removeItem: key => storage.delete(key) },
    elements: { gate, appShell: { hidden: true }, loadingLayer: { hidden: false }, academicYear: { value: '2026-2027' }, password: { focus() { state.focusCount++; } } },
    document: { dispatchEvent() {}, querySelector() { return null; } },
    window: { matchMedia() { return { matches: false }; }, location: { hash: '' }, requestAnimationFrame(done) { done(); }, setTimeout(done) { done(); } },
    showRandomMeetingQuote() {}, populateOfficerRoles() {}, populatePersonalRoleControls() {}, applyOfficerRole() {}, applyTheme() {}, populateYears() {}, setupNavigation() {}, applySidebarState() {}, setMobileNavigation() {}, setActiveMobileSection() {}, refreshNavigation() {},
    loadSharedYearSources() { return settings.promise; },
    refreshSharedResources() { state.resourceReads++; return resources.promise; },
    async loadDashboard() { state.dashboardLoads++; context.showLoading(false); },
  };
  const sections = [
    productionSection('  function getUnlockedUntil(', '\n  function showRandomMeetingQuote('),
    productionSection('  function showGate(', '\n  function clearDashboardState('),
    productionSection('  function showLoading(', '\n  function spreadsheetIdFrom('),
    productionSection('  async function initialize(', '\n  document.getElementById("shared-resources-refresh")'),
  ];
  const api = vm.runInNewContext(`${sections.join('\n')}\n({ initialize, showGate })`, context);
  return { api, state, elements: context.elements, settings, resources, storage };
}
async function finish(run, pending) {
  run.settings.resolve();
  await Promise.resolve();
  run.resources.resolve();
  await pending;
}

test('initial HTML never paints sign-in before the session check', () => {
  const gate = html.match(/<section\b[^>]*\bid="access-gate"[^>]*>/)?.[0];
  const loader = html.match(/<div\b[^>]*\bid="loading-layer"[^>]*>/)?.[0];
  assert.ok(gate && loader);
  assert.match(gate, /\bhidden\b/);
  assert.doesNotMatch(loader, /\bhidden\b/);
  assert.match(loader, /role="status"/);
});

test('a valid saved session never reveals sign-in during delayed settings and resource reads', async () => {
  const run = startup(now + 60_000);
  const pending = run.api.initialize();
  assert.equal(run.elements.gate.hidden, true);
  assert.equal(run.elements.loadingLayer.hidden, false);
  assert.equal(run.elements.appShell.hidden, true);
  run.settings.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(run.state.resourceReads, 1);
  assert.equal(run.elements.gate.hidden, true);
  assert.equal(run.elements.loadingLayer.hidden, false);
  run.resources.resolve();
  await pending;
  assert.equal(run.elements.appShell.hidden, false);
  assert.equal(run.elements.loadingLayer.hidden, true);
  assert.equal(run.state.dashboardLoads, 1);
  assert.equal(run.state.gateVisibility.includes(true), false);
});

for (const [name, stored] of [['missing', undefined], ['expired', now - 1], ['invalid', 'not-a-timestamp']]) {
  test(`${name} session shows sign-in immediately without waiting for Google`, async () => {
    const run = startup(stored);
    const pending = run.api.initialize();
    assert.equal(run.elements.gate.hidden, false);
    assert.equal(run.elements.appShell.hidden, true);
    assert.equal(run.elements.loadingLayer.hidden, true);
    assert.equal(run.state.focusCount, 1);
    await finish(run, pending);
    assert.equal(run.state.dashboardLoads, 0);
    assert.equal(run.state.focusCount, 1, 'Network completion must not steal focus again');
    assert.equal(run.storage.has('asmeHubUnlockedUntil'), false);
  });
}

test('session expiry during startup still requires sign-in', async () => {
  const run = startup(now + 60_000);
  const pending = run.api.initialize();
  run.state.now += 120_000;
  await finish(run, pending);
  assert.equal(run.elements.gate.hidden, false);
  assert.equal(run.elements.loadingLayer.hidden, true);
  assert.equal(run.state.dashboardLoads, 0);
});

test('locking while startup is pending cannot reopen the dashboard when Google responds', async () => {
  const run = startup(now + 60_000);
  const pending = run.api.initialize();
  run.api.showGate();
  assert.equal(run.elements.loadingLayer.hidden, true);
  await finish(run, pending);
  assert.equal(run.elements.gate.hidden, false);
  assert.equal(run.elements.appShell.hidden, true);
  assert.equal(run.state.dashboardLoads, 0);
});
