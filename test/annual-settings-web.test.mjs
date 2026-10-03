import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function fixture() {
  const configs = {ANNUAL_COPY_CONFIG:{intendedOwner:'chapter@example.org'},ANNUAL_SETUP_CONFIG:{schema:1},ANNUAL_SETTINGS_DRAFT_CONFIG:{schema:1,year:'2027-2028',controlCenterId:'configured-center',ledgerId:'configured-ledger',draftTimestamp:'2026-10-01T00:00:00Z',values:{display_label:'Private configured draft'}}};
  const stored = new Map(), calls = [], actor = {active:'chapter@example.org',effective:'chapter@example.org'};
  const props = {getProperty:key=>JSON.stringify(configs[key])};
  const user = {getProperty:key=>stored.get(key),setProperty:(key,value)=>stored.set(key,value),deleteProperty:key=>stored.delete(key)};
  const ctx = vm.createContext({ScriptApp:{AuthMode:{FULL:'FULL'},requireAllScopes:()=>calls.push('scopes')},Session:{getActiveUser:()=>({getEmail:()=>actor.active}),getEffectiveUser:()=>({getEmail:()=>actor.effective})},PropertiesService:{getScriptProperties:()=>props,getUserProperties:()=>user},Utilities:{getUuid:()=> 'private-ticket',newBlob:text=>({getBytes:()=>Buffer.from(text)})},HtmlService:{createHtmlOutputFromFile:name=>({setTitle:()=>name})},annualSettingsDraftIO_:(copy,setup,draft)=>{calls.push({draft});return {};},AnnualSettingsDraftEngine:{run:(handoff,draft,io,approval)=>{calls.push({handoff,draft,approval});if(handoff.links.wrong)throw Error('Handoff mismatch');if(approval&&approval.digest!=='verified-digest')throw Error('Stale preview');return approval?{status:'draft-readback-matched',year:draft.year,activation:false}:{digest:'verified-digest',row:[false,false],year:draft.year};}}});
  vm.runInContext(readFileSync(new URL('../integrations/apps-script/AnnualSettingsWebApp.gs.example',import.meta.url),'utf8'),ctx);
  const input={schema:1,type:'asme-annual-settings-input',handoff:{schema:1,type:'asme-annual-link-handoff',year:'2027-2028',links:{pointsMaster:'configured-copy'}},values:{display_label:'2027–2028'}};
  return {ctx,configs,stored,calls,actor,input,preview:()=>ctx.previewAnnualSettingsWeb(JSON.stringify(input)),save:()=>ctx.saveAnnualSettingsWeb('private-ticket',true,'Reviewed public links')};
}
test('web preview uses private targets/timestamp and never changes script config',()=>{
  const f=fixture(), before=JSON.stringify(f.configs); const result=f.preview();
  assert.equal(result.ticket,'private-ticket'); assert.equal(JSON.stringify(f.configs),before);
  const run=f.calls.find(x=>x.handoff);
  assert.equal(run.draft.controlCenterId,'configured-center');assert.equal(run.draft.ledgerId,'configured-ledger');assert.equal(run.draft.draftTimestamp,f.configs.ANNUAL_SETTINGS_DRAFT_CONFIG.draftTimestamp);assert.equal(run.approval,null);
  assert.deepEqual(JSON.parse(JSON.stringify(run.draft.values)),f.input.values);
});
test('save reruns engine with exact preview approval and permits same-row reconciliation',()=>{
  const f=fixture();f.preview();assert.equal(f.save().status,'draft-readback-matched');assert.equal(f.save().activation,false);
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls.filter(x=>x.approval).at(-1).approval)),{year:'2027-2028',digest:'verified-digest',publicLinkReview:true,reviewNote:'Reviewed public links'});
});
test('wrong actor, blank identity, execute-as-owner mismatch stop before IO',()=>{
  for(const actor of [{active:'other@example.org',effective:'other@example.org'},{active:'',effective:'chapter@example.org'},{active:'other@example.org',effective:'chapter@example.org'}]){
    const f=fixture();Object.assign(f.actor,actor);assert.throws(f.preview,/chapter account/);assert.equal(f.calls.some(x=>x.draft),false);
  }
});
test('import rejects wrong schema/year, unknown fields and oversized files',()=>{
  for(const change of [x=>{x.schema=2;},x=>{x.handoff.year='2028-2029';},x=>{x.controlCenterId='attacker';}]){const f=fixture();change(f.input);assert.throws(f.preview,/save file/);assert.equal(f.stored.size,0);}
  const f=fixture();assert.throws(()=>f.ctx.previewAnnualSettingsWeb(' '.repeat(16001)),/16 KB/);
});
test('failed import clears previous authorization to save',()=>{
  const f=fixture();f.preview();f.input.handoff.links.wrong=true;assert.throws(f.preview,/Handoff mismatch/);assert.throws(f.save,/verify.*first/);
});
test('save requires server preview, exact ticket and public review',()=>{
  const f=fixture();assert.throws(f.save,/first/);f.preview();
  assert.throws(()=>f.ctx.saveAnnualSettingsWeb('wrong',true,'Reviewed'),/expired or changed/);
  assert.throws(()=>f.ctx.saveAnnualSettingsWeb('private-ticket',false,'Reviewed'),/public row/);
  assert.throws(()=>f.ctx.saveAnnualSettingsWeb('private-ticket',true,' '),/public row/);
});
test('expired preview and changed private config block a save',()=>{
  const f=fixture();f.preview();const saved=JSON.parse(f.stored.get('ANNUAL_WEB_PREVIEW'));saved.createdAt=0;f.stored.set('ANNUAL_WEB_PREVIEW',JSON.stringify(saved));assert.throws(f.save,/expired/);
  const g=fixture();g.preview();g.configs.ANNUAL_SETTINGS_DRAFT_CONFIG.controlCenterId='changed';assert.throws(g.save,/configuration changed/);
});
test('deployment defaults to chapter self and accessing-user authority with existing scopes',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../integrations/apps-script/AnnualSettingsWebApp.appsscript.json.example',import.meta.url),'utf8'));
  const existing=JSON.parse(readFileSync(new URL('../integrations/apps-script/AnnualSetupRunner.appsscript.json.example',import.meta.url),'utf8'));
  assert.deepEqual(manifest.webapp,{access:'MYSELF',executeAs:'USER_ACCESSING'});assert.deepEqual(manifest.oauthScopes,existing.oauthScopes);
});
function manualFixture(){
 const f=fixture(),id='privateManualRulesFile1234567890';
 const rules={schema:1,year:'2027-2028',intendedOwner:'chapter@example.org',annualRootId:'privateAnnualRoot1234567890',excludedSourceIds:[],points:{term:'Fall 2027'},draft:f.configs.ANNUAL_SETTINGS_DRAFT_CONFIG};
 f.configs.ANNUAL_MANUAL_SETTINGS_CONFIG={schema:1,intendedOwner:rules.intendedOwner,rulesFileId:id};
 const metadata={mimeType:'application/json',owners:[{emailAddress:rules.intendedOwner}],capabilities:{canEdit:true},permissions:[{type:'user',emailAddress:rules.intendedOwner}]};
 f.ctx.annualCopyIO_=()=>({metadata:()=>metadata});f.ctx.DriveApp={getFileById:()=>({getSize:()=>JSON.stringify(rules).length,getBlob:()=>({getDataAsString:()=>JSON.stringify(rules)})})};
 let locks=0,verifications=0;const manualIO={lock:fn=>{locks++;return fn();}};
 f.ctx.manualAnnualVerificationIO_=()=>manualIO;
 f.ctx.ManualAnnualVerificationEngine={verify:(handoff,c)=>{verifications++;const snapshot={...c,draft:{...c.draft}};delete snapshot.handoff;delete snapshot.draft.manualVerificationDigest;return {handoff,digest:JSON.stringify(snapshot)};}};
 f.ctx.manualAnnualDraftIO_=(c,props,digest)=>({lock:manualIO.lock,verifiedHandoff:()=>{const fresh=f.ctx.ManualAnnualVerificationEngine.verify(c.handoff,c);if(fresh.digest!==digest)throw Error('Annual resources changed');return fresh.handoff;}});
 const run=f.ctx.AnnualSettingsDraftEngine.run;f.ctx.AnnualSettingsDraftEngine.run=(handoff,draft,io,approval)=>{if(io.verifiedHandoff)io.verifiedHandoff();return run(handoff,draft,io,approval);};
 return {...f,rules,metadata,get locks(){return locks;},get verifications(){return verifications;}};
}
test('manual web mode reads private rules and re-verifies snapshot under lock for save',()=>{
 const f=manualFixture();f.preview();assert.equal(f.locks,1);assert.equal(f.verifications,1);assert.equal(f.save().status,'draft-readback-matched');assert.equal(f.verifications,2);
 const raw=JSON.parse(f.stored.get('ANNUAL_WEB_PREVIEW'));assert.equal(raw.manual,true);assert.ok(raw.draft.manualVerificationDigest);assert.equal(f.calls.some(c=>c.draft&&!c.handoff),false);
 f.rules.points.term='Changed';assert.throws(f.save,/resources changed/);
});
test('manual rules file must remain private and chapter-owned; wrong actor stops reading it',()=>{
 for(const change of [f=>{f.metadata.permissions.push({type:'anyone'});},f=>{f.metadata.owners[0].emailAddress='other@example.org';},f=>{f.actor.active='other@example.org';}]){const f=manualFixture();change(f);assert.throws(f.preview,/chapter/);assert.equal(f.calls.some(c=>c.handoff),false);}
});
