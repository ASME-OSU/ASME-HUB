import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const sources = ['AnnualSetupRunner.gs.example', 'AnnualSettingsDraftRunner.gs.example'].map(name =>
  readFileSync(new URL(`../integrations/apps-script/${name}`, import.meta.url), 'utf8'));
function fixture(destination) {
  const form = {
    getId: () => 'copied-form', getDestinationId: destination,
    isAcceptingResponses: () => false,
    getEditUrl: () => 'https://docs.google.com/forms/d/copied-form/edit',
    getPublishedUrl: () => 'https://docs.google.com/forms/d/e/published-form/viewform',
    setDestination: () => assert.fail('Read-only adapter unexpectedly changed destination')
  };
  const context = vm.createContext({
    annualCopyIO_: () => ({ lock: fn => fn(), now: () => 'now' }),
    FormApp: { openById: () => form }
  });
  sources.forEach(source => vm.runInContext(source, context));
  const copy = { ledgerId: 'private_copy_ledger_123456789', intendedOwner: 'owner@example.test' };
  const setup = context.annualSetupIO_(copy, {});
  const draft = context.annualSettingsDraftIO_(copy, {}, {
    ledgerId: 'private_draft_ledger_123456789', controlCenterId: 'control_center_123456789'
  }, {});
  return [() => setup.form('copied-form').destinationId,
    () => setup.read({ kind: 'destination', id: 'copied-form' }),
    () => draft.form('copied-form').destinationId];
}

test('all destination adapter reads handle the exact Google no-destination exception', () => {
  for (const message of ['The form currently has no response destination.',
    'Exception: The form currently has no response destination.']) {
    const error = new Error(message);
    for (const read of fixture(() => { throw error; })) assert.equal(read(), null);
  }
});
test('all destination adapter reads preserve linked Form identity and empty returns', () => {
  for (const value of ['copied-points-workbook', null, '']) {
    for (const read of fixture(() => value)) assert.equal(read(), value || null);
  }
});
test('authorization, service and similar destination errors are rethrown unchanged', () => {
  for (const message of ['Authorization is required.', 'Service unavailable',
    'The form currently has no response destination. Try again later.',
    'The form currently has no response destination']) {
    const error = new Error(message);
    for (const read of fixture(() => { throw error; })) {
      assert.throws(read, caught => caught === error);
    }
  }
});
