import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const scripts=['AnnualProvisioner','EventSync','SanityCheck','ProvisionerWeb','TestCleanup'].map(n=>fs.readFileSync(new URL(`../integrations/apps-script/transition-simple/${n}.gs`,import.meta.url),'utf8')).join('\n');
const clone=x=>JSON.parse(JSON.stringify(x));
function harness(){
  const files=new Map(),books=new Map(),forms=new Map(),props=new Map(),triggers=[],writes=[];
  let observationDelay=0;let seq=0,failCopy=false,failAppend=false,actor='asmeohiostate@gmail.com',activeActor='asmeohiostate@gmail.com',locked=false;
  const iter=a=>{let i=0;return {hasNext:()=>i<a.length,next:()=>a[i++]};};
  class Sheet{
    constructor(name,values=[],formulas=[],maxRows=1000){this.name=name;this.values=clone(values);this.formulas=clone(formulas);this.maxRows=maxRows;this.protected=true;this.formUrl=null;}
    getName(){return this.name;} getLastRow(){return Math.max(1,...[this.values,this.formulas].flatMap(grid=>grid.map((r,i)=>r.some(v=>v!==''&&v!==undefined)?i+1:0)));} getMaxRows(){return this.maxRows;} getMaxColumns(){return 20;} getFormUrl(){return this.formUrl;}
    insertRowsAfter(_,n){writes.push('resize');this.maxRows+=n;}
    getProtections(){return this.protected?[{isWarningOnly:()=>this.protected==='warning'}]:[];}
    getDataRange(){return this.getRange(1,1,Math.max(this.values.length,this.formulas.length,1),20);}
    getRange(r,c,n=1,m=1){
      if(typeof r==='string'){const v=/^([A-Z]+)(\d+)$/.exec(r);c=[...v[1]].reduce((a,x)=>a*26+x.charCodeAt(0)-64,0);r=+v[2];}
      const read=grid=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>grid[r+i-1]?.[c+j-1]??''));
      const put=a=>{writes.push(`${this.name}!${r}:${c}`);a.forEach((row,i)=>row.forEach((v,j)=>{(this.values[r+i-1]??=[])[c+j-1]=v;}));if(this.name==='Hub_Settings_Public'&&r>1&&failAppend){failAppend=false;throw Error('append acknowledgement lost');}return range;};
      const range={getValues:()=>read(this.values),getValue:()=>read(this.values)[0][0],getFormulas:()=>read(this.formulas),getFormula:()=>read(this.formulas)[0][0],setValues:put,setValue:v=>put([[v]]),clearContent:()=>put(Array.from({length:n},()=>Array(m).fill('')))};return range;
    }
  }
  class File{
    constructor(id,name,parent,folder=false,mime='sheet'){this.id=id;this.name=name;this.parent=parent;this.folder=folder;this.mime=mime;this.access='private';this.owner='asmeohiostate@gmail.com';this.trashed=false;files.set(id,this);}
    getId(){return this.id;} getName(){return this.name;} getMimeType(){return this.mime;} getOwner(){return {getEmail:()=>this.owner};}getSharingAccess(){return this.access;}isTrashed(){return this.trashed;}
    getEditors(){return this.editors||[];}getViewers(){return this.viewers||[];}getParents(){return iter(this.parent?[files.get(this.parent)]:[]);}getUrl(){return `https://drive.google.com/drive/folders/${this.id}`;}
    getFoldersByName(name){return iter([...files.values()].filter(f=>f.parent===this.id&&f.folder&&f.name===name));}
    getFilesByName(name){return iter([...files.values()].filter(f=>f.parent===this.id&&!f.folder&&f.name===name));}
    createFolder(name){writes.push('create folder');return new File('folder'+ ++seq,name,this.id,true);}
    makeCopy(name,parent){writes.push('copy');const f=new File('copy'+ ++seq,name,parent.id,false,this.mime);
      if(books.has(this.id)){const original=books.get(this.id);books.set(f.id,book(f.id,[...original.sheets.values()].map(s=>{const c=new Sheet(s.name,s.values,s.formulas,s.maxRows);c.protected=s.protected;return c;})));}
      if(forms.has(this.id))forms.set(f.id,form(f.id));
      if(failCopy){failCopy=false;throw Error('copy acknowledgement lost');}return f;
    }
  }
  function book(id,sheets){const b={id,sheets:new Map(sheets.map(s=>[s.name,s])),getId:()=>id,getSheetByName:n=>b.sheets.get(n),getSheets:()=>{const list=[...b.sheets.values()];if(observationDelay>0&&list.some(s=>s.formUrl)){observationDelay--;return list.filter(s=>!s.formUrl);}return list;},insertSheet:name=>{writes.push('archive');const s=new Sheet(name);b.sheets.set(name,s);return s;},getSpreadsheetTimeZone:()=> 'America/New_York',toast:()=>{}};books.set(id,b);return b;}
  function form(id){const f={id,destination:null,accepting:false,responses:[],choices:[],choiceWrites:0,title:'template',getId:()=>id,getResponses:()=>f.responses,deleteAllResponses:()=>{throw Error('Bulk deletion must not be used');},deleteResponse:responseId=>{writes.push('delete form responses');f.responses=f.responses.filter(r=>r.getId()!==responseId);},isAcceptingResponses:()=>f.accepting,setAcceptingResponses:v=>{writes.push('intake');f.accepting=v;},setTitle:v=>{writes.push('title');f.title=v;},getDestinationId:()=>{if(!f.destination)throw Error('Exception: The form currently has no response destination.');return f.destination;},setDestination:(_,dest)=>{writes.push('destination');f.destination=dest;const s=new Sheet('Observed response 8',[clone(ctx.ASME_RESPONSE_HEADERS)]);s.formUrl='form:'+id;books.get(dest).sheets.set(s.name,s);},getPublishedUrl:()=>`https://docs.google.com/forms/d/e/${id}/viewform`,getEditUrl:()=>`https://docs.google.com/forms/d/${id}/edit`,getItems:()=>[{getTitle:()=> 'Event ID',asListItem:()=>({getChoices:()=>f.choices.map(c=>({getValue:()=>c})),setChoiceValues:a=>{f.choiceWrites++;writes.push('choices');f.choices=clone(a);}})}]};forms.set(id,f);return f;}
  const ctx=vm.createContext({console,Date,PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,getProperties:()=>Object.fromEntries(props),setProperty:(k,v)=>{props.set(k,v);}})},Session:{getEffectiveUser:()=>({getEmail:()=>actor}),getActiveUser:()=>({getEmail:()=>activeActor})},LockService:{getScriptLock:()=>({tryLock:()=>{if(locked)return false;locked=true;return true;},releaseLock:()=>{locked=false;}})},DriveApp:{Access:{PRIVATE:'private'},getFolderById:id=>{const f=files.get(id);if(!f?.folder)throw Error('folder missing');return f;},getFileById:id=>{const f=files.get(id);if(!f||f.folder)throw Error('file missing');return f;}},SpreadsheetApp:{ProtectionType:{SHEET:'sheet'},openById:id=>{if(!books.has(id))throw Error('book missing');return books.get(id);},getActiveSpreadsheet:()=>books.get('annual-master'),flush:()=>{}},FormApp:{DestinationType:{SPREADSHEET:'spreadsheet'},ItemType:{LIST:'list'},openById:id=>{if(!forms.has(id))throw Error('form missing');return forms.get(id);},openByUrl:url=>forms.get(url.slice(5))},Utilities:{sleep:()=>{},parseDate:(date,tz,pattern)=>{assert.equal(tz,'America/New_York');assert.equal(pattern,'yyyy-MM-dd');return date;}},ScriptApp:{EventType:{ON_EDIT:'onEdit'},getProjectTriggers:()=>triggers,newTrigger:handler=>{let id;const b={forSpreadsheet:ss=>{id=ss.getId();return b;},onEdit:()=>b,create:()=>{writes.push('trigger');const t={getHandlerFunction:()=>handler,getTriggerSourceId:()=>id,getEventType:()=> 'onEdit'};triggers.push(t);return t;}};return b;}}});
  vm.runInContext(scripts,ctx);
  new File('root','chapter root',null,true);new File('center','Control Center');
  const settings=new Sheet('Hub_Settings_Public',[clone(ctx.ASME_ANNUAL_HEADERS)]);book('center',[settings]);
  const cfg=new Sheet('Config');[['B2','Fall 2027'],['B3','2027-28'],['B5','TESTING'],['B7','Form Responses 1'],['B17','Event ID']].forEach(([a,v])=>cfg.getRange(a).setValue(v));
  const eventHeaders=['event_id','event_name','event_date','term','academic_year','event_type','points','scoring_active','form_open'];
  const events=new Sheet('Events',[eventHeaders,['20270826-001','Welcome',45000,'Fall 2027','2027-28','General Body Meeting',5,true,true],['closed','Closed',45000,'Fall 2027','2027-28','General Body Meeting',5,true,false]]);
  const sourceSheets=[cfg,new Sheet('_Raw_Ingest',[],[[ctx.ASME_RAW_INGEST_FORMULA]]),events,new Sheet('Roster',[],[["=INDEX('_Raw_Ingest'!C:C,ROW())"]]),new Sheet('Point Log',[],[['=INDEX(_Raw_Ingest!K:K,ROW())']]),new Sheet('Website Staging')];
  for(const [k,id]of Object.entries(ctx.ASME_ANNUAL_TEMPLATES)){new File(id,k,null,false,k==='attendanceForm'?'form':'sheet');if(k==='pointsMaster')book(id,sourceSheets);else if(k==='attendanceForm')form(id);else if(k==='budgetTracker')book(id,[new Sheet('Setup & Lists'),new Sheet('Start Here',[['ASME Budget Tracker — TEMPLATE — MAKE A COPY']]),new Sheet('Dashboard',[['ASME Budget Tracker — TEMPLATE — COPY BEFORE SETUP']])]);else book(id,[new Sheet('Config')]);}
  props.set('ANNUAL_PROVISIONER_CONFIG',JSON.stringify({rootFolderId:'root',controlCenterId:'center',engagementGoal:25,workspaceMode:'rehearsal',calendarIcalUrl:'https://example.org/calendar.ics'}));writes.length=0;
  // Model the UI's one-time fresh-execution resume, never generic retries.
  function resumeOnce(call){try{return call();}catch(error){if(error.message!=='Google response tab not uniquely observed yet; retry this same run. No name was guessed.')throw error;return call();}}
  return {delayObservation:n=>{observationDelay=n;},ctx,files,books,forms,props,triggers,writes,settings,Sheet,File,book,form,events,eventHeaders,setActor:v=>{actor=v;},setActiveActor:v=>{activeActor=v;},loseCopy:()=>{failCopy=true;},loseAppend:()=>{failAppend=true;},runOnce:()=>ctx.provisionAnnualYear('2027-2028','Fall 2027'),run:()=>resumeOnce(()=>ctx.provisionAnnualYear('2027-2028','Fall 2027')),runSetup:(...args)=>resumeOnce(()=>ctx.runAnnualSetup(...args)),runKey:()=>{const cfg=JSON.parse(props.get('ANNUAL_PROVISIONER_CONFIG'));return ctx.asmeAnnualRunKey_('2027-2028',cfg.rootFolderId,cfg.controlCenterId);},state:()=>{const cfg=JSON.parse(props.get('ANNUAL_PROVISIONER_CONFIG'));return JSON.parse(props.get(ctx.asmeAnnualRunKey_('2027-2028',cfg.rootFolderId,cfg.controlCenterId)));}};
}
test('actual provisioner creates five private copies, observed pointer, six dates and exact inactive row',()=>{
  const h=harness(),r=h.run(),s=r.receipt;
  assert.equal(r.success,true);assert.equal(h.writes.filter(x=>x==='copy').length,5);assert.equal(h.writes.filter(x=>x==='create folder').length,6);
  assert.match(r.readableReceipt,/Hub_Settings_Public!A2:T2/);assert.match(r.readableReceipt,/Actual response tab: Observed response 8/);
  const master=h.books.get(s.ids.pointsMaster),form=h.forms.get(s.ids.attendanceForm);
  assert.equal(form.accepting,false);assert.equal(master.getSheetByName('Config').getRange('B7').getValue(),'Observed response 8');assert.equal(master.getSheetByName('Config').getRange('B16').getValue(),form.id);
  assert.equal(h.books.get(s.ids.pointsExport).getSheetByName('Config').getRange('B1').getValue(),master.id);assert.equal(h.books.get(s.ids.budgetExport).getSheetByName('Config').getRange('B1').getValue(),s.ids.budgetTracker);
  const budget=h.books.get(s.ids.budgetTracker);
  assert.equal(budget.getSheetByName('Start Here').getRange('A1').getValue(),'ASME Budget Tracker 2027-2028 | Private annual copy');
  assert.equal(budget.getSheetByName('Dashboard').getRange('A1').getValue(),'ASME Budget Tracker 2027-2028 | Private annual copy');
  assert.match(master.getSheetByName('Config').getRange('B8').getValue(),/2027-2028.*TESTING.*review required/);
  assert.equal(h.books.get(h.ctx.ASME_ANNUAL_TEMPLATES.budgetTracker).getSheetByName('Start Here').getRange('A1').getValue(),'ASME Budget Tracker — TEMPLATE — MAKE A COPY');
  const setup=h.books.get(s.ids.budgetTracker).getSheetByName('Setup & Lists');assert.deepEqual(['B4','B5','B11','B12','B13','B14'].map(a=>setup.getRange(a).getValue()),['2027-08-01','2028-07-31','2027-08-01','2027-12-31','2028-01-01','2028-05-31']);
  assert.equal(h.settings.values[1].length,20);assert.equal(h.settings.values[1][10],false);assert.equal(h.settings.values[1][11],false);assert.equal(h.triggers.length,0);assert.equal(form.choices[0],'20270826-001 - Welcome');
  const before=h.writes.length,stamp=h.settings.values[1][12],retry=h.run();assert.equal(h.writes.length,before);assert.equal(h.settings.values[1][12],stamp);assert.equal(h.settings.values.length,2);assert.equal(retry.readableReceipt,r.readableReceipt);
});
test('committed copy with lost acknowledgement resumes without duplicate copies',()=>{const h=harness();h.loseCopy();assert.throws(h.run,/acknowledgement/);assert.equal(h.state().pending.key,'pointsMaster');h.run();assert.equal(h.writes.filter(x=>x==='copy').length,5);assert.equal(h.settings.values.length,2);});
test('committed append with lost acknowledgement reconciles exact draft without duplicate row',()=>{const h=harness();h.loseAppend();assert.throws(h.run,/acknowledgement/);const stamp=h.settings.values[1][12];h.run();assert.equal(h.settings.values.length,2);assert.equal(h.settings.values[1][12],stamp);assert.equal(h.triggers.length,0);});
test('unrelated same-name folder cannot be silently adopted',()=>{const h=harness();new h.File('intruder','ASME 2027-2028','root',true);assert.throws(h.run,/not owned by this run/);assert.equal(h.writes.length,0);});
test('configuration changes and changed inactive draft reject before file mutations',()=>{for(const kind of ['goal','row','active']){const h=harness();h.run();h.writes.length=0;if(kind==='goal'){const cfg=JSON.parse(h.props.get('ANNUAL_PROVISIONER_CONFIG'));cfg.engagementGoal=30;h.props.set('ANNUAL_PROVISIONER_CONFIG',JSON.stringify(cfg));}else h.settings.values[1][kind==='row'?6:10]=kind==='row'?'https://wrong.example':'TRUE';assert.throws(h.run,/configuration changed|no longer matches|active\/current/);assert.equal(h.writes.length,0);}});
test('same-year practice and production workspaces keep independent resumable receipts',()=>{
  const h=harness(),practice=h.run().receipt,practiceKey=h.runKey();
  new h.File('production-root','production root',null,true);new h.File('production-center','production center');
  h.book('production-center',[new h.Sheet('Hub_Settings_Public',[clone(h.ctx.ASME_ANNUAL_HEADERS)])]);
  const config=JSON.parse(h.props.get('ANNUAL_PROVISIONER_CONFIG'));
  h.ctx.saveAnnualSetupConfig({...config,rootFolderId:'production-root',controlCenterId:'production-center'});
  const production=h.run().receipt;
  assert.notEqual(h.runKey(),practiceKey);assert.notEqual(production.ids.pointsMaster,practice.ids.pointsMaster);
  assert.equal(h.settings.values.length,2);assert.equal(h.books.get('production-center').getSheetByName('Hub_Settings_Public').values.length,2);
  const before=h.writes.length;h.run();assert.equal(h.writes.length,before);
  h.ctx.saveAnnualSetupConfig(config);assert.equal(h.run().receipt.ids.pointsMaster,practice.ids.pointsMaster);
});
test('legacy year-only state migrates only when its full plan matches the chosen workspace',()=>{
  for(const matching of [true,false]){
    const h=harness(),receipt=h.run().receipt,key=h.runKey();
    h.props.delete(key);const legacy=clone(receipt);delete legacy.runKey;
    if(!matching)legacy.plan.rootFolderId='other-root';
    h.props.set('ASME_SIMPLE_ANNUAL_2027-2028',JSON.stringify(legacy));h.writes.length=0;
    if(matching){assert.equal(h.run().receipt.ids.pointsMaster,receipt.ids.pointsMaster);assert.equal(h.state().runKey,key);}
    else assert.throws(h.run,/outside this resumable run/);
    assert.equal(h.writes.length,0);assert.equal(h.props.get('ASME_SIMPLE_ANNUAL_2027-2028'),JSON.stringify(legacy));
  }
});
test('completed retries refuse changed wiring, dates or live/intake state without file writes',()=>{
  for(const kind of ['live','term','year','response','formId','intake','destination','responseLink','headers','proxy','pointsExport','budgetExport','budgetDate']){
    const h=harness(),state=h.run().receipt,master=h.books.get(state.ids.pointsMaster),form=h.forms.get(state.ids.attendanceForm),config=master.getSheetByName('Config');
    const changed={live:['B5','LIVE'],term:['B2','Fall 2028'],year:['B3','2028-29'],response:['B7','Wrong tab'],formId:['B16','wrong-form']}[kind];
    if(changed)config.getRange(changed[0]).setValue(changed[1]);
    if(kind==='intake')form.accepting=true;
    if(kind==='destination')form.destination='another-workbook';
    if(kind==='responseLink')master.getSheetByName(state.responseTab).formUrl=null;
    if(kind==='headers')master.getSheetByName(state.responseTab).values[0][0]='Wrong timestamp';
    if(kind==='proxy')master.getSheetByName('_Raw_Ingest').formulas[0][0]='=1';
    if(kind==='pointsExport'||kind==='budgetExport')h.books.get(state.ids[kind]).getSheetByName('Config').getRange('B1').setValue('wrong-source');
    if(kind==='budgetDate')h.books.get(state.ids.budgetTracker).getSheetByName('Setup & Lists').getRange('B4').setValue('2028-08-01');
    h.writes.length=0;assert.throws(h.run,/Completed annual/,kind);assert.equal(h.writes.length,0,kind);
    if(kind==='live')assert.equal(config.getRange('B5').getValue(),'LIVE');
    if(kind==='intake')assert.equal(form.accepting,true);
  }
});
test('a deleted completed settings row cannot reset a live copy or recreate its draft',()=>{
  const h=harness(),state=h.run().receipt,config=h.books.get(state.ids.pointsMaster).getSheetByName('Config');
  h.settings.values.length=1;config.getRange('B5').setValue('LIVE');h.writes.length=0;
  assert.throws(h.run,/Completed annual draft row is missing/);assert.equal(h.writes.length,0);
  assert.equal(config.getRange('B5').getValue(),'LIVE');assert.equal(h.settings.values.length,1);
});
test('completed retry compares native budget Date values without rewriting dates',()=>{
  const h=harness();h.ctx.Utilities.parseDate=date=>new Date(date+'T04:00:00Z');
  const state=h.run().receipt,budget=h.books.get(state.ids.budgetTracker),before=h.writes.length;
  assert.equal(h.run().success,true);assert.equal(h.writes.length,before);
  budget.getSheetByName('Setup & Lists').getRange('B4').setValue(new Date('2027-08-02T04:00:00Z'));h.writes.length=0;
  assert.throws(h.run,/budget dates changed/);assert.equal(h.writes.length,0);
});
test('saved copy identity cannot point at a canonical source or moved copy',()=>{for(const kind of ['source','parent']){const h=harness();h.loseCopy();assert.throws(h.run);const s=h.state();if(kind==='source')s.ids.pointsMaster=h.ctx.ASME_ANNUAL_TEMPLATES.pointsMaster;else{const copied=[...h.files.values()].find(f=>f.name==='2027-2028 Points Master');s.ids.pointsMaster=copied.id;copied.parent='root';}h.props.set(h.runKey(),JSON.stringify(s));h.writes.length=0;assert.throws(h.run,/source or control|identity changed/);assert.equal(h.writes.length,0);}});
test('chapter account binding and strict annual year/goal validation',()=>{const h=harness();h.setActor('personal@example.com');assert.throws(h.run,/chapter/);assert.equal(h.writes.length,0);assert.equal(h.ctx.asmeAnnualYear_('2100-2101','Fall 2100').short,'2100-01');assert.equal(h.ctx.asmeAnnualYear_('2199-2200','Fall 2199').end,2200);for(const [y,t]of [['2027-2029','Fall 2027'],['2027-2028','Fall 2028'],['2200-2201','Fall 2200']])assert.throws(()=>h.ctx.asmeAnnualYear_(y,t));assert.throws(()=>h.ctx.asmeAnnualDraftRow_('2027-2028',0,{},'', 'stamp'),/positive/);});
test('events exact headers, eligibility, duplicate IDs and empty placeholders',()=>{const h=harness();assert.deepEqual(clone(h.ctx.asmeEventChoices_(h.events.values)),['20270826-001 - Welcome']);const duplicate=clone(h.events.values);duplicate.push(duplicate[1]);assert.throws(()=>h.ctx.asmeEventChoices_(duplicate),/Duplicate/);const bad=clone(h.events.values);bad[0][0]='wrong';assert.throws(()=>h.ctx.asmeEventChoices_(bad),/headers/);h.run();const master=h.books.get(h.state().ids.pointsMaster),form=h.forms.get(h.state().ids.attendanceForm);master.getSheetByName('Events').values=[h.eventHeaders];h.ctx.asmeSyncEvents_(master);assert.deepEqual(form.choices,['No events currently open for attendance']);const before=form.choiceWrites;h.ctx.asmeSyncEvents_(master);assert.equal(form.choiceWrites,before);assert.equal(form.accepting,false);});
test('event sync refuses mismatched destinations, duplicate questions and source templates',()=>{const h=harness();h.run();const master=h.books.get(h.state().ids.pointsMaster),form=h.forms.get(h.state().ids.attendanceForm),before=form.choiceWrites;form.destination='other';assert.throws(()=>h.ctx.asmeSyncEvents_(master),/destination/);assert.equal(form.choiceWrites,before);form.destination=master.id;const original=form.getItems;form.getItems=()=>[...original(),...original()];assert.throws(()=>h.ctx.asmeSyncEvents_(master),/Exactly one/);assert.throws(()=>h.ctx.asmeSyncEvents_(h.books.get(h.ctx.ASME_ANNUAL_TEMPLATES.pointsMaster)),/canonical/);});
test('edit handler ignores unrelated changes and trigger validation rejects wrong types',()=>{const h=harness();h.run();const master=h.books.get(h.state().ids.pointsMaster);h.ctx.asmeEnsureEventTrigger_(master);h.writes.length=0;h.ctx.asmeEventsEdited({source:master,range:{getSheet:()=>master.getSheetByName('Config'),getRow:()=>2,getNumRows:()=>1,getColumn:()=>1}});assert.equal(h.writes.length,0);h.triggers[0].getEventType=()=> 'onChange';assert.throws(()=>h.ctx.asmeEnsureEventTrigger_(master),/Unexpected/);h.triggers[0].getEventType=()=> 'onEdit';h.ctx.asmeEnsureEventTrigger_(master);assert.equal(h.triggers.length,1);});
test('preflight accepts native quoted/unquoted proxy refs but leaves actual scoring manual',()=>{const h=harness();h.run();const master=h.books.get(h.state().ids.pointsMaster),before=h.writes.length,report=clone(h.ctx.asmeSanityReport_(master));assert.equal(report.filter(r=>!r.manual).every(r=>r.pass),true,JSON.stringify(report));assert.equal(report.at(-1).manual,true);assert.equal(report.at(-1).pass,false);assert.equal(h.writes.length,before);});
test('preflight detects warning-only protection, renamed response refs, public output and open intake',()=>{const h=harness();h.run();const master=h.books.get(h.state().ids.pointsMaster),form=h.forms.get(h.state().ids.attendanceForm);master.getSheetByName('_Raw_Ingest').protected='warning';master.getSheetByName('Roster').formulas[0].push("=INDEX('Observed response 8'!C:C,2)");master.getSheetByName('Website Staging').values=[[],['Private person']];form.accepting=true;const failures=clone(h.ctx.asmeSanityReport_(master)).filter(r=>!r.pass).map(r=>r.test);for(const label of ['Protected raw proxy uses exact Config pointer','Roster and Point Log use only stable proxy references','Public member output suppressed','Form intake closed for pre-flight'])assert.ok(failures.includes(label));});

