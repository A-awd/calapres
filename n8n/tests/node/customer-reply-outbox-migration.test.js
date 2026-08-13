'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const sql = readFileSync(join(
  __dirname,
  '../../postgres/migrations/0011_calapres_cs_customer_reply_outbox.sql',
), 'utf8');

test('migration 0011 adds idempotent model-budget reservations', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS calapres_cs\.model_budget_reservations/);
  assert.match(sql, /PRIMARY KEY \(brand_id, request_ref\)/);
  assert.match(sql, /outcome', 'reservation_reused'/);
  assert.match(sql, /outcome', 'request_ref_collision'/);
  assert.match(sql,
    /GRANT EXECUTE ON FUNCTION calapres_cs\.atomic_reserve_model_budget\(jsonb\)[\s\S]*TO calapres_cs_webhook_runtime, calapres_cs_webhook_login/);
});

test('migration 0011 installs a one-winner customer-reply outbox', () => {
  for (const table of ['customer_reply_events', 'customer_reply_scope_windows']) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS calapres_cs\\.${table}`));
  }
  for (const fn of [
    'atomic_claim_customer_reply_event',
    'atomic_claim_out_of_scope_notice',
    'atomic_claim_customer_reply_send',
    'atomic_complete_customer_reply_send',
    'atomic_finalize_customer_reply_event',
    'atomic_read_customer_reply_event',
  ]) {
    assert.match(sql, new RegExp(`CREATE OR REPLACE FUNCTION calapres_cs\\.${fn}\\(p_command jsonb\\)`));
    assert.match(sql, new RegExp(`ALTER FUNCTION calapres_cs\\.${fn}\\(jsonb\\)[\\s\\S]*OWNER TO calapres_cs_function_owner`));
  }
  assert.match(sql, /customer_egress_allowed', true/);
  assert.match(sql, /outcome', 'send_claimed'/);
  assert.match(sql, /outcome', 'send_reconciliation_required'/);
  assert.match(sql, /state IN \('processing', 'sending', 'sent', 'cancelled', 'escalated', 'failed', 'ambiguous'\)/);
  assert.match(sql, /last_sent_at > v_now - interval '24 hours'/);
  assert.match(sql, /VALUES \(11, 'calapres_cs_customer_reply_outbox'\)/);
});

test('migration 0011 is deny-first and stores no customer payloads', () => {
  assert.match(sql, /inbox_id integer NOT NULL CHECK \(inbox_id = 128058\)/);
  assert.match(sql, /account_id integer NOT NULL CHECK \(account_id = 179973\)/);
  assert.match(sql, /request_binding_sha256/);
  assert.match(sql, /final_reread_binding_sha256/);
  assert.match(sql, /REVOKE ALL ON TABLE[\s\S]*FROM PUBLIC/);
  assert.doesNotMatch(sql, /DROP\s+(?:SCHEMA|TABLE|FUNCTION)/i);
  assert.doesNotMatch(sql,
    /\b(?:raw_body|message_body|message_content|transcript|prompt_text|reply_text|phone_number|email_address|access_token|api_key)\b/i);
  assert.doesNotMatch(sql, /(?:INSERT|UPDATE)\s+[^;]*(?:content|phone|email|prompt|secret)/i);
});

