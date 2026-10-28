import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Execute the complete production closure with a small DOM and Google JSONP
// transport. Only initialize() is replaced to expose functions; no calculations
// or renderers are substituted. This is runtime coverage, not a native Sheet or
// ordinary browser acceptance receipt.
const appSource = readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const sharedSource = readFileSync(new URL('../assets/js/shared-resources.js', import.meta.url), 'utf8');
const eventHeaders = ['event_id', 'event_name', 'event_date', 'event_type', 'attendance', 'form_status', 'event_status', '', 'metric', 'value', 'status', 'detail'];
const monthHeaders = ['month_key', 'month_label', 'month_start', 'unique_attendees', 'total_checkins', 'events_held', 'average_turnout', 'repeat_attendees', 'repeat_rate', 'new_attendees', 'top_event_type', 'top_event_name', 'top_event_attendance', 'last_updated', 'highly_engaged_attendees'];
const semesterHeaders = ['period_key', 'period_label', 'period_start', ...monthHeaders.slice(3)];
const row = values => ({ c: values.map(v => ({ v })) });
const table = (headers, rows = []) => ({ cols: headers.map(label => ({ label })), rows });
function pointFeeds(year, events = [], status = 'LIVE') {
  const startYear = Number(year.slice(0, 4));
  const periodRow = (key, label, date) => row([key, label, date, 0, 0, 0, 0, 0, 0, 0, '—', '—', 0, 'Date(2026,9,7)', 0]);
  return {
    System_Status: table(['setting', 'public_value'], [row(['system_status', status])]),
    Leaderboard_Public: table(Array(9).fill('')),
    Event_Metrics_Public: table(eventHeaders, [
      ...events.map(event => row([event.id, event.name, event.date, 'Technical Workshop', event.attendance, 'Closed', 'Approved'])),
      row(['', '', '', '', '', '', '', '', 'last_updated', 'Date(2026,9,7)', 'LIVE', 'Public aggregate']),
      row(['', '', '', '', '', '', '', '', 'open_review_items', 0, 'LIVE', '']),
      row(['', '', '', '', '', '', '', '', 'past_forms_open', 0, 'LIVE', '']),
    ]),
    Monthly_Metrics_Public: table(monthHeaders, Array.from({ length: 12 }, (_, index) => {
      const date = new Date(startYear, 7 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return periodRow(key, key, `Date(${date.getFullYear()},${date.getMonth()},1)`);
    })),
    Semester_Metrics_Public: table(semesterHeaders, [periodRow('fall', `Fall ${startYear}`, `Date(${startYear},7,1)`), periodRow('spring', `Spring ${startYear + 1}`, `Date(${startYear + 1},0,1)`)]),
  };
}
const sourceFor = year => ({ label: year.replace('-', '–'), attendanceSheetUrl: `https://docs.google.com/spreadsheets/d/points-${year}-123456789012345/edit`, pointsMasterUrl: `https://docs.google.com/spreadsheets/d/master-${year}-123456789012345/edit`, budgetTrackerUrl: `https://docs.google.com/spreadsheets/d/budget-${year}-123456789012345/edit`, engagementGoal: 100 });
function runtime(feeds = {}, socialFeed = null, Clock = Date) {
  const nodes = new Map();
  const requests = [];
  const failures = [];
  const listeners = {};
  const dispatched = [];
  const classes = () => { const values = new Set(); return { add(...names) { names.forEach(name => values.add(name)); }, remove(...names) { names.forEach(name => values.delete(name)); }, toggle(name, force) { const on = force ?? !values.has(name); if (on) values.add(name); else values.delete(name); return on; }, contains: name => values.has(name) }; };
  const element = (tag = 'div') => ({
    tagName: tag.toUpperCase(), children: [], get options() { return this.children; }, attributes: {}, dataset: {}, classList: classes(), hidden: false, textContent: '', value: '', style: { setProperty(name, value) { this[name] = value; } },
    append(...items) { this.children.push(...items); }, appendChild(item) { this.children.push(item); return item; },
    replaceChildren(...items) { this.children = items; },
    setAttribute(name, value) { this.attributes[name] = String(value); }, removeAttribute(name) { delete this.attributes[name]; }, getAttribute(name) { return this.attributes[name] ?? null; },
    events: {}, addEventListener(name, callback) { this.events[name] = callback; }, removeEventListener() {}, setCustomValidity(message) { this.validationMessage = message; }, reportValidity() { this.validityReports = (this.validityReports || 0) + 1; return !this.validationMessage; }, querySelector(selector) { return selector === '.hub-search-result' ? this.children.find(child => child.className === 'hub-search-result') || null : null; }, querySelectorAll() { return []; }, closest() { return null; }, contains() { return false; }, remove() {}, focus() { document.activeElement = this; },
    getBoundingClientRect() { return { width: 760, height: 285 }; },
    parentElement: { setAttribute() {}, hidden: false, querySelector() { return null; }, append() {} },
  });
  const node = id => { if (!nodes.has(id)) nodes.set(id, element(id === 'period-filter' ? 'select' : 'div')); return nodes.get(id); };
  const document = { title: 'Fixture', body: element(), getElementById: node, createElement: element, createTextNode(text) { return { textContent: text }; }, createElementNS: (_ns, tag) => element(tag), querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, dispatchEvent(event) { dispatched.push(event); return true; } };
  const config = { currentAcademicYear: '2026-2027', access: {}, dataSources: { '2026-2027': sourceFor('2026-2027'), '2027-2028': sourceFor('2027-2028') }, resources: [{ id: 'budget-tracker', title: '2026–2027 Budget Tracker', label: 'Open budget', category: 'Finance', settingKey: 'budgetTrackerUrl', quickAction: { label: 'Budget tracker', detail: '2026–2027 workbook' } }] };
  const storage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const window = { ASME_HUB_CONFIG: config, location: { protocol: 'https:', hash: '', href:'https://example.test/' }, setTimeout, clearTimeout, matchMedia() { return { matches: false, addEventListener() {} }; }, addEventListener(name, callback) { listeners[name] = callback; }, removeEventListener() {}, requestAnimationFrame(callback) { callback(); }, scrollTo() {} };
  document.head = { appendChild(script) {
    const url = new URL(script.src), sheet = url.searchParams.get('sheet');
    const callbackName = url.searchParams.get('tqx').match(/responseHandler:([^;]+)/)[1];
    const year = url.pathname.includes('2027-2028') ? '2027-2028' : '2026-2027';
    const entry = feeds[year]?.[sheet];
    const callback = window[callbackName];
    const request = { year, sheet, respond(value) { callback(value); } };
    requests.push(request);
    if (entry === 'delayed') return script;
    queueMicrotask(() => { if (entry instanceof Error) script.onerror(); else callback(entry?.status === 'error' ? entry : { table: entry ?? table([]) }); });
    return script;
  } };
  function Option(text, value) { const option = element("option"); option.textContent = text; option.value = value; return option; }
  class CustomEvent extends Event { constructor(type, options) { super(type); this.detail = options.detail; } }
  const fetch = async url => { if (String(url).includes("social-automation.json") && socialFeed?.automation) return {ok:true,json:async()=>socialFeed.automation}; if (String(url).includes("posting-health.json") && socialFeed) return {ok:true,json:async()=>socialFeed}; throw new Error("Fixture feed unavailable"); };
  const sandbox = { fetch, CustomEvent, Option, window, document, sessionStorage: storage, localStorage: storage, AbortController, DOMException, URL, URLSearchParams, Date: Clock, Intl, Math, Promise, Event, setTimeout, clearTimeout, queueMicrotask, console: { warn(...items) { failures.push(items); }, error(...items) { failures.push(items); }, log() {} } };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(new URL("../assets/js/social-health.js", import.meta.url), "utf8"), sandbox);
  window.ASME_SOCIAL_HEALTH = sandbox.ASME_SOCIAL_HEALTH;
  vm.runInNewContext(sharedSource, sandbox);
  window.ASME_SHARED_RESOURCES = sandbox.ASME_SHARED_RESOURCES;
  const source = appSource.replace(/\n  initialize\(\);\n\}\)\(\);\s*$/, `\n  globalThis.testApi = { setActionItems(operations, rolePriorities = [], role = "president") { activeOperations = operations; activeRolePriorities = rolePriorities; selectedOfficerRole = role; activeDashboardData = { kpis: {} }; renderOperations(operations); renderRoleExperience(); }, normalizedCalendarEvents, parseIcalEvents, calendarResult, renderUpcomingEvents, setUpcomingEvents(events, role = "vice_president") { activeUpcomingEvents = events; selectedOfficerRole = role; renderOfficerCommandCenter(); renderRoleBriefing(); }, renderAttendanceChart, renderEventMetricsUnavailable, configureHubSearch, renderHubSearchResults, loadDashboard, loadLeaderboardDashboard, selectedYearPeriods, populatePeriodFilter, renderSelectedPeriod, renderBudget, loadBudgetSummary, resolveYearResources, renderResources, sheetTimestamp, reviewedAnnualSettingsInput, setAnnualBuilders(builder, transfer) { buildAnnualSettingsInput = builder; buildAnnualTransferUrl = transfer; }, queryPublicSheet, setPeriod(value) { selectedPeriod = value; }, setResources(records) { sharedResourceRecords = records; }, state() { return { activeDashboardData, attendanceChartItems, activeBudget }; } };\n})();`);
  vm.runInNewContext(source, sandbox, { filename: 'app.js' });
  return { api: sandbox.testApi, node, nodes, requests, feeds, failures, config, listeners, window, document, dispatched };
}
const allOptions = target => target.children.flatMap(child => child.tagName === 'OPTGROUP' ? child.children : [child]);
const flush = async () => { for (let index = 0; index < 10; index++) await Promise.resolve(); };

