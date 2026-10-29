import test from 'node:test';
import assert from 'node:assert/strict';
import {annualFileId,validateAnnualReadiness,validAnnualRunKey,annualEventControlsUrl} from '../assets/js/annual-readiness.js';
const ids={pointsMaster:'points_master_123456789012345',attendanceForm:'attendance_form_1234567890123',pointsExport:'points_export_123456789012345',budgetTracker:'budget_tracker_12345678901234',budgetExport:'budget_export_123456789012345',controlCenter:'control_center_12345678901234'};
const link=(id,kind='spreadsheets')=>`https://docs.google.com/${kind}/d/${id}/edit`;
const context={year:'2027-2028',runKey:'ASME_SIMPLE_ANNUAL_'+JSON.stringify(['2027-2028','root_folder_12345678901234567',ids.controlCenter]),mode:'production',workspaceMode:'production',controlCenterId:ids.controlCenter,links:{...Object.fromEntries(['pointsMaster','pointsExport','budgetTracker','budgetExport'].map(key=>[key,link(ids[key])])),attendanceFormEditor:link(ids.attendanceForm,'forms')}};
const report=()=>({version:1,readScope:'staging',year:context.year,runKey:context.runKey,checkedAt:new Date().toISOString(),ready:true,readyScope:'Connections and structure only.',checks:[{id:'identity',label:'Annual identity',status:'passed',detail:'Matched.',url:link(ids.pointsMaster)}],eventUpdates:{status:'installed',scope:'This project only.',triggerUid:'trigger-1',installedAt:new Date().toISOString()},limits:['No launch approval.'],fileIds:{...ids}});
test('validates matching bounded reports and returns an independent JSON observation',()=>{const value=report(),result=validateAnnualReadiness(value,context);value.checks[0].status='failed';assert.equal(result.checks[0].status,'passed');assert.equal(annualFileId('https://docs.google.com.evil.test/spreadsheets/d/'+ids.pointsMaster+'/edit'),'');});
for(const [name,change] of [
 ['different year',v=>v.year='2028-2029'],['different run',v=>v.runKey='wrong-run'],['old report',v=>v.checkedAt='2020-01-01T00:00:00.000Z'],['future report',v=>v.checkedAt='2190-01-01T00:00:00.000Z'],['wrong master',v=>v.fileIds.pointsMaster=ids.pointsExport],['extra executable field',v=>v.execute='anything'],['missing IDs',v=>delete v.fileIds],['invalid status',v=>v.checks[0].status='success'],['duplicate check',v=>v.checks.push({...v.checks[0]})],['conflicting ready',v=>v.checks[0].status='failed'],['unsafe file URL',v=>v.checks[0].url='https://evil.test/'],['unexpected Google file',v=>v.checks[0].url=link('different_file_123456789012345')],['long detail',v=>v.checks[0].detail='x'.repeat(3001)],['oversized checks',v=>v.checks=Array(41).fill(v.checks[0])],['object detail',v=>v.checks[0].detail={html:'unsafe'}],['unknown trigger state',v=>v.eventUpdates.status='ready'],['unproven observed state',v=>v.eventUpdates.status='observed'],['missing trigger',v=>delete v.eventUpdates.triggerUid],['invalid trigger identity',v=>v.eventUpdates.triggerUid='unknown uid\n'],['invalid calendar timestamp',v=>v.eventUpdates.installedAt='2026-02-30T12:00:00.000Z'],['object limit',v=>v.limits=[{}]]
]) test('rejects '+name+' before a write',()=>{const value=report();change(value);assert.throws(()=>validateAnnualReadiness(value,context));});
test('rejects mismatched mode and duplicate saved identities',()=>{assert.throws(()=>validateAnnualReadiness(report(),{...context,workspaceMode:'rehearsal'}));assert.throws(()=>validateAnnualReadiness(report(),{...context,links:{...context.links,pointsExport:context.links.pointsMaster}}));});
test('valid actionable failure is an observation, not a pass',()=>{const value=report();value.ready=false;value.checks[0].status='action_needed';value.eventUpdates={status:'not_connected',scope:'This project only.'};assert.equal(validateAnnualReadiness(value,context).ready,false);});

test('real backend key is canonical and binds year, root and Control Center',()=>{assert.equal(validAnnualRunKey(context.runKey,context.year,ids.controlCenter,'root_folder_12345678901234567'),true);for(const key of ['ANNUAL_RUN_123',context.runKey+' ',context.runKey.replace('2027-2028','2028-2029')])assert.equal(validAnnualRunKey(key,context.year,ids.controlCenter),false);});

test('retirement read scope cannot authorize staging actions',()=>{const value=report();value.readScope='retirement';assert.throws(()=>validateAnnualReadiness(value,context));assert.equal(validateAnnualReadiness(value,{...context,action:'stop'}).readScope,'retirement');});

test('validator accepts the actual provisioner run-key function output',async()=>{
 const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
 const source=readFileSync(new URL('../integrations/apps-script/transition-simple/AnnualProvisioner.gs',import.meta.url),'utf8');
 const functionSource=source.match(/function asmeAnnualRunKey_\([^)]*\)\{[\s\S]*?\n\}/)[0];
 const key=vm.runInNewContext(functionSource+';asmeAnnualRunKey_(year,root,center)',{year:context.year,root:'root_folder_12345678901234567',center:ids.controlCenter});
 const value=report();value.runKey=key;assert.equal(validateAnnualReadiness(value,{...context,runKey:key}).runKey,key);
});

test('pending stop requires retirement, not_connected and an exact recorded UID',()=>{
 const value=report();value.readScope='retirement';value.ready=false;value.eventUpdates={status:'not_connected',scope:'This project only.',triggerUid:'recorded-uid',stopPending:true,detail:'Finish recording the stopped status.'};
 assert.equal(validateAnnualReadiness(value,{...context,action:'stop'}).eventUpdates.stopPending,true);
 for(const change of [v=>v.eventUpdates.stopPending='yes',v=>delete v.eventUpdates.triggerUid,v=>v.eventUpdates.status='installed']){const bad=structuredClone(value);change(bad);assert.throws(()=>validateAnnualReadiness(bad,{...context,action:'stop'}));}
 const staging=structuredClone(value);staging.readScope='staging';assert.throws(()=>validateAnnualReadiness(staging,context));
});

test('Google hosted controls URL binds exact checked context and discards pre-existing query',()=>{
 const target=annualEventControlsUrl('https://script.google.com/macros/s/APP_DEPLOYMENT_123456789012345/exec?year=2000-2001#bad',{...context,configRevision:'["root","center","production"]'}),url=new URL(target);
 assert.equal(url.searchParams.get('year'),context.year);assert.equal(url.searchParams.get('mode'),context.mode);assert.equal(url.searchParams.get('expectedRunKey'),context.runKey);assert.equal(url.searchParams.get('expectedConfigRevision'),'["root","center","production"]');assert.equal(url.hash,'');
 for(const base of ['javascript:alert(1)','https://evil.test/macros/s/APP_DEPLOYMENT_123456789012345/exec','https://script.google.com.evil.test/macros/s/APP_DEPLOYMENT_123456789012345/exec','https://user:pass@script.google.com/macros/s/APP_DEPLOYMENT_123456789012345/exec','https://script.google.com/home/projects/APP_DEPLOYMENT_123456789012345/edit','http://script.google.com/macros/s/APP_DEPLOYMENT_123456789012345/exec'])assert.throws(()=>annualEventControlsUrl(base,{...context,configRevision:'revision'}));
 assert.throws(()=>annualEventControlsUrl(target,{...context,configRevision:'x'.repeat(2001)}));
});
