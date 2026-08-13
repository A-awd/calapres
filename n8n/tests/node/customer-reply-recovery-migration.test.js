'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const sql = readFileSync(join(
  __dirname,
  '../../postgres/migrations/0012_calapres_cs_customer_reply_recovery.sql',
), 'utf8');

test('migration 0012 adds a one-winner recovery queue without resend authority', () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION calapres_cs\.atomic_claim_due_customer_reply_recovery/);
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /state IN \('sending', 'ambiguous'\)/);
  assert.match(sql, /outcome', 'recovery_claimed'/);
  assert.match(sql, /customer_egress_allowed', false/);
  assert.doesNotMatch(sql, /customer_egress_allowed', true/);
});

test('migration 0012 can close an unreconciled send but cannot reset it for retry', () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION calapres_cs\.atomic_fail_customer_reply_recovery/);
  assert.match(sql, /SET state = 'failed'/);
  assert.doesNotMatch(sql, /SET state = 'processing'/);
  assert.doesNotMatch(sql, /SET state = 'sending'/);
  assert.match(sql, /VALUES \(12, 'calapres_cs_customer_reply_recovery'\)/);
});

test('migration 0012 remains identifier-only and keeps runtime table access revoked', () => {
  assert.match(sql, /GRANT EXECUTE ON FUNCTION[\s\S]*TO calapres_cs_webhook_runtime, calapres_cs_webhook_login/);
  assert.doesNotMatch(sql, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)\s+ON/i);
  assert.doesNotMatch(sql, /DROP\s+(?:SCHEMA|TABLE|FUNCTION)/i);
  assert.doesNotMatch(sql,
    /\b(?:raw_body|message_body|message_content|transcript|prompt_text|reply_text|phone_number|email_address|access_token|api_key)\b/i);
});
