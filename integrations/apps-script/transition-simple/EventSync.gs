/* Container-bound to Points Master. Installable triggers require chapter authorization;
 * simple onEdit cannot use FormApp. This script never opens intake or sets LIVE. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('ASME Tools')
    .addItem('Sync Events to Google Form', 'syncEventsToForm')
    .addItem('Enable automatic event sync', 'installEventSyncTrigger')
    .addItem('Run Pre-Flight Sanity Check', 'runSanityCheck').addToUi();
}
function asmeChapterActor_(){if(Session.getEffectiveUser().getEmail().toLowerCase()!=='asmeohiostate@gmail.com')throw new Error('Run as the chapter Google account.');}
function asmeEventChoices_(rows) {
  var expected=['event_id','event_name','event_date','term','academic_year','event_type','points','scoring_active','form_open'];
  if (!rows.length || expected.some(function(h,i){return rows[0][i]!==h;})) throw new Error('Events headers do not match the chapter template.');
  var seen={},choices=[];
  rows.slice(1).forEach(function(r){
    var id=String(r[0]||'').trim(),name=String(r[1]||'').trim();
    if(id){if(seen[id])throw new Error('Duplicate event ID: '+id);seen[id]=true;}
    if([r[7],r[8]].some(function(v){return v!==''&&v!==undefined&&v!==true&&v!==false;}))throw new Error('Event eligibility must use boolean checkboxes.');
    if(r[7]!==true || r[8]!==true)return;
    if(!id || !name)throw new Error('An open scored event needs both ID and name.');
    choices.push(id+' - '+name);
  });
  if(choices.length>500)throw new Error('More than 500 open events; review the list.');
  return choices;
}
function asmeSyncEvents_(ss) {
  asmeChapterActor_();
  if(!ss)throw new Error('Open the copied Points Master first.');
  var config=ss.getSheetByName('Config'),events=ss.getSheetByName('Events');
  if(!config||!events)throw new Error('Config and Events tabs are required.');
  var id=String(config.getRange('B16').getValue()).trim(),title=String(config.getRange('B17').getValue()).trim();
  if(ss.getId()==='1UXprLAnzUjlzaojb7BDYTN9Om25xPFRYGQZIyHQRG2M'||id==='1ofRiLS_WtQpH_poxU4blyKn7pZVriUWL8dsvfCJLLYA')throw new Error('Event sync is for annual copies; canonical templates are excluded.');
  if(!id||!title)throw new Error('Set the copied Form ID in Config!B16 and exact question title in B17.');
  var form=FormApp.openById(id);
  if(form.getDestinationId()!==ss.getId())throw new Error('Form destination is not this Points Master. No choices were changed.');
  var matches=form.getItems(FormApp.ItemType.LIST).filter(function(item){return item.getTitle()===title;});
  if(matches.length!==1)throw new Error('Exactly one matching Event ID dropdown is required.');
  if(events.getLastRow()>1000)throw new Error('Events exceeds the reviewed 999-event template bound.');
  var choices=asmeEventChoices_(events.getRange(1,1,Math.max(1,events.getLastRow()),9).getValues());
  var wanted=choices.length?choices:['No events currently open for attendance'],item=matches[0].asListItem();
  if(JSON.stringify(item.getChoices().map(function(c){return c.getValue();}))!==JSON.stringify(wanted))item.setChoiceValues(wanted);
  config.getRange('B18').setValue(new Date());
  config.getRange('B19').setValue('SYNCED: '+choices.length+' open scored events');
  return {events:choices.length,spreadsheetId:ss.getId(),formId:id};
}
function syncEventsToForm() {
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Event sync busy; retry shortly.');
  try{var ss=SpreadsheetApp.getActiveSpreadsheet(),result=asmeSyncEvents_(ss);ss.toast(result.events+' event choices synchronized. Intake state unchanged.','ASME Tools',5);return result;}finally{lock.releaseLock();}
}
function asmeEventsEdited(e) {
  if(!e||!e.range||!e.source)return;
  if(e.range.getSheet().getName()!=='Events'||e.range.getRow()+e.range.getNumRows()-1<2||e.range.getColumn()>9)return;
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Event sync busy; use ASME Tools to retry.');
  try {SpreadsheetApp.flush();return asmeSyncEvents_(e.source);}finally{lock.releaseLock();}
}
function asmeEnsureEventTrigger_(ss){
  var existing=ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='asmeEventsEdited'&&t.getTriggerSourceId()===ss.getId();});
  if(existing.length>1||existing.some(function(t){return t.getEventType()!==ScriptApp.EventType.ON_EDIT;}))throw new Error('Unexpected/duplicate sync triggers; chapter maintainer must review.');
  if(!existing.length)ScriptApp.newTrigger('asmeEventsEdited').forSpreadsheet(ss).onEdit().create();
}
function installEventSyncTrigger() {
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Event sync busy; retry shortly.');
  try{var ss=SpreadsheetApp.getActiveSpreadsheet(),result=asmeSyncEvents_(ss);asmeEnsureEventTrigger_(ss);return result;}finally{lock.releaseLock();}
}