test('private access cannot hide explicitly shared external viewers',()=>{const h=harness();h.files.get('root').viewers=[{getEmail:()=> 'external@example.com'}];assert.throws(h.run,/private chapter-owned/);assert.equal(h.writes.length,0);});
test('a trashed Control Center gives restore guidance and resumes the same files after restoration',()=>{
  const h=harness(),first=h.run().receipt,saved=h.props.get(h.runKey()),center=h.files.get('center');
  h.writes.length=0;center.trashed=true;
  assert.throws(h.run,/Control Center is in Google Drive Trash.*Restore that same Control Center.*same year/s);
  assert.equal(h.writes.length,0);
  const rejected=h.state();assert.match(rejected.lastError,/Google Drive Trash/);delete rejected.lastError;
  assert.deepEqual(rejected,JSON.parse(saved));
  center.trashed=false;
  assert.deepEqual(clone(h.run().receipt.ids),clone(first.ids));assert.equal(h.writes.length,0);
});
test('a Control Center owned by another account still rejects without writes',()=>{
  const h=harness();h.files.get('center').owner='personal@example.com';
  assert.throws(h.run,/Control Center must be chapter-owned/);assert.equal(h.writes.length,0);
});
test('trashed annual root and copied files name the resource to restore without making replacements',()=>{
  for(const resource of ['root','pointsMaster']){
    const h=harness(),first=h.run().receipt,file=h.files.get(resource==='root'?'root':first.ids[resource]);
    h.writes.length=0;file.trashed=true;
    assert.throws(h.run,error=>error.message.includes('Google Drive Trash: '+file.getName())&&/Restore that same file\/folder.*same year/s.test(error.message));
    assert.equal(h.writes.length,0);
    file.trashed=false;
    assert.deepEqual(clone(h.run().receipt.ids),clone(first.ids));assert.equal(h.writes.length,0);
  }
});
test('copied response schema failure prevents Config updates and settings append',()=>{const h=harness();h.loseCopy();assert.throws(h.run);// Alter the copied Form link result before setup can update Config.
  const source=h.files.get(h.ctx.ASME_ANNUAL_TEMPLATES.attendanceForm),copy=source.makeCopy.bind(source);source.makeCopy=(...args)=>{const f=copy(...args),form=h.forms.get(f.id),link=form.setDestination;form.setDestination=(...a)=>{link(...a);const sheet=h.books.get(a[1]).getSheetByName('Observed response 8');sheet.values[0][0]='Wrong';};return f;};
  assert.throws(h.run,/exact twelve headers/);const state=h.state(),config=h.books.get(state.ids.pointsMaster).getSheetByName('Config');assert.equal(config.getRange('B7').getValue(),'Form Responses 1');assert.equal(h.settings.values.length,1);});