test('production empty → configured/attended event → empty and all fourteen review periods', async () => {
  const feeds = { '2027-2028': pointFeeds('2027-2028') };
  const run = runtime(feeds);
  run.node('academic-year').value = '2027-2028';
  const input = { ...sourceFor('2027-2028'), academicYearKey: '2027-2028' };
  let data = await run.api.loadLeaderboardDashboard(input);
  assert.equal(data.meta.eventMetricsAvailable, true);
  assert.equal(data.kpis.eventsHeld, 0);
  assert.equal(data.kpis.averageTurnout, 0);
  assert.equal(data.operations.some(item => /needs attention/.test(item.title)), false);
  await run.api.loadDashboard('2027-2028');
  assert.equal(run.failures.length, 0, run.failures.map(items => items.map(item => item?.stack || String(item)).join(' ')).join('\n'));
  assert.equal(run.node('kpi-events-held').textContent, '0');
  assert.equal(run.node('kpi-average-turnout').textContent, 'No events yet');
  const options = allOptions(run.node('period-filter'));
  assert.equal(options.length, 15);
  assert.deepEqual(options.slice(1, 3).map(item => item.textContent), ['Fall 2027', 'Spring 2028']);
  for (const option of options.slice(1)) {
    run.api.setPeriod(option.value);
    run.api.renderSelectedPeriod();
    assert.equal(run.node('kpi-events-held').textContent, '0');
    assert.equal(run.node('kpi-average-turnout').textContent, 'No events yet');
    assert.match(run.node('attendance-chart-desc').textContent, /No recorded attendance/);
    assert.match(run.node('performance-summary').textContent, /No events/);
  }
  feeds['2027-2028'] = pointFeeds('2027-2028', [{ id: 'event1', name: 'Mock workshop', date: 'Date(2027,8,15)', attendance: 0 }]);
  await run.api.loadDashboard('2027-2028');
  assert.equal(run.node('kpi-events-held').textContent, '0');
  assert.match(run.node('performance-summary').textContent, /1 event/);
  assert.equal(run.api.state().activeDashboardData.health.find(item => item.label === 'Event metrics').detail, '1 configured event');
  feeds['2027-2028'] = pointFeeds('2027-2028', [{ id: 'event1', name: 'Mock workshop', date: 'Date(2027,8,15)', attendance: 1 }]);
  for (const period of [feeds['2027-2028'].Monthly_Metrics_Public.rows[1], feeds['2027-2028'].Semester_Metrics_Public.rows[0]]) {
    for (const index of [3, 4, 5, 6, 9, 12]) period.c[index].v = 1;
    period.c[10].v = 'Technical Workshop'; period.c[11].v = 'Mock workshop';
  }
  feeds['2027-2028'].Leaderboard_Public.rows = [row([1, 'Date(2026,9,7)', 0, 0, 0, 1, 0, 0, 0])];
  await run.api.loadDashboard('2027-2028');
  assert.equal(run.node('kpi-events-held').textContent, '1');
  assert.equal(run.node('kpi-average-turnout').textContent, '1.0');
  assert.match(run.node('attendance-chart-desc').textContent, /Mock workshop, 1 check-ins/);
  for (const option of allOptions(run.node('period-filter')).slice(1)) {
    run.api.setPeriod(option.value); run.api.renderSelectedPeriod();
    const matches = ['fall', '2027-09'].includes(option.value);
    assert.equal(run.node('kpi-events-held').textContent, matches ? '1' : '0');
    assert.equal(run.node('kpi-average-turnout').textContent, matches ? '1.0' : 'No events yet');
    assert.match(run.node('attendance-chart-desc').textContent, matches ? /Mock workshop/ : /No recorded attendance/);
  }
  feeds['2027-2028'] = pointFeeds('2027-2028');
  await run.api.loadDashboard('2027-2028');
  assert.equal(run.node('kpi-events-held').textContent, '0');
  assert.doesNotMatch(run.node('attendance-chart-desc').textContent, /Mock workshop/);
  assert.equal(run.api.state().attendanceChartItems.length, 0);
});

