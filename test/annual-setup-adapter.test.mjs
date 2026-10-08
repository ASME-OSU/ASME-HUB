import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const sources = ['AnnualSetupRunner.gs.example', 'AnnualSettingsDraftRunner.gs.example'].map(name =>
  readFileSync(new URL(`../integrations/apps-script/${name}`, import.meta.url), 'utf8'));
function fixture(destination) {
  const form = {
    getId: () => 'copied-form', getDestinationId: destination,
    isAcceptingResponses: () => false,
    getEditUrl: () => 'https://docs.google.com/forms/d/copied-form/edit',
    getPublishedUrl: () => 'https://docs.google.com/forms/d/e/published-form/viewform',
    setDestination: () => assert.fail('Read-only adapter unexpectedly changed destination')
  };
  const context = vm.createContext({
    annualCopyIO_: () => ({ lock: fn => fn(), now: () => 'now' }),
    FormApp: { openById: () => form }
  });
  sources.forEach(source => vm.runInContext(source, context));
  const copy = { ledgerId: 'private_copy_ledger_123456789', intendedOwner: 'owner@example.test' };
  const setup = context.annualSetupIO_(copy, {});
  const draft = context.annualSettingsDraftIO_(copy, {}, {
    ledgerId: 'private_draft_ledger_123456789', controlCenterId: 'control_center_123456789'
  }, {});
  return [() => setup.form('copied-form').destinationId,
    () => setup.read({ kind: 'destination', id: 'copied-form' }),
    () => draft.form('copied-form').destinationId];
}

test('all destination adapter reads handle the exact Google no-destination exception', () => {
  for (const message of ['The form currently has no response destination.',
    'Exception: The form currently has no response destination.']) {
    const error = new Error(message);
    for (const read of fixture(() => { throw error; })) assert.equal(read(), null);
  }
});
test('all destination adapter reads preserve linked Form identity and empty returns', () => {
  for (const value of ['copied-points-workbook', null, '']) {
    for (const read of fixture(() => value)) assert.equal(read(), value || null);
  }
});
test('authorization, service and similar destination errors are rethrown unchanged', () => {
  for (const message of ['Authorization is required.', 'Service unavailable',
    'The form currently has no response destination. Try again later.',
    'The form currently has no response destination']) {
    const error = new Error(message);
    for (const read of fixture(() => { throw error; })) {
      assert.throws(read, caught => caught === error);
    }
  }
});

test('filter adapter inventories both Google filter types and deletes exact reviewed IDs only',()=>{
 const requests=[],ctx=vm.createContext({SpreadsheetApp:{openById:()=>({getSheetByName:()=>null})},annualCopyIO_:()=>({lock:fn=>fn()}),Sheets:{Spreadsheets:{get:(id,options)=>{assert.equal(id,'copied-points');assert.match(options.fields,/basicFilter,filterViews/);return {sheets:[{properties:{title:'Review Queue',sheetId:9},basicFilter:{range:{sheetId:9}},filterViews:[{filterViewId:18},{filterViewId:17}]}]};},batchUpdate:(body,id)=>{requests.push({body,id});}}}});
 vm.runInContext(sources[0],ctx);const io=ctx.annualSetupIO_({},{});io.assertLegacyArchitecture('copied-points');const before=io.filters('copied-points','Review Queue');
 assert.deepEqual(JSON.parse(JSON.stringify(before)),{basicFilter:{range:{sheetId:9}},filterViews:[{filterViewId:17},{filterViewId:18}],sheetId:9});
 io.write({kind:'filters',id:'copied-points',sheet:'Review Queue',before,after:{basicFilter:null,filterViews:[],sheetId:9}});
 assert.deepEqual(JSON.parse(JSON.stringify(requests)),[{id:'copied-points',body:{requests:[{clearBasicFilter:{sheetId:9}},{deleteFilterView:{filterId:17}},{deleteFilterView:{filterId:18}}]}}]);
});

test('legacy native adapter refuses proxy masters before any destination, filter or cell writes',()=>{
 let proxy=true,writes=0;const ctx=vm.createContext({annualCopyIO_:()=>({lock:fn=>fn()}),SpreadsheetApp:{openById:()=>({getSheetByName:name=>name==='_Raw_Ingest'&&proxy?{}:null})},FormApp:{openById:()=>({setDestination:()=>writes++}),DestinationType:{SPREADSHEET:'spreadsheet'}},Sheets:{Spreadsheets:{batchUpdate:()=>writes++}}});
 vm.runInContext(sources[0],ctx);const io=ctx.annualSetupIO_({},{});
 assert.throws(()=>io.assertLegacyArchitecture('copied-points'),/AnnualProvisioner/);
 assert.throws(()=>io.write({kind:'destination',id:'form',after:'copied-points'}),/before any write/);assert.equal(writes,0);
 proxy=false;io.assertLegacyArchitecture('copied-points');proxy=true;
 for(const patch of [{kind:'destination',id:'form',after:'copied-points'},{kind:'filters',id:'copied-points',before:{basicFilter:{},filterViews:[]}},{kind:'cell',id:'copied-budget',sheet:'Config',a1:'B1',after:{value:'x'}}])assert.throws(()=>io.write(patch),/AnnualProvisioner/);
 assert.equal(writes,0);
});
