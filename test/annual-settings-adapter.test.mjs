import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../integrations/apps-script/AnnualSettingsDraftRunner.gs.example',import.meta.url),'utf8');

test('settings append expands a full sheet once and uses spare capacity without inserting',()=>{
 const row=['2027-2028','2027–2028',65,'https://example.org/points','Leaderboard_Public','','https://example.org/form','https://example.org/master','','',false,false,'2026-10-03T00:00:00Z','Draft','Event_Metrics_Public','https://example.org/budget','https://example.org/export','Budget_Public','',''];
 assert.equal(row.length,20);
 for(const initialMaxRows of [1000,1200]){
  const calls=[];let maxRows=initialMaxRows;
  const tab={
   getLastColumn:()=>20,getLastRow:()=>1000,getMaxRows:()=>maxRows,
   insertRowsAfter:(after,count)=>{calls.push(['insert',after,count]);assert.equal(after,1000);assert.equal(count,1);maxRows+=count;},
   getRange:(startRow,startColumn,rowCount,columnCount)=>{
    calls.push(['range',startRow,startColumn,rowCount,columnCount]);
    assert.ok(startRow<=maxRows,'capacity must exist before the append range is requested');
    return {setValues:matrix=>calls.push(['write',JSON.parse(JSON.stringify(matrix))])};
   },
  };
  const ctx=vm.createContext({annualSetupIO_:()=>({}),annualCopyIO_:()=>({}),SpreadsheetApp:{
   openById:id=>{assert.equal(id,'settings_control_center_12345');return {getSheetByName:name=>{assert.equal(name,'Hub_Settings_Public');return tab;}};},
   flush:()=>calls.push(['flush']),
  }});
  vm.runInContext(source,ctx);
  const io=ctx.annualSettingsDraftIO_({ledgerId:'copy_ledger_123456789012345'}, {}, {ledgerId:'draft_ledger_123456789012345',controlCenterId:'settings_control_center_12345',sheetName:'Hub_Settings_Public'}, {});
  io.append(row);
  assert.deepEqual(calls,[...(initialMaxRows===1000?[['insert',1000,1]]:[]),['range',1001,1,1,20],['write',[row]],['flush']]);
  assert.equal(calls.filter(call=>call[0]==='write').length,1);
 }
});