test('preflight cannot certify an unrelated lookalike response tab',()=>{const h=harness();h.run();const master=h.books.get(h.state().ids.pointsMaster);master.getSheetByName('Observed response 8').formUrl=null;const result=clone(h.ctx.asmeSanityReport_(master)).find(r=>r.test==='Response tab and exact twelve headers');assert.equal(result.pass,false);});
test('failed event sync releases manual lock and leaves trigger uninstalled',()=>{const h=harness();const master=h.book('annual-master',[new h.Sheet('Config'),h.events]);master.getSheetByName('Config').getRange('B16').setValue('wrong');master.getSheetByName('Config').getRange('B17').setValue('Event ID');assert.throws(()=>h.ctx.installEventSyncTrigger(),/form missing/);assert.equal(h.triggers.length,0);const f=h.form('wrong');f.destination='annual-master';assert.equal(h.ctx.installEventSyncTrigger().events,1);assert.equal(h.triggers.length,1);h.ctx.installEventSyncTrigger();assert.equal(h.triggers.length,1);});

test('malformed saved receipt rejects without creating copies',()=>{const h=harness();h.loseCopy();assert.throws(h.run);const s=h.state();s.ids='corrupt';h.props.set(h.runKey(),JSON.stringify(s));h.writes.length=0;assert.throws(h.run,/saved receipt is invalid/);assert.equal(h.writes.length,0);});

