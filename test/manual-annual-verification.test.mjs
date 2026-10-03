import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const ctx=vm.createContext({});
for(const name of ['ManualAnnualVerificationEngine','AnnualSettingsDraftEngine'])vm.runInContext(readFileSync(new URL(`../integrations/apps-script/${name}.gs.example`,import.meta.url),'utf8'),ctx);
const clone=x=>JSON.parse(JSON.stringify(x)),engine=ctx.ManualAnnualVerificationEngine,draftEngine=ctx.AnnualSettingsDraftEngine;
function fixture(){
 const key=x=>x.padEnd(30,'x'),names=['pointsMaster','attendanceFormEditor','pointsExport','budgetTracker','budgetExport','annualFolder'],ids=Object.fromEntries(names.map(x=>[x,key('manual_'+x)])),root=key('annual_root'),owner='chapter@example.org';
 const links=Object.fromEntries(names.map(x=>[x,x==='annualFolder'?`https://drive.google.com/drive/folders/${ids[x]}`:x==='attendanceFormEditor'?`https://docs.google.com/forms/d/${ids[x]}/edit`:`https://docs.google.com/spreadsheets/d/${ids[x]}/edit`]));links.attendanceFormRespondent=`https://docs.google.com/forms/d/e/${key('respondent_id')}/viewform`;
 const handoff={schema:1,type:'asme-annual-link-handoff',year:'2027-2028',links};
 const headers=Array.from({length:12},(_,i)=>'Response '+i);
 const values={display_label:'2027–2028',engagement_goal:100,leaderboard_tab:'Leaderboard_Public',dashboard_json_url:'',calendar_page_url:'',calendar_ical_url:'',status_note:'Draft',event_metrics_tab:'Event_Metrics_Public',budget_export_sheet_tab:'Budget_Public',banking_url:'',fundraising_url:''};
 const draft={schema:1,year:handoff.year,controlCenterId:key('control_center'),ledgerId:key('manual_draft_ledger'),sheetName:'Hub_Settings_Public',draftTimestamp:'2026-10-02T00:00:00Z',values};
 const config={schema:1,year:handoff.year,intendedOwner:owner,annualRootId:root,excludedSourceIds:Array.from({length:5},(_,i)=>key('source_'+i)),points:{term:'Fall 2027'},responseHeaders:clone(headers),schemas:[{resource:'pointsMaster',sheet:'Events',headers:['Event ID']},{resource:'budgetTracker',sheet:'Transactions',headers:['Date']},{resource:'pointsExport',sheet:'Event_Metrics_Public',headers:['Event ID','Count']},{resource:'pointsExport',sheet:'Leaderboard_Public',headers:['Alias','Points']},{resource:'budgetExport',sheet:'Budget_Public',headers:['Category','Amount']}],imports:{pointsExport:[{sheet:'Leaderboard_Public',a1:'A2',formulaTemplate:'=IMPORTRANGE("{{SOURCE_ID}}","Leaderboard_Public!A2:B")'}],budgetExport:[{sheet:'Budget_Public',a1:'A2',formulaTemplate:'=IMPORTRANGE("{{SOURCE_ID}}","Budget_Public!A2:B")'}]},draft};
 const file=(id,mime,parents)=>({id,name:'Officer copied resource',mimeType:mime,parents,owners:[{emailAddress:owner}],permissions:[{type:'user',emailAddress:owner,role:'owner'}],capabilities:{canEdit:true}});
 const files={[root]:file(root,'application/vnd.google-apps.folder',['my-drive-root'])};
 names.forEach(name=>{files[ids[name]]=file(ids[name],name==='annualFolder'?'application/vnd.google-apps.folder':name==='attendanceFormEditor'?'application/vnd.google-apps.form':'application/vnd.google-apps.spreadsheet',[name==='annualFolder'?root:ids.annualFolder]);});
 const form={id:ids.attendanceFormEditor,destinationId:ids.pointsMaster,acceptingResponses:false,editUrl:links.attendanceFormEditor,respondentUrl:links.attendanceFormRespondent};
 const response={id:1,name:'Form Responses 3',formId:ids.attendanceFormEditor,lastRow:1,headers};
 const cells=new Map(),put=(resource,sheet,a1,v)=>cells.set(resource+'|'+sheet+'|'+a1,v);
 for(const [a1,value] of Object.entries({B2:'Fall 2027',B3:'2027-28',B5:'TESTING',B7:response.name,B16:ids.attendanceFormEditor}))put('pointsMaster','Config',a1,{value});
 for(const [a1,date] of Object.entries({B4:'2027-08-01',B5:'2028-07-31',B11:'2027-08-01',B12:'2027-12-31',B13:'2028-01-01',B14:'2028-05-31'}))put('budgetTracker','Setup & Lists',a1,{date});
 const books={pointsMaster:{formulas:[{sheet:'Members',a1:'A2',formula:"='Form Responses 3'!A2"}],sourceURLCells:[]},budgetTracker:{formulas:[],sourceURLCells:[]}};
 for(const name of ['pointsExport','budgetExport'])books[name]={formulas:config.imports[name].map(spec=>({sheet:spec.sheet,a1:spec.a1,formula:spec.formulaTemplate.replace('{{SOURCE_ID}}',ids[name==='pointsExport'?'pointsMaster':'budgetTracker'])})),sourceURLCells:[]};
 const data={headers:Array.from(draftEngine.headers),rows:[Array.from(draftEngine.headers,k=>k==='academic_year'?'2026-2027':k==='is_current'||k==='is_active'?true:'')],formulas:[Array(20).fill(''),Array(20).fill('')]};
 let ledger={schema:1,runs:{}},appends=0,saves=0;
 const io={actor:()=>owner,metadata:id=>clone(files[id]),form:()=>clone(form),tabs:()=>[clone(response)],cell:(id,sheet,a1)=>clone(cells.get(names.find(name=>ids[name]===id)+'|'+sheet+'|'+a1)),headers:(id,sheet)=>clone(config.schemas.find(spec=>ids[spec.resource]===id&&spec.sheet===sheet).headers),workbook:id=>clone(books[names.find(name=>ids[name]===id)]),digest:s=>createHash('sha256').update(s).digest('hex'),lock:fn=>fn(),now:()=>draft.draftTimestamp,readSettings:()=>clone(data),load:()=>clone(ledger),save:v=>{saves++;ledger=clone(v);},append:row=>{appends++;data.rows.push(clone(row));data.formulas.push(Array(20).fill(''));}};
 const verify=()=>engine.verify(handoff,config,io);
 function prepare(){const verified=verify(),c={...draft,manualVerificationDigest:verified.digest};io.verifiedHandoff=()=>{const fresh=verify();if(fresh.digest!==verified.digest)throw Error('Snapshot changed');return fresh.handoff;};return {c,preview:draftEngine.run(handoff,c,io)};}
 return {config,draft,handoff,ids,root,files,form,response,cells,books,io,verify,prepare,get appends(){return appends;},get saves(){return saves;},data};
}
test('manual copies independently verify without creation journals; safe renamed copies accepted',()=>{const f=fixture();f.files[f.ids.pointsMaster].name='Points Master 2027';const r=f.verify();assert.deepEqual(clone(r.handoff.links),f.handoff.links);assert.match(r.readiness,/human checks/);assert.equal(f.saves,0);assert.equal(f.appends,0);});
test('manual verification rejects wrong destination/respondent/closed-state/response headers',()=>{
 for(const change of [f=>{f.form.destinationId='wrong';},f=>{f.form.respondentUrl+='?wrong';},f=>{f.form.acceptingResponses=true;},f=>{f.response.headers[0]='wrong';},f=>{f.response.lastRow=2;}]){const f=fixture();change(f);assert.throws(f.verify);assert.equal(f.saves,0);}
});
test('original IDs, wrong owner, public sharing, wrong parents and cycles reject',()=>{
 for(const change of [f=>{f.handoff.links.pointsMaster=`https://docs.google.com/spreadsheets/d/${f.config.excludedSourceIds[0]}/edit`;},f=>{f.files[f.ids.pointsMaster].owners[0].emailAddress='other@example.org';},f=>{f.files[f.ids.pointsMaster].permissions.push({type:'anyone'});},f=>{f.files[f.ids.pointsMaster].parents=[f.root];},f=>{f.files[f.ids.annualFolder].parents=[f.ids.annualFolder];}]){const f=fixture();change(f);assert.throws(f.verify);assert.equal(f.appends,0);}
});
test('wrong Config year/term/status/response tab or budget dates reject',()=>{
 for(const [resource,sheet,a1] of [['pointsMaster','Config','B2'],['pointsMaster','Config','B3'],['pointsMaster','Config','B5'],['pointsMaster','Config','B7'],['budgetTracker','Setup & Lists','B4']]){const f=fixture();f.cells.set(resource+'|'+sheet+'|'+a1,{value:'wrong'});assert.throws(f.verify,/configuration mismatch/);}
});
test('wrong import targets, unexpected import cells and stale source formulas reject',()=>{
 for(const change of [f=>{f.books.pointsExport.formulas[0].formula='=IMPORTRANGE("wrong","A:B")';},f=>{f.books.budgetExport.formulas.push({sheet:'Budget_Public',a1:'C2',formula:'=IMPORTRANGE("wrong","A:B")'});},f=>{f.books.pointsMaster.formulas.push({sheet:'Members',a1:'B2',formula:'="'+f.config.excludedSourceIds[0]+'"'});},f=>{f.books.budgetExport.sourceURLCells.push({sheet:'README',a1:'B2',value:'https://docs.google.com/spreadsheets/d/'+f.config.excludedSourceIds[0]+'/edit'});}]){const f=fixture();change(f);assert.throws(f.verify);}
});
test('digest-bound manual preview/save and repeat reuse one inactive row with exact readback',()=>{
 const f=fixture(),old=clone(f.data.rows[0]),p=f.prepare(),approval={year:f.draft.year,digest:p.preview.digest,publicLinkReview:true,reviewNote:'Human public audience review'};
 assert.equal(draftEngine.run(f.handoff,p.c,f.io,approval).status,'draft-readback-matched');
 const repeat=f.prepare();assert.equal(repeat.preview.digest,p.preview.digest);draftEngine.run(f.handoff,repeat.c,f.io,approval);
 assert.equal(f.appends,1);assert.deepEqual(f.data.rows[0],old);assert.equal(f.data.rows[1][10],false);assert.equal(f.data.rows[1][11],false);
});
test('edits between manual preview and save block append even when settings are valid',()=>{
 const f=fixture(),p=f.prepare();f.books.pointsMaster.formulas[0].formula="=IFERROR('Form Responses 3'!A2,0)";
 assert.throws(()=>draftEngine.run(f.handoff,p.c,f.io,{year:f.draft.year,digest:p.preview.digest,publicLinkReview:true,reviewNote:'Reviewed'}),/Snapshot changed/);assert.equal(f.appends,0);
});

