import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function fixture(){
 const c={schema:1,type:'asme-v3-fresh-copy-rehearsal',intendedOwner:'chapter@example.org',excludedTargetIds:['production-points','production-form','production-export','production-budget','production-budget-export'],copy:{namespace:'v3-remediation-fresh',schema:1,year:'2027-2028',intendedOwner:'chapter@example.org',parentId:'new-fixture-parent',ledgerId:'new-fixture-ledger',items:[{name:'V3 Remediation Fresh Copy — 2027–2028 Points',source:{id:'canonical-points'}}]},setup:{year:'2027-2028',reviewQueueFilterReset:{reviewed:true}}};
 const props=new Map([['V3_FRESH_REHEARSAL_REFERENCE',JSON.stringify({schema:1,rulesFileId:'new-private-config-file',intendedOwner:'chapter@example.org'})]]),calls=[];
 const ctx=vm.createContext({ScriptApp:{AuthMode:{FULL:'FULL'},requireAllScopes:()=>{}},annualSettingsWebContext_:()=>({props:{getProperty:key=>props.get(key)},actor:'chapter@example.org',draft:{controlCenterId:'production-center',ledgerId:'production-draft-ledger'},manual:{annualRootId:'production-root'}}),readAnnualManualRules_:()=>c,annualCopyIO_:copy=>({copy}),annualSetupIO_:copy=>({copy,digest:text=>text}),AnnualCopyEngine:{execute:(copy,io,preview)=>{calls.push({copy,preview});return {status:preview?'preview':'created'};}},AnnualSetupEngine:{run:(copy,setup,io,phase,approval)=>{calls.push({copy,setup,phase,approval});return {status:approval?'configured':'review-required',digest:'fixture-digest'};},handoff:()=>({type:'asme-annual-link-handoff'})}});
 vm.runInContext(readFileSync(new URL('../integrations/apps-script/V3FreshCopyRehearsal.gs.example',import.meta.url),'utf8'),ctx);
 return {ctx,c,props,calls};
}
test('native helper keeps production configuration untouched and uses actual separate copy engine',()=>{
 const f=fixture(),before=JSON.stringify([...f.props]);const preview=f.ctx.v3PreviewFreshCopies();assert.equal(preview.preview.status,'preview');assert.equal(JSON.stringify([...f.props]),before);
 assert.throws(()=>f.ctx.v3CreateFreshCopies(),/Approve/);f.props.set('V3_FRESH_COPY_APPROVAL',JSON.stringify({reviewed:true,configDigest:preview.configDigest}));
 assert.equal(f.ctx.v3CreateFreshCopies().status,'created');assert.equal(f.calls.at(-1).copy.ledgerId,'new-fixture-ledger');assert.equal(f.calls.at(-1).preview,false);
 f.c.copy.items[0].source.id='changed-canonical';assert.throws(()=>f.ctx.v3CreateFreshCopies(),/Approve/);
});
test('helper refuses production/source/historical roots or ledgers and mislabeled copy operations',()=>{
 for(const mutate of [f=>f.c.copy.ledgerId='production-draft-ledger',f=>f.c.copy.parentId='production-root',f=>f.c.copy.parentId='canonical-points',f=>f.c.copy.ledgerId='production-points',f=>f.c.copy.items[0].name='Unlabeled production copy']){
  const f=fixture();mutate(f);assert.throws(()=>f.ctx.v3PreviewFreshCopies());assert.equal(f.calls.length,0);
 }
});
test('fresh setup passes exact separate phase approval to engine and returns handoff',()=>{
 const f=fixture();f.ctx.v3PreviewFreshWorkbooks();assert.equal(f.calls.at(-1).approval,null);assert.throws(()=>f.ctx.v3ConfigureFreshWorkbooks(),/Review/);
 const approval={year:'2027-2028',phase:'workbooks',digest:'fixture-digest'};f.props.set('V3_FRESH_SETUP_APPROVAL',JSON.stringify(approval));
 const result=f.ctx.v3ConfigureFreshWorkbooks();assert.equal(result.handoff.type,'asme-annual-link-handoff');assert.deepEqual(JSON.parse(JSON.stringify(f.calls.at(-1).approval)),approval);
 assert.equal([...f.props.keys()].some(key=>key.startsWith('ANNUAL_')),false);
});
