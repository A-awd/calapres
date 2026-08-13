'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const sql = readFileSync(join(
  __dirname,
  '../../postgres/migrations/0014_calapres_cs_customer_reply_sla_escalation.sql',
), 'utf8');

test('migration 0014 durably tracks one open case per conversation without resetting the clock', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS calapres_cs\.customer_reply_sla_cases/);
  assert.match(sql, /customer_reply_sla_cases_one_open_per_conversation_idx/);
  assert.match(sql, /WHERE state IN \('open', 'claimed_for_escalation'\)/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION calapres_cs\.atomic_upsert_customer_reply_sla_case/);
  assert.match(sql, /already_touched/);
  assert.doesNotMatch(sql, /first_unresolved_at\s*=\s*v_now/);
});

test('migration 0014 claims due cases atomically and never grants send/customer egress', () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION calapres_cs\.atomic_claim_due_customer_reply_sla_escalation/);
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /state = 'open'/);
  assert.match(sql, /v_min_age NOT BETWEEN 82800 AND 172800/);
  assert.match(sql, /customer_egress_allowed', false/);
  assert.doesNotMatch(sql, /customer_egress_allowed', true/);
});

test('migration 0014 finalize supports escalated, released, and ineligible-resolved outcomes only', () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION calapres_cs\.atomic_finalize_customer_reply_sla_escalation/);
  assert.match(sql, /v_outcome NOT IN \('escalated', 'released', 'ineligible'\)/);
  assert.match(sql, /SET state = 'escalated'/);
  assert.match(sql, /SET state = 'resolved'/);
  assert.match(sql, /SET state = 'open', escalation_lease_token = NULL/);
  assert.match(sql, /v_retry_delay NOT BETWEEN 60 AND 900/);
});

test('migration 0014 keeps direct table access denied and grants EXECUTE only to the webhook runtime', () => {
  assert.match(sql, /REVOKE ALL ON TABLE calapres_cs\.customer_reply_sla_cases/);
  assert.match(sql, /FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_webhook_runtime,/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION calapres_cs\.atomic_upsert_customer_reply_sla_case\(jsonb\),\s*\n\s*calapres_cs\.atomic_claim_due_customer_reply_sla_escalation\(jsonb\),\s*\n\s*calapres_cs\.atomic_finalize_customer_reply_sla_escalation\(jsonb\)\s*\n\s*TO calapres_cs_webhook_runtime, calapres_cs_webhook_login/);
  assert.doesNotMatch(sql, /DROP\s+(?:SCHEMA|TABLE|FUNCTION)/i);
  assert.doesNotMatch(sql,
    /\b(?:raw_body|message_body|message_content|transcript|prompt_text|reply_text|phone_number|email_address|access_token|api_key)\b/i);
});

test('migration 0014 functions pin SECURITY DEFINER and the exact search_path convention', () => {
  const functionBlocks = sql.split(/CREATE OR REPLACE FUNCTION/).slice(1);
  assert.equal(functionBlocks.length, 3);
  for (const block of functionBlocks) {
    assert.match(block, /SECURITY DEFINER/);
    assert.match(block, /SET search_path TO pg_catalog, calapres_cs, pg_temp/);
  }
});

test('migration 0014 registers as schema version 14', () => {
  assert.match(sql, /VALUES \(14, 'calapres_cs_customer_reply_sla_escalation'\)/);
});
