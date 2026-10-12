/* Optional chapter-only setup screen for the standalone provisioner project. */
function asmeProvisionerActor_() {
  asmeChapterActor_();
  if (Session.getActiveUser().getEmail().toLowerCase() !== 'asmeohiostate@gmail.com') throw new Error('Sign in with the chapter Google account.');
}
function doGet() {
  asmeProvisionerActor_();
  return HtmlService.createHtmlOutputFromFile('ProvisionerPage').setTitle('ASME Annual Setup');
}
function getAnnualSetupConfig() {
  asmeProvisionerActor_();
  var config = JSON.parse(PropertiesService.getScriptProperties().getProperty('ANNUAL_PROVISIONER_CONFIG') || '{}');
  return {rootFolderId: config.rootFolderId || '', controlCenterId: config.controlCenterId || '', engagementGoal: config.engagementGoal || '', calendarIcalUrl: config.calendarIcalUrl || ''};
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
  var config = {rootFolderId: asmeSetupResourceId_(input.rootFolderId, 'folder'), controlCenterId: asmeSetupResourceId_(input.controlCenterId, 'spreadsheet'), engagementGoal: Number(input.engagementGoal), calendarIcalUrl: String(input.calendarIcalUrl || '').trim()};
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
  try { PropertiesService.getScriptProperties().setProperty('ANNUAL_PROVISIONER_CONFIG', JSON.stringify(config)); }
  finally { lock.releaseLock(); }
  return config;
}
function runAnnualSetup(year) {
  asmeProvisionerActor_();
  var result = provisionReviewedAnnualYear(String(year || '').trim());
  // Return plain data only: HTML service cannot transport Date instances.
  return {success: result.success, targetYear: result.targetYear, readableReceipt: result.readableReceipt, folderUrl: result.receipt.folderUrl, formEditUrl: result.receipt.formEditUrl, links: result.receipt.links, next: result.next};
}
