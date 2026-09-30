import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/js/settings-readback.js';
const { fields, compare } = globalThis.ASME_SETTINGS_READBACK;
function fixture() {
  const expected = Object.fromEntries(fields.filter(([, key]) => key).map(([, key, type]) => [key, type === 'boolean' ? false : type === 'number' ? 65 : '']));
  Object.assign(expected, { yearKey: '2027-2028', label: '2027–2028' });
  const row = value => ({ c: fields.map(([, key]) => ({ v: key ? value[key] : '' })) });
  const table = { cols: fields.map(([label]) => ({ label })), rows: [row({ ...expected, yearKey: '2026-2027', isActive: true, isCurrent: true }), row(expected)] };
  return { expected, table };
}
test('inactive draft matches raw row without activation or mutation', () => {
  const { expected, table } = fixture();
  const before = JSON.stringify({ expected, table });
  assert.equal(compare(table, expected).matched, true);
  assert.equal(JSON.stringify({ expected, table }), before);
});
test('differences list field names without leaking values', () => {
  const { expected, table } = fixture();
  expected.attendanceFormUrl = 'https://example.invalid/private-reference';
  const result = compare(table, expected);
  assert.equal(result.matched, false);
  assert.match(result.message, /attendance_form_url/);
  assert.doesNotMatch(result.message, /private-reference/);
});
for (const [name, change] of [
  ['missing year', f => f.table.rows.pop()],
  ['duplicate year', f => f.table.rows.push(f.table.rows[1])],
  ['multiple current', f => f.table.rows[1].c[11].v = true],
  ['no current', f => f.table.rows[0].c[11].v = false],
  ['inactive current', f => f.table.rows[0].c[10].v = false],
  ['blank flag', f => f.table.rows[1].c[10].v = ''],
  ['header reordered', f => f.table.cols.reverse()],
  ['empty response', f => f.table = {}],
  ['empty rows', f => f.table.rows = []],
  ['blank goal', f => f.table.rows[1].c[2].v = ''],
]) test(`${name} never confirms save`, () => {
  const f = fixture(); change(f);
  const result = compare(f.table, f.expected);
  assert.equal(result.matched, false);
  assert.match(result.message, /No shared save is confirmed/);
});
test('status and timestamp are excluded and explicitly not a Hub save', () => {
  const f = fixture(); f.table.rows[1].c[12].v = 'old timestamp';
  const result = compare(f.table, f.expected);
  assert.equal(result.matched, true);
  assert.match(result.message, /not confirmation of a Hub save/);
});