test('manual verification digest excludes its derived digest but binds selected export tabs',()=>{
 const f=fixture(),before=f.verify().digest;f.config.draft={...f.draft,manualVerificationDigest:before};assert.equal(f.verify().digest,before);
 f.config.draft.values.leaderboard_tab='Wrong_Public';assert.throws(f.verify,/Selected public export tabs/);
});

test('only explicitly reviewed exports may have public reader access',()=>{
 const f=fixture();f.files[f.ids.pointsExport].permissions.push({type:'anyone',role:'reader'});assert.throws(f.verify,/Private editable/);
 f.config.publicExportReadersAllowed=true;assert.ok(f.verify().digest);
 f.files[f.ids.pointsExport].permissions[1].role='writer';assert.throws(f.verify,/Private editable/);
 const g=fixture();g.config.publicExportReadersAllowed=true;g.files[g.ids.pointsMaster].permissions.push({type:'anyone',role:'reader'});assert.throws(g.verify,/Private editable/);
});

test('PAUSED manual copies verify; LIVE is rejected and changing nonlive status invalidates a preview',()=>{
 const f=fixture(),before=f.verify().digest;
 f.cells.set('pointsMaster|Config|B5',{value:'PAUSED'});
 assert.notEqual(f.verify().digest,before);
 const p=f.prepare(); f.cells.set('pointsMaster|Config|B5',{value:'TESTING'});
 assert.throws(()=>draftEngine.run(f.handoff,p.c,f.io,{year:f.draft.year,digest:p.preview.digest,publicLinkReview:true,reviewNote:'Reviewed'}),/Snapshot changed/);
 f.cells.set('pointsMaster|Config|B5',{value:'LIVE'});assert.throws(f.verify,/configuration mismatch/);assert.equal(f.appends,0);
});
