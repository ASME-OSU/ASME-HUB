/* Standalone chapter admin project. Run provision2027_2028() in editor, or
 * call provisionReviewedAnnualYear(year) from an authenticated chapter UI.
 * One-time maintainer config: ANNUAL_PROVISIONER_CONFIG JSON {rootFolderId,
 * controlCenterId,engagementGoal,calendarIcalUrl}. No digest/ledger setup.
 * Does not publish files, grant access, open intake, or activate a year.
 * Include EventSync.gs and SanityCheck.gs in this standalone project as well.
 */
var ASME_ANNUAL_HEADERS=['academic_year','display_label','engagement_goal','attendance_sheet_url','leaderboard_tab','dashboard_json_url','attendance_form_url','points_master_url','calendar_page_url','calendar_ical_url','is_active','is_current','last_updated','status_note','event_metrics_tab','budget_tracker_url','budget_export_sheet_url','budget_export_sheet_tab','banking_url','fundraising_url'];
var ASME_ANNUAL_TEMPLATES={pointsMaster:'1UXprLAnzUjlzaojb7BDYTN9Om25xPFRYGQZIyHQRG2M',attendanceForm:'1ofRiLS_WtQpH_poxU4blyKn7pZVriUWL8dsvfCJLLYA',pointsExport:'1CESQs6sY_WC9u0wonYq_CFraFFymtTJkh9SSv2DTXuY',budgetTracker:'1KMIkxLjNMRFilpicXIqePvy6XvZxgmJrRO3VT7DiCW8',budgetExport:'1vDHoouuaWX3NvdrflUiulesHU9z1JZ383_Tnu3Wqz-s'};
function asmeAnnualYear_(year,term){
  var match=/^(20\d{2}|21\d{2})-(20\d{2}|21\d{2}|2200)$/.exec(String(year));
  if(!match||+match[2]!==+match[1]+1||+match[1]>2199||term!=='Fall '+match[1])throw new Error('Use consecutive academic years and exact fall term, e.g. 2027-2028 / Fall 2027.');
  return {start:+match[1],end:+match[2],short:match[1]+'-'+match[2].slice(-2)};
}
function asmeAnnualDraftRow_(year,goal,links,ical,stamp){
  if(!Number.isInteger(goal)||goal<=0)throw new Error('Approved positive engagement goal required.');
  return [year,'ASME '+year,goal,links.pointsExport,'Leaderboard_Public','',links.formRespondent,links.pointsMaster,'https://org.osu.edu/asme/calendar/',ical||'',false,false,stamp,'Inactive draft initialized via AnnualProvisioner','Event_Metrics_Public',links.budgetTracker,links.budgetExport,'Budget_Public','',''];
}
// Pure, copyable private handoff text. This formats the saved run and does not
// create a Google Doc, grant access, authorize imports or install a trigger.
function asmeReadableAnnualReceipt_(state,settingsRowNumber){
  if(!state||state.phase!=='draft_ready'||!state.plan||!state.ids||!state.links||!state.responseTab||!state.formEditUrl||!state.folderUrl||!Number.isInteger(settingsRowNumber)||settingsRowNumber<2)throw new Error('A complete draft-ready receipt and settings row are required.');
  var y=asmeAnnualYear_(state.year,state.plan.fallTerm),p=state.plan,l=state.links;
  var required=['pointsMaster','pointsExport','budgetTracker','budgetExport','formRespondent'];
  if(required.some(function(k){return !l[k];})||!state.ids.attendanceForm||!state.ids.pointsMaster||!state.ids.budgetTracker||!p.controlCenterId)throw new Error('Saved annual links or Form/Control Center identity are incomplete.');
  var lines=[
    '# Private ASME annual setup receipt — '+state.year,
    '',
    'Provisioner run key: ASME_SIMPLE_ANNUAL_'+state.year,
    'Hub run name: [coordinator records the matching private Hub run]',
    'Technical maintainer/contact: [coordinator names a maintainer and private contact route]',
    'Bundle generated: '+(state.completedAt||'[not recorded]'),
    'Provisioner copy/draft verification: '+(state.checkedAt||'[not recorded]')+' (officer Google UI comparison remains open)',
    '',
    '## Seven annual links (private)',
    '1. Annual folder: '+state.folderUrl,
    '2. Points Master: '+l.pointsMaster,
    '3. Check-in Form editor: '+state.formEditUrl,
    '4. Check-in Form respondent: '+l.formRespondent,
    '5. Budget Tracker: '+l.budgetTracker,
    '6. Points Export: '+l.pointsExport,
    '7. Budget Export: '+l.budgetExport,
    '',
    '## Compare in Google UI',
    'Form ID: '+state.ids.attendanceForm,
    'Form response destination: Points Master '+state.ids.pointsMaster,
    'Actual response tab: '+state.responseTab,
    'Points Master → Config!B2 fall term: '+p.fallTerm,
    'Points Master → Config!B3 short year: '+y.short,
    'Points Master → Config!B5 mode: TESTING',
    'Points Master → Config!B7 response tab: '+state.responseTab,
    'Points Master → Config!B16 Form ID: '+state.ids.attendanceForm,
    'Points Export → Config!B1 source ID: '+state.ids.pointsMaster,
    'Budget Export → Config!B1 source ID: '+state.ids.budgetTracker,
    'Control Center: https://docs.google.com/spreadsheets/d/'+p.controlCenterId+'/edit',
    'Control Center → Hub_Settings_Public!A'+settingsRowNumber+':T'+settingsRowNumber+' (academic_year A'+settingsRowNumber+' = '+state.year+')',
    'Control Center engagement_goal C'+settingsRowNumber+': '+p.engagementGoal,
    'Control Center calendar_ical_url J'+settingsRowNumber+': '+(p.calendarIcalUrl||'[blank; no annual feed configured]'),
    'Control Center is_active K'+settingsRowNumber+': FALSE; is_current L'+settingsRowNumber+': FALSE',
    'Calendar decision/owner: [coordinator records approved source or explicit no-feed decision; provisioner configuration alone is not approval]',
    '',
    '## Expected August–July dates — compare the copied Budget Tracker',
    'Setup & Lists!B4 year start: '+y.start+'-08-01',
    'Setup & Lists!B5 year end: '+y.end+'-07-31',
    'Setup & Lists!B11 Fall start: '+y.start+'-08-01',
    'Setup & Lists!B12 Fall end: '+y.start+'-12-31',
    'Setup & Lists!B13 Spring start: '+y.end+'-01-01',
    'Setup & Lists!B14 Spring end: '+y.end+'-05-31',
    'These dates are in the Budget Tracker; they are not columns in the 20-column settings row.',
    '',
    '## Separate human confirmations — UNVERIFIED until recorded with owner, time and evidence',
    '- Clean-source verification for each canonical master: UNVERIFIED.',
    '- Each incoming holder’s role-appropriate access using their own account: UNVERIFIED.',
    '- Points Export private import authorization and resolved output: UNVERIFIED.',
    '- Budget Export private import authorization and resolved output: UNVERIFIED.',
    '- Initial Form event-sync result: provisioner invoked sync; officer observation UNVERIFIED.',
    '- Automatic event-sync trigger installation and a later observed edit: UNVERIFIED.',
    '- Real engagement goal/calendar approval, funding approval, bank reconciliation, public-field approval and launch approval: UNVERIFIED.',
    '- Incoming officer acceptance: UNVERIFIED.',
    '',
    'Keep this receipt with the named private Hub run; progress export does not carry the annual link draft. Intake remains closed and this row is inactive/noncurrent.'
  ];
  return lines.join('\n');
}
function provisionReviewedAnnualYear(year){
  var match=/^(20\d{2}|21\d{2})-(20\d{2}|21\d{2}|2200)$/.exec(String(year));
  if(!match)throw new Error('Use a consecutive academic year such as 2027-2028.');
  return provisionAnnualYear(String(year),'Fall '+match[1]);
}
function provision2027_2028(){return provisionReviewedAnnualYear('2027-2028');}
function annualProvisionerConfiguredTarget(){
  // Editor execution has no spreadsheet Ui; use the function arguments or private
  // project setting ANNUAL_PROVISIONER_TARGET for a simple editor run.
  var target=JSON.parse(PropertiesService.getScriptProperties().getProperty('ANNUAL_PROVISIONER_TARGET')||'{}');
  if(!target.year)throw new Error('Optional compatibility route: set ANNUAL_PROVISIONER_TARGET to {"year":"2027-2028","fallTerm":"Fall 2027"}, then run once.');
  return provisionAnnualYear(target.year,target.fallTerm);
}
// Compatibility alias for previously named editor entry point; no prompt UI.
function annualProvisionerPrompt(){return annualProvisionerConfiguredTarget();}
function provisionAnnualYear(targetYear,fallTerm){
  var year=asmeAnnualYear_(targetYear,fallTerm),owner='asmeohiostate@gmail.com';
  if(Session.getEffectiveUser().getEmail().toLowerCase()!==owner||Session.getActiveUser().getEmail().toLowerCase()!==owner)throw new Error('Run as the chapter Google account.');
  var properties=PropertiesService.getScriptProperties(),cfg=JSON.parse(properties.getProperty('ANNUAL_PROVISIONER_CONFIG')||'{}');
  if(!cfg.rootFolderId||!cfg.controlCenterId||cfg.rootFolderId===cfg.controlCenterId||cfg.rootFolderId==='125_HEyqM4T0lrSSuBfSzPT_o0B8kScHK'||Object.keys(ASME_ANNUAL_TEMPLATES).some(function(k){return [cfg.rootFolderId,cfg.controlCenterId].indexOf(ASME_ANNUAL_TEMPLATES[k])>=0;})||!Number.isInteger(cfg.engagementGoal)||cfg.engagementGoal<=0)throw new Error('Maintainer must configure chapter root, Control Center and approved positive goal once.');
  if(cfg.calendarIcalUrl && !/^https:\/\/[^\s]+$/.test(cfg.calendarIcalUrl))throw new Error('Calendar feed must be an HTTPS URL.');
  var lock=LockService.getScriptLock();if(!lock.tryLock(30000))throw new Error('Annual setup is already running.');
  var key='ASME_SIMPLE_ANNUAL_'+targetYear,state;
  try{
    var center=SpreadsheetApp.openById(cfg.controlCenterId),settings=center.getSheetByName('Hub_Settings_Public');
    if(!settings||JSON.stringify(settings.getRange(1,1,1,20).getValues()[0])!==JSON.stringify(ASME_ANNUAL_HEADERS)||settings.getRange(1,1,1,20).getFormulas()[0].some(Boolean)||settings.getLastRow()>1000)throw new Error('Control Center A:T must match exact 20-column schema.');
    state=JSON.parse(properties.getProperty(key)||'{}');
    var plan={year:targetYear,fallTerm:fallTerm,rootFolderId:cfg.rootFolderId,controlCenterId:cfg.controlCenterId,engagementGoal:cfg.engagementGoal,calendarIcalUrl:cfg.calendarIcalUrl||''};
    if(Object.keys(state).length && (JSON.stringify(state.plan)!==JSON.stringify(plan)||!state.ids||typeof state.ids!=='object'||Array.isArray(state.ids)||['new','draft_ready'].indexOf(state.phase)<0||typeof state.draftTimestamp!=='string'||isNaN(Date.parse(state.draftTimestamp))||new Date(state.draftTimestamp).toISOString()!==state.draftTimestamp))throw new Error('Existing run configuration changed or its saved receipt is invalid; maintainer must review it.');
    if(!Object.keys(state).length)state={year:targetYear,rootFolderId:cfg.rootFolderId,plan:plan,ids:{},phase:'new',draftTimestamp:new Date().toISOString()};
    function save(){properties.setProperty(key,JSON.stringify(state));}
    function privateOwned(file){if(file.getOwner().getEmail().toLowerCase()!==owner||file.getSharingAccess()!==DriveApp.Access.PRIVATE||file.isTrashed()||file.getEditors().concat(file.getViewers()).some(function(user){return user.getEmail().toLowerCase()!==owner;}))throw new Error('Expected private chapter-owned file/folder: '+file.getName());}
    var centerFile=DriveApp.getFileById(cfg.controlCenterId);if(centerFile.isTrashed()||centerFile.getOwner().getEmail().toLowerCase()!==owner)throw new Error('Control Center must be chapter-owned.');
    var root=DriveApp.getFolderById(cfg.rootFolderId);privateOwned(root);
    Object.keys(ASME_ANNUAL_TEMPLATES).forEach(function(k){privateOwned(DriveApp.getFileById(ASME_ANNUAL_TEMPLATES[k]));});
    var rows=settings.getLastRow()>1?settings.getRange(2,1,settings.getLastRow()-1,20).getValues():[];
    var existing=rows.filter(function(r){return r[0]===targetYear;});
    if(existing.length>1||existing.length&&!state.ids.pointsMaster)throw new Error('Year already exists outside this resumable run; inspect it before provisioning.');
    if(existing.some(function(r){return r[10]!==false||r[11]!==false;}))throw new Error('Target year is active/current. Provisioner will not modify it.');
    if(existing.length){
      if(!state.links||JSON.stringify(existing[0])!==JSON.stringify(asmeAnnualDraftRow_(targetYear,cfg.engagementGoal,state.links,cfg.calendarIcalUrl,state.draftTimestamp))||settings.getRange(rows.findIndex(function(r){return r[0]===targetYear;})+2,1,1,20).getFormulas()[0].some(Boolean))throw new Error('Existing draft no longer matches this run; no files were changed.');
    }
    // Save intent before a Drive operation. Only a matching interrupted intent may
    // reconcile a committed copy/folder whose acknowledgement was lost.
    function artifact(k,name,parent,isFolder){
      var source=isFolder?null:DriveApp.getFileById(ASME_ANNUAL_TEMPLATES[k]);
      var intent={key:k,name:name,parent:parent.getId(),source:isFolder?'folder':source.getId()};
      function validate(f){
        privateOwned(f);
        if(Object.keys(ASME_ANNUAL_TEMPLATES).some(function(t){return f.getId()===ASME_ANNUAL_TEMPLATES[t];})||[cfg.rootFolderId,cfg.controlCenterId].indexOf(f.getId())>=0)throw new Error('Saved artifact points at a source or control file.');
        var parents=f.getParents(),found=false;while(parents.hasNext())if(parents.next().getId()===parent.getId())found=true;
        if(!found||f.getName()!==name||(!isFolder&&f.getMimeType()!==source.getMimeType()))throw new Error('Saved artifact identity changed: '+name);
        return f;
      }
      if(state.ids[k])return validate(isFolder?DriveApp.getFolderById(state.ids[k]):DriveApp.getFileById(state.ids[k]));
      var matches=isFolder?parent.getFoldersByName(name):parent.getFilesByName(name),found=[];while(matches.hasNext())found.push(matches.next());
      var pending=JSON.stringify(state.pending)===JSON.stringify(intent);
      if(found.length>1||found.length&&!pending)throw new Error('Existing artifact is not owned by this run: '+name);
      state.pending=intent;save();
      var f=validate(found[0]||(isFolder?parent.createFolder(name):source.makeCopy(name,parent)));
      state.ids[k]=f.getId();delete state.pending;save();return f;
    }
    function folder(k,name,parent){return artifact(k,name,parent,true);}
    function copy(k,name,parent){return artifact(k,name,parent,false);}
    var annual=folder('annualFolder','ASME '+targetYear,root),att=folder('attendanceFolder','Attendance',annual),pts=folder('pointsFolder','Points',annual),fin=folder('financeFolder','Finance',annual);
    folder('communicationsFolder','Communications',annual);folder('notesFolder','Transition Notes',annual);
    copy('pointsMaster',targetYear+' Points Master',pts);copy('attendanceForm',targetYear+' Attendance Check-In',att);copy('pointsExport',targetYear+' Points Export',pts);copy('budgetTracker',targetYear+' Budget Tracker',fin);copy('budgetExport',targetYear+' Budget Export',fin);
    var master=SpreadsheetApp.openById(state.ids.pointsMaster),form=FormApp.openById(state.ids.attendanceForm),config=master.getSheetByName('Config');
    if(existing.length && state.phase==='draft_ready'){
      var verifiedLinks={pointsMaster:'https://docs.google.com/spreadsheets/d/'+master.getId()+'/edit',pointsExport:'https://docs.google.com/spreadsheets/d/'+state.ids.pointsExport+'/edit',budgetTracker:'https://docs.google.com/spreadsheets/d/'+state.ids.budgetTracker+'/edit',budgetExport:'https://docs.google.com/spreadsheets/d/'+state.ids.budgetExport+'/edit',formRespondent:form.getPublishedUrl()};
      if(JSON.stringify(state.links)!==JSON.stringify(verifiedLinks))throw new Error('Saved links do not match the copied files.');
      var existingRowNumber=rows.findIndex(function(r){return r[0]===targetYear;})+2;
      return {success:true,targetYear:targetYear,receipt:state,readableReceipt:asmeReadableAnnualReceipt_(state,existingRowNumber),next:'Existing draft and copies verified. This retry changed no files.'};
    }
    // A resumed run with responses is never reset by this setup function.
    if(!config||!master.getSheetByName('_Raw_Ingest')||master.getSheetByName('_Raw_Ingest').getRange('A1').getFormula()!==ASME_RAW_INGEST_FORMULA)throw new Error('Canonical raw proxy architecture is missing.');
    if(form.isAcceptingResponses())throw new Error('Copied Form is accepting responses; close and review it before retrying setup.');
    if(form.getResponses().length)throw new Error('Annual Form has responses; inspect the existing setup instead of reconfiguring.');
    form.setAcceptingResponses(false);form.setTitle('ASME OSU Attendance '+targetYear);
    var destination=null;try{destination=form.getDestinationId();}catch(e){if(!/^(?:Exception: )?The form currently has no response destination\.$/.test(String(e.message)))throw e;}
    if(destination&&destination!==master.getId())throw new Error('Copied Form points at another workbook.');
    if(!destination)form.setDestination(FormApp.DestinationType.SPREADSHEET,master.getId());
    var linked=[];
    for(var retry=0;retry<8;retry++){linked=master.getSheets().filter(function(s){var url=s.getFormUrl();return url&&FormApp.openByUrl(url).getId()===form.getId();});if(linked.length)break;Utilities.sleep(1000);}
    if(linked.length!==1)throw new Error('Google response tab not uniquely observed yet; retry this same run. No name was guessed.');
    if(JSON.stringify(linked[0].getRange(1,1,1,12).getValues()[0])!==JSON.stringify(ASME_RESPONSE_HEADERS)||linked[0].getLastRow()>1)throw new Error('Observed response tab must have the exact twelve headers and no data.');
    config.getRange('B2').setValue(fallTerm);config.getRange('B3').setValue(year.short);config.getRange('B5').setValue('TESTING');config.getRange('B7').setValue(linked[0].getName());config.getRange('B16').setValue(form.getId());
    var proxy=master.getSheetByName('_Raw_Ingest');if(!proxy||proxy.getRange('A1').getFormula()!==ASME_RAW_INGEST_FORMULA)throw new Error('Canonical raw proxy architecture is missing.');
    if(proxy.getMaxRows()<linked[0].getMaxRows())proxy.insertRowsAfter(proxy.getMaxRows(),linked[0].getMaxRows()-proxy.getMaxRows());
    SpreadsheetApp.openById(state.ids.pointsExport).getSheetByName('Config').getRange('B1').setValue(master.getId());
    var budget=SpreadsheetApp.openById(state.ids.budgetTracker);SpreadsheetApp.openById(state.ids.budgetExport).getSheetByName('Config').getRange('B1').setValue(budget.getId());
    var setup=budget.getSheetByName('Setup & Lists');['B4','B5','B11','B12','B13','B14'].forEach(function(a,i){var dates=[year.start+'-08-01',year.end+'-07-31',year.start+'-08-01',year.start+'-12-31',year.end+'-01-01',year.end+'-05-31'];setup.getRange(a).setValue(Utilities.parseDate(dates[i],budget.getSpreadsheetTimeZone(),'yyyy-MM-dd'));});
    SpreadsheetApp.flush();asmeSyncEvents_(master);
    var url=function(id){return 'https://docs.google.com/spreadsheets/d/'+id+'/edit';};
    var links={pointsMaster:url(master.getId()),pointsExport:url(state.ids.pointsExport),budgetTracker:url(budget.getId()),budgetExport:url(state.ids.budgetExport),formRespondent:form.getPublishedUrl()};
    state.links=links;save();
    var row=asmeAnnualDraftRow_(targetYear,cfg.engagementGoal,links,cfg.calendarIcalUrl,state.draftTimestamp);
    var rowNumber=existing.length?rows.findIndex(function(r){return r[0]===targetYear;})+2:settings.getLastRow()+1;
    if(existing.length){if(JSON.stringify(existing[0])!==JSON.stringify(row)||settings.getRange(rowNumber,1,1,20).getFormulas()[0].some(Boolean))throw new Error('Existing draft no longer matches this run; no row was changed.');}
    else settings.getRange(rowNumber,1,1,20).setValues([row]);
    SpreadsheetApp.flush();if(JSON.stringify(settings.getRange(rowNumber,1,1,20).getValues()[0])!==JSON.stringify(row))throw new Error('Draft readback failed; retry the same run to reconcile.');
    state.phase='draft_ready';state.responseTab=linked[0].getName();state.links=links;state.formEditUrl=form.getEditUrl();state.folderUrl=annual.getUrl();state.completedAt=state.completedAt||new Date().toISOString();state.checkedAt=new Date().toISOString();delete state.lastError;save();
    return {success:true,targetYear:targetYear,receipt:state,readableReceipt:asmeReadableAnnualReceipt_(state,rowNumber),next:'Enable automatic event sync from the copied master menu, authorize both private imports, run pre-flight and actual scoring tests. Intake remains closed, TESTING, inactive and noncurrent.'};
  }catch(e){if(state){state.lastError=String(e.message||e);try{properties.setProperty(key,JSON.stringify(state));}catch(ignore){/* Preserve the original failure; pending intent was saved first. */}}throw e;}finally{lock.releaseLock();}
}
