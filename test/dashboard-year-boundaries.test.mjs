import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

// Exercise production calculations directly; the browser wrapper has DOM work.
const source = readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');
function productionFunction(name, next) {
  const start = source.indexOf(`  function ${name}(`);
  const end = source.indexOf(`\n  function ${next}(`, start);
  assert.ok(start >= 0 && end > start);
  return vm.runInNewContext(`${source.slice(start, end)}\n${name}`, { Date });
}
const includes = productionFunction('eventFallsInPeriod', 'periodView');
const pace = productionFunction('goalPace', 'renderGoal');
const date = (year, month, day) => new Date(year, month - 1, day);

test('Fall and Spring event filters include exact selected bounds and exclude adjoining periods', () => {
  const fall = { kind: 'semester', start: date(2027, 8, 1) };
  const spring = { kind: 'semester', start: date(2028, 1, 1) };
  for (const [period, year, month, day, expected] of [
    [fall, 2027, 7, 31, false], [fall, 2027, 8, 1, true],
    [fall, 2027, 12, 31, true], [fall, 2028, 1, 1, false],
    [spring, 2027, 12, 31, false], [spring, 2028, 1, 1, true],
    [spring, 2028, 5, 31, true], [spring, 2028, 6, 1, false],
  ]) assert.equal(includes({ date: date(year, month, day) }, period), expected);
});

test('July remains available as an annual monthly reporting period with August excluded', () => {
  const july = { kind: 'month', start: date(2028, 7, 1) };
  assert.equal(includes({ date: date(2028, 6, 30) }, july), false);
  assert.equal(includes({ date: date(2028, 7, 1) }, july), true);
  assert.equal(includes({ date: date(2028, 7, 31) }, july), true);
  assert.equal(includes({ date: date(2028, 8, 1) }, july), false);
});

test('annual goal pace starts August 1 and continues through July before clamping at next August', () => {
  const kpis = { engagementGoal: 100, uniqueAttendees: 0 };
  const at = value => pace(kpis, { academicYear: '2027–2028', lastUpdated: value });
  assert.equal(at(date(2027, 7, 31)).variance, 0);
  assert.equal(at(date(2027, 8, 1)).variance, 0);
  const july = at(date(2028, 7, 1));
  const nextAugust = at(date(2028, 8, 1));
  assert.ok(july.variance > -100 && july.variance < -80);
  assert.equal(nextAugust.variance, -100);
  assert.equal(at(date(2028, 9, 1)).variance, -100);
});
