import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../integrations/apps-script/transition-simple/AnnualProvisioner.gs',import.meta.url),'utf8');
const ctx=vm.createContext({});
vm.runInContext(source,ctx);

function savedRun(){
  return {
    phase:'draft_ready',year:'2031-2032',
    plan:{fallTerm:'Fall 2031',controlCenterId:'private-center',engagementGoal:25,calendarIcalUrl:'https://example.org/calendar.ics'},
    ids:{attendanceForm:'actual-form',pointsMaster:'actual-points',budgetTracker:'actual-budget'},
    links:{pointsMaster:'https://example.org/points',pointsExport:'https://example.org/points-export',budgetTracker:'https://example.org/budget',budgetExport:'https://example.org/budget-export',formRespondent:'https://example.org/respond'},
    folderUrl:'https://example.org/folder',formEditUrl:'https://example.org/form-edit',responseTab:'Observed Form Responses 9',
    completedAt:'2026-10-08T12:00:00.000Z',checkedAt:'2026-10-08T12:01:00.000Z'
  };
}

test('private readable receipt maps saved identities, seven links and six dates to their actual locations',()=>{
  const state=savedRun(),before=JSON.stringify(state),receipt=ctx.asmeReadableAnnualReceipt_(state,12);
  assert.equal(JSON.stringify(state),before);
  assert.match(receipt,/Provisioner run key: ASME_SIMPLE_ANNUAL_2031-2032/);
  assert.match(receipt,/Hub run name: \[coordinator records/);
  for(const link of Object.values(state.links).concat(state.folderUrl,state.formEditUrl))assert.ok(receipt.includes(link),link);
  assert.match(receipt,/Form ID: actual-form/);
  assert.match(receipt,/Actual response tab: Observed Form Responses 9/);
  assert.match(receipt,/Hub_Settings_Public!A12:T12/);
  assert.match(receipt,/engagement_goal C12: 25/);
  assert.match(receipt,/calendar_ical_url J12: https:\/\/example.org\/calendar.ics/);
  assert.match(receipt,/is_active K12: FALSE; is_current L12: FALSE/);
  for(const [cell,date] of [['B4','2031-08-01'],['B5','2032-07-31'],['B11','2031-08-01'],['B12','2031-12-31'],['B13','2032-01-01'],['B14','2032-05-31']])assert.ok(receipt.includes(`Setup & Lists!${cell}`)&&receipt.includes(date));
  for(const label of ['Clean-source verification','role-appropriate access','Points Export private import authorization','Budget Export private import authorization','Automatic event-sync trigger','funding approval','Incoming officer acceptance'])assert.ok(receipt.includes(label),label);
  assert.doesNotMatch(receipt,/PASS|approved source confirmed/);
});

test('incomplete saved runs cannot render as complete receipts',()=>{
  for(const state of [{...savedRun(),phase:'new'},{...savedRun(),formEditUrl:''},{...savedRun(),ids:{attendanceForm:'actual-form'}},{...savedRun(),links:{}}])assert.throws(()=>ctx.asmeReadableAnnualReceipt_(state,12));
  assert.throws(()=>ctx.asmeReadableAnnualReceipt_(savedRun(),1));
});
