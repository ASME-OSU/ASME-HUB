/* Standalone, chapter-owned readiness and annual event updates. No intake,
 * publication, sharing, scoring inputs or launch flags are changed here. */
var ASME_ANNUAL_UPDATES_PREFIX='ASME_ANNUAL_EVENT_UPDATES_';
function asmeAnnualUpdatesKey_(runKey){return ASME_ANNUAL_UPDATES_PREFIX+runKey;}
function asmeAnnualOwnedResource_(file){
  if(file.isTrashed()||!file.getOwner()||file.getOwner().getEmail().toLowerCase()!=='asmeohiostate@gmail.com')throw new Error('Annual files must remain chapter-owned and outside Google Drive Trash.');
}
function asmeAnnualPrivateResource_(file){
  asmeAnnualOwnedResource_(file);
  if(file.getSharingAccess()!==DriveApp.Access.PRIVATE||file.getEditors().concat(file.getViewers()).some(function(u){return u.getEmail().toLowerCase()!=='asmeohiostate@gmail.com';}))throw new Error('Annual readiness requires the same private chapter-owned files, outside Trash. Review file access in Google Drive.');
}
function asmeAnnualParent_(file,parentId){
  var parents=file.getParents(),found=false;while(parents.hasNext())if(parents.next().getId()===parentId)found=true;
  if(!found)throw new Error('An annual file or folder moved outside its saved parent. Restore its original location before continuing.');
}
function asmeAnnualTargetIds_(state){
  var names=['annualFolder','attendanceFolder','pointsFolder','financeFolder','communicationsFolder','notesFolder','pointsMaster','attendanceForm','pointsExport','budgetTracker','budgetExport'],seen={},excluded=Object.keys(ASME_ANNUAL_TEMPLATES).map(function(k){return ASME_ANNUAL_TEMPLATES[k];});
  excluded.push(state.plan.rootFolderId,state.plan.controlCenterId,'125_HEyqM4T0lrSSuBfSzPT_o0B8kScHK');
  names.forEach(function(k){var id=state.ids[k];if(typeof id!=='string'||!id||seen[id]||excluded.indexOf(id)>=0)throw new Error('Saved annual file identities do not identify distinct annual copies. Reopen the original year and review its links.');seen[id]=true;});
}
function asmeAnnualReadinessContext_(input,allowRetired){
  asmeProvisionerActor_();
  if(!input||typeof input!=='object'||['production','rehearsal'].indexOf(input.mode)<0)throw new Error('Choose Real handoff or Practice before checking the annual files.');
  var year=String(input.year||''),parts=asmeAnnualYear_(year,'Fall '+year.slice(0,4)),properties=PropertiesService.getScriptProperties(),cfg=JSON.parse(properties.getProperty('ANNUAL_PROVISIONER_CONFIG')||'{}');
  if(input.expectedConfigRevision!==asmeAnnualConfigRevision_(cfg)||cfg.workspaceMode!==input.mode)throw new Error('Saved chapter setup changed. Reload this year before checking or connecting updates.');
  var runKey=asmeAnnualRunKey_(year,cfg.rootFolderId,cfg.controlCenterId);
  if(input.expectedRunKey!==runKey)throw new Error('This request does not match the saved annual run. Reopen the selected year.');
  var state=JSON.parse(properties.getProperty(runKey)||'{}');
  if(state.phase!=='draft_ready'||state.year!==year||state.runKey!==runKey||!state.plan||!state.ids||state.workspaceMode!==input.mode||state.plan.rootFolderId!==cfg.rootFolderId||state.plan.controlCenterId!==cfg.controlCenterId)throw new Error('Complete or reopen this year’s setup in the matching workspace first.');
  asmeCheckWorkspacePurpose_(properties,cfg);asmeAnnualTargetIds_(state);
  asmeAnnualPrivateResource_(DriveApp.getFolderById(cfg.rootFolderId));
  ['annualFolder','attendanceFolder','pointsFolder','financeFolder','communicationsFolder','notesFolder'].forEach(function(k){var folder=DriveApp.getFolderById(state.ids[k]);asmeAnnualPrivateResource_(folder);asmeAnnualParent_(folder,k==='annualFolder'?cfg.rootFolderId:state.ids.annualFolder);});
  var parents={pointsMaster:'pointsFolder',attendanceForm:'attendanceFolder',pointsExport:'pointsFolder',budgetTracker:'financeFolder',budgetExport:'financeFolder'};
  Object.keys(parents).forEach(function(k){var file=DriveApp.getFileById(state.ids[k]);if(allowRetired&&(k==='pointsExport'||k==='budgetExport'))asmeAnnualOwnedResource_(file);else asmeAnnualPrivateResource_(file);asmeAnnualParent_(file,state.ids[parents[k]]);});
  var centerFile=DriveApp.getFileById(cfg.controlCenterId);
  if(centerFile.isTrashed()||!centerFile.getOwner()||centerFile.getOwner().getEmail().toLowerCase()!=='asmeohiostate@gmail.com')throw new Error('Restore or select the chapter-owned settings sheet before continuing.');
  var settings=SpreadsheetApp.openById(cfg.controlCenterId).getSheetByName('Hub_Settings_Public');
  if(!settings||settings.getLastRow()>1000||JSON.stringify(settings.getRange(1,1,1,20).getValues()[0])!==JSON.stringify(ASME_ANNUAL_HEADERS)||settings.getRange(1,1,1,20).getFormulas()[0].some(Boolean))throw new Error('The settings sheet must keep its reviewed twenty-column headers.');
  var rows=settings.getLastRow()>1?settings.getRange(2,1,settings.getLastRow()-1,20).getValues():[],matches=[];
  rows.forEach(function(r,i){if(r[0]===year)matches.push({row:r,index:i+2});});
  var expectedRow=asmeAnnualDraftRow_(year,state.plan.engagementGoal,state.links,state.plan.calendarIcalUrl,state.draftTimestamp);
  if(matches.length!==1||matches[0].row[11]!==false||(!allowRetired&&(matches[0].row[10]!==false||JSON.stringify(matches[0].row)!==JSON.stringify(expectedRow)))||(allowRetired&&[0,3,6,7,15,16,17].some(function(i){return matches[0].row[i]!==expectedRow[i];}))||settings.getRange(matches[0].index,1,1,20).getFormulas()[0].some(Boolean))throw new Error('Readiness setup requires this run’s unchanged inactive, noncurrent annual row. Review the settings sheet; no flags were changed.');
  var master=SpreadsheetApp.openById(state.ids.pointsMaster),form=FormApp.openById(state.ids.attendanceForm);
  if(!allowRetired)asmeVerifyCompletedAnnual_(state,master,form,parts);
  else {var config=master.getSheetByName('Config'),response=master.getSheetByName(state.responseTab);if(form.isAcceptingResponses()||form.getDestinationId()!==master.getId()||!config||config.getRange('B16').getValue()!==form.getId()||config.getRange('B7').getValue()!==state.responseTab||!response||!response.getFormUrl()||FormApp.openByUrl(response.getFormUrl()).getId()!==form.getId())throw new Error('Stop updates only after closing the same annual Form and verifying its saved destination.');}
  return {properties:properties,runKey:runKey,state:state,master:master,form:form,registryKey:asmeAnnualUpdatesKey_(runKey),retired:!!allowRetired};
}
function asmeAnnualManagedTriggers_(masterId){return ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()==='asmeAnnualEventsEdited'&&t.getTriggerSourceId()===masterId;});}
function asmeAnnualUpdatesRecord_(ctx){
  var record=JSON.parse(ctx.properties.getProperty(ctx.registryKey)||'null');
  if(record&&(record.version!==1||record.runKey!==ctx.runKey||record.year!==ctx.state.year||record.mode!==ctx.state.workspaceMode||JSON.stringify(record.ids)!==JSON.stringify(ctx.state.ids)||JSON.stringify(record.plan)!==JSON.stringify(ctx.state.plan)||record.responseTab!==ctx.state.responseTab))throw new Error('The saved automatic-update record does not match these annual files. No triggers were changed.');
  return record;
}
function asmeAnnualUpdatesStatus_(ctx){
  var record=asmeAnnualUpdatesRecord_(ctx),triggers=asmeAnnualManagedTriggers_(ctx.master.getId()),result={status:'not_connected',scope:'This standalone project and chapter account only; copied bound-project or other-account triggers cannot be inspected here.'};
  if(triggers.length>1||triggers.some(function(t){return t.getEventType()!==ScriptApp.EventType.ON_EDIT;})||(triggers.length&&(!record||!record.triggerUid||String(triggers[0].getUniqueId())!==record.triggerUid))){result.status='error';result.detail='Automatic-update trigger identities conflict. No trigger was removed.';return result;}
  if(ctx.retired&&record&&record.stopping===true&&record.triggerUid&&triggers.length===0){result.triggerUid=record.triggerUid;result.stopPending=true;result.detail='Google removed the trigger; finish recording the stopped status.';}
  if(record&&record.triggerUid&&triggers.length===1){result.status=record.lastObservedAt?'observed':'installed';result.triggerUid=record.triggerUid;result.installedAt=record.installedAt;result.lastObservedAt=record.lastObservedAt||'';if(record.lastError){result.status='error';result.detail='The last automatic update failed. Check the annual Form binding and event list, then retry a normal Events edit.';}}
  return result;
}
function asmeAnnualReadinessReport_(ctx){
  var checks=[],url=function(id,range){return 'https://docs.google.com/spreadsheets/d/'+id+'/edit'+(range?'#range='+encodeURIComponent(range):'');};
  function add(id,label,status,detail,target){var c={id:id,label:label,status:status,detail:detail};if(target)c.url=target;checks.push(c);}
  add('annual_identity',ctx.retired?'Annual files and closed noncurrent year':'Annual files and closed draft settings','passed',ctx.retired?'Saved file identities and Form binding match this closed, noncurrent annual run.':'Saved file identities, Form binding, annual dates, TESTING mode and inactive/noncurrent settings match this run.');
  if(!ctx.retired){
  asmeSanityReport_(ctx.master).forEach(function(r,i){if(r.manual)return;add('structure_'+i,r.test,r.pass?'passed':'failed',r.pass?'Checked in this year’s Points Master.':(r.error||'Open the Points Master and review this check.'),url(ctx.master.getId()));});

  [['pointsExport','pointsMaster','Leaderboard_Public'],['budgetExport','budgetTracker','Budget_Public']].forEach(function(pair){
    try {
    var expectedImports=pair[0]==='pointsExport'?['Leaderboard_Public!A1','Point_Values_Public!A1','System_Status!A1','Event_Metrics_Public!A1','Monthly_Metrics_Public!A1','Semester_Metrics_Public!A1']:['C2','C3','C4','C5','C6'].concat(Array.from({length:28},function(_,i){return 'C'+(i+10);}),['C38','F2']).map(function(a){return 'Budget_Public!'+a;}),observedImports=[];
    var id=pair[0],book=SpreadsheetApp.openById(ctx.state.ids[id]),config=book.getSheetByName('Config'),first=null,errors=false,publicSheet=book.getSheetByName(pair[2]),count=0;
    book.getSheets().forEach(function(sheet){if(sheet.getMaxRows()>5000||sheet.getMaxColumns()>50)throw new Error('Export exceeds the reviewed readiness scan bounds.');var range=sheet.getDataRange(),formulas=range.getFormulas(),values=range.getDisplayValues();formulas.forEach(function(row,r){row.forEach(function(f,c){if(/IMPORTRANGE\s*\(/i.test(f)){count++;observedImports.push(sheet.getName()+'!'+sheet.getRange(r+1,c+1).getA1Notation());if(!first)first={sheet:sheet.getName(),cell:sheet.getRange(r+1,c+1).getA1Notation()};var calls=f.match(/IMPORTRANGE\s*\(/ig)||[],central=f.match(/IMPORTRANGE\s*\(\s*Config!\$?B\$?1\s*[,;]/ig)||[];if(calls.length!==central.length)errors=true;}});});values.forEach(function(row){row.forEach(function(v){if(/^(?:#(?:REF!|ERROR!|VALUE!|N\/A|NAME\?|DIV\/0!|NUM!|SPILL!|CALC!)|Loading(?:\.\.\.)?$)/i.test(v))errors=true;});});});
    if(JSON.stringify(observedImports.sort())!==JSON.stringify(expectedImports.sort()))errors=true;
    var pointer=!!config&&config.getRange('B1').getValue()===ctx.state.ids[pair[1]],header=!!publicSheet&&publicSheet.getLastColumn()>0&&publicSheet.getRange(1,1,1,publicSheet.getLastColumn()).getDisplayValues()[0].some(function(v){return v!==''&&!/^#/.test(v)&&!/^[-+]?\d+(?:\.\d+)?$/.test(v);});
    add(id+'_pointer',id==='pointsExport'?'Points Export source':'Budget Export source',pointer?'passed':'failed',pointer?'Config B1 points to this year’s matching private source.':'Review Config B1; no pointer was changed.',url(book.getId(),'Config!B1'));
    add(id+'_output',id==='pointsExport'?'Points Export connection and output':'Budget Export connection and output',pointer&&count>0&&header&&!errors?'passed':'action_needed',pointer&&count>0&&header&&!errors?'The reviewed six/35 import-cell map, centralized source arguments and output headers resolve without detected spreadsheet errors. This does not prove scoring or authorize public sharing.':'Open the export, select the import error cell and choose Allow access. Wait for calculation, then check again. If it remains unresolved, inspect the displayed Google error.',url(book.getId(),first?"'"+first.sheet.replace(/'/g,"''")+"'!"+first.cell:'Config!B1'));
    }catch(error){add(pair[0]+'_output',pair[0]==='pointsExport'?'Points Export connection and output':'Budget Export connection and output','failed','Export structure or output could not be read within the reviewed scan bounds. Open the file and review its tabs and import cells.',url(ctx.state.ids[pair[0]]));}
  });
  }
  var updates=asmeAnnualUpdatesStatus_(ctx);
  if(ctx.retired){
    var status=updates.status==='error'?'failed':updates.stopPending||updates.status==='installed'||updates.status==='observed'?'action_needed':'passed';
    var detail=updates.status==='error'?updates.detail:updates.stopPending?updates.detail:updates.status==='installed'||updates.status==='observed'?'The recorded connection is still installed. Confirm Stop to retire automatic updates for this closed, noncurrent year.':'No managed automatic-update trigger is installed for this retired year. No reconnect action is needed.';
    add('event_updates','Retired automatic event updates',status,detail);
  }else add('event_updates','Automatic event updates',updates.status==='observed'||updates.status==='installed'?'passed':updates.status==='error'?'failed':'action_needed',updates.stopPending?updates.detail:updates.status==='observed'?'A successful Events edit with this installed trigger ID was recorded.':updates.status==='installed'?'Connected. Make a normal approved Events edit in Google Sheets, then check again to observe delivery.':updates.status==='error'?updates.detail:'Choose Connect automatic event updates. This uses the already authorized chapter setup script.',url(ctx.master.getId(),'Events!A1:I10'));
  return {version:1,year:ctx.state.year,runKey:ctx.runKey,readScope:ctx.retired?'retirement':'staging',fileIds:{pointsMaster:ctx.state.ids.pointsMaster,attendanceForm:ctx.state.ids.attendanceForm,pointsExport:ctx.state.ids.pointsExport,budgetTracker:ctx.state.ids.budgetTracker,budgetExport:ctx.state.ids.budgetExport,controlCenter:ctx.state.plan.controlCenterId},checkedAt:new Date().toISOString(),checks:checks,eventUpdates:updates,ready:checks.every(function(c){return c.status==='passed';}),readyScope:ctx.retired?'Retirement identity and stopped status only; not launch approval.':'Annual file connections and structural checks only; not launch approval.',limits:ctx.retired?['Retirement checks cover only the recorded trigger in this standalone project and chapter account. Copied bound-project and other-account triggers cannot be inspected here.','Annual records, operating mode, export visibility and Form intake were not changed by this check.']:['Structural checks do not certify every source input, scoring formula or financial balance. Review legitimate annual inputs; fictional scoring tests belong only in isolated Practice files.','Incoming officers check their own access. Funding, bank reconciliation, calendar choices, public sharing and launch approval remain officer decisions.','Installed automatic updates await a normal Events edit before delivery is observed. Copied bound-project and other-account triggers cannot be inspected here.']};
}
function checkAnnualReadiness(input){
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Annual setup or event updates are busy. Retry shortly.');
  try{return asmeAnnualReadinessReport_(asmeAnnualReadinessContext_(input,!!input&&input.action==='stop'));}finally{lock.releaseLock();}
}
function enableAnnualEventUpdates(input){
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Annual setup or event updates are busy. Retry shortly.');
  try{
    var ctx=asmeAnnualReadinessContext_(input),record=asmeAnnualUpdatesRecord_(ctx),triggers=asmeAnnualManagedTriggers_(ctx.master.getId());
    if(triggers.length>1||triggers.some(function(t){return t.getEventType()!==ScriptApp.EventType.ON_EDIT;}))throw new Error('Conflicting automatic-update triggers exist. No trigger was removed.');
    if(triggers.length&&(!record||(!record.pending&&!record.triggerUid)||record.triggerUid&&record.triggerUid!==String(triggers[0].getUniqueId())))throw new Error('An unrecorded automatic-update trigger exists. No trigger was changed.');
    // Sync is bounded to this saved annual binding; it never opens intake.
    asmeSyncEvents_(ctx.master);
    if(!record)record={version:1,runKey:ctx.runKey,year:ctx.state.year,mode:ctx.state.workspaceMode,ids:ctx.state.ids,plan:ctx.state.plan,responseTab:ctx.state.responseTab};
    if(!triggers.length){
      if(ScriptApp.getProjectTriggers().length>=20)throw new Error('This chapter setup script has reached Google’s 20-trigger limit. Stop updates for a reviewed closed, retired year before connecting another year. No trigger was removed.');
      record.pending=true;delete record.triggerUid;delete record.installedAt;delete record.lastObservedAt;ctx.properties.setProperty(ctx.registryKey,JSON.stringify(record));
      ScriptApp.newTrigger('asmeAnnualEventsEdited').forSpreadsheet(ctx.master).onEdit().create();
    }
    triggers=asmeAnnualManagedTriggers_(ctx.master.getId());
    if(triggers.length!==1||triggers[0].getEventType()!==ScriptApp.EventType.ON_EDIT)throw new Error('Automatic-update installation could not be read back uniquely. Retry Connect for this same year. No trigger was removed.');
    record.triggerUid=String(triggers[0].getUniqueId());record.installedAt=record.installedAt||new Date().toISOString();delete record.pending;delete record.lastError;delete record.stoppedAt;ctx.properties.setProperty(ctx.registryKey,JSON.stringify(record));
    return asmeAnnualReadinessReport_(ctx);
  }finally{lock.releaseLock();}
}
function stopAnnualEventUpdates(input){
  if(!input||input.confirmStop!==true)throw new Error('Confirm stopping automatic event updates for this closed, noncurrent year.');
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Annual setup or event updates are busy. Retry shortly.');
  try{
    var ctx=asmeAnnualReadinessContext_(input,true),record=asmeAnnualUpdatesRecord_(ctx),triggers=asmeAnnualManagedTriggers_(ctx.master.getId());
    if(!record||!record.triggerUid||triggers.length>1||(triggers.length===0&&!record.stopping)||(triggers.length===1&&(String(triggers[0].getUniqueId())!==record.triggerUid||triggers[0].getEventType()!==ScriptApp.EventType.ON_EDIT)))throw new Error('The exact recorded automatic-update trigger was not found uniquely. No trigger was removed.');
    record.stopping=true;ctx.properties.setProperty(ctx.registryKey,JSON.stringify(record));
    if(triggers.length)ScriptApp.deleteTrigger(triggers[0]);
    if(ScriptApp.getProjectTriggers().some(function(t){return String(t.getUniqueId())===record.triggerUid;}))throw new Error('Google has not confirmed that this trigger stopped. Check again before retrying.');
    delete record.triggerUid;delete record.lastObservedAt;delete record.lastError;delete record.stopping;record.stoppedAt=new Date().toISOString();ctx.properties.setProperty(ctx.registryKey,JSON.stringify(record));return asmeAnnualReadinessReport_(ctx);
  }finally{lock.releaseLock();}
}
function asmeAnnualEventsEdited(e){
  if(!e||!e.source||!e.range||!e.triggerUid||e.range.getSheet().getName()!=='Events'||e.range.getRow()+e.range.getNumRows()-1<2||e.range.getColumn()>9||e.range.getSheet().getParent().getId()!==e.source.getId())return;
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Automatic event updates are busy. Retry the Events edit shortly.');
  var record,key,properties=PropertiesService.getScriptProperties();
  try{
    asmeChapterActor_();var saved=properties.getProperties(),matches=[];
    Object.keys(saved).filter(function(k){return k.indexOf(ASME_ANNUAL_UPDATES_PREFIX)===0;}).forEach(function(k){var r=JSON.parse(saved[k]);if(String(r.triggerUid||'')===String(e.triggerUid))matches.push({key:k,record:r});});
    if(matches.length!==1)throw new Error('Automatic event update does not match one recorded annual trigger.');
    key=matches[0].key;record=matches[0].record;
    var state=JSON.parse(properties.getProperty(record.runKey)||'{}');
    if(record.version!==1||record.ids.pointsMaster!==e.source.getId()||state.phase!=='draft_ready'||state.runKey!==record.runKey||state.year!==record.year||state.workspaceMode!==record.mode||JSON.stringify(state.ids)!==JSON.stringify(record.ids)||JSON.stringify(state.plan)!==JSON.stringify(record.plan)||state.responseTab!==record.responseTab)throw new Error('Automatic event update does not match its saved annual copy.');
    asmeAnnualTargetIds_(state);
    var config=e.source.getSheetByName('Config'),response=e.source.getSheetByName(record.responseTab),form=FormApp.openById(record.ids.attendanceForm),mode=config&&config.getRange('B5').getValue();
    if(!config||['TESTING','LIVE'].indexOf(mode)<0||record.mode==='rehearsal'&&mode!=='TESTING'||config.getRange('B16').getValue()!==record.ids.attendanceForm||config.getRange('B7').getValue()!==record.responseTab||!response||!response.getFormUrl()||FormApp.openByUrl(response.getFormUrl()).getId()!==form.getId()||form.getDestinationId()!==e.source.getId())throw new Error('Annual Form binding or operating mode changed. Review the copied Form destination and Points Config.');
    if(DriveApp.getFileById(e.source.getId()).isTrashed()||DriveApp.getFileById(e.source.getId()).getOwner().getEmail().toLowerCase()!=='asmeohiostate@gmail.com'||DriveApp.getFileById(form.getId()).isTrashed()||DriveApp.getFileById(form.getId()).getOwner().getEmail().toLowerCase()!=='asmeohiostate@gmail.com')throw new Error('Automatic updates require chapter-owned annual files outside Trash.');
    var triggers=asmeAnnualManagedTriggers_(e.source.getId());if(triggers.length!==1||triggers[0].getEventType()!==ScriptApp.EventType.ON_EDIT||String(triggers[0].getUniqueId())!==record.triggerUid)throw new Error('Automatic event-update trigger identity changed.');
    SpreadsheetApp.flush();asmeSyncEvents_(e.source);record.lastObservedAt=new Date().toISOString();delete record.lastError;properties.setProperty(key,JSON.stringify(record));
  }catch(error){if(record&&key){record.lastError=new Date().toISOString();properties.setProperty(key,JSON.stringify(record));}throw error;}finally{lock.releaseLock();}
}