test('closed-row duplicate IDs and string checkbox values cannot silently corrupt dropdown eligibility',()=>{const h=harness(),rows=clone(h.events.values);rows.push([...rows[1].slice(0,7),false,false]);assert.throws(()=>h.ctx.asmeEventChoices_(rows),/Duplicate event ID/);const invalid=clone(h.events.values);invalid[1][7]='TRUE';assert.throws(()=>h.ctx.asmeEventChoices_(invalid),/boolean checkboxes/);});

test('one-argument UI route and fixed editor entry require no per-year target property',()=>{const h=harness();assert.equal(h.props.has('ANNUAL_PROVISIONER_TARGET'),false);assert.throws(()=>h.ctx.provision2027_2028(),error=>error.message==='Google response tab not uniquely observed yet; retry this same run. No name was guessed.');assert.equal(h.ctx.provision2027_2028().success,true);assert.equal(h.ctx.provisionReviewedAnnualYear('2027-2028').success,true);assert.throws(()=>h.ctx.provisionReviewedAnnualYear('2027-2029'),/consecutive/);assert.equal(h.settings.values.length,2);});

test('execute-as-owner invocation still refuses another active account or unknown active identity',()=>{for(const account of ['personal@example.com','']){const h=harness();h.setActiveActor(account);assert.throws(()=>h.ctx.provisionReviewedAnnualYear('2027-2028'),/chapter/);assert.equal(h.writes.length,0);}});

