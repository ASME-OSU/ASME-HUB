import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../integrations/apps-script/transition-simple/AnnualReadiness.gs',import.meta.url),'utf8');
function fixture(){
  const saved={},changes={created:0,deleted:[],sync:0,locks:0},triggers=[],state={year:'2027-2028',runKey:'run',phase:'draft_ready',workspaceMode:'production',responseTab:'Actual Responses',plan:{rootFolderId:'root',controlCenterId:'center'},ids:{annualFolder:'annual',attendanceFolder:'attendance',pointsFolder:'pointsFolder',financeFolder:'finance',communicationsFolder:'communications',notesFolder:'notes',pointsMaster:'master',attendanceForm:'form',pointsExport:'points',budgetTracker:'budget',budgetExport:'budgetExport'}};
  const props={getProperty:k=>saved[k]??null,setProperty:(k,v)=>{saved[k]=v;},getProperties:()=>({...saved})};
  const configValues={B5:'TESTING',B16:'form',B7:'Actual Responses'};
  const config={getRange:a=>({getValue:()=>configValues[a]})};
  const response={getFormUrl:()=> 'form-url'};
  const master={getId:()=> 'master',getSheetByName:n=>n==='Config'?config:n==='Actual Responses'?response:null};
  const form={getId:()=> 'form',getDestinationId:()=> 'master',isAcceptingResponses:()=>false};
  const file={isTrashed:()=>false,getOwner:()=>({getEmail:()=> 'asmeohiostate@gmail.com'})};
  let failAfterCreate=false;
  function trigger(uid,sourceId='master',handler='asmeAnnualEventsEdited',type='ON_EDIT'){return {getUniqueId:()=>uid,getTriggerSourceId:()=>sourceId,getHandlerFunction:()=>handler,getEventType:()=>type};}
  const ctx=vm.createContext({console,Date,JSON,ScriptApp:{EventType:{ON_EDIT:'ON_EDIT'},getProjectTriggers:()=>triggers.slice(),deleteTrigger:t=>{changes.deleted.push(t.getUniqueId());triggers.splice(triggers.indexOf(t),1);},newTrigger:handler=>({forSpreadsheet:ss=>({onEdit:()=>({create:()=>{changes.created++;const t=trigger('uid-'+changes.created,ss.getId(),handler);triggers.push(t);if(failAfterCreate){failAfterCreate=false;throw Error('acknowledgement lost');}return t;}})})})},LockService:{getScriptLock:()=>({tryLock:()=>{changes.locks++;return true;},releaseLock:()=>{changes.locks--;}})},PropertiesService:{getScriptProperties:()=>props},SpreadsheetApp:{flush:()=>{}},DriveApp:{getFileById:()=>file},FormApp:{openById:()=>form,openByUrl:()=>form},asmeChapterActor_:()=>{},asmeProvisionerActor_:()=>{},ASME_ANNUAL_TEMPLATES:{pointsMaster:'canonical-master',attendanceForm:'canonical-form'},asmeSyncEvents_:ss=>{assert.equal(ss,master);changes.sync++;}});
  vm.runInContext(source,ctx);
  const annualContext={properties:props,runKey:state.runKey,state,master,form,registryKey:ctx.asmeAnnualUpdatesKey_(state.runKey)};
  const realContext=ctx.asmeAnnualReadinessContext_,realReport=ctx.asmeAnnualReadinessReport_;
  ctx.asmeAnnualReadinessContext_=()=>annualContext;
  ctx.asmeAnnualReadinessReport_=c=>({eventUpdates:ctx.asmeAnnualUpdatesStatus_(c)});
  saved.run=JSON.stringify(state);
  return {ctx,saved,changes,triggers,state,props,annualContext,realContext,realReport,master,configValues,form,trigger,loseAck:()=>{failAfterCreate=true;},event:uid=>({triggerUid:uid,source:master,range:{getSheet:()=>({getName:()=> 'Events',getParent:()=>master}),getRow:()=>2,getNumRows:()=>1,getColumn:()=>2}})};
}