for (const corruption of ['missing headers', 'wrong headers', 'missing rows', 'partial event', 'invalid attendance', 'invalid health', 'network failure']) {
  test(`production event metrics ${corruption} stays unavailable rather than zero`, async () => {
    const feeds = pointFeeds('2027-2028');
    if (corruption === 'missing headers') delete feeds.Event_Metrics_Public.cols;
    if (corruption === 'wrong headers') feeds.Event_Metrics_Public.cols[0].label = 'sign in';
    if (corruption === 'missing rows') delete feeds.Event_Metrics_Public.rows;
    if (corruption === 'partial event') feeds.Event_Metrics_Public.rows.unshift(row(['event1', '', '', '', 0]));
    if (corruption === 'invalid attendance') feeds.Event_Metrics_Public.rows.unshift(row(['event1', 'Mock', 'Date(2027,8,15)', '', '#REF!']));
    if (corruption === 'invalid health') feeds.Event_Metrics_Public.rows[1].c[9].v = '#REF!';
    if (corruption === 'network failure') feeds.Event_Metrics_Public = new Error('restricted');
    const run = runtime({ '2027-2028': feeds });
    const data = await run.api.loadLeaderboardDashboard({ ...sourceFor('2027-2028'), academicYearKey: '2027-2028' });
    assert.equal(data.meta.eventMetricsAvailable, false);
    assert.equal(data.kpis.eventsHeld, null);
    assert.equal(data.kpis.averageTurnout, null);
    assert.equal(data.allEvents.length, 0);
    assert.equal(data.health.find(item => item.label === 'Event metrics').status, 'ACTION');
    assert.match(data.operations.find(item => item.title === 'Event metrics feed needs attention').detail, /Check export sharing/);
  });
}

test('header-only event table is valid empty; a Google error cannot masquerade as empty', async () => {
  const feeds = pointFeeds('2027-2028');
  feeds.Event_Metrics_Public.rows = [];
  const run = runtime({ '2027-2028': feeds });
  const source = { ...sourceFor('2027-2028'), academicYearKey: '2027-2028' };
  assert.equal((await run.api.loadLeaderboardDashboard(source)).kpis.eventsHeld, 0);
  feeds.Event_Metrics_Public = { status: 'error', table: table(eventHeaders) };
  assert.equal((await run.api.loadLeaderboardDashboard(source)).kpis.eventsHeld, null);
});

for (const status of ['TESTING', 'PAUSED']) {
  test(`production ${status} suppresses all member-derived reads`, async () => {
    const run = runtime({ '2027-2028': pointFeeds('2027-2028', [], status) });
    await assert.rejects(run.api.loadLeaderboardDashboard(sourceFor('2027-2028')), /not LIVE/);
    assert.deepEqual(run.requests.map(request => request.sheet), ['System_Status']);
  });
}

test('year switching refreshes metadata before reads, failed → successful reads recover and old totals do not survive', async () => {
  const run = runtime({ '2026-2027': pointFeeds('2026-2027', [{ id: 'old', name: 'Old event', date: 'Date(2026,8,15)', attendance: 191 }]), '2027-2028': pointFeeds('2027-2028') });
  run.feeds['2026-2027'].Leaderboard_Public.rows = [row([191, 'Date(2026,9,7)', 0, 0, 0, 191, 0, 0, 0])];
  run.node('academic-year').value = '2026-2027';
  await run.api.loadDashboard('2026-2027');
  assert.match(run.node('goal-ring').attributes['aria-label'], /1 of 100/);
  assert.match(run.node('event-type-donut').attributes['aria-label'], /191/);
  run.node('academic-year').value = '2027-2028';
  run.feeds['2027-2028'].System_Status = new Error('restricted');
  const failed = run.api.loadDashboard('2027-2028');
  assert.equal(run.node('sidebar-year-label').textContent, '2027–2028');
  assert.equal(run.node('budget-period').textContent, '2027–2028');
  assert.equal(run.node('kpi-total-checkins').textContent, '—');
  assert.deepEqual(allOptions(run.node('period-filter')).slice(1, 3).map(option => option.textContent), ['Fall 2027', 'Spring 2028']);
  assert.match(run.node('goal-ring').attributes['aria-label'], /Loading 2027/);
  await failed;
  for (const id of ['goal-ring', 'event-type-donut', 'attendance-chart']) {
    assert.match(run.node(id).attributes['aria-label'], /unavailable/);
    assert.doesNotMatch(run.node(id).attributes['aria-label'], /191|Loading/);
  }
  run.listeners.resize();
  assert.match(run.node('attendance-chart-desc').textContent, /unavailable/);
  assert.match(run.node('period-detail').textContent, /unavailable/);
  assert.equal(run.node('period-filter').disabled, true);
  const retry = run.node('operations-list').children[0].children.find(item => item.tagName === 'BUTTON' && item.textContent === 'Retry');
  assert.ok(retry, 'attendance failure must retain its recovery action after operations render');
  assert.ok(run.node('operations-list').children[0].children.some(item => item.tagName === 'A'), 'export troubleshooting link remains available');
  run.feeds['2027-2028'].System_Status = pointFeeds('2027-2028').System_Status;
  await retry.events.click();
  assert.equal(run.node('period-filter').disabled, false);
  assert.equal(run.node('kpi-total-checkins').textContent, '0');
  run.node('academic-year').value = '2026-2027';
  await run.api.loadDashboard('2026-2027');
  assert.deepEqual(allOptions(run.node('period-filter')).slice(1, 3).map(option => option.textContent), ['Fall 2026', 'Spring 2027']);
  assert.equal(run.node('kpi-total-checkins').textContent, '191');
});

