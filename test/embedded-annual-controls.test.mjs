import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const dir=new URL('../integrations/apps-script/transition-simple/',import.meta.url);
const html=readFileSync(new URL('EmbeddedAnnualControls.html',dir),'utf8');
const server=readFileSync(new URL('ProvisionerWeb.gs',dir),'utf8');
const binding={year:'2029-2030',mode:'rehearsal',runKey:'saved-run',configRevision:'revision'};
const nonce='ab'.repeat(32),origin='https://asme-osu.github.io',channel='asme-annual-controls-v1';
const fileIds=Object.fromEntries(['pointsMaster','attendanceForm','pointsExport','budgetTracker','budgetExport','controlCenter'].map(k=>[k,'saved_'+k]));
const config={workspaceMode:binding.mode,runKey:binding.runKey,configRevision:binding.configRevision,fileIds};
function report(retirement=false){return {version:1,year:binding.year,runKey:binding.runKey,readScope:retirement?'retirement':'staging',fileIds:{...fileIds},checks:[{id:'event_updates',status:retirement?'action_needed':'passed',label:'Automatic updates',detail:'Observed'}],eventUpdates:{status:'installed',triggerUid:'only-managed-trigger'},limits:[]};}
function page(overrides={}){
 const calls=[],messages=[],listeners={};
 const elements=Object.fromEntries(Object.entries({year:binding.year,mode:binding.mode,'run-key':binding.runKey,'config-revision':binding.configRevision,nonce,status:''}).map(([k,value])=>[k,{value,textContent:''}]));
 const top={postMessage:(data,target)=>messages.push({data:JSON.parse(JSON.stringify(data)),target})};
 const window={top,addEventListener:(name,fn)=>listeners[name]=fn};
 const defaults={getAnnualSetupConfig:()=>config,checkAnnualReadiness:input=>report(input.action==='stop'),enableAnnualEventUpdates:()=>report(),stopAnnualEventUpdates:()=>({...report(true),checks:[{id:'event_updates',status:'passed',label:'Automatic updates',detail:'Stopped'}],eventUpdates:{status:'not_connected'}})};
 const makeRunner=()=>{const runner={};let proxy;proxy=new Proxy({}, {get:(_,key)=>{
  if(key==='withSuccessHandler')return fn=>{runner.success=fn;return proxy;};
  if(key==='withFailureHandler')return fn=>{runner.failure=fn;return proxy;};
  return (...args)=>{calls.push({name:key,args:JSON.parse(JSON.stringify(args))});try{const result=(overrides[key]||defaults[key])(...args);runner.success?.(result);}catch(error){runner.failure?.(error);}};
 }});return proxy;};
 // Every google.script.run property access is a fresh asynchronous-call builder.
 const google={script:{}};Object.defineProperty(google.script,'run',{get:makeRunner});
 vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{window,document:{getElementById:id=>elements[id]},google});
 const send=(patch={},eventPatch={})=>listeners.message({source:top,origin,data:{...binding,channel,nonce,type:'run',action:'connect',...patch},...eventPatch});
 return {calls,messages,elements,send,top};
}
test('embedded page loads only configuration and waits for a trusted explicit command',()=>{
 const p=page();assert.deepEqual(p.calls.map(c=>c.name),['getAnnualSetupConfig']);assert.equal(p.messages[0].data.type,'ready');assert.equal(p.messages[0].target,origin);
 assert.doesNotMatch(html,/<form|saveAnnualSetupConfig|runAnnualSetup|<button/i);
});
test('spoofed origins, sources, nonces, years, actions and confirmations cannot dispatch',()=>{
 const p=page();
 for(const patch of [{nonce:'wrong'},{year:'2030-2031'},{mode:'production'},{runKey:'other'},{configRevision:'old'},{channel:'other'},{type:'result'},{action:'save'},{action:'stop'},{action:'stop',confirmStop:'true'}])p.send(patch);
 p.send({}, {origin:'https://evil.example'});p.send({}, {source:{}});
 assert.deepEqual(p.calls.map(c=>c.name),['getAnnualSetupConfig']);
});
test('connect first checks the exact annual binding, then installs once and returns its report',()=>{
 const p=page();p.send();p.send();assert.deepEqual(p.calls.map(c=>c.name),['getAnnualSetupConfig','checkAnnualReadiness','enableAnnualEventUpdates']);
 assert.deepEqual(p.calls[1].args[0],{year:binding.year,mode:binding.mode,expectedRunKey:binding.runKey,expectedConfigRevision:binding.configRevision});
 assert.deepEqual(p.calls[2].args,p.calls[1].args);assert.equal(p.messages.at(-1).data.type,'result');assert.equal(p.messages.at(-1).data.nonce,nonce);
});
test('stop needs explicit confirmation, a retirement check, and forwards only confirmed stop',()=>{
 const p=page();p.send({action:'stop',confirmStop:true});assert.deepEqual(p.calls.map(c=>c.name),['getAnnualSetupConfig','checkAnnualReadiness','stopAnnualEventUpdates']);
 assert.equal(p.calls[1].args[0].action,'stop');assert.equal(p.calls[2].args[0].confirmStop,true);assert.equal(p.messages.at(-1).data.report.readScope,'retirement');
});
test('already-stopped retirement returns its checked report without another deletion',()=>{
 const p=page({checkAnnualReadiness:()=>({...report(true),checks:[{id:'event_updates',status:'passed',label:'Updates',detail:'Stopped'}],eventUpdates:{status:'not_connected'}})});p.send({action:'stop',confirmStop:true});
 assert.deepEqual(p.calls.map(c=>c.name),['getAnnualSetupConfig','checkAnnualReadiness']);assert.equal(p.messages.at(-1).data.type,'result');
});
test('wrong configuration or preflight file identities prevent trigger mutation',()=>{
 const changed=page({getAnnualSetupConfig:()=>({...config,runKey:'other'})});changed.send();assert.equal(changed.messages.at(-1).data.type,'error');assert.equal(changed.calls.length,1);
 for(const broken of [{...report(),year:'other'},{...report(),readScope:'retirement'},{...report(),fileIds:{...fileIds,attendanceForm:'wrong'}},{...report(),eventUpdates:null}]){
  const p=page({checkAnnualReadiness:()=>broken});p.send();assert.equal(p.calls.length,2);assert.equal(p.messages.at(-1).data.type,'error');
 }
});
test('Google mutation failures are reported without automatic retry or success claims',()=>{
 const p=page({enableAnnualEventUpdates:()=>{throw Error('Google denied access');}});p.send();p.send();assert.equal(p.calls.length,3);assert.equal(p.messages.at(-1).data.type,'error');assert.match(p.messages.at(-1).data.message,/denied/);
});
function serverPage(){
 const outputs=[];const context={asmeChapterActor_:()=>{},Session:{getActiveUser:()=>({getEmail:()=> 'asmeohiostate@gmail.com'})},asmeAnnualYear_:year=>{if(!/^2029-2030$/.test(year))throw Error('Invalid year');},HtmlService:{XFrameOptionsMode:{ALLOWALL:'allowall'},createHtmlOutputFromFile:name=>({getContent:()=>readFileSync(new URL(name+'.html',dir),'utf8')}),createHtmlOutput:content=>{const output={content,setTitle(){return this;},setXFrameOptionsMode(value){this.frame=value;return this;}};outputs.push(output);return output;}}};vm.createContext(context);vm.runInContext(server,context);return {get:parameter=>context.doGet({parameter}),outputs,context};
}
test('only complete explicitly bound embedded requests receive frame permission',()=>{
 const p=serverPage();const input={year:binding.year,mode:binding.mode,expectedRunKey:binding.runKey,expectedConfigRevision:binding.configRevision,embed:'hub',nonce};
 assert.equal(p.get(input).frame,'allowall');assert.equal(p.get({...input,embed:undefined}).frame,undefined);
 for(const patch of [{year:''},{mode:''},{mode:'other'},{expectedRunKey:''},{expectedConfigRevision:''},{nonce:'short'},{nonce:'AB'.repeat(32)},{embed:'other'}])assert.throws(()=>p.get({...input,...patch}));
 p.context.Session.getActiveUser=()=>({getEmail:()=> 'personal@example.test'});assert.throws(()=>p.get(input),/chapter/);
});
test('embedded context values are escaped as attributes without placeholder or replacement expansion',()=>{
 const p=serverPage();const key='run"><script>$&';const out=p.get({year:binding.year,mode:binding.mode,expectedRunKey:key,expectedConfigRevision:'revision"&',embed:'hub',nonce});
 assert.match(out.content,/value="run&quot;&gt;&lt;script&gt;\$&amp;"/);assert.match(out.content,/value="revision&quot;&amp;"/);assert.doesNotMatch(out.content,/__EXPECTED_|__YEAR__|__NONCE__/);
});