test('connect reads back one recorded trigger; retry is idempotent and preserves all unrelated triggers',()=>{
  const f=fixture(),other=f.trigger('production','old-master','oldHandler');f.triggers.push(other);
  const first=f.ctx.enableAnnualEventUpdates({});assert.equal(first.eventUpdates.status,'installed');assert.equal(first.eventUpdates.triggerUid,'uid-1');
  f.ctx.enableAnnualEventUpdates({});assert.equal(f.changes.created,1);assert.deepEqual(f.changes.deleted,[]);assert.ok(f.triggers.includes(other));assert.equal(f.changes.locks,0);
});
test('lost create acknowledgement reconciles only recorded pending target on retry',()=>{
  const f=fixture();f.loseAck();assert.throws(()=>f.ctx.enableAnnualEventUpdates({}),/acknowledgement lost/);assert.equal(JSON.parse(f.saved[f.annualContext.registryKey]).pending,true);
  assert.equal(f.ctx.enableAnnualEventUpdates({}).eventUpdates.triggerUid,'uid-1');assert.equal(f.changes.created,1);assert.deepEqual(f.changes.deleted,[]);
});
test('unknown or duplicate or wrong-type managed triggers stop without implicit deletion',()=>{
  for(const kind of ['unknown','duplicate','wrong-type']){const f=fixture();f.triggers.push(f.trigger('unknown'));if(kind==='duplicate')f.triggers.push(f.trigger('other'));if(kind==='wrong-type')f.triggers[0]=f.trigger('wrong','master','asmeAnnualEventsEdited','ON_OPEN');assert.throws(()=>f.ctx.enableAnnualEventUpdates({}),/trigger/);assert.equal(f.changes.created,0);assert.deepEqual(f.changes.deleted,[]);}
});
test('quota counts all handlers and does not remove other-year production triggers',()=>{
  const f=fixture();for(let i=0;i<20;i++)f.triggers.push(f.trigger('existing-'+i,'year-'+i,'otherHandler'));
  assert.throws(()=>f.ctx.enableAnnualEventUpdates({}),/20-trigger limit/);assert.equal(f.triggers.length,20);assert.equal(f.changes.created,0);assert.deepEqual(f.changes.deleted,[]);
});
test('record UID drift cannot silently adopt a replacement trigger',()=>{
  const f=fixture();f.ctx.enableAnnualEventUpdates({});f.triggers[0]=f.trigger('replacement');assert.equal(f.ctx.asmeAnnualUpdatesStatus_(f.annualContext).status,'error');assert.throws(()=>f.ctx.enableAnnualEventUpdates({}),/unrecorded/);assert.deepEqual(f.changes.deleted,[]);
});
test('only real matching UID and saved source can record observed event delivery; LIVE uses saved run after config changes',()=>{
  const f=fixture();f.ctx.enableAnnualEventUpdates({});const before=f.changes.sync;
  f.ctx.asmeAnnualEventsEdited({...f.event('uid-1'),triggerUid:undefined});assert.equal(f.changes.sync,before);
  assert.throws(()=>f.ctx.asmeAnnualEventsEdited(f.event('unknown')),/recorded/);assert.equal(f.changes.sync,before);
  f.configValues.B5='LIVE';f.saved.ANNUAL_PROVISIONER_CONFIG='{"workspaceMode":"rehearsal","rootFolderId":"other"}';
  f.ctx.asmeAnnualEventsEdited(f.event('uid-1'));assert.equal(f.changes.sync,before+1);assert.equal(f.ctx.asmeAnnualUpdatesStatus_(f.annualContext).status,'observed');
});
test('changed Form binding fails before sync and records no observed delivery',()=>{
  const f=fixture();f.ctx.enableAnnualEventUpdates({});const before=f.changes.sync;f.configValues.B16='other-form';
  assert.throws(()=>f.ctx.asmeAnnualEventsEdited(f.event('uid-1')),/binding/);assert.equal(f.changes.sync,before);const record=JSON.parse(f.saved[f.annualContext.registryKey]);assert.equal(record.lastObservedAt,undefined);assert.ok(record.lastError);
});
test('rehearsal handler rejects LIVE and ignores unrelated tab/range/source edits',()=>{
  const f=fixture();f.state.workspaceMode='rehearsal';f.saved.run=JSON.stringify(f.state);f.ctx.enableAnnualEventUpdates({});const before=f.changes.sync;
  const unrelated=f.event('uid-1');unrelated.range.getColumn=()=>10;f.ctx.asmeAnnualEventsEdited(unrelated);assert.equal(f.changes.sync,before);
  f.configValues.B5='LIVE';assert.throws(()=>f.ctx.asmeAnnualEventsEdited(f.event('uid-1')),/mode/);assert.equal(f.changes.sync,before);
});
test('stop needs explicit confirmation and deletes only exact recorded UID; mismatch is read-only',()=>{
  const f=fixture();f.ctx.enableAnnualEventUpdates({});const other=f.trigger('keep','production','productionHandler');f.triggers.push(other);
  assert.throws(()=>f.ctx.stopAnnualEventUpdates({}),/Confirm/);assert.deepEqual(f.changes.deleted,[]);
  f.triggers[0]=f.trigger('different');assert.throws(()=>f.ctx.stopAnnualEventUpdates({confirmStop:true}),/exact recorded/);assert.deepEqual(f.changes.deleted,[]);
  f.triggers[0]=f.trigger('uid-1');assert.equal(f.ctx.stopAnnualEventUpdates({confirmStop:true}).eventUpdates.status,'not_connected');assert.deepEqual(f.changes.deleted,['uid-1']);assert.ok(f.triggers.includes(other));
});
test('guard rejects changed config revision and wrong run key before resolving any caller files',()=>{
  const f=fixture();f.ctx.asmeAnnualYear_=()=>({start:2027,end:2028});f.ctx.asmeAnnualConfigRevision_=()=> 'revision';f.ctx.asmeAnnualRunKey_=()=> 'run';f.saved.ANNUAL_PROVISIONER_CONFIG='{"workspaceMode":"production"}';
  assert.throws(()=>f.realContext({year:'2027-2028',mode:'production',expectedConfigRevision:'old',expectedRunKey:'run',pointsMasterId:'caller'}),/setup changed/);
  assert.throws(()=>f.realContext({year:'2027-2028',mode:'production',expectedConfigRevision:'revision',expectedRunKey:'different'}),/saved annual run/);
  assert.equal(f.changes.created,0);assert.deepEqual(f.changes.deleted,[]);
});
test('canonical/reused/missing artifact IDs are rejected',()=>{
  const f=fixture();f.ctx.asmeAnnualTargetIds_(f.state);
  for(const bad of ['canonical-master','root','center','form','']){const altered=structuredClone(f.state);altered.ids.pointsMaster=bad;assert.throws(()=>f.ctx.asmeAnnualTargetIds_(altered),/identities/);}
});
function guardedFixture(){
  const f=fixture(),headers=Array.from({length:20},(_,i)=>'column-'+i),row=Array.from({length:20},()=> '');row[0]='2027-2028';row[10]=false;row[11]=false;
  f.state.plan.engagementGoal=20;f.state.plan.calendarIcalUrl='';f.state.links={};f.state.draftTimestamp='2026-10-28T00:00:00.000Z';f.saved.run=JSON.stringify(f.state);
  const cfg={workspaceMode:'production',rootFolderId:'root',controlCenterId:'center'};f.saved.ANNUAL_PROVISIONER_CONFIG=JSON.stringify(cfg);
  const access={trashed:false,owner:'asmeohiostate@gmail.com',viewers:[],publicExports:false,moved:false};const file={isTrashed:()=>access.trashed,getOwner:()=>({getEmail:()=>access.owner}),getSharingAccess:()=> 'PRIVATE',getEditors:()=>[],getViewers:()=>access.viewers.map(email=>({getEmail:()=>email}))};
  const expectedRow=[...row];
  const settings={getLastRow:()=>2,getRange:(r,c,n,w)=>({getValues:()=>[r===1?headers:row],getFormulas:()=>[Array(20).fill('')]})};
  Object.assign(f.ctx,{ASME_ANNUAL_HEADERS:[...headers],asmeAnnualYear_:()=>({start:2027,end:2028}),asmeAnnualConfigRevision_:()=> 'revision',asmeAnnualRunKey_:()=> 'run',asmeCheckWorkspacePurpose_:()=>{},asmeAnnualDraftRow_:()=>[...expectedRow],asmeVerifyCompletedAnnual_:()=>{if(f.form.isAcceptingResponses())throw Error('open intake');}});
  const parents={annual:'root',attendance:'annual',pointsFolder:'annual',finance:'annual',communications:'annual',notes:'annual',master:'pointsFolder',form:'attendance',points:'pointsFolder',budget:'finance',budgetExport:'finance'};
  function resource(id){let available=true;return {...file,getSharingAccess:()=>access.publicExports&&['points','budgetExport'].includes(id)?'ANYONE':'PRIVATE',getParents:()=>({hasNext:()=>available,next:()=>{available=false;return {getId:()=>access.moved?'wrong-parent':parents[id]};}})};}
  f.ctx.DriveApp.Access={PRIVATE:'PRIVATE'};f.ctx.DriveApp.getFolderById=resource;f.ctx.DriveApp.getFileById=resource;f.ctx.SpreadsheetApp.openById=id=>id==='center'?{getSheetByName:()=>settings}:f.master;
  return {...f,headers,row,access,input:{year:'2027-2028',mode:'production',expectedConfigRevision:'revision',expectedRunKey:'run'}};
}
test('full readiness guard checks account-owned private files, exact headers, inactive/current flags and closed binding before any writes',()=>{
  const f=guardedFixture();assert.equal(f.realContext(f.input).master,f.master);
  for(const mutate of [()=>{f.access.owner='other@example.com';},()=>{f.access.trashed=true;},()=>{f.access.viewers=['external@example.com'];},()=>{f.row[10]=true;},()=>{f.row[11]=true;},()=>{f.headers[0]='wrong';},()=>{f.row[3]='other-source';},()=>{f.form.isAcceptingResponses=()=>true;}]){
    // Apply each perturbation, then restore the original context.
    const old={...f.access,viewers:[...f.access.viewers]};mutate();assert.throws(()=>f.realContext(f.input));Object.assign(f.access,old);f.row[10]=false;f.row[11]=false;f.row[3]='';f.headers[0]='column-0';f.form.isAcceptingResponses=()=>false;
  }
  assert.equal(f.changes.created,0);assert.deepEqual(f.changes.deleted,[]);
});
test('read-only check preserves properties, triggers and intake; report distinguishes import action from approval limits',()=>{
  const f=fixture();let importError=true;
  const pointsNames=['Leaderboard_Public','Point_Values_Public','System_Status','Event_Metrics_Public','Monthly_Metrics_Public','Semester_Metrics_Public'];
  function sheet(name,cells){
    const formulas=Array.from({length:39},()=>Array(6).fill('')),values=Array.from({length:39},()=>Array(6).fill(''));values[0][0]='Reviewed output header';
    for(const cell of cells){const m=/([A-Z])([0-9]+)/.exec(cell),r=+m[2]-1,c=m[1].charCodeAt(0)-65;formulas[r][c]='=IMPORTRANGE(Config!$B$1,"Private!A1")';values[r][c]=importError?'#REF!':name==='Budget_Public'?'0':'member_id';}
    return {getName:()=>name,getMaxRows:()=>39,getMaxColumns:()=>6,getLastColumn:()=>6,getDataRange:()=>({getFormulas:()=>formulas,getDisplayValues:()=>values}),getRange:(r,c)=>({getA1Notation:()=>String.fromCharCode(64+c)+r,getDisplayValues:()=>[values[0]],getValue:()=>name==='Config'?undefined:''})};
  }
  function book(id){const source=id==='points'?'master':'budget',sheets=id==='points'?pointsNames.map(n=>sheet(n,['A1'])):[sheet('Budget_Public',['C2','C3','C4','C5','C6',...Array.from({length:28},(_,i)=>'C'+(i+10)),'C38','F2'])];const cfg=sheet('Config',[]);cfg.getRange=()=>({getValue:()=>source});sheets.push(cfg);return {getId:()=>id,getSheets:()=>sheets,getSheetByName:n=>sheets.find(s=>s.getName()===n)};}
  f.ctx.asmeSanityReport_=()=>Array.from({length:8},(_,i)=>({test:'Structure '+i,pass:true})).concat({test:'manual scoring',manual:true,pass:false});f.ctx.SpreadsheetApp.openById=id=>book(id);
  f.ctx.asmeAnnualReadinessReport_=f.realReport;const before=JSON.stringify(f.saved),report=f.ctx.checkAnnualReadiness({});
  assert.deepEqual(JSON.parse(JSON.stringify(report.fileIds)),{pointsMaster:'master',attendanceForm:'form',pointsExport:'points',budgetTracker:'budget',budgetExport:'budgetExport',controlCenter:'center'});
  assert.equal(report.readScope,'staging');assert.equal(report.ready,false);assert.equal(report.checks.find(c=>c.id==='pointsExport_output').status,'action_needed');assert.match(report.checks.find(c=>c.id==='pointsExport_output').detail,/Allow access/);assert.ok(report.checks.find(c=>c.id==='budgetExport_output').url.includes('range='));assert.equal(JSON.stringify(f.saved),before);assert.equal(f.changes.sync,0);assert.equal(f.changes.created,0);assert.equal(f.form.isAcceptingResponses(),false);assert.ok(report.limits.length>=3);
  importError=false;const connected=f.ctx.enableAnnualEventUpdates({});assert.equal(connected.ready,true);assert.equal(connected.eventUpdates.status,'installed');assert.match(connected.readyScope,/not launch approval/);assert.equal(connected.checks.find(c=>c.id==='event_updates').status,'passed');
  const open=f.ctx.SpreadsheetApp.openById;f.ctx.SpreadsheetApp.openById=id=>{const b=open(id);if(id==='points')b.getSheets()[0].getName=()=> 'Unexpected_Public';return b;};
  const malformed=f.ctx.checkAnnualReadiness({});assert.equal(malformed.ready,false);assert.equal(malformed.checks.find(c=>c.id==='pointsExport_output').status,'action_needed');
  f.annualContext.retired=true;f.configValues.B5='LIVE';f.ctx.asmeSanityReport_=()=>[{test:'TESTING mode',pass:false},{test:'Public member output suppressed',pass:false},{test:'Form intake closed for pre-flight',pass:true}];
  const retired=f.realReport(f.annualContext);assert.equal(retired.readScope,'retirement');assert.ok(retired.checks.every(c=>!['TESTING mode','Public member output suppressed'].includes(c.label)));assert.deepEqual(Array.from(retired.checks,c=>c.id),['annual_identity','event_updates']);assert.equal(retired.checks.find(c=>c.id==='event_updates').status,'action_needed');assert.match(retired.checks.find(c=>c.id==='event_updates').detail,/Confirm Stop/);
});
test('stop accepts reviewed closed noncurrent LIVE year and rejects open intake before deletion',()=>{
  const f=guardedFixture();f.ctx.asmeAnnualReadinessContext_=(input,retired)=>f.realContext(input,retired);f.ctx.enableAnnualEventUpdates(f.input);f.row[10]=true;f.configValues.B5='LIVE';
  f.form.isAcceptingResponses=()=>true;assert.throws(()=>f.ctx.stopAnnualEventUpdates({...f.input,confirmStop:true}),/closing/);assert.deepEqual(f.changes.deleted,[]);
  f.form.isAcceptingResponses=()=>false;assert.equal(f.ctx.stopAnnualEventUpdates({...f.input,confirmStop:true}).eventUpdates.status,'not_connected');assert.deepEqual(f.changes.deleted,['uid-1']);assert.equal(f.configValues.B5,'LIVE');assert.equal(f.row[10],true);
});
test('lost stop acknowledgement safely reconciles only the saved stopping intent',()=>{
  const f=fixture();f.ctx.enableAnnualEventUpdates({});const remove=f.ctx.ScriptApp.deleteTrigger;let lost=true;f.ctx.ScriptApp.deleteTrigger=t=>{remove(t);if(lost){lost=false;throw Error('delete acknowledgement lost');}};
  assert.throws(()=>f.ctx.stopAnnualEventUpdates({confirmStop:true}),/acknowledgement lost/);assert.equal(f.triggers.length,0);assert.equal(JSON.parse(f.saved[f.annualContext.registryKey]).stopping,true);
  assert.equal(f.ctx.stopAnnualEventUpdates({confirmStop:true}).eventUpdates.status,'not_connected');assert.deepEqual(f.changes.deleted,['uid-1']);assert.equal(JSON.parse(f.saved[f.annualContext.registryKey]).stopping,undefined);
});
test('retired public exports do not block exact managed stop; staged checks keep private policy and no sharing changes',()=>{
  const f=guardedFixture();f.ctx.asmeAnnualReadinessContext_=(input,retired)=>f.realContext(input,retired);f.ctx.enableAnnualEventUpdates(f.input);f.access.publicExports=true;
  assert.throws(()=>f.ctx.checkAnnualReadiness(f.input),/private/);assert.throws(()=>f.ctx.enableAnnualEventUpdates(f.input),/private/);assert.deepEqual(f.changes.deleted,[]);
  assert.equal(f.ctx.stopAnnualEventUpdates({...f.input,confirmStop:true}).eventUpdates.status,'not_connected');assert.equal(f.access.publicExports,true);assert.deepEqual(f.changes.deleted,['uid-1']);
});
test('public-export retirement cannot bypass current year, open Form, moved source or foreign owner protections',()=>{
  for(const kind of ['current','open','moved','owner']){
    const f=guardedFixture();f.ctx.asmeAnnualReadinessContext_=(input,retired)=>f.realContext(input,retired);f.ctx.enableAnnualEventUpdates(f.input);f.access.publicExports=true;
    if(kind==='current')f.row[11]=true;if(kind==='open')f.form.isAcceptingResponses=()=>true;if(kind==='moved')f.access.moved=true;if(kind==='owner')f.access.owner='foreign@example.com';
    assert.throws(()=>f.ctx.stopAnnualEventUpdates({...f.input,confirmStop:true}));assert.deepEqual(f.changes.deleted,[]);assert.equal(f.triggers.length,1);
  }
});

