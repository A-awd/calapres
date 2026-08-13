-- Calapres customer-reply send reconciliation queue.
-- Stores and returns identifiers and digests only; no customer text or contact data.

BEGIN;

CREATE INDEX IF NOT EXISTS customer_reply_events_recovery_due_idx
  ON calapres_cs.customer_reply_events (brand_id, updated_at, conversation_id, inbound_message_id)
  WHERE state IN ('sending', 'ambiguous');

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_due_customer_reply_recovery(p_command jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_brand text := p_command ->> 'brand_id';
  v_worker_token text := p_command ->> 'worker_token';
  v_min_age integer;
  v_lease_ttl integer;
  v_now timestamptz := transaction_timestamp();
  v_event calapres_cs.customer_reply_events%ROWTYPE;
BEGIN
  IF v_brand <> 'calapres'
     OR v_worker_token !~ '^crs_recovery_[A-Za-z0-9_-]{8,111}$'
     OR p_command ->> 'minimum_age_seconds' !~ '^[1-9][0-9]{0,3}$'
     OR p_command ->> 'lease_duration_seconds' !~ '^[1-9][0-9]{0,2}$' THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'claim_due_customer_reply_recovery',
      'status', 'rejected', 'outcome', 'invalid_command',
      'error_code', 'schema_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;
  v_min_age := (p_command ->> 'minimum_age_seconds')::integer;
  v_lease_ttl := (p_command ->> 'lease_duration_seconds')::integer;
  IF v_min_age NOT BETWEEN 60 AND 3600 OR v_lease_ttl NOT BETWEEN 30 AND 300 THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'claim_due_customer_reply_recovery',
      'status', 'rejected', 'outcome', 'range_invalid',
      'error_code', 'schema_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;

  SELECT * INTO v_event
  FROM calapres_cs.customer_reply_events
  WHERE brand_id = v_brand
    AND state IN ('sending', 'ambiguous')
    AND send_ref IS NOT NULL
    AND reply_sha256 IS NOT NULL
    AND updated_at <= v_now - make_interval(secs => v_min_age)
    AND (send_lease_expires_at IS NULL OR send_lease_expires_at <= v_now)
  ORDER BY updated_at, conversation_id, inbound_message_id
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'claim_due_customer_reply_recovery',
      'status', 'committed', 'outcome', 'recovery_queue_empty',
      'error_code', NULL, 'value', NULL,
      'customer_egress_allowed', false);
  END IF;

  UPDATE calapres_cs.customer_reply_events
  SET state = 'ambiguous', send_lease_token = v_worker_token,
      send_lease_expires_at = v_now + make_interval(secs => v_lease_ttl),
      error_code = 'send_reconciliation_pending', updated_at = v_now
  WHERE brand_id = v_event.brand_id AND account_id = v_event.account_id
    AND inbox_id = v_event.inbox_id AND conversation_id = v_event.conversation_id
    AND inbound_message_id = v_event.inbound_message_id
  RETURNING * INTO v_event;

  RETURN jsonb_build_object(
    'contract_verified', true, 'operation', 'claim_due_customer_reply_recovery',
    'status', 'committed', 'outcome', 'recovery_claimed',
    'error_code', NULL,
    'value', jsonb_build_object(
      'brand_id', v_event.brand_id,
      'account_id', v_event.account_id,
      'inbox_id', v_event.inbox_id,
      'conversation_id', v_event.conversation_id,
      'inbound_message_id', v_event.inbound_message_id,
      'send_ref', v_event.send_ref,
      'send_lease_token', v_event.send_lease_token,
      'reply_sha256', v_event.reply_sha256,
      'send_lease_expires_at', v_event.send_lease_expires_at),
    'customer_egress_allowed', false);
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_fail_customer_reply_recovery(p_command jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_brand text := p_command ->> 'brand_id';
  v_account integer;
  v_inbox integer;
  v_conversation bigint;
  v_message bigint;
  v_send_ref text := p_command ->> 'send_ref';
  v_send_token text := p_command ->> 'send_lease_token';
  v_error text := p_command ->> 'error_code';
  v_now timestamptz := transaction_timestamp();
  v_event calapres_cs.customer_reply_events%ROWTYPE;
BEGIN
  IF v_brand <> 'calapres'
     OR p_command ->> 'account_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'inbox_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'conversation_id' !~ '^[1-9][0-9]{0,15}$'
     OR p_command ->> 'inbound_message_id' !~ '^[1-9][0-9]{0,15}$'
     OR v_send_ref !~ '^csr_[A-Za-z0-9_-]{8,120}$'
     OR v_send_token !~ '^crs_recovery_[A-Za-z0-9_-]{8,111}$'
     OR v_error !~ '^[a-z0-9_]{3,64}$' THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'fail_customer_reply_recovery',
      'status', 'rejected', 'outcome', 'invalid_command',
      'error_code', 'schema_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;
  v_account := (p_command ->> 'account_id')::integer;
  v_inbox := (p_command ->> 'inbox_id')::integer;
  v_conversation := (p_command ->> 'conversation_id')::bigint;
  v_message := (p_command ->> 'inbound_message_id')::bigint;
  IF v_account <> 179973 OR v_inbox <> 128058
     OR v_conversation > 9007199254740991 OR v_message > 9007199254740991 THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'fail_customer_reply_recovery',
      'status', 'rejected', 'outcome', 'route_invalid',
      'error_code', 'route_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;

  SELECT * INTO v_event FROM calapres_cs.customer_reply_events
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message
  FOR UPDATE;
  IF NOT FOUND OR v_event.state <> 'ambiguous' OR v_event.send_ref <> v_send_ref
     OR v_event.send_lease_token <> v_send_token
     OR v_event.send_lease_expires_at <= v_now THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'fail_customer_reply_recovery',
      'status', 'rejected', 'outcome', 'recovery_lease_invalid',
      'error_code', 'lease_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;

  UPDATE calapres_cs.customer_reply_events
  SET state = 'failed', send_lease_expires_at = NULL,
      error_code = v_error, updated_at = v_now
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message
  RETURNING * INTO v_event;
  IF v_event.scope_lease_token IS NOT NULL THEN
    UPDATE calapres_cs.customer_reply_scope_windows
    SET lease_token = NULL, lease_expires_at = NULL,
        leased_inbound_message_id = NULL, updated_at = v_now
    WHERE brand_id = v_brand AND conversation_id = v_conversation
      AND lease_token = v_event.scope_lease_token;
  END IF;
  RETURN jsonb_build_object(
    'contract_verified', true, 'operation', 'fail_customer_reply_recovery',
    'status', 'committed', 'outcome', 'recovery_failed_closed',
    'error_code', NULL,
    'value', jsonb_build_object('state', v_event.state,
      'send_ref', v_event.send_ref, 'error_code', v_event.error_code),
    'customer_egress_allowed', false);
END;
$function$;

ALTER FUNCTION calapres_cs.atomic_claim_due_customer_reply_recovery(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_fail_customer_reply_recovery(jsonb)
  OWNER TO calapres_cs_function_owner;

REVOKE ALL ON FUNCTION calapres_cs.atomic_claim_due_customer_reply_recovery(jsonb),
  calapres_cs.atomic_fail_customer_reply_recovery(jsonb)
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_reconciliation_runtime,
    calapres_cs_owner_runtime, calapres_cs_reconciliation_login;

GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_due_customer_reply_recovery(jsonb),
  calapres_cs.atomic_fail_customer_reply_recovery(jsonb)
  TO calapres_cs_webhook_runtime, calapres_cs_webhook_login;

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (12, 'calapres_cs_customer_reply_recovery')
ON CONFLICT (version) DO NOTHING;

COMMIT;
