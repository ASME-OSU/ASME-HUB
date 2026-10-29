import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../integrations/apps-script/transition-simple/ProvisionerPage.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fileIds={pointsMaster:'master',attendanceForm:'form',pointsExport:'pointsExport',budgetTracker:'budget',budgetExport:'budgetExport',controlCenter:'center'};
const config=()=>({rootFolderId:'root',controlCenterId:'center',engagementGoal:20,calendarIcalUrl:'',workspaceMode:'production',configRevision:'revision',runKey:'run-key',fileIds:{...fileIds},existing:true});
function report(retirement=false,updates={status:'not_connected'}){return {version:1,year:'2027-2028',runKey:'run-key',readScope:retirement?'retirement':'staging',fileIds:{...fileIds},checks:[{id:'annual_identity',label:'Annual identity',status:'passed',detail:'Same saved annual files.'}],eventUpdates:updates,ready:false,readyScope:'Connections only; not launch approval.',limits:['Public sharing and launch remain separate.']};}
function page({bound=false,configValue=config()}={}){
  const elements=new Map(),calls=[];
  class Element{
    constructor(id=''){this.id=id;this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.textContent='';this.dataset={};this.children=[];this.events={};}
    addEventListener(type,fn){this.events[type]=fn;}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    focus(){}select(){}click(){return this.events.click?.({preventDefault(){}});}
  }
  const get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
  for(const match of html.matchAll(/id="([^"]+)"/g))get(match[1]);
  get('year').value='2027-2028';get('mode').value='production';get('annualGoal').value='20';get('expected-run-key').value=bound?'run-key':'';get('expected-config-revision').value=bound?'revision':'';
  const document={getElementById:get,querySelectorAll:()=>[...elements.values()],createElement:()=>new Element()};
  function runner(success,failure){return new Proxy({}, {get(_,key){if(key==='withSuccessHandler')return fn=>runner(fn,failure);if(key==='withFailureHandler')return fn=>runner(success,fn);return (...args)=>{calls.push({name:key,args,success,failure});};}});}
  const ctx=vm.createContext({document,google:{script:{run:runner()}},console,URL,Blob,setTimeout,navigator:{clipboard:{writeText:async()=>{}}}});vm.runInContext(script,ctx);
  const initial=calls.shift();assert.equal(initial.name,'getAnnualSetupConfig');initial.success(configValue);
  const next=()=>{assert.ok(calls.length,'expected HTML-service call');return calls.shift();};
  return {get,calls,next,ctx};
}
test('existing completed year exposes Google-hosted controls without invoking Create/reopen',()=>{
  const p=page();assert.equal(p.get('connection-panel').hidden,false);assert.equal(p.calls.length,0);assert.equal(p.get('connection-files').children.length,6);
  p.get('check-readiness').click();const read=p.next();assert.equal(read.name,'checkAnnualReadiness');assert.equal(read.args[0].expectedRunKey,'run-key');read.success(report());assert.match(p.get('event-update-status').textContent,/not connected/);assert.equal(p.calls.length,0);
});
test('Connect uses a fresh matching read before Google HTML-service mutation, then renders installed versus observed',()=>{
  const p=page({bound:true});p.get('connect-updates').click();let call=p.next();assert.equal(call.name,'checkAnnualReadiness');assert.equal(p.calls.length,0);call.success(report());call=p.next();assert.equal(call.name,'enableAnnualEventUpdates');assert.equal(call.args.length,1);assert.equal(call.args[0].expectedConfigRevision,'revision');call.success(report(false,{status:'installed',triggerUid:'uid'}));assert.match(p.get('event-update-status').textContent,/awaits.*Events edit/);
  p.get('check-readiness').click();p.next().success(report(false,{status:'observed',triggerUid:'uid'}));assert.match(p.get('event-update-status').textContent,/edit was observed/);assert.equal(p.calls.length,0);
});
test('mismatched report files or run key blocks Connect before mutation',()=>{
  for(const kind of ['file','run','scope']){const p=page();p.get('connect-updates').click();const read=p.next(),wrong=report();if(kind==='file')wrong.fileIds.pointsMaster='foreign';if(kind==='run')wrong.runKey='other';if(kind==='scope')wrong.readScope='retirement';read.success(wrong);assert.equal(p.calls.length,0);assert.match(p.get('status').textContent,/different files|incomplete report/);}
});
test('year or mode changes during read cannot send a mutation or render stale success',()=>{
  for(const kind of ['year','mode']){const p=page();p.get('connect-updates').click();const read=p.next();p.get(kind).value=kind==='year'?'2028-2029':'rehearsal';read.success(report());assert.equal(p.calls.length,0);assert.match(p.get('status').textContent,/changed/);}
  const p=page();p.get('connect-updates').click();p.next().success(report());const mutation=p.next();p.get('year').value='2028-2029';mutation.success(report(false,{status:'installed',triggerUid:'uid'}));assert.match(p.get('status').textContent,/changed/);assert.doesNotMatch(p.get('status').textContent,/Connection returned/);
});
test('bound page mismatch blocks all file actions before any server mutation',()=>{
  const p=page({bound:true,configValue:{...config(),runKey:'different-run'}});assert.equal(p.get('connection-panel').hidden,true);assert.equal(p.get('create').disabled,true);p.get('connect-updates').click();assert.equal(p.calls.length,0);p.get('config-form').events.submit({preventDefault(){}});assert.equal(p.calls.length,0);assert.match(p.get('status').textContent,/matching Hub link/);
});
test('retirement check and Stop use retirement read, explicit checkbox and saved UID without requiring ready',()=>{
  const p=page();p.get('check-retirement').click();let call=p.next();assert.equal(call.name,'checkAnnualReadiness');assert.equal(call.args[0].action,'stop');call.success(report(true,{status:'installed',triggerUid:'uid'}));assert.equal(p.calls.length,0);
  p.get('stop-updates').click();assert.equal(p.calls.length,0);assert.match(p.get('status').textContent,/confirmation/);
  p.get('confirm-stop').checked=true;p.get('confirm-stop').events.change();p.get('stop-updates').click();call=p.next();assert.equal(call.args[0].action,'stop');call.success(report(true,{status:'installed',triggerUid:'uid'}));call=p.next();assert.equal(call.name,'stopAnnualEventUpdates');assert.equal(call.args[0].confirmStop,true);call.success(report(true));assert.match(p.get('event-update-status').textContent,/No managed automatic updates/);assert.equal(p.get('confirm-stop').checked,false);assert.match(p.get('status').textContent,/stopped/);
});
test('lost stop acknowledgement recovery retains pending identity and finalizes through explicit Stop retry',()=>{
  const p=page();p.get('confirm-stop').checked=true;p.get('stop-updates').click();p.next().success(report(true,{status:'installed',triggerUid:'uid'}));p.next().failure({message:'delete acknowledgement lost'});
  p.get('check-retirement').click();p.next().success(report(true,{status:'not_connected',triggerUid:'uid',stopPending:true}));assert.match(p.get('event-update-status').textContent,/finish recording/);
  p.get('stop-updates').click();p.next().success(report(true,{status:'not_connected',triggerUid:'uid',stopPending:true}));const stop=p.next();assert.equal(stop.name,'stopAnnualEventUpdates');stop.success(report(true));assert.match(p.get('status').textContent,/stopped/);
});
test('missing retirement UID or changed stop confirmation never sends Stop',()=>{
  const p=page();p.get('confirm-stop').checked=true;p.get('stop-updates').click();p.next().success(report(true));assert.equal(p.calls.length,0);
  p.get('stop-updates').click();const read=p.next();p.get('confirm-stop').checked=false;read.success(report(true,{status:'installed',triggerUid:'uid'}));assert.equal(p.calls.length,0);assert.match(p.get('status').textContent,/confirmation changed/);
});
test('loading another year clears connection context and rejects stale config responses',()=>{
  const p=page();p.get('year').value='2028-2029';p.get('year').events.change();assert.equal(p.get('connection-panel').hidden,true);const configRequest=p.next();assert.equal(configRequest.name,'getAnnualSetupConfig');p.get('year').value='2029-2030';configRequest.success(config());assert.equal(p.get('connection-panel').hidden,true);p.get('connect-updates').click();assert.equal(p.calls.length,0);
});
test('Google-hosted doGet escapes optional binding attributes and rejects incomplete or oversized bindings',()=>{
  const server=fs.readFileSync(new URL('../integrations/apps-script/transition-simple/ProvisionerWeb.gs',import.meta.url),'utf8');
  const ctx=vm.createContext({asmeChapterActor_:()=>{},Session:{getActiveUser:()=>({getEmail:()=> 'asmeohiostate@gmail.com'})},asmeAnnualYear_:()=>({}),HtmlService:{createHtmlOutputFromFile:()=>({getContent:()=>html}),createHtmlOutput:content=>({content,setTitle(){return this;}})}});vm.runInContext(server,ctx);
  const injected='run\"><script>bad()</script>&$&';const output=ctx.doGet({parameter:{year:'2027-2028',mode:'production',expectedRunKey:injected,expectedConfigRevision:'revision\"<&'}}).content;
  assert.ok(output.includes('value="run&quot;&gt;&lt;script&gt;bad()&lt;/script&gt;&amp;$&amp;"'));assert.ok(!output.includes(injected));assert.ok(output.includes('value="revision&quot;&lt;&amp;"'));
  assert.throws(()=>ctx.doGet({parameter:{expectedRunKey:'only-key'}}),/incomplete/);assert.throws(()=>ctx.doGet({parameter:{expectedRunKey:'x'.repeat(701),expectedConfigRevision:'revision'}}),/too long/);assert.throws(()=>ctx.doGet({parameter:{expectedRunKey:'key',expectedConfigRevision:'x'.repeat(2001)}}),/too long/);
});
test('configuration bridge exposes trusted copy IDs only for a completed saved run',()=>{
  const server=fs.readFileSync(new URL('../integrations/apps-script/transition-simple/ProvisionerWeb.gs',import.meta.url),'utf8'),cfg=config(),saved={phase:'draft_ready',plan:{rootFolderId:'root',controlCenterId:'center',engagementGoal:20},ids:{...fileIds},runKey:'run-key'};
  const ctx=vm.createContext({asmeChapterActor_:()=>{},Session:{getActiveUser:()=>({getEmail:()=> 'asmeohiostate@gmail.com'})},asmeAnnualYear_:()=>({}),asmeAnnualConfigRevision_:()=> 'revision',asmeAnnualRunKey_:()=> 'run-key',PropertiesService:{getScriptProperties:()=>({getProperty:key=>JSON.stringify(key==='ANNUAL_PROVISIONER_CONFIG'?cfg:saved)})}});vm.runInContext(server,ctx);
  const view=ctx.getAnnualSetupConfig('2027-2028');assert.deepEqual(JSON.parse(JSON.stringify(view.fileIds)),fileIds);saved.phase='new';assert.equal(ctx.getAnnualSetupConfig('2027-2028').fileIds,undefined);
});

