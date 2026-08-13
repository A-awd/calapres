'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const sql = readFileSync(join(
  __dirname,
  '../../postgres/migrations/0013_calapres_cs_customer_reply_recovery_retry.sql',
), 'utf8');

test('migration 0013 releases transient recovery reads without resend authority', () => {
  assert.match(sql,
    /CREATE OR REPLACE FUNCTION calapres_cs\.atomic_release_customer_reply_recovery/);
  assert.match(sql, /outcome', 'recovery_released_for_retry'/);
  assert.match(sql, /SET send_lease_expires_at = v_now \+ make_interval/);
  assert.match(sql, /customer_egress_allowed', false/);
  assert.doesNotMatch(sql, /customer_egress_allowed', true/);
});

test('migration 0013 never resets delivery state or increments send attempts', () => {
  assert.doesNotMatch(sql, /SET state = '(?:processing|sending)'/);
  assert.doesNotMatch(sql, /send_attempt_count\s*=\s*send_attempt_count\s*\+/);
  assert.doesNotMatch(sql, /INSERT INTO calapres_cs\.customer_reply_events/);
  assert.match(sql,
    /GRANT EXECUTE ON FUNCTION[\s\S]*TO calapres_cs_webhook_runtime, calapres_cs_webhook_login/);
  assert.match(sql, /VALUES \(13, 'calapres_cs_customer_reply_recovery_retry'\)/);
});

test('migration 0013 remains identifier-only', () => {
  assert.doesNotMatch(sql, /DROP\s+(?:SCHEMA|TABLE|FUNCTION)/i);
  assert.doesNotMatch(sql,
    /\b(?:raw_body|message_body|message_content|transcript|prompt_text|reply_text|phone_number|email_address|access_token|api_key)\b/i);
});
