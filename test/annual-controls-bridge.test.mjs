import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {runEmbeddedAnnualAction, annualControlsSourceMatches} from '../assets/js/annual-controls-bridge.js';
const context={year:'2029-2030',mode:'rehearsal',runKey:'ASME_SIMPLE_ANNUAL_'+JSON.stringify(['2029-2030','practice_root_123456789012345','practice_center_123456789012345']),rootFolderId:'practice_root_123456789012345',controlCenterId:'practice_center_123456789012345',configRevision:'revision-1'};
function harness(extra={}){
 const listeners=new Map(),timers=new Map(),sent=[];let seq=0,removed=0,guard=0;
 const outer={};outer.parent=outer;const inner={parent:outer,postMessage:(data,origin)=>sent.push({data,origin})};
 const frame={contentWindow:outer,setAttribute(){},remove(){removed++;}};
 const window={location:{origin:'https://asme-osu.github.io'},addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
 const document={createElement:()=>frame,body:{append(){}}};
 const promise=runEmbeddedAnnualAction({url:'https://script.google.com/macros/s/SETUP_DEPLOYMENT_123456789012345/exec',context,action:'connect',assertContext(){guard++;if(extra.stale)throw Error('Changed checklist');},...extra.options},{window,document,crypto:webcrypto,setTimeout:(fn,delay)=>{timers.set(++seq,{fn,delay});return seq;},clearTimeout:key=>timers.delete(key)});
 const nonce=()=>new URL(frame.src).searchParams.get('nonce');
 const emit=(type,changes={},event={})=>listeners.get('message')?.({origin:'https://n-abc-script.googleusercontent.com',source:inner,data:{channel:'asme-annual-controls-v1',nonce:nonce(),year:context.year,mode:context.mode,runKey:context.runKey,configRevision:context.configRevision,type,...changes},...event});
 return {promise,emit,frame,inner,outer,sent,timers,listeners,removed:()=>removed,guard:()=>guard};
}
test('loading an embed never sends an action; only a bound ready handshake does',async()=>{
 const h=harness();assert.equal(h.sent.length,0);assert.match(new URL(h.frame.src).searchParams.get('nonce'),/^[a-f0-9]{64}$/);
 h.emit('ready');assert.equal(h.sent.length,1);assert.equal(h.sent[0].data.action,'connect');assert.equal(h.sent[0].origin,'https://n-abc-script.googleusercontent.com');h.emit('ready');assert.equal(h.sent.length,1);
 h.emit('result',{report:{mock:'observed result'}});assert.deepEqual(await h.promise,{mock:'observed result'});assert.equal(h.removed(),1);assert.equal(h.listeners.size,0);assert.equal(h.timers.size,0);
});
test('foreign origins, unrelated windows, nonces and changed year/mode/run/revision cannot authorize actions',async()=>{
 const h=harness();
 for(const event of [{origin:'https://evil.test'},{origin:'https://n-abc-script.googleusercontent.com.evil.test'},{source:{parent:null}}])h.emit('ready',{},event);
 for(const changes of [{nonce:'wrong'},{year:'2030-2031'},{mode:'production'},{runKey:'other'},{configRevision:'other'}])h.emit('ready',changes);
 assert.equal(h.sent.length,0);h.emit('ready');h.emit('result',{report:true});assert.equal(await h.promise,true);
});
test('a sibling Google sandbox cannot supply the result after the handshake',async()=>{
 const h=harness();h.emit('ready');h.emit('result',{report:'wrong'},{source:{parent:h.outer}});h.emit('result',{report:'right'});assert.equal(await h.promise,'right');
});
test('stop requires explicit confirmation and sends it only for the requested stop',async()=>{
 const no=harness({options:{action:'stop'}});await assert.rejects(no.promise,/Confirm/);assert.equal(no.sent.length,0);
 const yes=harness({options:{action:'stop',confirmStop:true}});yes.emit('ready');assert.equal(yes.sent[0].data.confirmStop,true);yes.emit('result',{report:true});await yes.promise;
});
test('timeouts distinguish no action from an unconfirmed started action and clean up',async()=>{
 for(const started of [false,true]){const h=harness();if(started)h.emit('ready');const timer=[...h.timers.values()][0];assert.equal(timer.delay,started?390000:30000);const rejected=assert.rejects(h.promise,started?/Check connections before retrying/:/No connection action was sent/);timer.fn();await rejected;assert.equal(h.listeners.size,0);assert.equal(h.removed(),1);}
});
test('changed checklist rejects before any command is sent',async()=>{const h=harness({stale:true});await assert.rejects(h.promise,/Changed checklist/);assert.equal(h.sent.length,0);});
test('source ancestry is bounded and refuses inaccessible and unrelated windows',()=>{const root={};root.parent=root;assert.equal(annualControlsSourceMatches({parent:root},root),true);assert.equal(annualControlsSourceMatches(root,{}),false);assert.equal(annualControlsSourceMatches({get parent(){throw Error('blocked');}},root),false);});
