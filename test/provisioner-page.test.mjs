import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(new URL('../integrations/apps-script/transition-simple/ProvisionerPage.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function page() {
  const calls = [], elements = new Map(), downloads = [], urls = [];
  function element(tag = 'div') {
    return {tag, value:'', textContent:'', hidden:false, disabled:false, dataset:{}, children:[], handlers:{}, addEventListener(name, handler){this.handlers[name] = handler;}, append(child){this.children.push(child);}, replaceChildren(){this.children=[];}, click(){downloads.push(this);}, submit(){this.handlers.submit({preventDefault(){}});}};
  }
  for (const match of html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[^>]*>/g)) elements.set(match[2],element(match[1]));
  // doGet supplies the selected mode before the HTML service executes this script.
  elements.get('mode').value='production';
  const runner = {withSuccessHandler(fn){this.success=fn;return this;},withFailureHandler(fn){this.failure=fn;return this;}};
  for (const method of ['getAnnualSetupConfig','saveAnnualSetupConfig','runAnnualSetup']) runner[method] = (arg,answers) => calls.push({method,arg,answers,success:runner.success,failure:runner.failure});
  const document = {getElementById:id=>elements.get(id),querySelectorAll:()=>[...elements.values()].filter(e=>['input','button'].includes(e.tag)),createElement:tag=>element(tag)};
  vm.runInNewContext(script,{document,google:{script:{run:runner}},Blob,URL:{createObjectURL:blob=>{urls.push(blob);return 'blob:receipt';},revokeObjectURL:()=>{}},setTimeout:fn=>fn()});
  return {get:id=>elements.get(id),calls,downloads,urls};
}
const config = {rootFolderId:'root',controlCenterId:'center',engagementGoal:25,calendarIcalUrl:'',workspaceMode:'production'};
test('setup page loads saved chapter fields, saves changes and blocks duplicate submissions',()=>{
  const p=page();assert.equal(p.get('year').disabled,true);p.calls[0].success(config);assert.equal(p.get('year').disabled,false);assert.equal(p.get('rootFolderId').value,'root');
  p.get('engagementGoal').value='50';p.get('config-form').submit();assert.equal(p.calls[1].arg.engagementGoal,'50');p.get('config-form').submit();assert.equal(p.calls.length,2);
  p.calls[1].success(config);p.calls[2].success(config);assert.equal(p.get('configuration').open,false);assert.match(p.get('status').textContent,/Ready/);
});
test('setup page displays seven returned links and downloads receipt after annual setup',()=>{
  const p=page();p.calls[0].success(config);p.get('year').value='2027-2028';p.get('annual-form').submit();assert.equal(p.calls[1].method,'runAnnualSetup');assert.equal(p.calls[1].arg,'2027-2028');
  p.get('annual-form').submit();assert.equal(p.calls.length,2);
  p.calls[1].success({targetYear:'2027-2028',folderUrl:'https://drive.google.com/drive/folders/annual',formEditUrl:'https://docs.google.com/forms/d/form/edit',links:{pointsMaster:'https://docs.google.com/spreadsheets/d/master/edit',formRespondent:'https://docs.google.com/forms/d/e/form/viewform',pointsExport:'https://docs.google.com/spreadsheets/d/points/edit',budgetTracker:'https://docs.google.com/spreadsheets/d/budget/edit',budgetExport:'https://docs.google.com/spreadsheets/d/export/edit'},readableReceipt:'<private receipt>',next:'Enable automatic event sync'});
  assert.equal(p.get('result').hidden,false);assert.equal(p.get('links').children.length,7);assert.equal(p.get('receipt').textContent,'<private receipt>');assert.match(p.get('status').textContent,/inactive/);
  p.get('download').handlers.click();assert.equal(p.downloads[0].download,'ASME-2027-2028-setup-receipt.txt');assert.equal(p.urls.length,1);
});
test('setup errors keep the year editable for retry and hide earlier results',()=>{
  const p=page();p.calls[0].success(config);p.get('year').value='2027-2028';p.get('annual-form').submit();p.calls[1].failure({message:'Google response tab not ready; retry same year'});
  assert.equal(p.get('year').disabled,false);assert.equal(p.get('year').value,'2027-2028');assert.equal(p.get('result').hidden,true);assert.equal(p.get('status').dataset.error,'true');
  p.get('annual-form').submit();assert.equal(p.calls[2].arg,'2027-2028');
});

test('changing chapter setup hides the earlier workspace receipt',()=>{
  const p=page();p.calls[0].success(config);p.get('result').hidden=false;
  p.get('rootFolderId').value='another-root';p.get('config-form').submit();
  assert.equal(p.get('result').hidden,true);
  p.calls[1].failure({message:'Invalid root'});assert.equal(p.get('result').hidden,true);
});