test('explicit stop read intent validates retired LIVE public exports without writes; ordinary read remains staged',()=>{
  const f=guardedFixture();let retiredArgument;f.ctx.asmeAnnualReadinessContext_=(input,retired)=>{retiredArgument=retired;return f.realContext(input,retired);};f.ctx.enableAnnualEventUpdates(f.input);f.access.publicExports=true;f.row[10]=true;f.configValues.B5='LIVE';const before=JSON.stringify(f.saved),sync=f.changes.sync;
  assert.throws(()=>f.ctx.checkAnnualReadiness(f.input),/private|inactive/);
  assert.equal(f.ctx.checkAnnualReadiness({...f.input,action:'stop'}).eventUpdates.status,'installed');assert.equal(retiredArgument,true);assert.equal(JSON.stringify(f.saved),before);assert.equal(f.changes.sync,sync);assert.deepEqual(f.changes.deleted,[]);
});

test('retirement read preserves lost-delete UID only for stop reconciliation, then finalizes without another deletion',()=>{
  const f=guardedFixture();f.ctx.asmeAnnualReadinessContext_=(input,retired)=>f.realContext(input,retired);f.ctx.enableAnnualEventUpdates(f.input);const remove=f.ctx.ScriptApp.deleteTrigger;let lose=true;f.ctx.ScriptApp.deleteTrigger=t=>{remove(t);if(lose){lose=false;throw Error('delete acknowledgement lost');}};
  assert.throws(()=>f.ctx.stopAnnualEventUpdates({...f.input,confirmStop:true}),/acknowledgement lost/);assert.equal(f.triggers.length,0);
  const staged=f.ctx.checkAnnualReadiness(f.input);assert.equal(staged.eventUpdates.status,'not_connected');assert.equal(staged.eventUpdates.triggerUid,undefined);assert.equal(staged.eventUpdates.stopPending,undefined);
  const before=JSON.stringify(f.saved),retired=f.ctx.checkAnnualReadiness({...f.input,action:'stop'});assert.equal(retired.eventUpdates.status,'not_connected');assert.equal(retired.eventUpdates.triggerUid,'uid-1');assert.equal(retired.eventUpdates.stopPending,true);assert.match(retired.eventUpdates.detail,/finish recording/);assert.equal(JSON.stringify(f.saved),before);
  const finalized=f.ctx.stopAnnualEventUpdates({...f.input,confirmStop:true});assert.equal(finalized.eventUpdates.status,'not_connected');assert.equal(finalized.eventUpdates.stopPending,undefined);assert.equal(finalized.eventUpdates.triggerUid,undefined);assert.deepEqual(f.changes.deleted,['uid-1']);assert.equal(JSON.parse(f.saved[f.annualContext.registryKey]).stopping,undefined);
});

