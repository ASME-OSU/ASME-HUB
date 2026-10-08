import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
function fixture(){
 const owner='asmeohiostate@gmail.com',logs=[],files=[],ids={pointsMaster:'1UXprLAnzUjlzaojb7BDYTN9Om25xPFRYGQZIyHQRG2M',attendanceFormEditor:'1ofRiLS_WtQpH_poxU4blyKn7pZVriUWL8dsvfCJLLYA',pointsExport:'1CESQs6sY_WC9u0wonYq_CFraFFymtTJkh9SSv2DTXuY',budgetTracker:'1KMIkxLjNMRFilpicXIqePvy6XvZxgmJrRO3VT7DiCW8',budgetExport:'1vDHoouuaWX3NvdrflUiulesHU9z1JZ383_Tnu3Wqz-s'},root='1wJyK2QH03mPoK61UMt0N9LmGj9e5cL5H';
 const metadata=id=>({id,name:id,mimeType:id===root?'application/vnd.google-apps.folder':id===ids.attendanceFormEditor?'application/vnd.google-apps.form':'application/vnd.google-apps.spreadsheet',version:'current-native-version',owners:[{emailAddress:owner}],permissions:[{type:'user',emailAddress:owner}],capabilities:{canCopy:true,canAddChildren:true},parents:[root]});
 const state={id:ids.attendanceFormEditor,acceptingResponses:false,destinationId:null};
 const io={actor:()=>owner,metadata};let content='';
 const ctx=vm.createContext({ScriptApp:{AuthMode:{FULL:'FULL'},requireAllScopes:()=>{}},annualSettingsWebContext_:()=>({actor:owner}),annualCopyIO_:()=>io,Session:{getActiveUser:()=>({getEmail:()=>owner})},annualSetupIO_:()=>({form:()=>state,filters:()=>({basicFilter:null,filterViews:[],sheetId:9}),cell:()=>({value:'TESTING'}),workbook:id=>id===ids.pointsMaster?{formulas:[{sheet:'Roster',a1:'A2',formula:"=IF('Form Responses 2'!A2, 'Form Responses 2'!B2,0)"}]}:{tabs:['Public'],formulas:[{sheet:'Public',a1:'A1',formula:`=IMPORTRANGE("${id===ids.pointsExport?ids.pointsMaster:ids.budgetTracker}","A1")`}]}}),FormApp:{openById:()=>({getResponses:()=>[]})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>({getRange:()=>({getValues:()=>[Array(12).fill('header')]}),getLastRow:()=>1})})},Utilities:{newBlob:(text,mime)=>({text,mime,getBytes:()=>Buffer.from(text)}),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,text)=>[...createHash('sha256').update(text).digest()],getUuid:()=> 'private-receipt'},Drive:{Files:{create:(body,blob,options)=>{files.push({body,options});content=blob.text;return {id:'created-private-receipt'};}}},DriveApp:{getFileById:()=>({getBlob:()=>({getDataAsString:()=>content})})},console:{log:text=>logs.push(text)}});
 vm.runInContext(readFileSync(new URL('../integrations/apps-script/V3CanonicalSourceInspection.gs.example',import.meta.url),'utf8'),ctx);
 return {ctx,state,io,logs,files,get report(){return JSON.parse(content);}};
}
test('canonical inspection records observed version and formula inventory without automatically certifying clean review',()=>{
 const f=fixture(),receipt=f.ctx.v3InspectCanonicalSources();assert.equal(receipt.phase,'canonical-source-inspection');assert.equal(f.report.result.response.inventory.formulaCells,1);assert.equal(f.report.result.response.inventory.occurrences,2);
 assert.equal(f.report.result.sources.pointsMaster.version,'current-native-version');assert.equal(f.report.result.sources.pointsMaster.cleanReviewed,false);assert.equal(f.report.result.form.responseCount,0);
 assert.equal(f.files.length,1);assert.equal(f.files[0].options.ignoreDefaultVisibility,true);assert.equal(f.logs.length,1);assert.match(f.logs[0],/ASME_V3_PRIVATE_RECEIPT/);assert.doesNotMatch(f.logs[0],/pointsMaster|current-native-version|IMPORTRANGE/);
});
test('open or linked canonical Form and changed source privacy stop before receipt creation',()=>{
 for(const mutate of [f=>f.state.acceptingResponses=true,f=>f.state.destinationId='existing-private-destination',f=>{const old=f.io.metadata;f.io.metadata=id=>({...old(id),permissions:[{type:'anyone'}]});}]){
  const f=fixture();mutate(f);assert.throws(()=>f.ctx.v3InspectCanonicalSources());assert.equal(f.files.length,0);assert.equal(f.logs.length,0);
 }
});