test('hosted lost-create acknowledgement retries backend pending reconciliation despite error preflight without creating a second trigger',()=>{
  const p=page(),saved={},triggers=[];let creations=0,lose=true;const props={getProperty:key=>saved[key]||null,setProperty:(key,value)=>{saved[key]=value;}};
  const backend=vm.createContext({Date,JSON,LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},ScriptApp:{EventType:{ON_EDIT:'ON_EDIT'},getProjectTriggers:()=>triggers.slice(),newTrigger:handler=>({forSpreadsheet:ss=>({onEdit:()=>({create:()=>{creations++;triggers.push({getHandlerFunction:()=>handler,getTriggerSourceId:()=>ss.getId(),getEventType:()=> 'ON_EDIT',getUniqueId:()=> 'uid'});if(lose){lose=false;throw Error('create acknowledgement lost');}}})})})},asmeSyncEvents_:()=>{}});
  vm.runInContext(fs.readFileSync(new URL('../integrations/apps-script/transition-simple/AnnualReadiness.gs',import.meta.url),'utf8'),backend);
  const context={properties:props,runKey:'run-key',state:{year:'2027-2028',workspaceMode:'production',ids:{...fileIds},plan:{controlCenterId:'center'},responseTab:'Responses'},master:{getId:()=> 'master'},registryKey:backend.asmeAnnualUpdatesKey_('run-key')};
  backend.asmeAnnualReadinessContext_=()=>context;backend.asmeAnnualReadinessReport_=()=>report(false,backend.asmeAnnualUpdatesStatus_(context));
  function serve(call){try{call.success(backend[call.name](...call.args));}catch(error){call.failure(error);}}
  p.get('connect-updates').click();serve(p.next());const first=p.next();assert.equal(first.name,'enableAnnualEventUpdates');serve(first);assert.equal(creations,1);assert.match(p.get('status').textContent,/acknowledgement lost/);
  p.get('connect-updates').click();const read=p.next();assert.equal(backend.checkAnnualReadiness(read.args[0]).eventUpdates.status,'error');serve(read);const retry=p.next();assert.equal(retry.name,'enableAnnualEventUpdates');serve(retry);assert.equal(creations,1);assert.equal(triggers.length,1);assert.match(p.get('event-update-status').textContent,/installed/);assert.equal(JSON.parse(saved[context.registryKey]).triggerUid,'uid');assert.equal(JSON.parse(saved[context.registryKey]).pending,undefined);
});