test('setup screen saves validated chapter links without editing properties manually',()=>{
  const h=harness();
  const cfg=h.ctx.saveAnnualSetupConfig({rootFolderId:'https://drive.google.com/drive/folders/root?usp=sharing',controlCenterId:'https://docs.google.com/spreadsheets/d/center/edit',engagementGoal:'25',workspaceMode:'rehearsal',calendarIcalUrl:'https://example.org/calendar.ics'});
  assert.equal(cfg.rootFolderId,'root');assert.equal(cfg.controlCenterId,'center');assert.equal(cfg.engagementGoal,25);
  assert.equal(h.ctx.getAnnualSetupConfig().rootFolderId,'root');
  const r=h.runSetup('2027-2028',{engagementGoal:25,mode:'rehearsal',rootFolderId:'root',controlCenterId:'center',configRevision:'["root","center","rehearsal","https://example.org/calendar.ics",25]'});assert.equal(r.success,true);assert.equal(Object.keys(r.links).length,5);assert.match(r.readableReceipt,/inactive|FALSE/);
  const before=h.writes.length;h.runSetup('2027-2028',{engagementGoal:25,mode:'rehearsal',rootFolderId:'root',controlCenterId:'center',configRevision:'["root","center","rehearsal","https://example.org/calendar.ics",25]'});assert.equal(h.writes.length,before);
});
test('setup screen rejects wrong account, invalid goal, resource links and headers before saving',()=>{
  const h=harness(),valid={rootFolderId:'root',controlCenterId:'center',engagementGoal:25,workspaceMode:'rehearsal'},before=h.props.get('ANNUAL_PROVISIONER_CONFIG');
  for(const delta of [{engagementGoal:0},{engagementGoal:1.5},{rootFolderId:'https://evil.example/root'},{calendarIcalUrl:'http://example.org/feed'},{rootFolderId:h.ctx.ASME_ANNUAL_TEMPLATES.pointsMaster}])assert.throws(()=>h.ctx.saveAnnualSetupConfig({...valid,...delta}));
  h.settings.values[0][0]='wrong';assert.throws(()=>h.ctx.saveAnnualSetupConfig(valid),/headers/);
  h.setActiveActor('someone@example.com');assert.throws(()=>h.ctx.getAnnualSetupConfig(),/chapter/);assert.throws(()=>h.runSetup('2027-2028',{engagementGoal:25,mode:'rehearsal',rootFolderId:'root',controlCenterId:'center',configRevision:'["root","center","rehearsal","https://example.org/calendar.ics",25]'}),/chapter/);
  assert.equal(h.props.get('ANNUAL_PROVISIONER_CONFIG'),before);assert.equal(h.writes.length,0);
});
function cleanupFixture(){
  const h=harness();h.run();const ids=h.state().ids,master=h.books.get(ids.pointsMaster),form=h.forms.get(ids.attendanceForm),raw=master.getSheetByName('Observed response 8');
  master.getSheetByName('Events').values=[h.eventHeaders,['MOCK-FALL','MOCK welcome',45000,'Fall 2027','2027-28','General Body Meeting',5,true,false]];
  raw.values.push(['timestamp','fictional@example.com','test.9001','Yes','Test','Student','1','Engineering','Initials','', 'MOCK-FALL - MOCK welcome','']);
  form.responses=[{getId:()=> 'response1',getTimestamp:()=>new Date('2027-08-26T12:00:00Z'),getRespondentEmail:()=> 'fictional@example.com',getItemResponses:()=>[{getItem:()=>({getId:()=>11,getTitle:()=> 'Event ID'}),getResponse:()=> 'MOCK-FALL - MOCK welcome'}]}];
  function preview(){const p=h.ctx.asmeTestCleanupPlan_(master);return JSON.stringify({formId:p.formId,responseName:p.responseName,raw:p.raw,formRecords:p.formRecords});}
  h.writes.length=0;return {...h,master,form,raw,preview};
}
test('Clear Test Data archives and verifies both stores, preserves formulas and is repeatable',()=>{
  const h=cleanupFixture(),roster=clone(h.master.getSheetByName('Roster').formulas),result=h.ctx.asmeClearTestData_(h.master,h.preview());
  assert.equal(result.rows,1);assert.equal(result.responses,1);assert.equal(h.form.responses.length,0);assert.equal(h.raw.getLastRow(),1);assert.deepEqual(h.raw.values[0],clone(h.ctx.ASME_RESPONSE_HEADERS));
  assert.deepEqual(h.master.getSheetByName('Roster').formulas,roster);assert.equal(h.master.getSheetByName('Config').getRange('B5').getValue(),'TESTING');assert.equal(h.form.accepting,false);
  const archive=h.master.getSheetByName(result.archive);assert.ok(archive.values.some(r=>r[0]==='form_response'&&JSON.parse(r[1]).id==='response1'));assert.ok(archive.values.some(r=>r[0]==='sheet_row'&&JSON.parse(r[1]).values[2]==='test.9001'));
  assert.ok(h.writes.indexOf('archive')<h.writes.indexOf('delete form responses'));
  h.writes.length=0;const again=h.ctx.asmeClearTestData_(h.master,h.preview());assert.equal(again.archive,null);assert.equal(h.writes.length,0);
});
test('cleanup refuses LIVE, open intake/events, unmarked attendance, formulas and stale preview',()=>{
  for(const kind of ['live','intake','event','raw','form','formula','changed']){
    const h=cleanupFixture(),preview=h.preview();
    if(kind==='live')h.master.getSheetByName('Config').values[4][1]='LIVE';
    if(kind==='intake')h.form.accepting=true;
    if(kind==='event')h.master.getSheetByName('Events').values[1][8]=true;
    if(kind==='raw')h.raw.values[1][10]='Real meeting';
    if(kind==='form')h.form.responses[0].getItemResponses=()=>[{getItem:()=>({getId:()=>11,getTitle:()=> 'Event ID'}),getResponse:()=> 'Real meeting'}];
    if(kind==='formula')h.raw.formulas[1]=['=1'];
    if(kind==='changed')h.raw.values[1][11]='changed after preview';
    assert.throws(()=>h.ctx.asmeClearTestData_(h.master,preview));assert.equal(h.form.responses.length,1);assert.equal(h.raw.getLastRow(),2);assert.equal(h.writes.length,0);
  }
});
test('cleanup preserves originals if backup readback fails',()=>{
  const h=cleanupFixture(),insert=h.master.insertSheet;h.master.insertSheet=name=>{const sheet=insert(name),range=sheet.getRange.bind(sheet);sheet.getRange=(...args)=>{const r=range(...args);r.getValues=()=>[['corrupt backup']];return r;};return sheet;};
  assert.throws(()=>h.ctx.asmeClearTestData_(h.master,h.preview()),/Backup verification failed/);assert.equal(h.form.responses.length,1);assert.equal(h.raw.getLastRow(),2);assert.ok(!h.writes.includes('delete form responses'));
});
test('cleanup preserves an unseen Form response committed during reviewed ID deletion',()=>{
  const h=cleanupFixture(),preview=h.preview(),original=h.form.responses[0],remove=h.form.deleteResponse,deleted=[];
  h.form.deleteResponse=id=>{deleted.push(id);remove(id);h.form.responses.push({...original,getId:()=> 'late-response'});};
  assert.throws(()=>h.ctx.asmeClearTestData_(h.master,preview),/Attendance changed during Form cleanup/);
  assert.deepEqual(deleted,['response1']);assert.equal(h.form.responses[0].getId(),'late-response');
  assert.equal(h.raw.getLastRow(),2);assert.equal(h.raw.values[1][2],'test.9001');
});
test('cleanup rechecks raw rows and safe bindings after Form deletion before clearing the sheet',()=>{
  for(const kind of ['row','live','intake','destination']){
    const h=cleanupFixture(),preview=h.preview(),remove=h.form.deleteResponse;
    h.form.deleteResponse=id=>{remove(id);
      if(kind==='row')h.raw.values[1][11]='changed during deletion';
      if(kind==='live')h.master.getSheetByName('Config').getRange('B5').setValue('LIVE');
      if(kind==='intake')h.form.accepting=true;
      if(kind==='destination')h.form.destination='other-workbook';
    };
    assert.throws(()=>h.ctx.asmeClearTestData_(h.master,preview));
    assert.equal(h.raw.getLastRow(),2,kind);assert.equal(h.raw.values[1][2],'test.9001',kind);
    assert.ok([...h.master.sheets.keys()].some(name=>name.startsWith('_Test_Backup_')),kind);
  }
});
test('canceling cleanup confirmation changes neither store',()=>{
  const h=cleanupFixture();h.ctx.SpreadsheetApp.getActiveSpreadsheet=()=>h.master;h.ctx.SpreadsheetApp.getUi=()=>({Button:{YES:'yes'},ButtonSet:{YES_NO:'yesno'},alert:()=> 'no'});
  assert.equal(h.ctx.clearTestData().cleared,false);assert.equal(h.writes.length,0);assert.equal(h.form.responses.length,1);
});

