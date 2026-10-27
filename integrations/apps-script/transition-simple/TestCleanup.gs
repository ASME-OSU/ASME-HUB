/* Bound to Points Master. Only explicitly MOCK-marked attendance is eligible.
 * Archives both stores before clearing; leaves all calculated tabs intact. */
function asmeTestArchiveValue_(value) {
  if (value instanceof Date) return {type: 'date', value: value.toISOString()};
  if (Array.isArray(value)) return value.map(asmeTestArchiveValue_);
  return value;
}
function asmeTestCleanupPlan_(ss) {
  asmeChapterActor_();
  if (!ss || ss.getId() === '1UXprLAnzUjlzaojb7BDYTN9Om25xPFRYGQZIyHQRG2M') throw new Error('Open an annual Points Master copy, not the template.');
  var config = ss.getSheetByName('Config');
  if (!config || config.getRange('B5').getValue() !== 'TESTING') throw new Error('Clear Test Data requires TESTING mode.');
  var formId = String(config.getRange('B16').getValue()).trim(), responseName = String(config.getRange('B7').getValue()).trim(), title = String(config.getRange('B17').getValue()).trim();
  if (!formId || !title || formId === '1ofRiLS_WtQpH_poxU4blyKn7pZVriUWL8dsvfCJLLYA') throw new Error('The copied Form ID and exact Event ID question title are required.');
  var form = FormApp.openById(formId), response = ss.getSheetByName(responseName), events = ss.getSheetByName('Events');
  if (form.getDestinationId() !== ss.getId() || !response || !response.getFormUrl() || FormApp.openByUrl(response.getFormUrl()).getId() !== formId) throw new Error('Form and response tab must belong to this annual copy.');
  if (form.isAcceptingResponses()) throw new Error('Close Form intake before clearing test data.');
  if (response.getLastRow() > 1000 || !events || events.getLastRow() > 1000) throw new Error('Attendance or event rows exceed the reviewed cleanup limit.');
  if (JSON.stringify(response.getRange(1, 1, 1, 12).getValues()[0]) !== JSON.stringify(ASME_RESPONSE_HEADERS)) throw new Error('Response headers must match the twelve-column template.');
  var eventRows = events.getRange(1, 1, Math.max(1, events.getLastRow()), 9).getValues();
  asmeEventChoices_(eventRows);
  var mockChoices = Object.create(null);
  eventRows.slice(1).forEach(function(r) {
    if (r[8] === true) throw new Error('Close every event form_open checkbox before cleanup.');
    var id = String(r[0] || '').trim(), name = String(r[1] || '').trim();
    if (id && name && (/^MOCK(?:\b|[_-])/i.test(id) || /^MOCK(?:\b|[_-])/i.test(name))) mockChoices[id + ' - ' + name] = true;
  });
  var rowCount = Math.max(0, response.getLastRow() - 1), raw = rowCount ? response.getRange(2, 1, rowCount, 12).getValues() : [];
  if (rowCount && response.getRange(2, 1, rowCount, 12).getFormulas().some(function(r) { return r.some(Boolean); })) throw new Error('Response input contains formulas; no data was cleared.');
  raw.forEach(function(r) { if (r.some(function(v) { return v !== ''; }) && !mockChoices[String(r[10] || '').trim()]) throw new Error('Every response must reference an explicitly MOCK-marked event. Real or unmarked attendance was preserved.'); });
  var responses = form.getResponses();
  if (responses.length > 999) throw new Error('Form responses exceed the reviewed cleanup limit.');
  var formRecords = responses.map(function(r) {
    var answers = r.getItemResponses().map(function(a) { return {itemId: a.getItem().getId(), title: a.getItem().getTitle(), response: asmeTestArchiveValue_(a.getResponse())}; });
    var eventAnswers = answers.filter(function(a) { return a.title === title; });
    if (eventAnswers.length !== 1 || !mockChoices[String(eventAnswers[0].response || '').trim()]) throw new Error('Every Form response must reference an explicitly MOCK-marked event. No responses were deleted.');
    return {id: r.getId(), timestamp: r.getTimestamp().toISOString(), email: r.getRespondentEmail() || '', answers: answers};
  });
  return {form: form, sheet: response, rowCount: rowCount, raw: asmeTestArchiveValue_(raw), formRecords: formRecords, formId: formId, responseName: responseName};
}
function asmeClearTestData_(ss, expected) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Points tools are busy; retry shortly.');
  try {
    var plan = asmeTestCleanupPlan_(ss);
    function snapshot(p) { return JSON.stringify({formId: p.formId, responseName: p.responseName, raw: p.raw, formRecords: p.formRecords}); }
    if (!expected || snapshot(plan) !== expected) throw new Error('Test data changed after the preview. Review Clear Test Data again.');
    if (!plan.rowCount && !plan.formRecords.length) return {cleared: true, rows: 0, responses: 0, archive: null};
    var stamp = new Date().toISOString(), archiveName = '_Test_Backup_' + stamp.replace(/[-:.TZ]/g, '');
    var records = [['Record type', 'Archived JSON'], ['metadata', JSON.stringify({spreadsheetId: ss.getId(), formId: plan.formId, responseTab: plan.responseName, savedAt: stamp})], ['headers', JSON.stringify(ASME_RESPONSE_HEADERS)]];
    plan.raw.forEach(function(r, i) { records.push(['sheet_row', JSON.stringify({row: i + 2, values: r})]); });
    plan.formRecords.forEach(function(r) { records.push(['form_response', JSON.stringify(r)]); });
    if (records.some(function(r) { return r[1].length > 45000; })) throw new Error('A response is too large to archive safely; no data was cleared.');
    var archive = ss.insertSheet(archiveName);
    if (archive.getMaxRows() < records.length) archive.insertRowsAfter(archive.getMaxRows(), records.length - archive.getMaxRows());
    archive.getRange(1, 1, records.length, 2).setValues(records);
    SpreadsheetApp.flush();
    if (JSON.stringify(archive.getRange(1, 1, records.length, 2).getValues()) !== JSON.stringify(records)) throw new Error('Backup verification failed; original test data was preserved.');
    if (snapshot(asmeTestCleanupPlan_(ss)) !== expected) throw new Error('Data changed while backing up; original data was preserved. Review again.');
    // Google stores Form responses and spreadsheet rows separately. Clear both.
    // Delete only archived IDs. A response committed after the final snapshot
    // must never be swept up by deleteAllResponses, even with intake closed.
    plan.formRecords.forEach(function(record) { plan.form.deleteResponse(record.id); });
    var beforeSheetClear = asmeTestCleanupPlan_(ss);
    if (JSON.stringify({formId: beforeSheetClear.formId, responseName: beforeSheetClear.responseName, raw: beforeSheetClear.raw}) !== JSON.stringify({formId: plan.formId, responseName: plan.responseName, raw: plan.raw}) || beforeSheetClear.formRecords.length) throw new Error('Attendance changed during Form cleanup. Sheet rows were preserved; inspect ' + archiveName + ' before retrying.');
    if (plan.rowCount) plan.sheet.getRange(2, 1, plan.rowCount, 12).clearContent();
    SpreadsheetApp.flush();
    var after = asmeTestCleanupPlan_(ss);
    if (after.rowCount || after.formRecords.length) throw new Error('Cleanup incomplete. Backup is in ' + archiveName + '; intake remains closed.');
    asmeSyncEvents_(ss);
    return {cleared: true, rows: plan.rowCount, responses: plan.formRecords.length, archive: archiveName};
  } finally { lock.releaseLock(); }
}
function clearTestData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), plan = asmeTestCleanupPlan_(ss);
  if (!plan.rowCount && !plan.formRecords.length) {
    ss.toast('No test attendance to clear: 0 response-sheet rows and 0 Form responses. No backup was created or data changed.', 'ASME Tools', 8);
    return {cleared: true, rows: 0, responses: 0, archive: null};
  }
  var ui = SpreadsheetApp.getUi();
  var expected = JSON.stringify({formId: plan.formId, responseName: plan.responseName, raw: plan.raw, formRecords: plan.formRecords});
  var choice = ui.alert('Clear Test Data', 'Archive and remove ' + plan.rowCount + ' response-sheet rows and ' + plan.formRecords.length + ' Form responses? All are marked MOCK. The backup stays in this workbook. Original Form response IDs cannot be restored. Formula tabs, event definitions and budget inputs are preserved.', ui.ButtonSet.YES_NO);
  if (choice !== ui.Button.YES) return {cleared: false};
  var result = asmeClearTestData_(ss, expected);
  ss.toast('Test attendance cleared.' + (result.archive ? ' Backup: ' + result.archive : ''), 'ASME Tools', 8);
  return result;
}
