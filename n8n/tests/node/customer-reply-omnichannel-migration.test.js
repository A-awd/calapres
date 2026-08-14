import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync(
  new URL('../../postgres/migrations/0015_calapres_cs_customer_reply_omnichannel.sql', import.meta.url),
  'utf8',
);

test('migration 0015 allowlists only the three Calapres customer-service inboxes', () => {
  assert.match(sql, /CHECK \(inbox_id IN \(128031, 128033, 128058\)\)/);
  assert.match(sql, /v_inbox NOT IN \(128031, 128033, 128058\)/);
  assert.doesNotMatch(sql, /128028|128326/);
});

test('migration 0015 updates every inbox-bound customer-reply function', () => {
  const functions = [...sql.matchAll(/CREATE OR REPLACE FUNCTION calapres_cs\.([a-z0-9_]+)/g)]
    .map((match) => match[1]);
  assert.equal(functions.length, 10);
  assert.equal(new Set(functions).size, 10);
  assert.ok(functions.includes('atomic_claim_customer_reply_event'));
  assert.ok(functions.includes('atomic_upsert_customer_reply_sla_case'));
  assert.ok(functions.includes('atomic_finalize_customer_reply_sla_escalation'));
  assert.ok(functions.includes('atomic_fail_customer_reply_recovery'));
  assert.ok(functions.includes('atomic_release_customer_reply_recovery'));
});

test('migration 0015 is registered exactly once', () => {
  assert.match(sql, /VALUES \(15, 'calapres_cs_customer_reply_omnichannel'\)/);
});