// The warning must be available before account/config loading or file creation.
test('setup page explains the single-account Chrome requirement and summary',()=>{
 assert.match(html,/id="account-warning" role="note"/);
 assert.match(html,/Chrome’s ASME profile/);
 assert.match(html,/asmeohiostate@gmail.com must be the only Google account signed in/);
 assert.match(html,/cannot check your Chrome profile or count signed-in accounts/);
 assert.match(html,/Setup summary:[\s\S]*seven links/);
 assert.ok(html.indexOf('id="account-warning"')<html.indexOf('id="annual-form"'));
});


const bindingPending = 'Google response tab not uniquely observed yet; retry this same run. No name was guessed.';
test('fallback locks the created annual goal for reopening and unlocks a different new year',()=>{
 const p=page();p.calls[0].success({...config,existing:false});p.get('year').value='2027-2028';p.get('annualGoal').value='60';
 p.get('annual-form').submit();p.calls[1].failure({message:bindingPending});
 p.calls[2].success({success:true,targetYear:'2027-2028',folderUrl:'https://drive.google.com/drive/folders/annual',formEditUrl:'https://docs.google.com/forms/d/form/edit',links:{pointsMaster:'https://docs.google.com/spreadsheets/d/master/edit',formRespondent:'https://docs.google.com/forms/d/e/form/viewform',pointsExport:'https://docs.google.com/spreadsheets/d/points/edit',budgetTracker:'https://docs.google.com/spreadsheets/d/budget/edit',budgetExport:'https://docs.google.com/spreadsheets/d/export/edit'},readableReceipt:'receipt',hubHandoff:'handoff',next:'Enable automatic event sync'});
 assert.equal(p.get('annualGoal').readOnly,true);assert.equal(p.get('annualGoal').value,'60');assert.match(p.get('goal-source').textContent,/This year’s saved setup: 60 members/);assert.doesNotMatch(p.get('goal-source').textContent,/You can change/);assert.equal(p.get('result').hidden,false);
 p.get('annual-form').submit();assert.equal(p.calls[3].arg,'2027-2028');assert.equal(p.calls[3].answers.engagementGoal,'60');p.calls[3].failure({message:'Network failed'});
 p.get('year').value='2028-2029';p.get('year').handlers.change();assert.equal(p.calls[4].arg,'2028-2029');p.calls[4].success({...config,existing:false,engagementGoal:75});
 assert.equal(p.get('annualGoal').readOnly,false);assert.equal(p.get('annualGoal').value,75);assert.match(p.get('goal-source').textContent,/You can change/);
});
test('fallback retries only exact pending binding once with captured year and answers',()=>{
 const p=page();p.calls[0].success(config);p.get('year').value='2027-2028';p.get('annual-form').submit();p.calls[1].failure({message:bindingPending});
 assert.equal(p.calls.length,3);assert.equal(p.get('year').disabled,true);assert.equal(p.calls[2].arg,p.calls[1].arg);assert.deepEqual(p.calls[2].answers,p.calls[1].answers);
 p.calls[2].failure({message:bindingPending});assert.equal(p.calls.length,3);assert.equal(p.get('year').disabled,false);assert.equal(p.get('status').dataset.error,'true');
});
test('fallback does not retry auth network or ambiguous binding failures',()=>{
 for(const message of ['Authorization expired','Network failed','More than one response tab is linked to this Form.']){
 const p=page();p.calls[0].success(config);p.get('year').value='2027-2028';p.get('annual-form').submit();p.calls[1].failure({message});assert.equal(p.calls.length,2);assert.equal(p.get('year').disabled,false);
 }
});
test('fallback recognizes the Google ScriptError wrapper for pending binding',()=>{
 const p=page();p.calls[0].success(config);p.get('year').value='2027-2028';p.get('annual-form').submit();p.calls[1].failure({message:'Error: '+bindingPending});assert.equal(p.calls.length,3);assert.deepEqual(p.calls[2].answers,p.calls[1].answers);
});
test('fallback does not resume when captured year or goal changed',()=>{
 for(const field of ['year','annualGoal']){const p=page();p.calls[0].success(config);p.get('year').value='2027-2028';p.get('annual-form').submit();p.get(field).value='changed';p.calls[1].failure({message:bindingPending});assert.equal(p.calls.length,2);assert.equal(p.get('status').dataset.error,'true');}
});
test('fallback rejects stale success after the automatic resume',()=>{
 const p=page();p.calls[0].success(config);p.get('year').value='2027-2028';p.get('annual-form').submit();p.calls[1].failure({message:bindingPending});p.get('year').value='2028-2029';p.calls[2].success({targetYear:'2027-2028'});assert.equal(p.get('result').hidden,true);assert.equal(p.get('status').dataset.error,'true');
});