test('successful intentional stop report excludes staging failures and never invites reconnecting a retired LIVE year',()=>{
  const f=guardedFixture();f.ctx.asmeAnnualReadinessContext_=(input,retired)=>f.realContext(input,retired);f.ctx.enableAnnualEventUpdates(f.input);f.row[10]=true;f.configValues.B5='LIVE';f.access.publicExports=true;
  f.ctx.asmeAnnualReadinessReport_=f.realReport;f.ctx.asmeSanityReport_=()=>{throw Error('staging sanity must not run for retirement');};
  const report=f.ctx.stopAnnualEventUpdates({...f.input,confirmStop:true});assert.equal(report.readScope,'retirement');assert.equal(report.eventUpdates.status,'not_connected');assert.equal(report.ready,true);assert.deepEqual(Array.from(report.checks,c=>c.id),['annual_identity','event_updates']);assert.ok(report.checks.every(c=>c.status==='passed'));assert.match(report.checks[1].detail,/No reconnect action is needed/);assert.doesNotMatch(JSON.stringify(report.checks),/Choose Connect|TESTING mode|suppressed|Allow access/);assert.deepEqual(f.changes.deleted,['uid-1']);assert.equal(f.configValues.B5,'LIVE');assert.equal(f.access.publicExports,true);
});
