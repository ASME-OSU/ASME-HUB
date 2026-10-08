/* Read-only pre-flight: no test deletion, publication, intake or activation. */
var ASME_RAW_INGEST_FORMULA='=QUERY(INDIRECT("\'" & Config!$B$7 & "\'!A:L"), "SELECT * WHERE Col1 IS NOT NULL", 1)';
var ASME_RESPONSE_HEADERS=['Timestamp','Email Address','OSU name.number','Is this your first submission this academic year?','Preferred first name','Last name','Year in school','Major','Public leaderboard display','Public alias','Event ID','Optional note'];
function asmeSanityReport_(ss) {
  var results=[],config=ss.getSheetByName('Config');
  function check(test,fn){try{var pass=fn()===true;results.push({test:test,pass:pass});}catch(e){results.push({test:test,pass:false,error:String(e.message||e)});}}
  if(!config)return [{test:'Config exists',pass:false}];
  var responseName=String(config.getRange('B7').getValue()).trim(),formId=String(config.getRange('B16').getValue()).trim();
  var expected=ASME_RESPONSE_HEADERS;
  check('Response tab and exact twelve headers',function(){var sheet=ss.getSheetByName(responseName);return !!sheet&&!!sheet.getFormUrl()&&FormApp.openByUrl(sheet.getFormUrl()).getId()===formId&&JSON.stringify(sheet.getRange(1,1,1,12).getValues()[0])===JSON.stringify(expected);});
  check('Copied Form destination matches this master',function(){return FormApp.openById(formId).getDestinationId()===ss.getId();});
  check('Form intake closed for pre-flight',function(){return FormApp.openById(formId).isAcceptingResponses()===false;});
  check('Protected raw proxy uses exact Config pointer',function(){var s=ss.getSheetByName('_Raw_Ingest');return !!s&&s.getRange('A1').getFormula()===ASME_RAW_INGEST_FORMULA&&s.getProtections(SpreadsheetApp.ProtectionType.SHEET).some(function(p){return !p.isWarningOnly();});});
  check('Roster and Point Log use only stable proxy references',function(){return ['Roster','Point Log'].every(function(name){var s=ss.getSheetByName(name);if(!s||s.getMaxRows()>5000||s.getMaxColumns()>50)return false;var f=s.getDataRange().getFormulas().flat().filter(Boolean),escaped=responseName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),direct=new RegExp("(?:'"+escaped.replace(/'/g,"''")+"'|"+escaped+")!");return f.some(function(x){return /(?:'_Raw_Ingest'|_Raw_Ingest)!/.test(x);})&&!f.some(function(x){return /(?:'Form Responses \d+'|Form Responses \d+)!/.test(x)||direct.test(x);});});});
  check('TESTING mode',function(){return config.getRange('B5').getValue()==='TESTING';});
  check('Public member output suppressed',function(){var s=ss.getSheetByName('Website Staging');return !!s&&s.getLastRow()<=5000&&!s.getRange(2,1,Math.max(1,s.getLastRow()-1),15).getValues().some(function(r){return r.some(function(v){return v!=='';});});});
  check('Open event configuration valid',function(){var s=ss.getSheetByName('Events');if(!s||s.getLastRow()>1000)return false;asmeEventChoices_(s.getRange(1,1,Math.max(1,s.getLastRow()),9).getValues());return true;});
  // Export permissions and scoring require observations in those files, not inferred PASS.
  results.push({test:'Export Allow Access and actual test scoring',pass:false,manual:true,error:'Check both exports and expected private totals; this report does not certify scoring or public sharing.'});
  return results;
}
function runSanityCheck() {
  var results=asmeSanityReport_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.getUi().alert('Pre-Flight Sanity Results\n\n'+results.map(function(r){return (r.manual?'MANUAL: ':r.pass?'PASS: ':'FAIL: ')+r.test+(r.error?' — '+r.error:'');}).join('\n'));
  return results;
}
