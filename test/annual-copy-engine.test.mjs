import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../integrations/apps-script/AnnualCopyEngine.gs.example', import.meta.url), 'utf8'), context);
const engine = context.AnnualCopyEngine;
const folder = 'application/vnd.google-apps.folder';
const sheet = 'application/vnd.google-apps.spreadsheet';
function fixture() {
  const config = { schema: 1, namespace: 'test', year: '2027-2028', parentId: 'parent', ledgerId: 'ledger', intendedOwner: 'owner@example.test', items: [
    { key: 'annual', kind: 'folder', parentKey: 'root', name: 'Annual 2027-2028' },
    { key: 'points', kind: 'copy', parentKey: 'annual', name: 'Points 2027-2028', source: { id: 'source', name: 'Clean points', mimeType: sheet, owner: 'owner@example.test', version: '1', cleanReviewed: true, reviewNote: 'Synthetic blank fixture inspected' } }
  ] };
  const file = (id, mimeType, name) => ({ id, name, mimeType, version: '1', owners: [{ emailAddress: config.intendedOwner }], permissions: [{ type: 'user', emailAddress: config.intendedOwner, role: 'owner' }], capabilities: { canEdit: true, canCopy: true, canAddChildren: true } });
  const files = { parent: file('parent', folder, 'Private parent'), ledger: file('ledger', 'application/json', 'Ledger'), source: file('source', sheet, 'Clean points') };
  let durable = { schema: 1, runs: {} }, writes = 0, creates = 0;
  const io = {
    actor: () => config.intendedOwner, now: () => '2026-09-30T00:00:00Z', lock: fn => fn(),
    metadata: id => { if (!files[id]) throw Error('Missing file'); return structuredClone(files[id]); },
    load: () => structuredClone(durable), save: value => { durable = structuredClone(value); writes++; },
    find: marker => Object.values(files).filter(f => f.appProperties?.transitionOperation === marker).map(f => structuredClone(f)),
    create: (item, parentId, marker) => { creates++; const id = `new${creates}`; files[id] = { ...file(id, item.kind === 'folder' ? folder : sheet, item.name), parents: [parentId], appProperties: { transitionOperation: marker } }; return { id }; }
  };
  return { config, io, files, ledger: () => durable, writes: () => writes, creates: () => creates };
}
test('dry run describes ordered plan without mutation', () => { const f = fixture(); const r = engine.execute(f.config, f.io, true); assert.equal(r.operations.length, 2); assert.equal(f.writes(), 0); assert.equal(f.creates(), 0); });
test('native create then repeat reuses exact identities and ledger', () => { const f = fixture(); const r = engine.execute(f.config, f.io, false); assert.equal(r.operations[1].id, 'new2'); engine.execute(f.config, f.io, false); assert.equal(f.creates(), 2); assert.equal(f.files.new2.parents[0], 'new1'); });
test('lost copy response is reconciled without repeating the copy', () => { const f = fixture(); const create = f.io.create; f.io.create = (...args) => { const result = create(...args); if (args[0].kind === 'copy') throw Error('Timeout after commit'); return result; }; assert.throws(() => engine.execute(f.config, f.io, false), /Timeout/); f.io.create = create; engine.execute(f.config, f.io, false); assert.equal(f.creates(), 2); });
test('pending without visible candidate blocks all retries', () => { const f = fixture(); f.io.create = () => { throw Error('Unknown transport outcome'); }; assert.throws(() => engine.execute(f.config, f.io, false), /Unknown/); assert.throws(() => engine.execute(f.config, f.io, false), /Unknown prior/); assert.equal(f.creates(), 0); });
test('lost ledger commit after creation reconciles same file', () => { const f = fixture(); const save = f.io.save; let n = 0; f.io.save = value => { if (++n === 2) throw Error('Ledger acknowledgement lost'); save(value); }; assert.throws(() => engine.execute(f.config, f.io, false), /acknowledgement/); f.io.save = save; engine.execute(f.config, f.io, false); assert.equal(f.creates(), 2); });
test('unacknowledged intent never sends external creation', () => { const f = fixture(); f.io.save = () => { throw Error('Ledger unavailable'); }; assert.throws(() => engine.execute(f.config, f.io, false), /unavailable/); assert.equal(f.creates(), 0); });
test('ambiguous marker blocks resume', () => { const f = fixture(); engine.execute(f.config, f.io, false); f.files.duplicate = { ...f.files.new1, id: 'duplicate' }; assert.throws(() => engine.execute(f.config, f.io, false), /ambiguous/); assert.equal(f.creates(), 2); });
test('same year changed plan is rejected', () => { const f = fixture(); engine.execute(f.config, f.io, false); f.config.items[1].name = 'Different'; assert.throws(() => engine.execute(f.config, f.io, false), /plan differs/); });
test('public, shared-drive, wrong-owner and incapable parents fail before writing', () => { for (const mutate of [f => f.files.parent.permissions.push({ type: 'anyone' }), f => f.files.parent.driveId = 'shared', f => f.files.parent.owners[0].emailAddress = 'other', f => f.files.parent.capabilities.canAddChildren = false]) { const f = fixture(); mutate(f); assert.throws(() => engine.execute(f.config, f.io, false)); assert.equal(f.creates(), 0); } });
test('source certificate is bound to version and clean review', () => { for (const mutate of [f => f.files.source.version = '2', f => f.config.items[1].source.cleanReviewed = false, f => f.files.source.capabilities.canCopy = false]) { const f = fixture(); mutate(f); assert.throws(() => engine.execute(f.config, f.io, false)); assert.equal(f.creates(), 0); } });
test('unknown actor and lock contention block writes', () => { const f = fixture(); f.io.actor = () => ''; assert.throws(() => engine.execute(f.config, f.io, false), /intended/); f.io.lock = () => { throw Error('Busy'); }; assert.throws(() => engine.execute(f.config, f.io, false), /Busy/); assert.equal(f.creates(), 0); });
test('corrupt ledger, parent ordering and invalid years are rejected', () => { for (const mutate of [f => f.io.load = () => ({}), f => f.config.items[0].parentKey = 'points', f => f.config.year = '2027-2029', f => f.config.items[1].key = 'annual']) { const f = fixture(); mutate(f); assert.throws(() => engine.execute(f.config, f.io, false)); assert.equal(f.creates(), 0); } });
test('changed or public created files fail resume', () => { const f = fixture(); engine.execute(f.config, f.io, false); f.files.new2.permissions.push({ type: 'domain' }); assert.throws(() => engine.execute(f.config, f.io, false), /Private/); assert.equal(f.creates(), 2); });
test('post-copy privacy failure leaves intent pending and stops later operations', () => { const f = fixture(); const create = f.io.create; f.io.create = (...args) => { const result = create(...args); f.files[result.id].permissions.push({ type: 'anyone' }); return result; }; assert.throws(() => engine.execute(f.config, f.io, false), /Private/); assert.equal(f.creates(), 1); assert.equal(f.ledger().runs['2027-2028'].operations.annual.state, 'pending'); });