test('attendance Retry reads the currently selected year rather than the failed year', async () => {
  const run = runtime({ '2026-2027': { System_Status: new Error('temporarily unavailable') }, '2027-2028': pointFeeds('2027-2028') });
  run.node('academic-year').value = '2026-2027';
  await run.api.loadDashboard('2026-2027');
  const retry = run.node('operations-list').children[0].children.find(item => item.tagName === 'BUTTON' && item.textContent === 'Retry');
  assert.ok(retry);
  run.node('academic-year').value = '2027-2028';
  await retry.events.click();
  assert.equal(run.node('sidebar-year-label').textContent, '2027–2028');
  assert.equal(run.api.state().activeDashboardData.meta.academicYear, '2027–2028');
  assert.equal(run.node('period-filter').disabled, false);
  assert.equal(run.node('kpi-total-checkins').textContent, '0');
  assert.equal(run.node('operations-list').children.some(article => article.children.some(item => item.tagName === 'BUTTON' && item.textContent === 'Retry')), false);
});

test('aborted JSONP late callbacks cannot overwrite the new selection or clear its loading state', async () => {
  const run = runtime({ '2026-2027': { System_Status: 'delayed' }, '2027-2028': pointFeeds('2027-2028') });
  run.node('academic-year').value = '2026-2027';
  const old = run.api.loadDashboard('2026-2027');
  await flush();
  const delayed = run.requests.find(request => request.year === '2026-2027');
  run.node('academic-year').value = '2027-2028';
  const current = run.api.loadDashboard('2027-2028');
  delayed.respond({ table: pointFeeds('2026-2027').System_Status });
  await Promise.all([old, current]);
  assert.equal(run.node('sidebar-year-label').textContent, '2027–2028');
  assert.equal(run.node('loading-layer').hidden, true);
  assert.equal(run.api.state().activeDashboardData.meta.academicYear, '2027–2028');
  assert.equal(run.node('kpi-total-checkins').textContent, '0');
});

test('wrong-year/missing period tables warn and retain disabled selected-year presets', async () => {
  const feeds = pointFeeds('2027-2028');
  feeds.Monthly_Metrics_Public = pointFeeds('2026-2027').Monthly_Metrics_Public;
  feeds.Semester_Metrics_Public.rows[1].c[2].v = 'Date(2028,5,1)';
  const run = runtime({ '2027-2028': feeds });
  run.node('academic-year').value = '2027-2028';
  const data = await run.api.loadLeaderboardDashboard({ ...sourceFor('2027-2028'), academicYearKey: '2027-2028' });
  assert.equal(data.monthlyMetrics.length, 12);
  assert.equal(data.semesterMetrics.length, 2);
  assert.equal(data.monthlyMetrics.every(period => period.unavailable), true);
  assert.equal(data.health.find(item => item.label === 'Monthly reporting').status, 'ACTION');
  assert.equal(data.health.find(item => item.label === 'Semester reporting').status, 'ACTION');
  await run.api.loadDashboard('2027-2028');
  assert.equal(allOptions(run.node('period-filter')).slice(1).every(option => option.disabled), true);
  assert.equal(run.node('period-filter').disabled, true);
  assert.match(run.node('period-detail').textContent, /Semester and month reporting are unavailable/);
  assert.match(run.node('health-insight-copy').textContent, /No attendance activity is recorded for this academic year/);
});

test('annual activity remains visible when period exports fail, and period guidance recovers', async () => {
  const feeds = pointFeeds('2027-2028', [{ id: 'event', name: 'Workshop', date: 'Date(2027,8,15)', attendance: 194 }]);
  feeds.Leaderboard_Public.rows = Array.from({ length: 125 }, (_, index) => row([index < 69 ? 2 : 1, 'Date(2027,9,7)', 0, 0, 0, 0, 0, 0, 0]));
  feeds.Monthly_Metrics_Public = new Error('unavailable');
  feeds.Semester_Metrics_Public = new Error('unavailable');
  const run = runtime({ '2027-2028': feeds });
  run.node('academic-year').value = '2027-2028';
  await run.api.loadDashboard('2027-2028');
  assert.equal(run.node('period-filter').disabled, true);
  assert.match(run.node('health-insight-copy').textContent, /125 participants and 194 check-ins/);
  assert.equal(run.node('health-insight-status').textContent, 'Year-to-date activity');
  assert.doesNotMatch(run.node('health-insight-copy').textContent, /first recorded event|first year baseline/);
  assert.match(run.node('period-detail').textContent, /reporting are unavailable/);
  feeds.Monthly_Metrics_Public = pointFeeds('2027-2028').Monthly_Metrics_Public;
  await run.api.loadDashboard('2027-2028');
  assert.equal(run.node('period-filter').disabled, false);
  assert.match(run.node('period-detail').textContent, /available semester or month preset/);
});

test('annual URL and year labels survive global/year-specific shared overrides', () => {
  const run = runtime();
  run.api.setResources([{ resource_id: 'budget-tracker', label: '2026–2027 Treasurer ledger', url: '', category: 'Finance', roles: 'all', sort_order: 1, enabled: true, academic_year: '' }]);
  run.node('academic-year').value = '2027-2028';
  const source = { ...sourceFor('2027-2028'), label: 'MOCK RUN — 2027–2028' };
  const resource = run.api.resolveYearResources(source)[0];
  assert.equal(resource.title, 'MOCK RUN — 2027–2028 Treasurer ledger');
  assert.equal(resource.quickAction.detail, 'MOCK RUN — 2027–2028 workbook');
  assert.equal(resource.url, source.budgetTrackerUrl);
  run.api.setResources([{ resource_id: 'budget-tracker', label: 'Target Treasurer ledger', url: '', category: 'Finance', roles: 'all', sort_order: 1, enabled: true, academic_year: '2027-2028' }]);
  assert.equal(run.api.resolveYearResources(source)[0].title, 'MOCK RUN — 2027–2028 Target Treasurer ledger');
});

