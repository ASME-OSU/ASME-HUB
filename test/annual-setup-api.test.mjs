import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnnualSetupClient} from '../assets/js/annual-setup-api.js';
const config = {clientId:'123-test.apps.googleusercontent.com',deploymentId:'API-deployment',scopes:['https://www.googleapis.com/auth/drive']};
function harness(options={}) {
 let stamp=0, sent, init;
 const identity={hasGrantedAllScopes:()=>options.granted!==false,initTokenClient(value){init=value;return {requestAccessToken(){value.callback({access_token:'ephemeral-test-token',expires_in:3600});}};}};
 const client=createAnnualSetupClient(config,{identity:()=>identity,now:()=>stamp,fetch:async(url,request)=>{sent={url,request};return options.response || {ok:true,status:200,json:async()=>({done:true,response:{result:{example:true}}})};}});
 return {client,get sent(){return sent;},get init(){return init;},expire(){stamp=3300000;}};
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
