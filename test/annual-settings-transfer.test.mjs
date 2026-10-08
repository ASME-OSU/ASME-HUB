import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {annualSettingsTransferUrl} from '../assets/js/annual-settings-input.js';
const service='https://script.google.com/macros/s/chapter_deployment/exec';
const input={schema:1,type:'asme-annual-settings-input',handoff:{year:'2027-2028'},values:{status_note:'Reviewed & ready ✓'}};
function page(hash){
 const elements=new Map(),calls=[];
 const element=()=>({disabled:true,hidden:true,files:[],value:'',checked:false,textContent:'',events:{},children:[],addEventListener(name,fn){this.events[name]=fn;},replaceChildren(){this.children=[];},append(child){this.children.push(child);}});
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 const chain={withSuccessHandler(fn){this.success=fn;return this;},withFailureHandler(fn){this.failure=fn;return this;},previewAnnualSettingsWeb(source){calls.push({type:'preview',source});this.success({ticket:'reviewed',preview:{headers:['is_active'],row:[false],year:'2027-2028',currentYear:'2026-2027'}});},saveAnnualSettingsWeb(...args){calls.push({type:'save',args});}};
 const ctx=vm.createContext({document:{getElementById:get,createElement:element},TextEncoder,google:{script:{url:{getLocation:fn=>fn({hash})},run:chain}}});
 const script=readFileSync(new URL('../integrations/apps-script/AnnualSettingsPage.html.example',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];vm.runInContext(script,ctx);
 return {get,calls,chain};
}
test('direct transfer contains exact reviewed draft in fragment, no query or authorization',()=>{
 const url=new URL(annualSettingsTransferUrl(service,input));assert.equal(url.search,'');assert.deepEqual(JSON.parse(decodeURIComponent(url.hash.slice(8))),input);
 assert.throws(()=>annualSettingsTransferUrl('https://example.org/exec',input),/not connected/);
 assert.throws(()=>annualSettingsTransferUrl(service,{value:'x'.repeat(16001)}),/16 KB/);
});
test('opening transferred draft never calls verification or save; explicit verify sends exact draft',async()=>{
 const f=page(new URL(annualSettingsTransferUrl(service,input)).hash.slice(1));assert.equal(f.calls.length,0);assert.equal(f.get('verify').disabled,false);assert.equal(f.get('save').disabled,true);
 await f.get('verify').events.click();assert.deepEqual(f.calls,[{type:'preview',source:JSON.stringify(input)}]);assert.equal(f.get('save').disabled,true);
 f.get('public-review').checked=true;f.get('note').value='Audience reviewed';f.get('note').events.input();assert.equal(f.get('save').disabled,false);
 f.get('save').events.click();assert.equal(f.calls[1].type,'save');assert.deepEqual(f.calls[1].args,['reviewed',true,'Audience reviewed']);
});
test('malformed transfer cannot enable a save; selecting a fallback replaces transferred data',async()=>{
 const bad=page('annual=%broken');assert.equal(bad.calls.length,0);assert.equal(bad.get('verify').disabled,true);assert.match(bad.get('status').textContent,/could not verify/);
 const f=page(new URL(annualSettingsTransferUrl(service,input)).hash.slice(1)),replacement={...input,values:{status_note:'File replacement'}};
 f.get('file').files=[{size:100,text:async()=>JSON.stringify(replacement)}];f.get('file').events.change();await f.get('verify').events.click();assert.equal(f.calls[0].source,JSON.stringify(replacement));
 f.chain.failure({message:'Changed resources'});assert.equal(f.get('save').disabled,true);assert.equal(f.get('review').hidden,true);
});

test('double click cannot dispatch twice; uncertain save keeps exact review for reconciliation',async()=>{
 const f=page(new URL(annualSettingsTransferUrl(service,input)).hash.slice(1));await f.get('verify').events.click();
 f.get('public-review').checked=true;f.get('note').value='Reviewed';f.get('note').events.input();
 f.get('save').events.click();f.get('save').events.click();assert.equal(f.calls.filter(c=>c.type==='save').length,1);
 f.chain.failure({message:'Network response lost'});assert.equal(f.get('save').disabled,false);assert.equal(f.get('review').hidden,false);assert.match(f.get('status').textContent,/uncertain.*reconcile/);
 f.get('save').events.click();assert.equal(f.calls.filter(c=>c.type==='save').length,2);assert.deepEqual(f.calls[1].args,f.calls[2].args);
});
test('expired verification clears approval while keeping retained draft downloadable',async()=>{
 const f=page(new URL(annualSettingsTransferUrl(service,input)).hash.slice(1));await f.get('verify').events.click();
 f.get('public-review').checked=true;f.get('note').value='Reviewed';f.get('note').events.input();f.get('save').events.click();
 f.chain.failure({message:'This verification expired after 30 minutes.'});assert.equal(f.get('save').disabled,true);assert.equal(f.get('download-draft').disabled,false);assert.match(f.get('status').textContent,/Download the retained draft/);
});

test('retired fresh-copy controls stay disabled and cannot dispatch legacy calls while settings save works',async()=>{
 const f=page(new URL(annualSettingsTransferUrl(service,input)).hash.slice(1));
 for(const id of ['setup-destination','setup-workbooks','setup-configure']){assert.equal(f.get(id).disabled,true);f.get(id).events.click();assert.match(f.get('status').textContent,/retired.*AnnualProvisioner/);}
 assert.equal(f.calls.length,0);await f.get('verify').events.click();f.get('public-review').checked=true;f.get('note').value='Reviewed';f.get('note').events.input();assert.equal(f.get('save').disabled,false);f.get('save').events.click();assert.equal(f.calls[1].type,'save');
 for(const id of ['setup-destination','setup-workbooks','setup-configure'])assert.equal(f.get(id).disabled,true);
 const html=readFileSync(new URL('../integrations/apps-script/AnnualSettingsPage.html.example',import.meta.url),'utf8');assert.match(html,/Legacy fresh-copy setup — retired/);assert.match(html,/id="setup-destination" type="button" disabled/);assert.match(html,/id="setup-workbooks" type="button" disabled/);
});
