import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {annualSettingsInput} from '../assets/js/annual-settings-input.js';
const ctx=vm.createContext({});
vm.runInContext(readFileSync(new URL('../integrations/apps-script/AnnualSettingsDraftEngine.gs.example',import.meta.url),'utf8'),ctx);
const engine=ctx.AnnualSettingsDraftEngine,clone=x=>JSON.parse(JSON.stringify(x));
function fixture(){
 const ids=Object.fromEntries(['pointsMaster','attendanceFormEditor','pointsExport','budgetTracker','budgetExport','annualFolder'].map(k=>[k,('annual_'+k).padEnd(30,'x')]));
 const links=Object.fromEntries(Object.entries(ids).map(([k,id])=>[k,k==='annualFolder'?`https://drive.google.com/drive/folders/${id}`:k==='attendanceFormEditor'?`https://docs.google.com/forms/d/${id}/edit`:`https://docs.google.com/spreadsheets/d/${id}/edit`]));
 links.attendanceFormRespondent='https://docs.google.com/forms/d/e/observedFormRespondentId123456789/viewform';
 const handoff={schema:1,type:'asme-annual-link-handoff',year:'2027-2028',links};
 const config={schema:1,year:handoff.year,controlCenterId:'privateSettingsControlCenter12345',sheetName:'Hub_Settings_Public',draftTimestamp:'2026-09-30T00:00:00Z',values:{display_label:'2027–2028',engagement_goal:65,leaderboard_tab:'Leaderboard_Public',dashboard_json_url:'',calendar_page_url:'https://example.org/calendar',calendar_ical_url:'https://example.org/calendar.ics',status_note:'Draft',event_metrics_tab:'Event_Metrics_Public',budget_export_sheet_tab:'Budget_Public',banking_url:'',fundraising_url:''}};
 const data={headers:Array.from(engine.headers),rows:[Array.from(engine.headers,k=>k==='academic_year'?'2026-2027':k==='is_current'||k==='is_active'?true:'')],formulas:[Array(20).fill(''),Array(20).fill('')]};
 let ledger={schema:1,runs:{}},appends=0;
 const form={id:ids.attendanceFormEditor,destinationId:ids.pointsMaster,editUrl:links.attendanceFormEditor,respondentUrl:links.attendanceFormRespondent,acceptingResponses:false};
 const io={lock:fn=>fn(),digest:x=>createHash('sha256').update(x).digest('hex'),now:()=>config.draftTimestamp,verifiedHandoff:()=>clone(handoff),metadata:id=>({id,mimeType:id===ids.annualFolder?'application/vnd.google-apps.folder':id===ids.attendanceFormEditor?'application/vnd.google-apps.form':'application/vnd.google-apps.spreadsheet'}),form:()=>clone(form),readSettings:()=>clone(data),load:()=>clone(ledger),save:x=>{ledger=clone(x);},append:row=>{appends++;data.rows.push(clone(row));data.formulas.push(Array(20).fill(''));}};
 return {handoff,config,io,form,data,get ledger(){return ledger;},get appends(){return appends;}};
}
function approve(f){const p=engine.run(f.handoff,f.config,f.io);return {year:p.year,digest:p.digest,publicLinkReview:true,reviewNote:'Reviewed every literal and link'};}
test('preview maps fields inactive/noncurrent and has no writes',()=>{const f=fixture(),before=clone(f.data),p=engine.run(f.handoff,f.config,f.io);assert.equal(f.appends,0);assert.deepEqual(f.data,before);assert.equal(Object.keys(f.ledger.runs).length,0);assert.equal(p.row[3],f.handoff.links.pointsExport);assert.equal(p.row[6],f.handoff.links.attendanceFormRespondent);assert.equal(p.row[10],false);assert.equal(p.row[11],false);assert.equal(p.row.includes(f.handoff.links.attendanceFormEditor),false);});
test('append readback preserves current row and repeat avoids duplicates',()=>{const f=fixture(),old=clone(f.data.rows[0]),a=approve(f);assert.equal(engine.run(f.handoff,f.config,f.io,a).activation,false);assert.equal(engine.run(f.handoff,f.config,f.io,a).status,'draft-readback-matched');assert.equal(f.appends,1);assert.deepEqual(f.data.rows[0],old);});
test('lost append result reconciles same row; unresolved pending cannot retry',()=>{const f=fixture(),a=approve(f),append=f.io.append;f.io.append=row=>{append(row);throw Error('Lost result');};assert.throws(()=>engine.run(f.handoff,f.config,f.io,a),/Lost result/);f.io.append=append;engine.run(f.handoff,f.config,f.io,a);assert.equal(f.appends,1);const g=fixture(),b=approve(g);g.io.append=()=>{throw Error('Unknown');};assert.throws(()=>engine.run(g.handoff,g.config,g.io,b),/Unknown/);assert.throws(()=>engine.run(g.handoff,g.config,g.io,b),/Unknown prior append/);});
test('invalid headers/current flags/duplicate rows reject before writes',()=>{for(const change of [f=>{f.data.headers[1]='wrong';},f=>{f.data.rows.push(clone(f.data.rows[0]));},f=>{f.data.rows[0][11]=false;},f=>{f.data.rows[0][10]=false;}]){const f=fixture();change(f);assert.throws(()=>engine.run(f.handoff,f.config,f.io));assert.equal(f.appends,0);}});
test('Form mismatch, absent public review, stale approval and injection reject',()=>{const f=fixture(),a=approve(f);assert.throws(()=>engine.run(f.handoff,f.config,f.io,{...a,publicLinkReview:false}),/public link review/);f.form.destinationId='wrong';assert.throws(()=>engine.run(f.handoff,f.config,f.io,a),/destination mismatch/);const g=fixture(),b=approve(g);g.config.values.engagement_goal=100;assert.throws(()=>engine.run(g.handoff,g.config,g.io,b),/Exact private preview/);g.config.values.status_note='=IMPORTDATA("bad")';assert.throws(()=>engine.run(g.handoff,g.config,g.io),/literal/);});
test('actual Hub transfer file verifies and reconciles old journal despite reordered link fields',()=>{
 const f=fixture(), approval=approve(f);engine.run(f.handoff,f.config,f.io,approval);
 const v=f.config.values,l=f.handoff.links;
 const settings={yearKey:f.handoff.year,isActive:false,isCurrent:false,label:v.display_label,engagementGoal:v.engagement_goal,attendanceSheetUrl:l.pointsExport,attendanceFormUrl:l.attendanceFormRespondent,pointsMasterUrl:l.pointsMaster,budgetTrackerUrl:l.budgetTracker,budgetExportSheetUrl:l.budgetExport,attendanceSheetTab:v.leaderboard_tab,dashboardUrl:v.dashboard_json_url,calendarUrl:v.calendar_page_url,calendarIcalUrl:v.calendar_ical_url,budgetExportSheetTab:v.budget_export_sheet_tab,bankingUrl:v.banking_url,fundraisingUrl:v.fundraising_url};
 const input=annualSettingsInput(clone(f.handoff),settings,{currentAcademicYear:'2026-2027'},{statusNote:v.status_note,eventMetricsTab:v.event_metrics_tab});
 assert.notDeepEqual(Object.keys(input.handoff.links),Object.keys(f.handoff.links));
 const config={...f.config,values:Object.fromEntries(Object.keys(f.config.values).map(k=>[k,input.values[k]]))};
 const preview=engine.run(input.handoff,config,f.io);assert.equal(preview.digest,approval.digest);
 assert.equal(engine.run(input.handoff,config,f.io,approval).status,'draft-readback-matched');assert.equal(f.appends,1);
 input.handoff.links.extra='injected';assert.throws(()=>engine.run(input.handoff,config,f.io),/handoff differs/);
});
