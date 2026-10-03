import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../integrations/apps-script/AnnualSetupEngine.gs.example', import.meta.url), 'utf8'), context);
const engine = context.AnnualSetupEngine;
const clone = value => JSON.parse(JSON.stringify(value));
const headers = ['Timestamp', 'Email Address', 'OSU name.number', 'Is this your first submission this academic year?', 'Preferred first name', 'Last name', 'Year in school', 'Major', 'Public leaderboard display', 'Public alias', 'Event ID', 'Optional note'];
function fixture() {
  const resources = { pointsMaster: 'points', attendanceFormEditor: 'form', pointsExport: 'pointsExport', budgetTracker: 'budget', budgetExport: 'budgetExport', annualFolder: 'annual' };
  const copy = { schema: 1, year: '2028-2029', items: Object.values(resources).map(key => key === 'annual' ? { key, kind: 'folder' } : { key, kind: 'copy', source: { id: 'source_' + key, version: '1', mimeType: key === 'form' ? 'application/vnd.google-apps.form' : 'application/vnd.google-apps.spreadsheet' } }) };
  const setup = { schema: 1, year: copy.year, resources, reviews: Object.fromEntries(Object.values(resources).filter(k => k !== 'annual').map(key => [key, { boundScriptsReviewed: true, propertiesAndTriggersReviewed: true, safeForConfiguration: true, sourceVersion: '1', reviewNote: 'Synthetic fixture source reviewed' }])), points: { oldResponseTab: 'Form Responses 2', term: 'Fall 2028', academicYear: '2028-29' }, exports: { pointsExport: { sourceId: 'source_points', expectedFormulaCells: 1 }, budgetExport: { sourceId: 'source_budget', expectedFormulaCells: 2 } } };
  let ledger = { schema: 1, runs: { [copy.year]: { operations: {} } } }, saves = 0, writes = 0;
  const ids = Object.fromEntries(Object.entries(resources).map(([name, key]) => [name, 'new_' + key]));
  const form = { id: ids.attendanceFormEditor, acceptingResponses: false, destinationId: null, editUrl: 'https://docs.google.com/forms/d/new_form/edit', respondentUrl: 'https://docs.google.com/forms/d/e/observed_published_form/viewform' };
  let tabs = [{ id: 1, name: 'Form Responses 2', formId: null, lastRow: 1, headers: [] }];
  const cells = new Map();
  const key = (id, sheet, a1) => id + '|' + sheet + '|' + a1;
  const set = (id, sheet, a1, value) => cells.set(key(id, sheet, a1), clone(value));
  set(ids.pointsMaster, 'Config', 'B5', { value: 'TESTING' });
  for (const [a1, value] of Object.entries({ B2: 'Fall 2027', B3: '2027-28', B7: 'Form Responses 2', B16: '' })) set(ids.pointsMaster, 'Config', a1, { value });
  for (const a1 of ['B4', 'B5', 'B11', 'B12', 'B13', 'B14']) set(ids.budgetTracker, 'Setup & Lists', a1, { date: '2027-08-01' });
  set(ids.budgetTracker, 'Dashboard', 'C5', { value: 123.45 });
  set(ids.budgetTracker, 'Setup & Lists', 'B6', { value: 55 });
  set(ids.budgetTracker, 'Setup & Lists', 'B7', { value: 66 });
  for (const a1 of ['A2', 'B2', 'A3', 'B3']) set(ids.pointsMaster, 'Roster', a1, { formula: "=IF('Form Responses 2'!A2=\"\",\"\",'Form Responses 2'!B2)" });
  set(ids.pointsExport, 'Public', 'A1', { formula: '=IMPORTRANGE("source_points","Website Staging!A1:N1000")' });
  for (const a1 of ['C2', 'C3']) set(ids.budgetExport, 'Budget_Public', a1, { formula: '=IFERROR(IMPORTRANGE("https://docs.google.com/spreadsheets/d/source_budget/edit","Dashboard!C2"),0)' });
  set(ids.budgetExport, 'Read Me', 'B2', { value: 'Source: https://docs.google.com/spreadsheets/d/source_budget/edit' });
  const copyIO = { load: () => clone(ledger), save: value => { ledger = clone(value); saves++; } };
  context.AnnualCopyEngine = { verifyCompleted: () => ({ operations: Object.values(resources).map(key => ({ key, state: 'created', id: 'new_' + key })) }) };
  const io = {
    copy: copyIO, lock: fn => fn(), now: () => '2026-09-30T00:00:00Z', digest: value => createHash('sha256').update(value).digest('hex'),
    form: () => clone(form), tabs: () => clone(tabs), cell: (id, sheet, a1) => clone(cells.get(key(id, sheet, a1)) || { value: '' }),
    workbook: (id, sourceId) => {
      const formulas = [], sourceURLCells = [];
      for (const [k, cell] of cells) { const [file, sheet, a1] = k.split('|'); if (file !== id) continue; if (cell.formula) formulas.push({ sheet, a1, formula: cell.formula }); else if (typeof cell.value === 'string' && cell.value.includes(sourceId)) sourceURLCells.push({ sheet, a1, value: cell.value }); }
      return { formulas, sourceURLCells };
    },
    read: patch => patch.kind === 'destination' ? form.destinationId : patch.kind === 'range' ? rangeCells(patch).map(row => row.map(a1 => cells.get(key(patch.id, patch.sheet, a1)).formula)) : io.cell(patch.id, patch.sheet, patch.a1),
    write: patch => {
      writes++;
      if (patch.kind === 'destination') { form.destinationId = patch.after; tabs.push({ id: 2, name: "Form Responses 3", formId: ids.attendanceFormEditor, lastRow: 1, headers }); }
      else if (patch.kind === 'range') rangeCells(patch).forEach((row, r) => row.forEach((a1, c) => set(patch.id, patch.sheet, a1, { formula: patch.after[r][c] })));
      else set(patch.id, patch.sheet, patch.a1, patch.after);
    }
  };
  function approve(phase) { const preview = engine.run(copy, setup, io, phase); return { digest: preview.digest, phase, year: copy.year }; }
  function destination() { return engine.run(copy, setup, io, 'destination', approve('destination')); }
  function workbooks() { destination(); return engine.run(copy, setup, io, 'workbooks', approve('workbooks')); }
  return { copy, setup, io, ids, form, cells, tabs: () => tabs, set, saves: () => saves, writes: () => writes, ledger: () => ledger, approve, destination, workbooks };
}
function rangeCells(patch) {
  const m = patch.a1.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  const col = label => [...label].reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0);
  const label = number => { let output = ''; while (number) { output = String.fromCharCode(65 + (number - 1) % 26) + output; number = Math.floor((number - 1) / 26); } return output; };
  return Array.from({ length: +m[4] - +m[2] + 1 }, (_, i) => Array.from({ length: col(m[3]) - col(m[1]) + 1 }, (_, j) => label(col(m[1]) + j) + (+m[2] + i)));
}
test('destination preview contains exact target/baseline with no ledger or external mutation', () => { const f = fixture(); const result = engine.run(f.copy, f.setup, f.io, 'destination'); assert.equal(result.changes[0].after, f.ids.pointsMaster); assert.equal(result.changes[0].before, null); assert.equal(f.writes(), 0); assert.equal(f.saves(), 0); });
test('workbooks preview blocks until actual copied destination/header exists', () => { const f = fixture(); assert.throws(() => f.approve('workbooks'), /destination/); f.destination(); f.tabs()[1].headers = ['Different']; assert.throws(() => f.approve('workbooks'), /header/); });
test('destination repeat reuses linked resource; no second setDestination', () => { const f = fixture(); const approved = f.approve('destination'); f.destination(); const writes = f.writes(); engine.run(f.copy, f.setup, f.io, 'destination', approved); assert.equal(f.writes(), writes); assert.equal(f.tabs().length, 2); });
test('copied Form must be closed and unexpected destinations cannot be relinked', () => { for (const mutation of [f => f.form.acceptingResponses = true, f => f.form.destinationId = 'source_points']) { const f = fixture(); mutation(f); assert.throws(() => f.approve('destination')); assert.equal(f.writes(), 0); } });
test('bound script/version reviews and source file rejection precede mutation', () => { const f = fixture(); f.setup.reviews.points.boundScriptsReviewed = false; assert.throws(() => f.approve('destination'), /review/); assert.equal(f.writes(), 0); const g = fixture(); context.AnnualCopyEngine.verifyCompleted = () => ({ operations: Object.values(g.setup.resources).map(key => ({ key, state: 'created', id: key === 'points' ? 'source_points' : 'new_' + key })) }); assert.throws(() => g.approve('destination'), /Source file/); });
test('wrong year, missing resources and mismatched import sources fail before writes', () => { for (const mutate of [f => f.setup.year = '2029-2030', f => f.setup.resources.budgetExport = 'missing', f => f.setup.exports.budgetExport.sourceId = 'other']) { const f = fixture(); mutate(f); assert.throws(() => f.approve('destination')); assert.equal(f.writes(), 0); } });
test('exact approval rejects tampering, and all baselines compare before first write', () => { const f = fixture(); f.destination(); const approved = f.approve('workbooks'); assert.throws(() => engine.run(f.copy, f.setup, f.io, 'workbooks', { ...approved, digest: 'wrong' }), /Approval/); f.set(f.ids.pointsMaster, 'Config', 'B2', { value: 'Changed concurrently' }); assert.throws(() => engine.run(f.copy, f.setup, f.io, 'workbooks', approved), /Approval|baseline/); assert.equal(f.writes(), 1); });
test('formula references retarget actual observed tab, labels/form id/dates configure exactly', () => { const f = fixture(); f.destination(); const preview = engine.run(f.copy, f.setup, f.io, 'workbooks'); const ranges = preview.changes.filter(p => p.kind === 'range' && p.id === f.ids.pointsMaster); assert.equal(ranges.length, 1); assert.equal(ranges[0].a1, 'A2:B3'); assert.match(ranges[0].after[0][0], /Form Responses 3/); const writes = f.writes(), saves = f.saves(); engine.run(f.copy, f.setup, f.io, 'workbooks'); assert.equal(f.writes(), writes); assert.equal(f.saves(), saves); engine.run(f.copy, f.setup, f.io, 'workbooks', f.approve('workbooks')); assert.deepEqual(f.io.cell(f.ids.budgetTracker, 'Setup & Lists', 'B14'), { date: '2029-05-31' }); assert.deepEqual(f.io.cell(f.ids.pointsMaster, 'Config', 'B16'), { value: f.ids.attendanceFormEditor }); assert.equal(f.io.cell(f.ids.budgetTracker, 'Dashboard', 'C5').value, 123.45); assert.equal(f.io.cell(f.ids.budgetTracker, 'Setup & Lists', 'B6').value, 55); assert.equal(f.io.cell(f.ids.budgetTracker, 'Setup & Lists', 'B7').value, 66); });
test('exports patch source IDs in exact formulas and Read Me, retaining local formulas', () => { const f = fixture(); f.set(f.ids.budgetExport, 'Budget_Public', 'C4', { formula: '=C2+C3' }); f.workbooks(); assert.match(f.io.cell(f.ids.budgetExport, 'Budget_Public', 'C2').formula, /new_budget/); assert.equal(f.io.cell(f.ids.budgetExport, 'Budget_Public', 'C4').formula, '=C2+C3'); assert.match(f.io.cell(f.ids.budgetExport, 'Read Me', 'B2').value, /new_budget/); });
test('unreviewed external imports and unexpected counts remain blocked', () => { for (const mutate of [f => f.set(f.ids.budgetExport, 'Budget_Public', 'C4', { formula: '=IMPORTRANGE("other","A1")' }), f => f.setup.exports.budgetExport.expectedFormulaCells = 34]) { const f = fixture(); f.destination(); mutate(f); assert.throws(() => f.approve('workbooks'), /target|count|differs/); assert.equal(f.writes(), 1); } });
test('unknown outcome after destination commit reconciles readback without repeat', () => { const f = fixture(), write = f.io.write; const approved = f.approve('destination'); f.io.write = patch => { write(patch); throw Error('Lost acknowledgement'); }; assert.throws(() => engine.run(f.copy, f.setup, f.io, 'destination', approved), /Lost/); f.io.write = write; engine.run(f.copy, f.setup, f.io, 'destination', approved); assert.equal(f.writes(), 1); });
test('pending write with unchanged old value blocks blind retry', () => { const f = fixture(), approved = f.approve('destination'); f.io.write = () => { throw Error('Unknown'); }; assert.throws(() => engine.run(f.copy, f.setup, f.io, 'destination', approved), /Unknown/); assert.throws(() => engine.run(f.copy, f.setup, f.io, 'destination', approved), /unknown/); assert.equal(f.writes(), 0); });
test('intent acknowledgement failure never sends the configuration write', () => { const f = fixture(), approved = f.approve('destination'); f.io.copy.save = () => { throw Error('Ledger unavailable'); }; assert.throws(() => engine.run(f.copy, f.setup, f.io, 'destination', approved), /Ledger/); assert.equal(f.writes(), 0); });
test('lost formula range acknowledgement reconciles without repeating range', () => { const f = fixture(); f.destination(); const approved = f.approve('workbooks'), write = f.io.write; let uncertain = false; f.io.write = patch => { write(patch); if (patch.kind === 'range' && !uncertain) { uncertain = true; throw Error('Lost range acknowledgement'); } }; assert.throws(() => engine.run(f.copy, f.setup, f.io, 'workbooks', approved), /Lost range/); const writes = f.writes(); f.io.write = write; engine.run(f.copy, f.setup, f.io, 'workbooks', approved); assert.equal(f.writes(), writes + 2); });
test('unchanged configured repeat and handoff use observed Form URLs with no external writes', () => { const f = fixture(); f.destination(); const approved = f.approve('workbooks'); engine.run(f.copy, f.setup, f.io, 'workbooks', approved); const writes = f.writes(); engine.run(f.copy, f.setup, f.io, 'workbooks', approved); const handoff = engine.handoff(f.copy, f.setup, f.io); assert.equal(f.writes(), writes); assert.equal(handoff.type, 'asme-annual-link-handoff'); assert.equal(handoff.links.attendanceFormRespondent, f.form.respondentUrl); assert.equal(Object.keys(handoff.links).length, 7); assert.equal(handoff.verification.destinationMatches, true); });
test('handoff refuses missing configuration, changed baseline and LIVE status', () => { const f = fixture(); assert.throws(() => engine.handoff(f.copy, f.setup, f.io), /Complete/); f.workbooks(); f.set(f.ids.pointsMaster, 'Config', 'B5', { value: 'LIVE' }); assert.throws(() => engine.handoff(f.copy, f.setup, f.io), /TESTING/); });