test('changing the Hub year updates annual tools while shared and additional resources keep their links',()=>{
 const run=runtime();
 run.config.resources=[
  {id:'attendance-check-in',title:'Check-in',settingKey:'attendanceFormUrl'},
  {id:'points-master',title:'Points Master',settingKey:'pointsMasterUrl'},
  {id:'budget-tracker',title:'Budget Tracker',settingKey:'budgetTrackerUrl'},
  {id:'newsletter-builder',title:'Newsletter Builder',url:'https://shared.example/newsletter'},
  {id:'social-hub',title:'Social Hub',url:'https://shared.example/social'},
  {id:'officer-workspace',title:'Officer workspace',url:'https://shared.example/officers'}
 ];
 run.api.setResources([{resource_id:'extra-resource',label:'Additional chapter resource',url:'https://shared.example/extra',category:'Operations',roles:'all',sort_order:500,enabled:true,academic_year:''}]);
 for(const year of ['2026-2027','2027-2028']){
  run.node('academic-year').value=year;
  const source={...sourceFor(year),attendanceFormUrl:`https://forms.example/${year}`};
  const resources=new Map(run.api.resolveYearResources(source).map(r=>[r.id,r]));
  for(const [id,key] of [['attendance-check-in','attendanceFormUrl'],['points-master','pointsMasterUrl'],['budget-tracker','budgetTrackerUrl']]){
   assert.equal(resources.get(id).url,source[key]);assert.match(resources.get(id).title,new RegExp(year.replace('-','–')));
  }
  for(const [id,path] of [['newsletter-builder','newsletter'],['social-hub','social'],['officer-workspace','officers'],['extra-resource','extra']])assert.equal(resources.get(id).url,`https://shared.example/${path}`);
 }
 run.node('academic-year').value='2027-2028';
 assert.equal(run.api.resolveYearResources({...sourceFor('2027-2028'),pointsMasterUrl:''}).find(r=>r.id==='points-master').url,'');
});

for (const [categories, confirmed, expected, total] of [
  [[{ label: 'Food', actual: 0, planned: 0 }], false, /Treasurer review required/, '$0'],
  [[{ label: 'Food', actual: 0, planned: 0 }], true, /Zero category allocations reviewed/, '$0'],
  [[{ label: 'Food', actual: null, planned: 0 }], false, /Category data is incomplete/, '—'],
  [[], true, /Category data is incomplete/, '—'],
]) {
  test(`production category rendering: ${expected}`, () => {
    const run = runtime();
    run.api.renderBudget({ available: true, academicYear: '2027–2028', approvedIncome: 0, approvedExpenses: 0, pendingApproval: 0, plannedBudget: 0, remainingBudget: 0, budgetUsedPercent: 0, categories, fundingModelStatus: confirmed ? 'Confirmed' : 'Unreviewed' });
    assert.equal(run.node('budget-category-total').textContent, total);
    assert.match(run.node('budget-category-bars').children[0].textContent, expected);
    assert.doesNotMatch(run.node('budget-category-bars').children[0].textContent, confirmed && categories.length ? /Treasurer review required/ : /this pattern must not occur/);
  });
}

for (const key of ['open_review_items', 'past_forms_open']) {
  test(`production ${key} requires nonnegative whole-number counts`, async () => {
    for (const value of [-1, 0.5, '', true, Number.POSITIVE_INFINITY]) {
      const feeds = pointFeeds('2027-2028');
      feeds.Event_Metrics_Public.rows.find(record => record.c[8].v === key).c[9].v = value;
      const run = runtime({ '2027-2028': feeds });
      const data = await run.api.loadLeaderboardDashboard({ ...sourceFor('2027-2028'), academicYearKey: '2027-2028' });
      assert.equal(data.meta.eventMetricsAvailable, false, `${key}: ${String(value)}`);
      assert.equal(data.kpis.eventsHeld, null);
    }
    const feeds = pointFeeds('2027-2028');
    feeds.Event_Metrics_Public.rows.find(record => record.c[8].v === key).c[9].v = 2;
    const run = runtime({ '2027-2028': feeds });
    const data = await run.api.loadLeaderboardDashboard(sourceFor('2027-2028'));
    assert.equal(data.meta.eventMetricsAvailable, true);
    assert.equal(data.operations.some(item => /2 attendance review items|2 past event forms/.test(item.title)), true);
  });
}

test('production Sheet dates reject Gregorian rollovers and retain valid leap-day and native serial values', async () => {
  for (const value of ['Date(2027,13,32)', 'Date(2027,3,31)', 'Date(2027,1,29)', 'Date(2027,8,0)', 'Date(2027,8,15,24,0,0)', Number.POSITIVE_INFINITY]) {
    const feeds = pointFeeds('2027-2028', [{ id: 'date', name: 'Invalid date', date: value, attendance: 1 }]);
    const run = runtime({ '2027-2028': feeds });
    const data = await run.api.loadLeaderboardDashboard(sourceFor('2027-2028'));
    assert.equal(data.meta.eventMetricsAvailable, false, String(value));
    assert.equal(data.allEvents.length, 0);
  }
  const epoch = Date.UTC(1899, 11, 30);
  const serial = (year, month, day) => (Date.UTC(year, month, day) - epoch) / 86400000;
  const feeds = pointFeeds('2027-2028', [
    { id: 'leap', name: 'Leap-day workshop', date: 'Date(2028,1,29)', attendance: 1 },
    { id: 'serial', name: 'Native Sheet serial date', date: serial(2027, 8, 15) + 0.75, attendance: 0 },
  ]);
  for (const name of ['Monthly_Metrics_Public', 'Semester_Metrics_Public']) {
    for (const record of feeds[name].rows) {
      const match = record.c[2].v.match(/Date\((\d+),(\d+),(\d+)\)/);
      record.c[2].v = serial(Number(match[1]), Number(match[2]), Number(match[3]));
    }
  }
  const run = runtime({ '2027-2028': feeds });
  const data = await run.api.loadLeaderboardDashboard({ ...sourceFor('2027-2028'), academicYearKey: '2027-2028' });
  assert.equal(data.meta.eventMetricsAvailable, true);
  assert.equal(data.allEvents[0].date.getDate(), 29);
  assert.equal(data.allEvents[1].date.getHours(), 18);
  assert.equal(data.monthlyMetrics.length, 12);
  assert.equal(data.semesterMetrics.length, 2);
  assert.equal([...data.monthlyMetrics, ...data.semesterMetrics].some(period => period.unavailable), false);
  assert.equal(data.monthlyMetrics[0].start.getMonth(), 7);
  assert.equal(data.monthlyMetrics[11].start.getMonth(), 6);
  assert.equal(data.semesterMetrics[1].start.getFullYear(), 2028);
});

