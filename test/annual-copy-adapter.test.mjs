import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../integrations/apps-script/AnnualCopyRunner.gs.example', import.meta.url), 'utf8');
function fixture() {
  let content = '{"schema":1,"runs":{}}';
  const calls = [];
  const env = {
    Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.test' }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => calls.push('release') }) },
    DriveApp: { getFileById: () => ({ setContent: value => { content = value; }, getBlob: () => ({ getDataAsString: () => content }) }) },
    Drive: { Files: {
      get: id => ({ id }),
      list: options => { calls.push(options); return options.pageToken ? { files: [{ id: 'second' }] } : { nextPageToken: 'next', files: [{ id: 'first' }] }; },
      copy: (...args) => { calls.push(args); return { id: 'copy' }; },
      create: (...args) => { calls.push(args); return { id: 'folder' }; }
    }, Permissions: { list: (id, options) => options.pageToken ? { permissions: [{ type: 'user', emailAddress: 'officer@example.test' }] } : { nextPageToken: 'next', permissions: [{ type: 'user', emailAddress: 'owner@example.test' }] } } }
  };
  const context = vm.createContext(env); vm.runInContext(source, context);
  return { io: context.annualCopyIO_({ ledgerId: 'ledger' }), env, calls };
}
test('adapter paginates marker and permission reads', () => { const f = fixture(); const found = f.io.find('chapter:2027-2028:points'); assert.equal(found.length, 2); assert.equal(found[1].permissions.length, 2); assert.equal(f.calls[1].pageToken, 'next'); });
test('adapter rejects incomplete reconciliation', () => { const f = fixture(); f.env.Drive.Files.list = () => ({ incompleteSearch: true }); assert.throws(() => f.io.find('operation'), /Incomplete/); });
test('native copy and folder preserve exact parent/marker and suppress default visibility', () => { const f = fixture(); f.io.create({ kind: 'copy', name: 'Points', source: { id: 'source' } }, 'parent', 'op'); f.io.create({ kind: 'folder', name: 'Year' }, 'root', 'folderOp'); assert.equal(f.calls[0][1], 'source'); assert.equal(f.calls[0][0].parents[0], 'parent'); assert.equal(f.calls[0][0].appProperties.transitionOperation, 'op'); assert.equal(f.calls[0][2].ignoreDefaultVisibility, true); assert.equal(f.calls[1][0].mimeType, 'application/vnd.google-apps.folder'); });
test('adapter lock releases after failure and refuses contention', () => { const f = fixture(); assert.throws(() => f.io.lock(() => { throw Error('Failure'); }), /Failure/); assert.equal(f.calls[0], 'release'); f.env.LockService.getScriptLock = () => ({ tryLock: () => false }); assert.throws(() => f.io.lock(() => assert.fail('Ran despite lock')), /active/); });
test('Google ledger saves exact JSON and detects unavailable acknowledgement', () => { const f = fixture(); f.io.save({ schema: 1, runs: {} }); assert.equal(f.io.load().schema, 1); f.env.DriveApp.getFileById = () => ({ setContent: () => {}, getBlob: () => ({ getDataAsString: () => 'old' }) }); assert.throws(() => f.io.save({ schema: 1 }), /acknowledgement/); });

test('missing granular consent stops preview and creation before config, lock, engine or Drive writes', () => {
  for (const entry of ['previewAnnualCopies', 'createOrResumeAnnualCopies']) {
    const calls = [];
    const context = vm.createContext({
      ScriptApp: { AuthMode: { FULL: 'FULL' }, requireAllScopes: mode => { calls.push(['consent', mode]); throw Error('Missing consent'); } },
      PropertiesService: { getScriptProperties: () => assert.fail('Read configuration before consent') },
      LockService: { getScriptLock: () => assert.fail('Acquired lock before consent') },
      AnnualCopyEngine: { execute: () => assert.fail('Executed engine before consent') },
      Drive: { Files: { create: () => assert.fail('Created before consent'), copy: () => assert.fail('Copied before consent') } }
    });
    vm.runInContext(source, context);
    assert.throws(() => context[entry](), /Missing consent/);
    assert.deepEqual(calls, [['consent', 'FULL']]);
  }
});
test('granted consent precedes private configuration and forwards correct execution mode', () => {
  const calls = [];
  const context = vm.createContext({
    ScriptApp: { AuthMode: { FULL: 'FULL' }, requireAllScopes: mode => calls.push(['consent', mode]) },
    PropertiesService: { getScriptProperties: () => { calls.push(['config']); return { getProperty: () => '{"ledgerId":"private"}' }; } },
    AnnualCopyEngine: { execute: (config, io, preview) => { calls.push(['engine', preview]); return { mode: preview }; } }
  });
  vm.runInContext(source, context);
  assert.equal(context.previewAnnualCopies().mode, true);
  assert.equal(context.createOrResumeAnnualCopies().mode, false);
  assert.deepEqual(calls, [['consent', 'FULL'], ['config'], ['engine', true], ['consent', 'FULL'], ['config'], ['engine', false]]);
});