test('annual questions use a per-year goal, preserve saved chapter defaults and resume with saved goal',()=>{
 const h=harness(),before=h.props.get('ANNUAL_PROVISIONER_CONFIG');
 const r=h.runSetup('2027-2028',{engagementGoal:'50',mode:'rehearsal',rootFolderId:'root',controlCenterId:'center',configRevision:'["root","center","rehearsal","https://example.org/calendar.ics",25]'});
 assert.equal(r.receipt,undefined);assert.equal(JSON.parse(r.hubHandoff).year,'2027-2028');assert.equal(Object.keys(JSON.parse(r.hubHandoff).links).length,7);
 assert.match(JSON.parse(r.hubHandoff).mock.controlCenterUrl,/center/);
 assert.equal(h.state().plan.engagementGoal,50);assert.equal(h.props.get('ANNUAL_PROVISIONER_CONFIG'),before);
 assert.equal(h.ctx.getAnnualSetupConfig('2027-2028').engagementGoal,50);assert.equal(h.ctx.getAnnualSetupConfig('2027-2028').existing,true);
 const writes=h.writes.length;h.runSetup('2027-2028',{engagementGoal:50,mode:'rehearsal',rootFolderId:'root',controlCenterId:'center',configRevision:'["root","center","rehearsal","https://example.org/calendar.ics",25]'});assert.equal(h.writes.length,writes);
 assert.throws(()=>h.runSetup('2027-2028',{engagementGoal:51,mode:'rehearsal',rootFolderId:'root',controlCenterId:'center',configRevision:'["root","center","rehearsal","https://example.org/calendar.ics",25]'}),/configuration changed/);assert.equal(h.writes.length,writes);
});