test('namespace changes cannot bypass existing year ledger', () => { const f = fixture(); engine.execute(f.config, f.io, false); f.config.namespace = 'other'; assert.throws(() => engine.execute(f.config, f.io, false), /plan differs/); assert.equal(f.creates(), 2); });

test('Google actor, configured owner, source and created owners compare case-insensitively after trimming', () => {
  const f = fixture();
  f.config.intendedOwner = ' Owner@Example.Test ';
  f.config.items[1].source.owner = ' OWNER@example.TEST ';
  f.io.actor = () => 'owner@example.test';
  f.files.parent.owners[0].emailAddress = 'OWNER@EXAMPLE.TEST';
  f.files.ledger.owners[0].emailAddress = ' owner@example.test ';
  const create = f.io.create;
  f.io.create = (...args) => { const result = create(...args); f.files[result.id].owners[0].emailAddress = 'owner@EXAMPLE.test'; return result; };
  engine.execute(f.config, f.io, false);
  engine.execute(f.config, f.io, false);
  assert.equal(f.creates(), 2);
});
test('email normalization never authorizes a distinct or missing Google identity', () => {
  for (const actor of ['other@example.test', ' OWNER+OTHER@EXAMPLE.TEST ', '', '   ', null]) {
    const f = fixture(); f.io.actor = () => actor;
    assert.throws(() => engine.execute(f.config, f.io, false), /intended/);
    assert.equal(f.creates(), 0);
  }
  const f = fixture(); f.files.source.owners[0].emailAddress = ' OWNER+OTHER@EXAMPLE.TEST ';
  assert.throws(() => engine.execute(f.config, f.io, false), /Owner/);
  assert.equal(f.creates(), 0);
});
