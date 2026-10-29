/* Optional chapter-only setup screen for the standalone provisioner project. */
function asmeProvisionerActor_() {
  asmeChapterActor_();
  if (Session.getActiveUser().getEmail().toLowerCase() !== 'asmeohiostate@gmail.com') throw new Error('Sign in with the chapter Google account.');
}
function doGet(e) {
  asmeProvisionerActor_();
  var input = e && e.parameter || {}, year = String(input.year || ''), mode = input.mode === 'rehearsal' ? 'rehearsal' : 'production';
  if (year) asmeAnnualYear_(year, 'Fall ' + year.slice(0,4));
  var expectedRunKey=String(input.expectedRunKey||''),expectedConfigRevision=String(input.expectedConfigRevision||'');
  if(!!expectedRunKey!==!!expectedConfigRevision||expectedRunKey.length>700||expectedConfigRevision.length>2000)throw new Error('This connection link is incomplete or too long. Return to the Hub and check the selected year again.');
  function attribute(value){return value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  var html = HtmlService.createHtmlOutputFromFile('ProvisionerPage').getContent();
  return HtmlService.createHtmlOutput(html.replace('value="__YEAR__"', 'value="' + year + '"').replace('value="__MODE__"', 'value="' + mode + '"').replace('value="__EXPECTED_RUN_KEY__"',function(){return 'value="'+attribute(expectedRunKey)+'"';}).replace('value="__EXPECTED_CONFIG_REVISION__"',function(){return 'value="'+attribute(expectedConfigRevision)+'"';})).setTitle('ASME Annual Setup');
}
function getAnnualSetupConfig(year) {
  asmeProvisionerActor_();
  var config = JSON.parse(PropertiesService.getScriptProperties().getProperty('ANNUAL_PROVISIONER_CONFIG') || '{}');
  var view = {rootFolderId: config.rootFolderId || '', controlCenterId: config.controlCenterId || '', engagementGoal: config.engagementGoal || '', calendarIcalUrl: config.calendarIcalUrl || '', runKey: '', workspaceMode: config.workspaceMode || '', configRevision: asmeAnnualConfigRevision_(config), goalSource: 'Saved chapter setup', existing: false};
  if (year && config.rootFolderId && config.controlCenterId) {
    var parts = asmeAnnualYear_(year, 'Fall ' + String(year).slice(0,4));
    var saved = JSON.parse(PropertiesService.getScriptProperties().getProperty(asmeAnnualRunKey_(year,config.rootFolderId,config.controlCenterId)) || '{}');
    if (saved.plan && saved.plan.rootFolderId === config.rootFolderId && saved.plan.controlCenterId === config.controlCenterId) {
      view.runKey = saved.runKey || '';
      if(saved.phase==='draft_ready'&&saved.ids)view.fileIds={pointsMaster:saved.ids.pointsMaster,attendanceForm:saved.ids.attendanceForm,pointsExport:saved.ids.pointsExport,budgetTracker:saved.ids.budgetTracker,budgetExport:saved.ids.budgetExport,controlCenter:saved.plan.controlCenterId}; view.engagementGoal = saved.plan.engagementGoal; view.goalSource = 'This year’s saved setup'; view.existing = true;
    } else {
      var sheet = SpreadsheetApp.openById(config.controlCenterId).getSheetByName('Hub_Settings_Public');
      if (!sheet || sheet.getLastRow() > 1000 || JSON.stringify(sheet.getRange(1,1,1,20).getValues()[0]) !== JSON.stringify(ASME_ANNUAL_HEADERS)) throw new Error('Ask the President to check the saved settings sheet.');
      var rows = sheet.getLastRow() > 1 ? sheet.getRange(2,1,sheet.getLastRow()-1,20).getValues() : [];
      var priorYear = (parts.start-1) + '-' + parts.start;
      var previous = rows.filter(function(row) { return row[0] === priorYear; });
      if (previous.length > 1) throw new Error('Last year appears twice in the settings sheet. Ask the President to resolve it.');
      if (previous.length && Number.isInteger(previous[0][2]) && previous[0][2] > 0) { view.engagementGoal = previous[0][2]; view.goalSource = 'Last year (' + priorYear + ')'; }
    }
  }
  return view;
}
function asmeSetupResourceId_(value, kind) {
  var text = String(value || '').trim();
  var pattern = kind === 'folder' ? /^https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)(?:[/?#].*)?$/ : /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]+)(?:[/?#].*)?$/;
  var match = pattern.exec(text);
  var id = match ? match[1] : text;
  if (!/^[\w-]+$/.test(id)) throw new Error('Enter a valid Google ' + kind + ' link or file ID.');
  return id;
}
function saveAnnualSetupConfig(input) {
  asmeProvisionerActor_();
  if (!input || typeof input !== 'object') throw new Error('Setup fields are required.');
  var config = {rootFolderId: asmeSetupResourceId_(input.rootFolderId, 'folder'), controlCenterId: asmeSetupResourceId_(input.controlCenterId, 'spreadsheet'), engagementGoal: Number(input.engagementGoal), calendarIcalUrl: String(input.calendarIcalUrl || '').trim(), workspaceMode: input.workspaceMode};
  if (['production','rehearsal'].indexOf(config.workspaceMode) < 0) throw new Error('Choose whether this workspace is Real handoff or Practice.');
  if (!Number.isInteger(config.engagementGoal) || config.engagementGoal <= 0) throw new Error('Enter a positive whole-number engagement goal.');
  if (config.calendarIcalUrl && !/^https:\/\/[^\s]+$/.test(config.calendarIcalUrl)) throw new Error('Calendar feed must be an HTTPS URL.');
  var excluded = Object.keys(ASME_ANNUAL_TEMPLATES).map(function(k) { return ASME_ANNUAL_TEMPLATES[k]; });
  excluded.push('125_HEyqM4T0lrSSuBfSzPT_o0B8kScHK');
  if (config.rootFolderId === config.controlCenterId || excluded.indexOf(config.rootFolderId) >= 0 || excluded.indexOf(config.controlCenterId) >= 0) throw new Error('Choose the annual workspace root and Control Center, not a template or template-library root.');
  var root = DriveApp.getFolderById(config.rootFolderId), center = DriveApp.getFileById(config.controlCenterId);
  if (root.isTrashed() || root.getOwner().getEmail().toLowerCase() !== 'asmeohiostate@gmail.com' || root.getSharingAccess() !== DriveApp.Access.PRIVATE || root.getEditors().concat(root.getViewers()).some(function(u) { return u.getEmail().toLowerCase() !== 'asmeohiostate@gmail.com'; })) throw new Error('Use a private chapter-owned annual workspace root.');
  if (center.isTrashed() || center.getOwner().getEmail().toLowerCase() !== 'asmeohiostate@gmail.com') throw new Error('Use the chapter-owned Control Center.');
  var settings = SpreadsheetApp.openById(config.controlCenterId).getSheetByName('Hub_Settings_Public');
  if (!settings || JSON.stringify(settings.getRange(1, 1, 1, 20).getValues()[0]) !== JSON.stringify(ASME_ANNUAL_HEADERS) || settings.getRange(1, 1, 1, 20).getFormulas()[0].some(Boolean)) throw new Error('Control Center must have the expected twenty-column settings headers.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Annual setup is running; wait before changing setup fields.');
  try {
    var properties = PropertiesService.getScriptProperties(), old = JSON.parse(properties.getProperty('ANNUAL_PROVISIONER_CONFIG') || '{}');
    var sharedIdentity = old.rootFolderId === config.rootFolderId || old.controlCenterId === config.controlCenterId;
    if (sharedIdentity && old.workspaceMode && old.workspaceMode !== config.workspaceMode) throw new Error('Do not change an existing workspace between Practice and Real handoff. Use a separate folder and settings sheet.');
    asmeCheckWorkspacePurpose_(properties, config);
    properties.setProperty('ANNUAL_PROVISIONER_CONFIG', JSON.stringify(config));
  }
  finally { lock.releaseLock(); }
  return config;
}
function runAnnualSetup(year, answers) {
  asmeProvisionerActor_();
  year = String(year || '').trim();
  if (!answers || typeof answers !== 'object') throw new Error('Answer the member-goal question before continuing.');
  var result = provisionAnnualYear(year, 'Fall ' + year.slice(0,4), answers);
  var handoff = {schema:1,type:'asme-annual-link-handoff',year:result.targetYear,links:{annualFolder:result.receipt.folderUrl,pointsMaster:result.receipt.links.pointsMaster,attendanceFormEditor:result.receipt.formEditUrl,attendanceFormRespondent:result.receipt.links.formRespondent,pointsExport:result.receipt.links.pointsExport,budgetTracker:result.receipt.links.budgetTracker,budgetExport:result.receipt.links.budgetExport}};
  if (answers.mode === 'rehearsal') handoff.mock = {controlCenterUrl:'https://docs.google.com/spreadsheets/d/' + result.receipt.plan.controlCenterId + '/edit'};
  // Return plain data only: HTML service cannot transport Date instances.
  return {success: result.success, targetYear: result.targetYear, runKey: result.receipt.runKey, fileIds:{pointsMaster:result.receipt.ids.pointsMaster,attendanceForm:result.receipt.ids.attendanceForm,pointsExport:result.receipt.ids.pointsExport,budgetTracker:result.receipt.ids.budgetTracker,budgetExport:result.receipt.ids.budgetExport,controlCenter:result.receipt.plan.controlCenterId}, readableReceipt: result.readableReceipt, folderUrl: result.receipt.folderUrl, formEditUrl: result.receipt.formEditUrl, links: result.receipt.links, next: result.next, hubHandoff: JSON.stringify(handoff)};
}
