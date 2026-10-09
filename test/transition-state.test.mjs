import test from 'node:test';import assert from 'node:assert/strict';
import {TRANSITION_STEPS as steps,TRANSITION_CHECKS as checks} from '../assets/js/transition-steps.js';
import {checkApplies,rehearsalEligibility,emptyProgress,createTransitionRun,parseProgress,exportProgress,importProgress,migrateProgress,launchEligibility,reconcileProgress,storageKey,progressSummary,transitionYear} from '../assets/js/transition-state.js';
const year='2027-2028',run=(mode='rehearsal',id='a')=>emptyProgress(year,createTransitionRun(id,mode,id));
const read=v=>parseProgress(v,year,steps,checks);
const ready=()=>({...run('production'),steps:Object.fromEntries(steps.filter(s=>!s.launch).map(s=>[s.id,'complete'])),checks:Object.fromEntries(checks.map(c=>[c.id,'passed']))});
test('rehearsal GO excludes production approvals but requires every practice observation and closeout',()=>{
 const p={...run(),steps:Object.fromEntries(steps.map(s=>[s.id,s.launch?'skipped':'complete'])),checks:Object.fromEntries(checks.filter(c=>checkApplies(c,'rehearsal')).map(c=>[c.id,'passed'])),reasons:{T05:'Rehearsal only'}};
 assert.equal(rehearsalEligibility(p,steps,checks).eligible,true);
 assert.equal(progressSummary(p,steps,checks).finished,true);
 assert.equal(launchEligibility(p,steps,checks).eligible,false);
 assert.deepEqual(importProgress(exportProgress(p,steps,checks),year,steps,checks),p);
 for(const c of checks.filter(c=>checkApplies(c,'rehearsal'))){const incomplete={...p,checks:{...p.checks,[c.id]:'unable'}};assert.equal(rehearsalEligibility(incomplete,steps,checks).eligible,false,c.id);}
 const production={...p,run:run('production').run};assert.equal(launchEligibility(production,steps,checks).eligible,false);
 assert.throws(()=>read(production),/unchecked manual check/);
});
test('guide 8 migration retains all 26 observations but reopens confirmations under scoped rules',()=>{
 const old={...ready(),guideVersion:'officer-transition-guide-8',notes:{V20:'Private owner evidence'},steps:{T01:'complete',T05:'skipped'},reasons:{T05:'Rehearsal only'}};
 const before=structuredClone(old),next=migrateProgress(old,year,steps,checks);
 assert.deepEqual(old,before);assert.equal(next.checks.V26,'needs_recheck');assert.equal(next.checks.V20,'needs_recheck');assert.match(next.notes.V20,/Private owner evidence/);assert.equal(next.steps.T01,'in_progress');assert.equal(next.steps.T05,'in_progress');
});
test('five-step definition includes wiring, scoring, communications and cleanup without automatic activation',()=>{assert.equal(steps.length,5);assert.ok(checks.length>=10);assert.match(steps[1].action,/response tab/);assert.match(steps[2].action,/five cases/);assert.match(steps[4].action,/rehearsal/i);});
test('same-year named mock runs isolate state and skipped reason survives export',()=>{const a={...run(),steps:{T02:'skipped'},reasons:{T02:'Mock only'}};assert.notEqual(storageKey(year,'a'),storageKey(year,'b'));assert.deepEqual(importProgress(exportProgress(a,steps,checks),year,steps,checks),a);assert.throws(()=>read({...a,reasons:{}}),/reason/);});
test('strict production activation requires every earlier step and all checks',()=>{const p=ready();assert.equal(launchEligibility(p,steps,checks).eligible,true);assert.equal(read({...p,steps:{...p.steps,T05:'complete'}}).steps.T05,'complete');for(const id of ['T01','T02','T03','T04'])assert.throws(()=>read({...p,steps:{...p.steps,[id]:'blocked',T05:'complete'}}),/prerequisites/);assert.throws(()=>read({...p,run:run().run,steps:{...p.steps,T05:'complete'}}),/rehearsal/);});
test('mock skip never completes launch, later communications can be reported independently',()=>{const a={...run(),steps:{T02:'skipped',T04:'complete',T05:'skipped'},checks:Object.fromEntries(checks.filter(c=>c.step==='T04').map(c=>[c.id,'passed'])),reasons:{T02:'Isolated mock',T05:'NO-GO'}};assert.deepEqual(read(a),a);assert.equal(launchEligibility(a,steps,checks).eligible,false);assert.equal(progressSummary(a,steps,checks).stepCounts.skipped,2);});
test('changed prerequisite reopens dependent confirmations and activation',()=>{const p=ready();p.steps.T05='complete';const n=reconcileProgress({...p,steps:{...p.steps,T02:'blocked'}},steps,checks,p);assert.equal(n.steps.T03,'in_progress');assert.equal(n.steps.T05,'in_progress');assert.equal(n.checks.V04,'needs_recheck');assert.equal(n.checks.V10,'passed');});
test('imported production completion requires fresh checks',()=>{const p=ready();p.steps.T05='complete';const n=importProgress(exportProgress(p,steps,checks),year,steps,checks);assert.equal(n.steps.T05,'in_progress');assert.equal(n.checks.V10,'needs_recheck');});
test('16-step versions2-6 migrate without changing original or carrying launch readiness',()=>{for(const v of [2,3,4,5,6]){const p={version:v===6?2:1,guideVersion:'officer-transition-guide-'+v,year,run:run().run,savedAt:null,reasons:{},notes:{},steps:{T03:'blocked',T15:'complete',T16:'complete'},checks:{V01:'unable',V10:'passed'}};const before=structuredClone(p),n=migrateProgress(p,year,steps,checks);assert.deepEqual(p,before);assert.equal(n.steps.T02,'in_progress');assert.equal(n.steps.T05,'in_progress');assert.equal(n.checks.V10,'needs_recheck');assert.match(n.notes.T02,/T03: blocked/);assert.deepEqual(read(n),n);assert.throws(()=>migrateProgress({...p,checks:{V99:'passed'}},year,steps,checks),/Unknown check/);}});
test('five-step guide 7 migration keeps each step in place and new checks unverified',()=>{
 const old={version:2,guideVersion:'officer-transition-guide-7',year,run:run('production').run,savedAt:null,
  steps:{T01:'complete',T02:'blocked',T03:'complete',T04:'complete',T05:'skipped'},
  checks:Object.fromEntries(Array.from({length:10},(_,i)=>[`V${String(i+1).padStart(2,'0')}`,'passed'])),
  reasons:{T02:'Missing receipt',T05:'Rehearsal only'},notes:{T03:'Five cases observed'}};
 const original=structuredClone(old), next=migrateProgress(old,year,steps,checks);
 assert.deepEqual(old,original);
 for(const id of ['T01','T02','T03','T04','T05'])assert.equal(next.steps[id],'in_progress');
 assert.match(next.notes.T02,/Missing receipt/);
 assert.match(next.notes.T03,/Five cases observed/);
 assert.match(next.notes.V05,/Earlier V05: passed/);
 for(let i=1;i<=10;i++)assert.equal(next.checks[`V${String(i).padStart(2,'0')}`],'needs_recheck');
 for(const check of checks.filter(c=>Number(c.id.slice(1))>10))assert.equal(next.checks[check.id],undefined);
 assert.equal(launchEligibility(next,steps,checks).eligible,false);
 assert.deepEqual(read(next),next);
 assert.throws(()=>migrateProgress({...old,steps:{T16:'complete'}},year,steps,checks),/Unknown step/);
 assert.throws(()=>migrateProgress({...old,checks:{V11:'passed'}},year,steps,checks),/Unknown check/);
});
test('dispositions do not claim closeout when cleanup or acceptance remains unverified',()=>{
 const p={...run(),steps:Object.fromEntries(steps.map(s=>[s.id,s.id==='T05'?'skipped':'complete'])),
  checks:Object.fromEntries(checks.filter(c=>c.step!=='T05').map(c=>[c.id,'passed'])),reasons:{T05:'Rehearsal only'}};
 assert.equal(progressSummary(p,steps,checks).disposed,5);
 assert.equal(progressSummary(p,steps,checks).finished,false);
 for(const id of ['V16','V17'])if(checks.some(c=>c.id===id))p.checks[id]='passed';
 if(checks.some(c=>c.id==='V16')&&checks.some(c=>c.id==='V17'))assert.equal(progressSummary(p,steps,checks).finished,true);
 p.steps.T03='blocked';assert.equal(progressSummary(p,steps,checks).finished,false);
});
test('corrupt and mismatched progress is rejected and years stay bounded',()=>{assert.throws(()=>read({...run(),steps:{T16:'complete'}}),/unknown step/);assert.throws(()=>importProgress('{',year,steps,checks),/valid JSON/);assert.throws(()=>read({...run(),notes:{T01:'x'.repeat(2001)}}),/invalid notes/);assert.equal(transitionYear('2199'),'2199-2200');assert.throws(()=>transitionYear('2200'));});


test('legacy corruption is rejected before aggregation can hide it', () => {
 const old={...run('production'),guideVersion:'officer-transition-guide-6',steps:{T16:'complete'},checks:{V10:'passed'}};
 for(const field of ['reasons','notes'])for(const invalid of [null,[],false,''])assert.throws(()=>migrateProgress({...old,[field]:invalid},year,steps,checks),/legacy evidence/);
 for(const run of [null,undefined,[],{id:'a',name:'A',mode:'unknown'},{name:'A',mode:'production'},{id:'a',name:'A'},{id:'a',mode:'production'}])assert.throws(()=>migrateProgress({...old,run},year,steps,checks),/run|name/);
 for(const savedAt of [false,0,undefined,'garbage'])assert.throws(()=>migrateProgress({...old,savedAt},year,steps,checks),/save time/);
 assert.throws(()=>migrateProgress({...old,steps:{T16:'skipped'}},year,steps,checks),/needs a reason/);
 const missingEarlyEvidence={version:1,guideVersion:'officer-transition-guide-2',year,savedAt:null,steps:{},checks:{}};
 assert.doesNotThrow(()=>migrateProgress(missingEarlyEvidence,year,steps,checks));
});