test('goal suggestion reads last year without copying old annual destinations or approving the goal',()=>{
 const h=harness();const previous=Array(20).fill('');previous[0]='2026-2027';previous[2]=65;previous[3]='old-export';h.settings.values.push(previous);
 const before=h.props.get('ANNUAL_PROVISIONER_CONFIG'),view=h.ctx.getAnnualSetupConfig('2027-2028');
 assert.equal(view.engagementGoal,65);assert.match(view.goalSource,/2026-2027/);assert.equal(view.existing,false);assert.equal(h.writes.length,0);assert.equal(h.props.get('ANNUAL_PROVISIONER_CONFIG'),before);
 const result=h.runSetup('2027-2028',{engagementGoal:70,mode:'rehearsal',rootFolderId:'root',controlCenterId:'center',configRevision:'["root","center","rehearsal","https://example.org/calendar.ics",25]'});assert.notEqual(result.links.pointsExport,'old-export');assert.equal(h.state().plan.engagementGoal,70);
});

test('real handoff cannot silently reuse Practice or unconfirmed workspace; invalid goal writes nothing',()=>{
 for(const answers of [{engagementGoal:25,mode:'production',rootFolderId:'root',controlCenterId:'center',configRevision:'["root","center","rehearsal","https://example.org/calendar.ics",25]'},{engagementGoal:0,mode:'rehearsal',rootFolderId:'root',controlCenterId:'center',configRevision:'["root","center","rehearsal","https://example.org/calendar.ics",25]'},{engagementGoal:1.5,mode:'rehearsal',rootFolderId:'root',controlCenterId:'center',configRevision:'["root","center","rehearsal","https://example.org/calendar.ics",25]'}]){
  const h=harness();assert.throws(()=>h.runSetup('2027-2028',answers));assert.equal(h.writes.length,0);
 }
 const h=harness();const cfg=JSON.parse(h.props.get('ANNUAL_PROVISIONER_CONFIG'));delete cfg.workspaceMode;h.props.set('ANNUAL_PROVISIONER_CONFIG',JSON.stringify(cfg));
 assert.throws(()=>h.runSetup('2027-2028',{engagementGoal:25,mode:'rehearsal',rootFolderId:'root',controlCenterId:'center',configRevision:'["root","center","rehearsal","https://example.org/calendar.ics",25]'}),/confirm/);assert.equal(h.writes.length,0);
});

