import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the production readers with synthetic Google table responses. The
// browser wrapper is deliberately excluded; these functions have no DOM use.
const source = readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
const start = source.indexOf('  async function readPublicPointStatus(');
const end = source.indexOf('\n  function normalizeEventType(', start);
assert.ok(start >= 0 && end > start, 'public readers found in app.js');
const readers = source.slice(start, end);
const cell = value => ({ v: value });
const staleMember = { c: [cell(2), cell('2026-09-30'), ...Array(7).fill(cell(0))] };

function fixture(status, { failStatus = false } = {}) {
  const calls = [];
  let jsonFetches = 0;
  const context = {
    spreadsheetIdFrom: () => 'synthetic-public-sheet',
    sheetCell: (row, index) => row.c[index]?.v ?? '',
    sheetTimestamp: () => null,
    eventTypeColumns: [],
    normalizeEventType: value => value,
    formatNumber: String,
    settingsProvenance: 'fixture',
    queryPublicSheet: async (_id, sheet) => {
      calls.push(sheet);
      if (sheet === 'System_Status') {
        if (failStatus) throw new Error('status request failed');
        return { rows: status === null ? [] : [{ c: [cell('system_status'), cell(status)] }] };
      }
      return { rows: sheet === 'Leaderboard_Public' ? [staleMember] : [] };
    },
    fetchJsonWithTimeout: async () => {
      jsonFetches += 1;
      return { meta: { systemStatus: status }, kpis: { uniqueAttendees: 99 } };
    },
  };
  const api = vm.runInNewContext(`${readers}\n({ loadLeaderboardDashboard, loadDashboardJson })`, context);
  return { ...api, calls, get jsonFetches() { return jsonFetches; } };
}

for (const status of ['TESTING', 'PAUSED', null]) {
  test(`${status ?? 'missing status'} blocks stale member rows before any derived query`, async () => {
    const run = fixture(status);
    await assert.rejects(run.loadLeaderboardDashboard({ attendanceSheetUrl: 'fixture' }), /not LIVE/);
    assert.deepEqual(run.calls, ['System_Status']);
  });
}

test('status request failure also blocks stale rows', async () => {
  const run = fixture('LIVE', { failStatus: true });
  await assert.rejects(run.loadLeaderboardDashboard({ attendanceSheetUrl: 'fixture' }), /status request failed/);
  assert.deepEqual(run.calls, ['System_Status']);
});

test('LIVE status permits the member-derived queries and reader result', async () => {
  const run = fixture('LIVE');
  const result = await run.loadLeaderboardDashboard({ attendanceSheetUrl: 'fixture', label: 'Fixture year' });
  assert.equal(result.kpis.uniqueAttendees, 1);
  assert.equal(result.kpis.totalCheckIns, 2);
  assert.deepEqual(run.calls, ['System_Status', 'Leaderboard_Public', 'Event_Metrics_Public', 'Monthly_Metrics_Public', 'Semester_Metrics_Public']);
});

test('configured JSON path checks Sheet status before fetching snapshot', async () => {
  const paused = fixture('PAUSED');
  await assert.rejects(paused.loadDashboardJson({ attendanceSheetUrl: 'fixture', dashboardUrl: 'fixture-json' }), /not LIVE/);
  assert.deepEqual(paused.calls, ['System_Status']);
  assert.equal(paused.jsonFetches, 0);

  const failed = fixture('LIVE', { failStatus: true });
  await assert.rejects(failed.loadDashboardJson({ attendanceSheetUrl: 'fixture', dashboardUrl: 'fixture-json' }), /status request failed/);
  assert.equal(failed.jsonFetches, 0);

  const live = fixture('LIVE');
  const data = await live.loadDashboardJson({ attendanceSheetUrl: 'fixture', dashboardUrl: 'fixture-json' });
  assert.equal(data.kpis.uniqueAttendees, 99);
  assert.deepEqual(live.calls, ['System_Status']);
  assert.equal(live.jsonFetches, 1);
});

test('JSON-only source requires an explicit LIVE status in its payload', async () => {
  const paused = fixture('PAUSED');
  await assert.rejects(paused.loadDashboardJson({ dashboardUrl: 'fixture-json' }), /not LIVE/);
  const missing = fixture(null);
  await assert.rejects(missing.loadDashboardJson({ dashboardUrl: 'fixture-json' }), /not LIVE/);
  const live = fixture('LIVE');
  assert.equal((await live.loadDashboardJson({ dashboardUrl: 'fixture-json' })).kpis.uniqueAttendees, 99);
});

test('clearing a previous dashboard removes member-derived display and state', () => {
  const clearStart = source.indexOf('  function clearDashboardState(');
  const clearEnd = source.indexOf('\n  function setReportControlsDisabled(', clearStart);
  assert.ok(clearStart >= 0 && clearEnd > clearStart);
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {
      textContent: 'old member total', hidden: true, children: ['old row'],
      style: { width: '88%', setProperty() {} },
      replaceChildren(...children) { this.children = children; },
      setAttribute() {},
    });
    return nodes.get(id);
  };
  const context = {
    activeDashboardData: { kpis: { uniqueAttendees: 10 } },
    activeUpcomingEvents: [{ title: 'Old event' }], activeOperations: [{}], activeBudget: {}, activeHealth: [{}],
    elements: {
      heroBriefingTitle: node('hero-briefing-title'), heroBriefingCopy: node('hero-briefing-copy'),
      briefingRoleTitle: node('briefing-role-title'), briefingRoleCopy: node('briefing-role-copy'),
      briefingPriorityCount: node('briefing-priority-count'), periodFilter: {},
    },
    document: {
      getElementById: node,
      body: { classList: { add() {} } },
    },
    setText: (id, value) => { node(id).textContent = value; },
    renderBudget() {}, setReportControlsDisabled() {},
  };
  const clear = vm.runInNewContext(`${source.slice(clearStart, clearEnd)}\nclearDashboardState`, context);
  clear('Loading next year…');
  assert.equal(context.activeDashboardData, null);
  assert.equal(node('kpi-unique-attendees').textContent, '—');
  assert.equal(node('hero-briefing-title').textContent, 'Attendance data unavailable');
  assert.deepEqual(node('operations-list').children, []);
  assert.deepEqual(node('health-grid').children, []);
  assert.deepEqual(node('briefing-role-metrics').children, []);
});
