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
function runtime(feeds = {}) {
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
    events: {}, addEventListener(name, callback) { this.events[name] = callback; }, removeEventListener() {}, setCustomValidity(message) { this.validationMessage = message; }, reportValidity() { this.validityReports = (this.validityReports || 0) + 1; return !this.validationMessage; }, querySelector() { return null; }, querySelectorAll() { return []; }, closest() { return null; }, contains() { return false; }, remove() {}, focus() {},
    getBoundingClientRect() { return { width: 760, height: 285 }; },
    parentElement: { setAttribute() {}, hidden: false, querySelector() { return null; }, append() {} },
  });
  const node = id => { if (!nodes.has(id)) nodes.set(id, element(id === 'period-filter' ? 'select' : 'div')); return nodes.get(id); };
  const document = { title: 'Fixture', body: element(), getElementById: node, createElement: element, createTextNode(text) { return { textContent: text }; }, createElementNS: (_ns, tag) => element(tag), querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, dispatchEvent(event) { dispatched.push(event); return true; } };
  const config = { currentAcademicYear: '2026-2027', access: {}, dataSources: { '2026-2027': sourceFor('2026-2027'), '2027-2028': sourceFor('2027-2028') }, resources: [{ id: 'budget-tracker', title: '2026–2027 Budget Tracker', label: 'Open budget', category: 'Finance', settingKey: 'budgetTrackerUrl', quickAction: { label: 'Budget tracker', detail: '2026–2027 workbook' } }] };
  const storage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const window = { ASME_HUB_CONFIG: config, location: { protocol: 'https:', hash: '' }, setTimeout, clearTimeout, matchMedia() { return { matches: false, addEventListener() {} }; }, addEventListener(name, callback) { listeners[name] = callback; }, removeEventListener() {}, requestAnimationFrame(callback) { callback(); }, scrollTo() {} };
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
  const sandbox = { CustomEvent, Option, window, document, sessionStorage: storage, localStorage: storage, AbortController, DOMException, URL, URLSearchParams, Date, Intl, Math, Promise, Event, setTimeout, clearTimeout, queueMicrotask, console: { warn(...items) { failures.push(items); }, error(...items) { failures.push(items); }, log() {} } };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(sharedSource, sandbox);
  window.ASME_SHARED_RESOURCES = sandbox.ASME_SHARED_RESOURCES;
  const source = appSource.replace(/\n  initialize\(\);\n\}\)\(\);\s*$/, `\n  globalThis.testApi = { loadDashboard, loadLeaderboardDashboard, selectedYearPeriods, populatePeriodFilter, renderSelectedPeriod, renderBudget, loadBudgetSummary, resolveYearResources, renderResources, sheetTimestamp, reviewedAnnualSettingsInput, setAnnualBuilders(builder, transfer) { buildAnnualSettingsInput = builder; buildAnnualTransferUrl = transfer; }, queryPublicSheet, setPeriod(value) { selectedPeriod = value; }, setResources(records) { sharedResourceRecords = records; }, state() { return { activeDashboardData, attendanceChartItems, activeBudget }; } };\n})();`);
  vm.runInNewContext(source, sandbox, { filename: 'app.js' });
  return { api: sandbox.testApi, node, nodes, requests, feeds, failures, config, listeners, window, dispatched };
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
  run.feeds['2027-2028'].System_Status = pointFeeds('2027-2028').System_Status;
  await run.api.loadDashboard('2027-2028');
  assert.equal(run.node('period-filter').disabled, false);
  assert.equal(run.node('kpi-total-checkins').textContent, '0');
  run.node('academic-year').value = '2026-2027';
  await run.api.loadDashboard('2026-2027');
  assert.deepEqual(allOptions(run.node('period-filter')).slice(1, 3).map(option => option.textContent), ['Fall 2026', 'Spring 2027']);
  assert.equal(run.node('kpi-total-checkins').textContent, '191');
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
