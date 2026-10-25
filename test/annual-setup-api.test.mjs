import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnnualSetupClient} from '../assets/js/annual-setup-api.js';
const config = {clientId:'123-test.apps.googleusercontent.com',deploymentId:'API-deployment',scopes:['https://www.googleapis.com/auth/drive']};
function harness(options={}) {
 let stamp=0, sent, init, fetchCount=0;
 const identity={hasGrantedAllScopes:()=>{if(options.scopeThrows)throw new Error('GIS scope checker failed');return options.granted!==false;},initTokenClient(value){init=value;return {requestAccessToken(){value.callback(Object.hasOwn(options,'oauth') ? options.oauth : {access_token:'ephemeral-test-token',expires_in:3600});}};}};
 const client=createAnnualSetupClient(config,{identity:()=>identity,now:()=>stamp,fetch:async(url,request)=>{fetchCount++;sent={url,request};return options.response || {ok:true,status:200,json:async()=>({done:true,response:{result:{example:true}}})};}});
 return {client,get sent(){return sent;},get init(){return init;},get fetchCount(){return fetchCount;},expire(){stamp=3300000;}};
}
test('requires configured OAuth client and API executable',()=>{assert.equal(createAnnualSetupClient().ready,false);});
test('calls the deployed API with transient token and plain parameters',async()=>{
 const h=harness(); await h.client.connect(); assert.deepEqual(await h.client.call('getAnnualSetupConfig',['2027-2028']),{example:true});
 assert.equal(h.sent.url,'https://script.googleapis.com/v1/scripts/API-deployment:run');
 assert.equal(h.sent.request.credentials,'omit'); assert.equal(h.sent.request.redirect,'error');
 assert.deepEqual(JSON.parse(h.sent.request.body),{function:'getAnnualSetupConfig',parameters:['2027-2028'],devMode:false});
 assert.equal(h.init.hint,'asmeohiostate@gmail.com'); assert.equal(h.init.include_granted_scopes,false);
});
test('requires a user sign-in before calling and before expiry',async()=>{
 const h=harness(); await assert.rejects(h.client.call('runAnnualSetup',[]),/Sign in again/); await h.client.connect(); h.expire(); await assert.rejects(h.client.call('runAnnualSetup',[]),/Sign in again/); assert.equal(h.sent,undefined);
});
test('rejects partial permissions and unsupported functions',async()=>{
 const h=harness({granted:false}); await assert.rejects(h.client.connect(),/all listed/); await assert.rejects(h.client.call('saveAnnualSetupConfig',[]),/Unsupported/);
});
test('preserves script failures without mistaking HTTP 200 for success',async()=>{
 const h=harness({response:{ok:true,status:200,json:async()=>({done:true,error:{details:[{errorMessage:'Wrong workspace mode'}]}})}}); await h.client.connect(); await assert.rejects(h.client.call('runAnnualSetup',[]),/Wrong workspace/);
});
test('does not treat incomplete operations as saved results',async()=>{
 const h=harness({response:{ok:true,status:200,json:async()=>({done:false})}}); await h.client.connect(); await assert.rejects(h.client.call('runAnnualSetup',[]),/same year/);
});
test('expired server credentials require new sign-in',async()=>{
 const h=harness({response:{ok:false,status:401,json:async()=>({})}}); await h.client.connect(); await assert.rejects(h.client.call('runAnnualSetup',[]),/expired/); await assert.rejects(h.client.call('runAnnualSetup',[]),/Sign in again/);
});


test('malformed HTTP 401 clears authorization before inspecting its response body',async()=>{
 let parsed=0;
 const h=harness({response:{ok:false,status:401,json:async()=>{parsed++;throw new SyntaxError('HTML login page');}}});
 await h.client.connect();
 await assert.rejects(h.client.call('runAnnualSetup',[]),/sign-in expired.*same year/s);
 assert.equal(parsed,0);
 await assert.rejects(h.client.call('getAnnualSetupConfig',[]),/Sign in again/);
 assert.equal(h.fetchCount,1);
});
test('non-JSON HTTP failures retain account and same-year recovery instructions',async()=>{
 for(const [status,message]of [[403,/denied access.*chapter account.*Cloud project/s],[500,/could not be reached.*same year/s]]){
  let parsed=0;
  const h=harness({response:{ok:false,status,json:async()=>{parsed++;throw new SyntaxError('HTML upstream error');}}});
  await h.client.connect();await assert.rejects(h.client.call('runAnnualSetup',[]),message);assert.equal(parsed,0);
 }
});
test('malformed successful responses never become completed setup results',async()=>{
 for(const json of [async()=>{throw new SyntaxError('broken JSON');},async()=>null,async()=>[],async()=>42,async()=>'<html>']){
  const h=harness({response:{ok:true,status:200,json}});await h.client.connect();
  await assert.rejects(h.client.call('runAnnualSetup',[]),/unreadable setup response.*same year/s);
 }
});
test('OAuth failures distinguish declined consent, account policy and client configuration',async()=>{
 for(const [error,message]of [['access_denied',/cancelled or permission was declined/],['admin_policy_enforced',/account policy blocked.*administrator/s],['invalid_client',/configured correctly.*OAuth client/s],['unauthorized_client',/not authorized.*OAuth configuration/s],['unexpected_error',/did not return authorization.*maintainer/s]]){
  const h=harness({oauth:{error}});await assert.rejects(h.client.connect(),message);
  await assert.rejects(h.client.call('getAnnualSetupConfig',[]),/Sign in again/);assert.equal(h.fetchCount,0);
 }
});
test('malformed OAuth callbacks and scope-check failures reject without leaving sign-in pending',async()=>{
 for(const options of [{oauth:null},{oauth:undefined},{oauth:{access_token:'ephemeral-test-token',expires_in:3600},scopeThrows:true}]){
  const h=harness(options);
  await assert.rejects(h.client.connect(),/did not return authorization|could not confirm Annual Setup permissions/);
  await assert.rejects(h.client.connect(),/did not return authorization|could not confirm Annual Setup permissions/);
  await assert.rejects(h.client.call('runAnnualSetup',[]),/Sign in again/);
  assert.equal(h.fetchCount,0);
 }
});
test('identity script that loads without the Google client can be retried',async()=>{
 const originalDocument=globalThis.document,originalGoogle=globalThis.google;
 const scripts=[];
 try{
  delete globalThis.google;
  globalThis.document={createElement:()=>({remove(){}}),head:{append:script=>scripts.push(script)}};
  const client=createAnnualSetupClient(config);
  scripts[0].onload();
  await Promise.resolve();await Promise.resolve();
  await assert.rejects(client.connect(),/sign-in is loading/);
  assert.equal(scripts.length,2);
  globalThis.google={accounts:{oauth2:{hasGrantedAllScopes:()=>true,initTokenClient:({callback})=>({requestAccessToken:()=>callback({access_token:'ephemeral-test-token',expires_in:3600})})}}};
  scripts[1].onload();
  await client.connect();
 }finally{
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  if(originalGoogle===undefined)delete globalThis.google;else globalThis.google=originalGoogle;
 }
});
