import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../assets/js/pwa.js',import.meta.url),'utf8');
function pwa({controlled=true,supported=true}={}){
 const windowEvents=new Map(),workerEvents=new Map(),messageWrites=[],registrations=[];
 let reloads=0,focusMoves=0,updates=0;
 const node=()=>({hidden:true,listeners:new Map(),addEventListener(name,callback){this.listeners.set(name,callback);},focus(){focusMoves++;}});
 const notice=node(),message=node(),reload=node(),install=[node(),node()],hint=node();
 Object.defineProperty(message,'textContent',{get:()=>messageWrites.at(-1)||'',set:value=>messageWrites.push(value)});
 const nodes=new Map([['app-update-notice',notice],['app-update-message',message],['app-update-reload',reload],['ios-install-hint',hint]]);
 const serviceWorker={controller:controlled?{}:null,ready:Promise.resolve(),addEventListener(name,callback){workerEvents.set(name,callback);},register:async(...args)=>{registrations.push(args);return {update:async()=>{updates++;}};}};
 const navigator={standalone:false,userAgent:'Fixture desktop',platform:'Fixture',maxTouchPoints:0,...(supported?{serviceWorker}:{})};
 const document={querySelectorAll:()=>install,getElementById:id=>nodes.get(id),documentElement:{dataset:{}}};
 const window={navigator,matchMedia:()=>({matches:false}),addEventListener(name,callback){windowEvents.set(name,callback);},location:{reload(){reloads++;}}};
 vm.runInNewContext(source,{window,navigator,document,console});
 return {notice,message,reload,install,hint,document,windowEvents,workerEvents,messageWrites,registrations,get reloads(){return reloads;},get focusMoves(){return focusMoves;},get updates(){return updates;},change(controller){serviceWorker.controller=controller;workerEvents.get('controllerchange')();}};
}

test('first service-worker claim is silent and never reloads an uncontrolled page',()=>{
 const h=pwa({controlled:false}),first={};
 h.change(null);h.change(first);h.change(first);
 assert.equal(h.notice.hidden,true);assert.equal(h.messageWrites.length,0);assert.equal(h.reloads,0);assert.equal(h.focusMoves,0);
});

test('replacement on an already controlled page shows one nonmodal notice without reload or focus movement',()=>{
 const h=pwa();h.change({});
 assert.equal(h.notice.hidden,false);assert.match(h.message.textContent,/update is ready.*Save your notes.*finish Annual Setup.*before reloading/);
 assert.equal(h.reloads,0);assert.equal(h.focusMoves,0);
 h.change({});h.change(null);h.change({});
 assert.equal(h.messageWrites.length,1);assert.equal(h.reloads,0);assert.equal(h.focusMoves,0);
});

test('a later replacement after the silent first claim becomes an explicit update notice',()=>{
 const h=pwa({controlled:false});h.change({});assert.equal(h.notice.hidden,true);
 h.change({});assert.equal(h.notice.hidden,false);assert.equal(h.messageWrites.length,1);assert.equal(h.reloads,0);
});

test('reload occurs only on explicit action and remains usable if navigation is canceled',()=>{
 const h=pwa();h.change({});assert.equal(h.reloads,0);
 h.reload.listeners.get('click')();assert.equal(h.reloads,1);
 // Returning from reload models the user canceling the browser's leave prompt.
 assert.equal(h.notice.hidden,false);assert.notEqual(h.reload.disabled,true);
 h.change({});assert.equal(h.messageWrites.length,1);assert.equal(h.reloads,1);
 h.reload.listeners.get('click')();assert.equal(h.reloads,2);
});

test('registration still checks for updates and marks worker readiness without reloading',async()=>{
 const h=pwa();h.windowEvents.get('load')();for(let i=0;i<10;i++)await Promise.resolve();
 assert.equal(h.registrations.length,1);assert.equal(h.registrations[0][0],'./sw.js');assert.equal(h.registrations[0][1].updateViaCache,'none');
 assert.equal(h.updates,1);assert.equal(h.document.documentElement.dataset.pwaReady,'true');assert.equal(h.reloads,0);
});

test('unsupported service workers do not expose an update notice and install prompts retain their explicit action',async()=>{
 const h=pwa({supported:false});assert.equal(h.notice.hidden,true);assert.equal(h.workerEvents.size,0);
 let prompted=0,prevented=false;
 h.windowEvents.get('beforeinstallprompt')({preventDefault(){prevented=true;},prompt(){prompted++;},userChoice:Promise.resolve({outcome:'accepted'})});
 assert.equal(prevented,true);assert.ok(h.install.every(button=>!button.hidden));assert.equal(prompted,0);
 await h.install[0].listeners.get('click')();assert.equal(prompted,1);assert.ok(h.install.every(button=>button.hidden));assert.equal(h.reloads,0);
});

test('update notice lives outside topbar and modal controls, with a polite status and native reload button',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/<\/header>\s*<aside class="app-update-notice"[^>]+aria-label="Hub update" hidden>[\s\S]*?<\/aside>\s*<main id="main-content">/);
 assert.match(html,/<p id="app-update-message" role="status" aria-live="polite"><\/p>/);
 assert.match(html,/<button[^>]+id="app-update-reload" type="button">Reload Hub<\/button>/);
 const css=readFileSync(new URL('../assets/css/styles.css',import.meta.url),'utf8');
 assert.doesNotMatch(css.match(/\.app-update-notice \{[^}]+\}/)[0],/position:\s*(fixed|absolute|sticky)/);
 assert.match(css,/@media \(max-width: 600px\)\s*\{\s*\.app-update-notice \{\s*flex-direction: column/);
});