test('workspace purpose is immutable and stored on created runs',()=>{
 const h=harness(),cfg=h.ctx.getAnnualSetupConfig();h.runSetup('2027-2028',{...cfg,mode:'rehearsal'});
 assert.equal(h.state().workspaceMode,'rehearsal');const writes=h.writes.length;
 assert.throws(()=>h.ctx.saveAnnualSetupConfig({...cfg,workspaceMode:'production'}),/Do not change/);assert.equal(h.writes.length,writes);
 // Even external property changes cannot reclassify the previously created files.
 h.props.set('ANNUAL_PROVISIONER_CONFIG',JSON.stringify({...JSON.parse(h.props.get('ANNUAL_PROVISIONER_CONFIG')),workspaceMode:'production'}));
 const changed=h.ctx.getAnnualSetupConfig();assert.throws(()=>h.runSetup('2027-2028',{...changed,mode:'production'}),/Existing files/);assert.equal(h.writes.length,writes);
});

test('stale page refuses changed workspace or calendar before writing files',()=>{
 for(const change of [{rootFolderId:'other-root'},{calendarIcalUrl:'https://example.org/new.ics'}]) {
  const h=harness(),shown=h.ctx.getAnnualSetupConfig();h.props.set('ANNUAL_PROVISIONER_CONFIG',JSON.stringify({...JSON.parse(h.props.get('ANNUAL_PROVISIONER_CONFIG')),...change}));
  assert.throws(()=>h.runSetup('2027-2028',{...shown,mode:'rehearsal'}),/confirm/);assert.equal(h.writes.length,0);
 }
});

test('old workspace with existing unclassified files cannot be relabeled real',()=>{
 const h=harness();h.run();const cfg=JSON.parse(h.props.get('ANNUAL_PROVISIONER_CONFIG'));delete cfg.workspaceMode;h.props.set('ANNUAL_PROVISIONER_CONFIG',JSON.stringify(cfg));
 assert.throws(()=>h.ctx.saveAnnualSetupConfig({...cfg,workspaceMode:'production'}),/unconfirmed workspace/);
});

test('Real and Practice cannot share either root or settings sheet even after changing current config',()=>{
 const h=harness();h.runSetup('2027-2028',{...h.ctx.getAnnualSetupConfig(),mode:'rehearsal'});
 new h.File('newroot','New root',null,true);new h.File('newcenter','New center',null);h.book('newcenter',[new h.Sheet('Hub_Settings_Public',[h.ctx.ASME_ANNUAL_HEADERS])]);
 const cfg=JSON.parse(h.props.get('ANNUAL_PROVISIONER_CONFIG')),before=h.props.get('ANNUAL_PROVISIONER_CONFIG');
 for(const change of [{rootFolderId:'newroot'},{controlCenterId:'newcenter'}]) assert.throws(()=>h.ctx.saveAnnualSetupConfig({...cfg,...change,workspaceMode:'production'}),/separate folder and settings sheet/);
 assert.equal(h.props.get('ANNUAL_PROVISIONER_CONFIG'),before);
 h.ctx.saveAnnualSetupConfig({...cfg,rootFolderId:'newroot',controlCenterId:'newcenter',workspaceMode:'production'});
 for(const change of [{rootFolderId:'root'},{controlCenterId:'center'}]) assert.throws(()=>h.ctx.saveAnnualSetupConfig({...cfg,rootFolderId:'newroot',controlCenterId:'newcenter',...change,workspaceMode:'production'}),/separate folder and settings sheet/);
});

test('delayed Google response binding completes initial setup once and retry reuses the same five files',()=>{const h=harness();h.delayObservation(12);const first=h.run();assert.equal(first.success,true);assert.equal(h.writes.filter(x=>x==='copy').length,5);assert.equal(h.settings.values.length,2);assert.equal(h.books.get(first.receipt.ids.pointsMaster).getSheetByName('Config').getRange('B7').getValue(),'Observed response 8');const writes=h.writes.length;assert.equal(h.run().receipt.ids.pointsMaster,first.receipt.ids.pointsMaster);assert.equal(h.writes.length,writes);});


test('annual setup observes a fresh spreadsheet handle when the original sheet list stays stale',()=>{
  const h=harness(),open=h.ctx.SpreadsheetApp.openById;
  let masterOpens=0,staleReads=0;
  h.ctx.SpreadsheetApp.openById=id=>{
    const book=open(id);
    if(id!==JSON.parse(h.props.get(h.runKey())||'{}').ids?.pointsMaster)return book;
    masterOpens++;
    // The first handle was acquired before Google attached the response tab.
    // It never refreshes; later opens return current metadata for the same ID.
    if(masterOpens===1)return {...book,getSheets(){staleReads++;return [];}};
    return book;
  };
  const result=h.run();
  assert.equal(result.success,true);
  assert.ok(masterOpens>=2,'binding observation must reopen the same master');
  assert.equal(staleReads,0,'the stale initial sheet list must never be polled');
  assert.equal(h.writes.filter(x=>x==='copy').length,5);
  assert.equal(h.writes.filter(x=>x==='destination').length,1);
  assert.equal(h.settings.values.length,2);
  assert.equal(h.books.get(result.receipt.ids.pointsMaster).getSheetByName('Config').getRange('B7').getValue(),'Observed response 8');
  const writes=h.writes.length;
  assert.equal(h.run().receipt.ids.pointsMaster,result.receipt.ids.pointsMaster);
  assert.equal(h.writes.length,writes);
});


test('new destination returns pending before configuration and fresh execution resumes same artifacts',()=>{
 const h=harness();
 assert.throws(()=>h.runOnce(),error=>error.message==='Google response tab not uniquely observed yet; retry this same run. No name was guessed.');
 const pending=h.state(),master=h.books.get(pending.ids.pointsMaster),form=h.forms.get(pending.ids.attendanceForm);
 assert.equal(pending.phase,'new');assert.equal(form.destination,master.getId());assert.equal(form.accepting,false);
 assert.equal(master.getSheetByName('Config').getRange('B7').getValue(),'Form Responses 1');assert.equal(h.settings.values.length,1);
 assert.equal(h.writes.filter(x=>x==='copy').length,5);assert.equal(h.writes.filter(x=>x==='destination').length,1);
 const result=h.runOnce();
 assert.equal(result.success,true);assert.equal(result.receipt.ids.pointsMaster,pending.ids.pointsMaster);
 assert.equal(master.getSheetByName('Config').getRange('B7').getValue(),'Observed response 8');
 assert.equal(h.writes.filter(x=>x==='copy').length,5);assert.equal(h.writes.filter(x=>x==='destination').length,1);assert.equal(h.settings.values.length,2);
 assert.equal(form.accepting,false);assert.equal(h.settings.values[1][10],false);assert.equal(h.settings.values[1][11],false);
 const before=h.writes.length;h.runOnce();assert.equal(h.writes.length,before);
});
