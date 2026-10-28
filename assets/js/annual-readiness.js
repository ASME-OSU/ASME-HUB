// Validate remote observations before showing them or using their identities in a write.
const ID = /^[A-Za-z0-9_-]{20,200}$/;
export function validAnnualRunKey(value, year, controlCenterId, rootFolderId) {
  const prefix = 'ASME_SIMPLE_ANNUAL_';
  if (typeof value !== 'string' || value.length > 700 || !value.startsWith(prefix)) return false;
  try {
    const parts = JSON.parse(value.slice(prefix.length));
    return Array.isArray(parts) && parts.length === 3 && parts[0] === year && /^\d{4}-\d{4}$/.test(year) && ID.test(parts[1]) && ID.test(parts[2]) && parts[2] === controlCenterId && (!rootFolderId || parts[1] === rootFolderId) && prefix + JSON.stringify(parts) === value;
  } catch { return false; }
}
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function text(value, max, optional = false) {
  if (optional && value === undefined) return;
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw Error('Google returned an invalid connection report. Check connections again before retrying a change.');
}
function keys(value, allowed) {
  if (!plain(value) || Object.keys(value).some(key => !allowed.includes(key))) throw Error('Google returned an unsupported connection report. Check connections again before retrying a change.');
}
function stamp(value, now) {
  text(value, 40);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(Date.parse(value)).toISOString() !== value || Date.parse(value) > now + 60000) throw Error('Google returned an invalid connection time. Check again.');
}
export function annualFileId(value, kind = 'spreadsheets') {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.search || url.port || url.username || url.password) return '';
    const match = url.pathname.match(new RegExp(`^/${kind}/d/([A-Za-z0-9_-]{20,200})/edit/?$`));
    return match?.[1] || '';
  } catch { return ''; }
}
export function validateAnnualReadiness(value, context) {
  keys(value, ['version','year','runKey','readScope','checkedAt','checks','eventUpdates','ready','readyScope','limits','fileIds']);
  if (JSON.stringify(value).length > 100000 || value.version !== 1 || value.year !== context.year || value.runKey !== context.runKey || !validAnnualRunKey(value.runKey, context.year, context.controlCenterId, context.rootFolderId) || !['production','rehearsal'].includes(context.mode) || context.mode !== context.workspaceMode) throw Error('The connection report belongs to a different year or workspace. Reopen this year before continuing.');
  if (value.readScope !== (context.action === 'stop' ? 'retirement' : 'staging')) throw Error('The connection report has the wrong action scope. Check again before continuing.');
  const now = context.now ?? Date.now();
  stamp(value.checkedAt, now);
  if (now - Date.parse(value.checkedAt) > 600000) throw Error('The connection report is old. Check connections again.');
  keys(value.fileIds, ['pointsMaster','attendanceForm','pointsExport','budgetTracker','budgetExport','controlCenter']);
  const expected = Object.fromEntries(['pointsMaster','pointsExport','budgetTracker','budgetExport'].map(key => [key, annualFileId(context.links?.[key])]));
  expected.attendanceForm = annualFileId(context.links?.attendanceFormEditor, 'forms'); expected.controlCenter = context.controlCenterId;
  if (new Set(Object.values(expected)).size !== 6) throw Error('Annual file identities must be distinct. Review the saved links.');
  for (const [key, id] of Object.entries(expected)) if (!ID.test(id || '') || value.fileIds[key] !== id) throw Error('The connection report does not match this checklist’s saved files. Review the links and reopen the correct year. Check connections again before retrying a change.');
  if (typeof value.ready !== 'boolean' || !Array.isArray(value.checks) || !value.checks.length || value.checks.length > 40 || !Array.isArray(value.limits) || value.limits.length > 20) throw Error('Google returned an incomplete connection report. Check again.');
  text(value.readyScope, 2000);
  const seen = new Set();
  for (const check of value.checks) {
    keys(check, ['id','label','status','detail','url','required']);
    text(check.id, 100); text(check.label, 300); text(check.detail, 3000);
    if (!/^[A-Za-z0-9_-]+$/.test(check.id) || seen.has(check.id) || !['passed','action_needed','failed'].includes(check.status) || (check.required !== undefined && typeof check.required !== 'boolean')) throw Error('Google returned invalid connection checks. Check again.');
    seen.add(check.id);
    if (check.url !== undefined) {
      text(check.url, 2000);
      if (!annualFileId(check.url) || !Object.values(value.fileIds).includes(annualFileId(check.url))) throw Error('Google returned an unexpected file link. Check connections again before retrying a change.');
    }
  }
  if (value.ready && value.checks.some(check => check.required !== false && check.status !== 'passed')) throw Error('Google returned conflicting connection results. Check again.');
  keys(value.eventUpdates, ['status','triggerUid','installedAt','lastObservedAt','scope','detail','stopPending']);
  const updates = value.eventUpdates;
  if (!['not_connected','installed','observed','error'].includes(updates.status)) throw Error('Google returned an invalid event update status.');
  if (updates.stopPending !== undefined && typeof updates.stopPending !== 'boolean') throw Error('Google returned an invalid pending-stop state.');
  if (updates.stopPending === true && (value.readScope !== 'retirement' || updates.status !== 'not_connected' || !updates.triggerUid)) throw Error('Pending stop does not match a recorded retired-year connection.');
  text(updates.scope, 2000); text(updates.detail, 3000, true);
  if (updates.triggerUid !== undefined) { text(updates.triggerUid, 200); if (!/^[A-Za-z0-9_-]{1,200}$/.test(updates.triggerUid)) throw Error('Google returned an invalid recorded trigger identity.'); }
  for (const key of ['installedAt','lastObservedAt']) if (updates[key]) stamp(updates[key], now); else if (updates[key] !== undefined && updates[key] !== '') throw Error('Google returned an invalid event update time.');
  if (['installed','observed'].includes(updates.status) && (!updates.triggerUid || !updates.installedAt || (updates.status === 'observed' && !updates.lastObservedAt))) throw Error('Google returned an incomplete event update record.');
  value.limits.forEach(limit => text(limit, 3000));
  // Copy only bounded JSON primitives so caller state cannot be mutated afterwards.
  return JSON.parse(JSON.stringify(value));
}

// Trigger installation/removal must run from the Google-hosted UI, never scripts.run.
export function annualEventControlsUrl(base, context) {
  let url; try { url = new URL(base); } catch { throw Error('The Google-hosted event controls are not configured.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.username || url.password || url.port || !/^\/macros\/s\/[A-Za-z0-9_-]{20,200}\/exec$/.test(url.pathname) || !['production','rehearsal'].includes(context.mode) || !validAnnualRunKey(context.runKey, context.year, context.controlCenterId, context.rootFolderId) || typeof context.configRevision !== 'string' || !context.configRevision || context.configRevision.length > 2000) throw Error('The Google-hosted event controls do not match the selected setup.');
  url.search = ''; url.hash = '';
  for (const [key, value] of Object.entries({year: context.year, mode: context.mode, expectedRunKey: context.runKey, expectedConfigRevision: context.configRevision})) url.searchParams.set(key, value);
  return url.href;
}
