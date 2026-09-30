import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../integrations/apps-script/FormDestinationValidator.gs.example', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);
const FORM = 'syntheticFormEditor_01';
const SHEET = 'syntheticPointsMaster_01';
const OTHER = 'syntheticOtherWorkbook_02';
const TIME = '2026-09-28T12:00:00.000Z';
const input = { yearKey: '2027-2028', form: FORM, pointsMaster: SHEET };
function check({ data = { formId: FORM, linkedSheetId: SHEET }, formCode = 200, sheetCode = 200, sheetData = { spreadsheetId: SHEET } } = {}, overrides = {}) {
  const calls = [];
  const result = context.validateFormDestination_({ ...input, ...overrides }, (kind, id) => {
    calls.push({ kind, id });
    return kind === 'form' ? { code: formCode, data } : { code: sheetCode, data: sheetData };
  }, () => TIME);
  return { result: JSON.parse(JSON.stringify(result)), calls };
}

test('match comes from actual Google response; evidence binds year, form, both workbook IDs and check time', () => {
  const { result, calls } = check();
  assert.deepEqual(result, { checkId: 'V02', checkVersion: 1, method: 'authorized-google-rest', checkedAt: TIME, yearKey: input.yearKey, formId: FORM, intendedWorkbookId: SHEET, observedDestinationId: SHEET, status: 'match', reason: 'actual-destination-matches' });
  assert.deepEqual(calls, [{ kind: 'form', id: FORM }, { kind: 'sheet', id: SHEET }]);
  assert.deepEqual(input, { yearKey: '2027-2028', form: FORM, pointsMaster: SHEET });
});
test('mismatch observes another destination without reading its workbook', () => {
  const { result, calls } = check({ data: { formId: FORM, linkedSheetId: OTHER } });
  assert.equal(result.status, 'mismatch');
  assert.equal(result.observedDestinationId, OTHER);
  assert.equal(calls[1].id, SHEET);
});
test('missing and empty destination are unlinked, never inferred from intended input', () => {
  for (const data of [{ formId: FORM }, { formId: FORM, linkedSheetId: '' }]) {
    assert.equal(check({ data }).result.status, 'unlinked');
  }
});
test('read access, API, service, quota and transport errors cannot pass', () => {
  for (const code of [0, 301, 401, 403, 404, 429, 500, 503]) {
    const formFailure = check({ formCode: code });
    assert.equal(formFailure.result.status, 'inaccessible');
    assert.equal(formFailure.calls.length, 1);
    assert.equal(check({ sheetCode: code }).result.status, 'inaccessible');
  }
  assert.equal(context.validateFormDestination_(input, () => { throw new Error('private values'); }, () => TIME).status, 'inaccessible');
});
test('intended workbook access is required even when destination matches or is absent', () => {
  assert.equal(check({ sheetCode: 403 }).result.status, 'inaccessible');
  const result = check({ data: { formId: FORM }, sheetCode: 404 }).result;
  assert.equal(result.status, 'inaccessible');
  assert.equal(result.observedDestinationId, null);
});
test('editor URLs normalize while published, shortened, unsafe, or malformed inputs cause no reads', () => {
  assert.equal(check({}, { form: `https://docs.google.com/forms/d/${FORM}/edit?usp=sharing`, pointsMaster: `https://docs.google.com/spreadsheets/d/${SHEET}/edit#gid=0` }).result.status, 'match');
  for (const form of ['', 'short', '1FAIpQLpublishedForm_01', 'https://docs.google.com/forms/d/e/1FAIpQLpublishedForm_01/viewform', 'https://docs.google.com/forms/d/1FAIpQLpublishedForm_01/edit', 'https://forms.gle/synthetic', `http://docs.google.com/forms/d/${FORM}/edit`, `https://docs.google.com.evil.test/forms/d/${FORM}/edit`, `https://user:pass@docs.google.com/forms/d/${FORM}/edit`, `https://docs.google.com/forms/d/${FORM}/viewform`, FORM + '/extra']) {
    const { result, calls } = check({}, { form });
    assert.equal(result.status, 'invalid', form);
    assert.equal(calls.length, 0);
    assert.equal(result.formId, undefined);
  }
  for (const overrides of [{ yearKey: '2027-2029' }, { yearKey: '2027–2028' }, { yearKey: 2027 }, { pointsMaster: 'https://evil.test/sheet' }]) {
    assert.equal(check({}, overrides).calls.length, 0);
  }
});
test('malformed or inconsistent Google metadata cannot establish linkage', () => {
  for (const data of [null, [], {}, { formId: OTHER }, { formId: FORM, linkedSheetId: null }, { formId: FORM, linkedSheetId: 123 }, { formId: FORM, linkedSheetId: `https://docs.google.com/spreadsheets/d/${SHEET}/edit` }]) {
    assert.equal(check({ data }).result.status, 'invalid');
  }
  assert.equal(check({ sheetData: { spreadsheetId: OTHER } }).result.status, 'invalid');
});
test('real transport uses only masked GETs to fixed Google hosts, no redirects or leaked error body', () => {
  const requests = [];
  const logs = [];
  const sandbox = vm.createContext({
    ScriptApp: { getOAuthToken: () => 'privateToken' },
    UrlFetchApp: { fetch(url, options) {
      requests.push({ url, options });
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify(url.includes('forms.googleapis.com') ? { formId: FORM, linkedSheetId: SHEET } : { spreadsheetId: SHEET }) };
    } },
    console: { info: value => logs.push(value) }
  });
  vm.runInContext(source, sandbox);
  assert.equal(sandbox.validateFormDestination_(input, sandbox.googleDestinationGet_, () => TIME).status, 'match');
  assert.equal(requests.length, 2);
  for (const { url, options } of requests) {
    assert.match(url, /^https:\/\/(forms|sheets)\.googleapis\.com\//);
    assert.equal(options.method, 'get');
    assert.equal(options.followRedirects, false);
    assert.equal(options.payload, undefined);
    assert.equal(options.headers.Authorization, 'Bearer privateToken');
  }
  assert.match(requests[0].url, /fields=formId,linkedSheetId$/);
  assert.match(requests[1].url, /fields=spreadsheetId&includeGridData=false$/);
  sandbox.UrlFetchApp.fetch = () => ({ getResponseCode: () => 403, getContentText: () => { throw new Error('must not read private body'); } });
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.googleDestinationGet_('form', FORM))), { code: 403 });
  sandbox.UrlFetchApp.fetch = () => ({ getResponseCode: () => 200, getContentText: () => '<html>private invalid response</html>' });
  assert.equal(sandbox.googleDestinationGet_('form', FORM).malformed, true);
  sandbox.UrlFetchApp.fetch = () => { throw new Error('private request URL'); };
  assert.equal(sandbox.googleDestinationGet_('form', FORM).code, 0);
  sandbox.runFormDestinationCheck(); // blank template inputs prevent requests
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0], new RegExp(`${FORM}|${SHEET}|privateToken|private request`));
  const manifest = JSON.parse(readFileSync(new URL('../integrations/apps-script/FormDestinationValidator.appsscript.json.example', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.oauthScopes, ['https://www.googleapis.com/auth/forms.body.readonly', 'https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/script.external_request']);
  assert.doesNotMatch(source, /function\s+(?:doGet|doPost|onOpen)\s*\(/);
});
