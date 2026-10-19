import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context = {Intl, Date};
vm.runInNewContext(readFileSync(new URL('../assets/js/social-health.js', import.meta.url),'utf8'), context);
const {evaluate, unavailable} = context.ASME_SOCIAL_HEALTH;
const now = Date.parse('2026-10-19T18:00:00Z');
const stamp = new Date(now).toISOString();
const calendarUrl = 'https://calendar.example/basic.ics';
const options = {year:'2026-2027',now,calendarHealthy:true,calendarUrl};
function fixture() {
  return {schemaVersion:1,generatedAt:stamp,activeYear:'2026-27',config:{groupme:{enabled:true,mode:'bot'}},tokenWarning:{status:'healthy',configured:true,checkedAt:stamp},calendar:{generatedAt:stamp,feedUrl:calendarUrl,candidates:[]},campaigns:[]};
}
function campaign() {
  return {id:'test',year:'2026-27',title:'Workshop',start:'2026-10-22T21:30:00Z',end:'2026-10-22T22:30:00Z',revision:1,channels:{feed:{enabled:true,dueAt:'2026-10-15T16:00:00Z',status:'done',mediaId:'123',postedAt:'2026-10-15T16:30:00Z'},story:{enabled:true,dueAt:'2026-10-19T16:00:00Z',status:'pending'},groupme:{enabled:false}}};
}
test('real receipts and not-yet-due scheduling are distinguished with hourly grace',()=>{
 const feed=fixture();const c=campaign();c.channels.story.dueAt='2026-10-19T17:00:00Z';feed.campaigns=[c];
 const r=evaluate(feed,options);assert.equal(r.health.status,'LIVE');assert.match(r.health.detail,/1 publication receipt verified; 1 enabled post not yet due/);
 c.channels.story.dueAt='2026-10-19T15:59:00Z';assert.match(evaluate(feed,options).health.detail,/story is overdue/);
});
test('done labels, examples, and skipped windows never supply publication proof',()=>{
 const feed=fixture();const c=campaign();feed.campaigns=[c];delete c.channels.feed.mediaId;c.channels.story.status='skipped';
 let r=evaluate(feed,options);assert.match(r.health.detail,/done without a publication receipt/);assert.match(r.health.detail,/window skipped/);
 c.demo=true;assert.equal(evaluate(feed,options).health.status,'LIVE');
 const e={id:'event::2026-10-22',title:'Workshop',startAt:c.start,allDay:false};feed.calendar.candidates=[{id:e.id,title:e.title,start:c.start,dueAt:{feed:'2026-10-15T16:00:00Z'}}];
 r=evaluate(feed,{...options,calendarEvents:[e]});assert.match(r.health.detail,/no real campaign or posting receipt/);
});
test('explicitly disabled, cancelled, archived and other-year campaigns do not trigger missing-post alerts',()=>{
 const feed=fixture();for(const flag of ['cancelled','archived'])feed.campaigns.push({...campaign(),[flag]:true});
 feed.campaigns.push({...campaign(),year:'2025-26'});const c=campaign();Object.values(c.channels).forEach(ch=>ch.enabled=false);feed.campaigns.push(c);
 assert.equal(evaluate(feed,options).health.status,'LIVE');
});
test('failed and ambiguous writes remain actionable even when timestamps or IDs exist',()=>{
 const feed=fixture();const c=campaign();feed.campaigns=[c];c.channels.feed.status='failed';c.channels.story.publishAttemptedAt=stamp;
 const r=evaluate(feed,options);assert.match(r.health.detail,/failed or needs reconciliation/);assert.match(r.health.detail,/outcome is unconfirmed/);
});
test('GroupMe bot acknowledgement and native revision receipts follow configured mode',()=>{
 const feed=fixture();const c=campaign();c.channels.story.enabled=false;c.channels.groupme={enabled:true,dueAt:'2026-10-15T16:00:00Z',status:'done',botSentAt:'2026-10-15T16:00:00Z'};feed.campaigns=[c];
 assert.equal(evaluate(feed,options).health.status,'LIVE');feed.config.groupme.mode='native';c.channels.groupme={enabled:true,immediate:true,status:'pending',eventId:'event',syncedRevision:0};
 assert.match(evaluate(feed,options).health.detail,/needs native event creation or an update receipt/);c.channels.groupme.syncedRevision=1;assert.equal(evaluate(feed,options).health.status,'LIVE');
});
test('calendar occurrence identity matches campaigns without conflating weekly recurrences',()=>{
 const feed=fixture();const c=campaign();c.channels.story.enabled=false;c.source={uid:'weekly::2026-10-22'};feed.campaigns=[c];
 const event={id:c.source.uid,title:'Changed calendar title',startAt:c.start,allDay:false};assert.equal(evaluate(feed,{...options,calendarEvents:[event]}).health.status,'LIVE');
 event.id='weekly::2026-10-29';event.startAt='2026-10-29T21:30:00Z';feed.calendar.candidates=[{id:event.id,title:event.title,start:event.startAt,dueAt:{feed:'2026-10-22T16:00:00Z'}}];assert.equal(evaluate(feed,{...options,calendarEvents:[event]}).health.status,'LIVE');
 feed.calendar.candidates[0].dueAt.feed='2026-10-18T16:00:00Z';assert.match(evaluate(feed,{...options,calendarEvents:[event]}).health.detail,/no real campaign/);
});
test('unknown, stale, malformed or wrong-year/source data cannot appear healthy',()=>{
 assert.equal(unavailable('No connection').health.status,'ACTION');assert.equal(evaluate({},options).health.status,'ACTION');
 const malformed=fixture();malformed.campaigns=[null];assert.equal(evaluate(malformed,options).health.status,'ACTION');
 for(const mutate of [f=>f.generatedAt='bad',f=>f.generatedAt='2026-10-19T00:00:00Z',f=>f.generatedAt='2026-10-20T00:00:00Z',f=>f.calendar.generatedAt='2026-10-10T00:00:00Z',f=>f.calendar.feedUrl='other',f=>f.activeYear='2027-28',f=>f.tokenWarning.status='unknown',f=>f.tokenWarning.configured=false]) {const f=fixture();mutate(f);assert.equal(evaluate(f,options).health.status,'ACTION');}
 assert.equal(evaluate(fixture(),{...options,calendarHealthy:false}).health.status,'ACTION');
});
test('academic all-day notices excluded, unmatched timed events and ambiguous campaigns require review',()=>{
 const feed=fixture();const event={id:'unknown',title:'Classes begin',date:'2026-10-20T00:00:00Z',allDay:true};assert.equal(evaluate(feed,{...options,calendarEvents:[event]}).health.status,'LIVE');
 event.allDay=false;assert.match(evaluate(feed,{...options,calendarEvents:[event]}).health.detail,/missing from Social Hub/);
 const c=campaign();c.channels.story.enabled=false;c.source={uid:event.id};event.date=c.start;feed.campaigns=[c,{...c,id:'duplicate'}];assert.match(evaluate(feed,{...options,calendarEvents:[event]}).health.detail,/multiple campaigns/);
});
test('actual Hub and Social occurrence formats match imported campaigns even after title changes',()=>{
 const feed=fixture();const c=campaign();c.channels.story.enabled=false;c.source={uid:'weekly@google.com::2026-10-22T21:30:00.000Z',calendarUid:'weekly@google.com'};feed.campaigns=[c];
 const event={id:'weekly@google.com:2026-10-22T17:30:00',title:'Renamed Workshop',startAt:'2026-10-22T21:30:00.000Z',allDay:false};
 // Used imports disappear from candidates; the retained campaign must match.
 assert.equal(feed.calendar.candidates.length,0);assert.equal(evaluate(feed,{...options,calendarEvents:[event]}).health.status,'LIVE');
 delete c.source.calendarUid;assert.equal(evaluate(feed,{...options,calendarEvents:[event]}).health.status,'LIVE');
 event.id='weekly@google.com:2026-10-29T17:30:00';event.startAt='2026-10-29T21:30:00.000Z';assert.match(evaluate(feed,{...options,calendarEvents:[event]}).health.detail,/missing from Social Hub/);
});
test('source-linked campaigns cannot satisfy a different calendar UID with the same title and time',()=>{
 const feed=fixture();const c=campaign();c.channels.story.enabled=false;c.source={uid:'one@google.com::2026-10-22T21:30:00.000Z',calendarUid:'one@google.com'};feed.campaigns=[c];
 const event={id:'two@google.com:2026-10-22T17:30:00',title:c.title,startAt:c.start,allDay:false};
 feed.calendar.candidates=[{id:'two@google.com::2026-10-22T21:30:00.000Z',title:c.title,start:c.start,source:{calendarUid:'two@google.com'},dueAt:{feed:'2026-10-15T16:00:00Z'}}];
 assert.match(evaluate(feed,{...options,calendarEvents:[event]}).health.detail,/no real campaign/);
 delete c.source;assert.equal(evaluate(feed,{...options,calendarEvents:[event]}).health.status,'LIVE');
});
test('candidate matching bridges real occurrence formats without relying on titles or other UIDs',()=>{
 const feed=fixture();const event={id:'chapter:event@google.com:2026-10-22T17:30:00',title:'Updated title',startAt:'2026-10-22T21:30:00Z',allDay:false};
 const candidate={id:'chapter:event@google.com::2026-10-22T21:30:00.000Z',title:'Old title',start:event.startAt,dueAt:{feed:'2026-10-15T16:00:00Z'}};feed.calendar.candidates=[candidate];
 assert.match(evaluate(feed,{...options,calendarEvents:[event]}).health.detail,/no real campaign/);
 candidate.id='other@google.com::2026-10-22T21:30:00.000Z';candidate.title=event.title;assert.match(evaluate(feed,{...options,calendarEvents:[event]}).health.detail,/missing from Social Hub/);
});


test('native GroupMe event receipt does not mask a missing or uncertain announcement',()=>{
 const feed=fixture();feed.config.groupme.mode='native';const c=campaign();c.channels.story.enabled=false;c.channels.groupme={enabled:true,immediate:true,status:'done',eventId:'native',syncedRevision:1,schedule:{announce:true}};feed.campaigns=[c];
 assert.match(evaluate(feed,options).health.detail,/without a publication receipt/);
 c.channels.groupme.status='pending';c.channels.groupme.botAttemptedAt=stamp;assert.match(evaluate(feed,options).health.detail,/outcome is unconfirmed/);
 c.channels.groupme.botSentAt=stamp;assert.equal(evaluate(feed,options).health.status,'LIVE');
});
test('one manual campaign cannot satisfy distinct calendar occurrences with the same title and time',()=>{
 const feed=fixture();const c=campaign();c.channels.story.enabled=false;feed.campaigns=[c];const events=['one','two'].map(id=>({id,title:c.title,startAt:c.start,allDay:false}));
 assert.match(evaluate(feed,{...options,calendarEvents:events}).health.detail,/manual campaign matches multiple/);
});