test('annual transfer/download buttons focus required positive goal before passing input to the builder and clear validity on editing', async () => {
  const run = runtime();
  let builderCalls = 0;
  run.api.setAnnualBuilders((_handoff, settings) => { builderCalls++; return { handoff: { year: '2027-2028' }, values: { engagement_goal: settings.engagementGoal } }; }, () => 'https://script.google.com/macros/s/reviewed/exec#annual=fixture');
  const goal = run.node('settings-engagement-goal');
  for (const value of ['', '0', '-1', '0.5']) {
    goal.value = value;
    let prevented = false;
    run.node('settings-annual-service').events.click({ currentTarget: run.node('settings-annual-service'), preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.match(goal.validationMessage, /positive whole-number/);
    assert.match(run.node('settings-status').textContent, /positive whole-number/);
    assert.ok(goal.validityReports > 0);
    assert.equal(builderCalls, 0);
    await run.node('settings-download-annual').events.click();
    assert.equal(builderCalls, 0, 'invalid download button does not prepare/download a payload');
    goal.events.input(); assert.equal(goal.validationMessage, '');
  }
  goal.value = '100'; goal.events.input();
  run.node('settings-annual-service').events.click({ currentTarget: run.node('settings-annual-service'), preventDefault() { assert.fail('valid transfer prevented'); } });
  assert.equal(builderCalls, 1);
  assert.equal(goal.validationMessage, '');
  assert.match(run.node('settings-annual-service').href, /reviewed\/exec#annual/);
});

test('resource refresh publishes full snapshot for independent-year guide resolution and preserves legacy global', () => {
  const run = runtime();
  const records = [{ resource_id: 'budget-tracker', label: 'Target Treasurer ledger', url: '', category: 'Finance', roles: 'all', sort_order: 1, enabled: true, academic_year: '2027-2028' }];
  run.api.setResources(records);
  run.node('academic-year').value = '2026-2027';
  const resources = run.api.resolveYearResources(sourceFor('2026-2027'));
  run.api.renderResources(resources);
  const snapshot = run.window.ASME_TRANSITION_RESOURCE_SNAPSHOT;
  assert.equal(snapshot.resources, run.window.ASME_TRANSITION_RESOURCES);
  assert.equal(snapshot.records, records);
  assert.equal(snapshot.defaults, run.config.resources);
  assert.equal(run.dispatched.at(-1).detail, snapshot);
  const target = run.window.ASME_SHARED_RESOURCES.resolve(snapshot.defaults, snapshot.records, '2027-2028', sourceFor('2027-2028'));
  assert.equal(target[0].title, 'Target Treasurer ledger');
  assert.equal(target[0].url, sourceFor('2027-2028').budgetTrackerUrl);
});


test('Hub search includes the transition guide by its title and common handoff terms',()=>{
 const run=runtime();run.api.configureHubSearch([]);
 for(const query of ['Transition','handoff','annual setup','practice','new year','transition guide']) {
  run.api.renderHubSearchResults(query);const results=run.node('hub-search-results').children;
  assert.equal(results.length,1,query);assert.equal(results[0].children[1].children[0].textContent,'Transition to New Year',query);assert.equal(typeof results[0].events.click,'function');
 }
});

test('Hub search uses a labelled ordinary group with native result controls and keyboard guidance',()=>{
 const markup=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(markup,/<input[^>]+id="hub-search-input"[^>]+aria-describedby="hub-search-help"/);
 assert.match(markup,/<p[^>]+id="hub-search-help">Tab to a result, then Enter to open it\.<\/p>/);
 assert.match(markup,/<div[^>]+id="hub-search-results"[^>]+role="group"[^>]+aria-label="Search results"/);
 assert.doesNotMatch(markup,/<div[^>]+id="hub-search-results"[^>]+role="listbox"/);
 const run=runtime();run.api.configureHubSearch([{title:'Reviewed external tool',description:'Fixture',url:'https://example.org/tool'}]);
 const controls=run.node('hub-search-results').children;
 assert.ok(controls.some(result=>result.tagName==='BUTTON'));assert.ok(controls.some(result=>result.tagName==='A'));
 for(const result of controls){assert.equal(result.getAttribute('role'),null);assert.equal(result.getAttribute('aria-selected'),null);assert.equal(result.getAttribute('tabindex'),null);assert.equal(result.events.keydown,undefined);}
});

for(const key of ['Enter','ArrowDown'])test(`search input ${key} focuses the first internal result without activating it`,()=>{
 const run=runtime();run.api.configureHubSearch([]);run.api.renderHubSearchResults('Transition');
 let navigations=0;run.document.querySelector=selector=>{assert.equal(selector,'.nav-link[href="#transition"]');return {click(){navigations++;}};};
 const input=run.node('hub-search-input'),dialog=run.node('hub-search-dialog'),result=run.node('hub-search-results').children[0];
 input.focus();dialog.setAttribute('open','');let prevented=false;
 input.events.keydown({key,preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(run.document.activeElement,result);assert.equal(navigations,0);assert.equal(dialog.getAttribute('open'),'');
 assert.equal(result.tagName,'BUTTON');assert.equal(result.type,'button');
 result.events.click();assert.equal(navigations,1);assert.equal(dialog.getAttribute('open'),null);
});

test('focusing an external search result never opens it and retains explicit native link navigation',()=>{
 const run=runtime();run.api.configureHubSearch([{title:'Reviewed external tool',description:'Fixture',url:'https://example.org/tool'}]);run.api.renderHubSearchResults('Reviewed external');
 const input=run.node('hub-search-input'),dialog=run.node('hub-search-dialog'),result=run.node('hub-search-results').children[0];
 dialog.setAttribute('open','');input.events.keydown({key:'Enter',preventDefault(){}});
 assert.equal(run.document.activeElement,result);assert.equal(dialog.getAttribute('open'),'');
 assert.equal(result.tagName,'A');assert.equal(result.href,'https://example.org/tool');assert.equal(result.target,'_blank');assert.equal(result.rel,'noopener');
 assert.equal(result.events.keydown,undefined);assert.equal(run.window.location.href,'https://example.test/');
 result.events.click();assert.equal(dialog.getAttribute('open'),null);assert.equal(result.href,'https://example.org/tool');
});

test('search input preserves native Tab and ignores modifiers, composing text, repeats and handled events',()=>{
 const run=runtime();run.api.configureHubSearch([]);run.api.renderHubSearchResults('Transition');const input=run.node('hub-search-input');
 for(const event of [{key:'Tab'},{key:'Tab',shiftKey:true},{key:'Escape'},{key:'Enter',isComposing:true},{key:'Enter',keyCode:229},{key:'ArrowDown',altKey:true},{key:'Enter',ctrlKey:true},{key:'Enter',metaKey:true},{key:'Enter',shiftKey:true},{key:'Enter',repeat:true},{key:'Enter',defaultPrevented:true}]){
  input.focus();let prevented=false;input.events.keydown({...event,preventDefault(){prevented=true;}});
  assert.equal(prevented,false,JSON.stringify(event));assert.equal(run.document.activeElement,input,JSON.stringify(event));
 }
});

test('search input does not focus the empty-state message when there are no results',()=>{
 const run=runtime();run.api.configureHubSearch([]);const input=run.node('hub-search-input');
 input.value='no matching hub fixture';input.events.input();
 const empty=run.node('hub-search-results').children[0];assert.equal(empty.tagName,'P');assert.match(empty.textContent,/No Hub results/);
 for(const key of ['Enter','ArrowDown']){input.focus();let prevented=false;input.events.keydown({key,preventDefault(){prevented=true;}});assert.equal(prevented,false);assert.equal(run.document.activeElement,input);}
});

test('internal resource search links retain same-page native navigation',()=>{
 const run=runtime();run.api.configureHubSearch([{title:'Reviewed internal shortcut',description:'Fixture',url:'#events'}]);run.api.renderHubSearchResults('Reviewed internal');
 const result=run.node('hub-search-results').children[0];assert.equal(result.tagName,'A');assert.equal(result.href,'#events');assert.equal(result.target,'_self');assert.equal(result.rel,'');assert.equal(result.getAttribute('role'),null);
});

const calendarPolicyOccurrences = [
 {id:'reference',title:'Reference date',allDay:true,startDate:'2026-11-01',endDate:'2026-11-02'},
 {id:'chapter-day',title:'All-day chapter activity',allDay:true,startDate:'2026-11-02',endDate:'2026-11-03'},
 {id:'timed',title:'Timed session',allDay:false,startAt:'2026-11-03T17:00:00Z',endAt:'2026-11-03T18:00:00Z'},
 {id:'day-room',title:'All-day activity with room',allDay:true,startDate:'2026-11-04',endDate:'2026-11-05',location:'Chapter hall'},
 {id:'timed-room',title:'Timed activity with room',allDay:false,startAt:'2026-11-05T17:00:00Z',endAt:'2026-11-05T18:00:00Z',location:'Engineering room'},
];
const calendarPolicyIcal = ['BEGIN:VCALENDAR',...calendarPolicyOccurrences.flatMap(item=>[
 'BEGIN:VEVENT',`UID:${item.id}`,`SUMMARY:${item.title}`,
 item.allDay?`DTSTART;VALUE=DATE:${item.startDate.replaceAll('-','')}`:`DTSTART:${item.startAt.replace(/[-:]/g,'')}`,
 ...(item.location?[`LOCATION:${item.location}`]:[]),'END:VEVENT',
]),'END:VCALENDAR'].join('\r\n');
const calendarPolicyClock = class extends Date {
 constructor(...args){super(...(args.length?args:['2026-10-27T12:00:00Z']));}
 static now(){return Date.parse('2026-10-27T12:00:00Z');}
};

for(const model of ['normalized snapshot','legacy iCal fallback']){
 function calendarPolicyFixture(){
  const run=runtime({},null,calendarPolicyClock);
  const events=model==='normalized snapshot'?run.api.normalizedCalendarEvents(calendarPolicyOccurrences):run.api.parseIcalEvents(calendarPolicyIcal);
  return {run,events};
 }
 test(`${model}: missing all-day locations are neutral and only timed missing locations enter the queue`,()=>{
  const {run,events}=calendarPolicyFixture();assert.equal(events.length,5);
  const byTitle=new Map(events.map(item=>[item.title,item]));
  for(const title of ['Reference date','All-day chapter activity']){
   assert.equal(byTitle.get(title).allDay,true);assert.equal(byTitle.get(title).status,'All-day item');assert.equal(byTitle.get(title).location,'');
  }
  assert.equal(byTitle.get('Timed session').allDay,false);assert.equal(byTitle.get('Timed session').status,'Needs location');
  assert.equal(byTitle.get('All-day activity with room').status,'Confirmed');assert.equal(byTitle.get('All-day activity with room').location,'Chapter hall');
  assert.equal(byTitle.get('Timed activity with room').status,'Confirmed');assert.equal(byTitle.get('Timed activity with room').location,'Engineering room');
  const result=run.api.calendarResult(events,'LIVE','Reviewed fixture');
  assert.equal(result.operations.length,1);assert.equal(result.operations[0].title,'Timed session needs a location');
  assert.match(result.operations[0].detail,/Timed session.*Add its location in Google Calendar/s);
  assert.doesNotMatch(result.operations[0].detail,/Reference date|All-day chapter activity/);
  const onlyAllDay=run.api.calendarResult(events.filter(item=>item.allDay),'LIVE','Reviewed fixture');assert.equal(onlyAllDay.operations.length,0);
 });

 test(`${model}: upcoming cards and both role briefings omit absent all-day locations and preserve supplied rooms`,()=>{
  const {run,events}=calendarPolicyFixture();run.api.renderUpcomingEvents(events);
  const cards=run.node('upcoming-events').children;
  for(const index of [0,1]){assert.equal(cards[index].children[1].children[1].textContent,'All day');assert.equal(cards[index].children[2].textContent,'All-day item');}
  assert.match(cards[2].children[1].children[1].textContent,/Location TBD/);assert.equal(cards[2].children[2].textContent,'Needs location');
  assert.equal(cards[3].children[1].children[1].textContent,'All day · Chapter hall');
  assert.match(cards[4].children[1].children[1].textContent,/ · Engineering room$/);
  for(const role of ['vice_president','social_chair']){
   run.api.setUpcomingEvents(events,role);
   const briefings=run.node('briefing-upcoming-events').children;
   assert.equal(briefings[0].children[1].children[1].textContent,'All day');assert.equal(briefings[0].children[2].textContent,'All-day item');
   assert.match(run.node('hero-briefing-copy').textContent,/All day/);assert.doesNotMatch(run.node('hero-briefing-copy').textContent,/Location TBD/);
   run.api.setUpcomingEvents([events[3]],role);assert.match(run.node('hero-briefing-copy').textContent,/All day · Chapter hall/);
   run.api.setUpcomingEvents([events[2]],role);assert.match(run.node('hero-briefing-copy').textContent,/Location TBD/);
  }
 });
}


test('turnout inspection keeps full names and exact counts when selecting points or the event picker', () => {
  const run = runtime();
  const items = [
    { label: 'A very long engineering workshop name that must remain readable', date: '2027-09-15T16:00:00Z', attendance: 0, type: 'Technical Workshop' },
    { label: 'Company information session', date: '2027-09-16T16:00:00Z', attendance: 27, type: 'Company Info Session' },
  ];
  run.api.renderAttendanceChart(items);
  const picker = run.node('attendance-event-picker');
  const points = run.node('attendance-chart').children.filter(child => child.attributes.role === 'button');
  assert.equal(run.node('attendance-chart-controls').hidden, false);
  assert.match(picker.children[0].textContent, /A very long engineering workshop name that must remain readable/);
  assert.equal(run.node('attendance-event-name').textContent, items[1].label);
  assert.equal(run.node('attendance-event-count').textContent, '27');
  points[0].events.click();
  assert.equal(run.node('attendance-event-name').textContent, items[0].label);
  assert.equal(run.node('attendance-event-count').textContent, '0');
  assert.match(run.node('attendance-event-meta').textContent, /Sep 15, 2027.*Technical Workshop/);
  assert.equal(points[0].attributes['aria-pressed'], 'true');
  picker.value = '1'; picker.onchange();
  assert.equal(run.node('attendance-event-name').textContent, items[1].label);
  assert.equal(points[0].attributes['aria-pressed'], 'false');
  let prevented = false;
  points[1].events.keydown({ key: 'ArrowLeft', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(picker.value, '0');
});

test('turnout selection survives resizing but cannot leak into a different period, empty result, or unavailable feed', () => {
  const run = runtime();
  const items = [{ label: 'Workshop A', attendance: 12 }, { label: 'Workshop B', attendance: 8 }];
  run.api.renderAttendanceChart(items);
  run.node('attendance-event-picker').value = '0'; run.node('attendance-event-picker').onchange();
  run.api.renderAttendanceChart(items);
  assert.equal(run.node('attendance-event-name').textContent, 'Workshop A');
  run.api.renderAttendanceChart([{ label: 'Different year event', attendance: 3 }]);
  assert.equal(run.node('attendance-event-name').textContent, 'Different year event');
  run.api.renderAttendanceChart([]);
  assert.equal(run.node('attendance-chart-controls').hidden, true);
  assert.equal(run.node('attendance-event-name').textContent, '');
  assert.equal(run.node('attendance-event-picker').children.length, 0);
  run.api.renderAttendanceChart(items);
  run.api.renderEventMetricsUnavailable();
  assert.equal(run.node('attendance-chart-controls').hidden, true);
  assert.equal(run.node('attendance-event-count').textContent, '');
  assert.equal(run.node('attendance-chart').children.length, 0);
  assert.equal(run.node('attendance-event-picker').onchange, null);
});


test('social monitor failure remains visible with otherwise loaded attendance and when attendance fails', async () => {
  for (const feeds of [{ '2026-2027': pointFeeds('2026-2027') }, { '2026-2027': { System_Status: new Error('unavailable') } }]) {
    const r = runtime(feeds);
    await r.api.loadDashboard('2026-2027');
    const cards = r.node('health-attention-grid').children;
    assert.ok(cards.some(card => card.children[0].children[0].textContent === 'Social posting'));
    assert.ok(r.node('operations-list').children.some(card => JSON.stringify(card).includes('Social posting needs attention')));
  }
});

test('social follow-up stays in role priorities without making healthy publishing unhealthy', async () => {
  const timestamp = new Date().toISOString();
  const r = runtime({ '2026-2027': pointFeeds('2026-2027') }, {schemaVersion:1,generatedAt:timestamp,activeYear:'2026-27',calendar:{generatedAt:timestamp,feedUrl:'',candidates:[]},campaigns:[],tokenWarning:{status:'unknown',configured:true,checkedAt:timestamp},automation:{schemaVersion:1,generatedAt:timestamp,workflows:['Posting dispatcher','Calendar import','Social Hub deployment'].map(label=>({label,available:true,maxAgeHours:6,latest:{startedAt:timestamp,status:'completed'},completed:{conclusion:'success'}}))}});
  await r.api.loadDashboard('2026-2027');
  const card = r.node('health-grid').children.find(card => card.children[0].children[0].textContent === 'Social posting');
  assert.equal(card.children[0].children[1].textContent,'LIVE');
  assert.ok(r.api.state().activeDashboardData.rolePriorities.some(p=>/token expiry/.test(p.detail)));
  assert.ok(JSON.stringify(r.node('briefing-priorities').children).includes('Social posting follow-up'));
  assert.ok(!JSON.stringify(r.node('operations-list').children).includes('Social posting follow-up'));
});


test('hero and all action counters share operational items while role reminders retain their own label', () => {
  const r = runtime();
  const actions = [{ severity:'warning', title:'Review attendance' }, { severity:'warning', title:'Calendar follow-up' }, { severity:'success', title:'Resolved item' }];
  const reminders = [{ severity:'info', title:'Social posting follow-up' }];
  for (const role of ['president','secretary','webmaster','ecouncil','all']) {
    r.api.setActionItems(actions, reminders, role);
    assert.equal(r.node('hero-briefing-title').textContent,'2 action items need attention.');
    assert.equal(r.node('operations-count').textContent,'2 open items');
    assert.equal(r.node('overview-attention-count').textContent,'2 open items');
    assert.equal(r.node('nav-alert-count').textContent,'2');
    assert.equal(r.node('briefing-priority-count').textContent,'3 priorities');
    assert.ok(JSON.stringify(r.node('briefing-priorities').children).includes('Social posting follow-up'));
  }
  r.api.setActionItems(actions.slice(0,1),reminders);
  assert.equal(r.node('hero-briefing-title').textContent,'1 action item needs attention.');
  assert.equal(r.node('operations-count').textContent,'1 open item');
  assert.equal(r.node('nav-alert-count').textContent,'1');
  r.api.setActionItems([],reminders);
  assert.equal(r.node('operations-count').textContent,'0 open items');
  assert.equal(r.node('overview-attention-count').textContent,'All clear');
  assert.equal(r.node('nav-alert-count').textContent,'0');
  assert.equal(r.node('briefing-priority-count').textContent,'1 priority');
  assert.doesNotMatch(r.node('hero-briefing-title').textContent,/need.*attention/);
});
