-- Calapres customer-reply recovery retry release.
-- A transient Chatwoot read failure may be retried, but never grants resend authority.

BEGIN;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_release_customer_reply_recovery(p_command jsonb)
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
  v_retry_delay integer;
  v_now timestamptz := transaction_timestamp();
  v_event calapres_cs.customer_reply_events%ROWTYPE;
BEGIN
  IF v_brand <> 'calapres'
     OR p_command ->> 'account_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'inbox_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'conversation_id' !~ '^[1-9][0-9]{0,15}$'
     OR p_command ->> 'inbound_message_id' !~ '^[1-9][0-9]{0,15}$'
     OR p_command ->> 'retry_delay_seconds' !~ '^[1-9][0-9]{1,3}$'
     OR v_send_ref !~ '^csr_[A-Za-z0-9_-]{8,120}$'
     OR v_send_token !~ '^crs_recovery_[A-Za-z0-9_-]{8,111}$'
     OR v_error !~ '^[a-z0-9_]{3,64}$' THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'release_customer_reply_recovery',
      'status', 'rejected', 'outcome', 'invalid_command',
      'error_code', 'schema_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;
  v_account := (p_command ->> 'account_id')::integer;
  v_inbox := (p_command ->> 'inbox_id')::integer;
  v_conversation := (p_command ->> 'conversation_id')::bigint;
  v_message := (p_command ->> 'inbound_message_id')::bigint;
  v_retry_delay := (p_command ->> 'retry_delay_seconds')::integer;
  IF v_account <> 179973 OR v_inbox <> 128058
     OR v_conversation > 9007199254740991 OR v_message > 9007199254740991
     OR v_retry_delay NOT BETWEEN 60 AND 900 THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'release_customer_reply_recovery',
      'status', 'rejected', 'outcome', 'route_or_range_invalid',
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
      'contract_verified', true, 'operation', 'release_customer_reply_recovery',
      'status', 'rejected', 'outcome', 'recovery_lease_invalid',
      'error_code', 'lease_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;

  UPDATE calapres_cs.customer_reply_events
  SET send_lease_expires_at = v_now + make_interval(secs => v_retry_delay),
      error_code = v_error, updated_at = v_now
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message
  RETURNING * INTO v_event;

  RETURN jsonb_build_object(
    'contract_verified', true, 'operation', 'release_customer_reply_recovery',
    'status', 'committed', 'outcome', 'recovery_released_for_retry',
    'error_code', NULL,
    'value', jsonb_build_object(
      'state', v_event.state, 'send_ref', v_event.send_ref,
      'retry_not_before', v_event.send_lease_expires_at,
      'error_code', v_event.error_code),
    'customer_egress_allowed', false);
END;
$function$;

ALTER FUNCTION calapres_cs.atomic_release_customer_reply_recovery(jsonb)
  OWNER TO calapres_cs_function_owner;

REVOKE ALL ON FUNCTION calapres_cs.atomic_release_customer_reply_recovery(jsonb)
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_reconciliation_runtime,
    calapres_cs_owner_runtime, calapres_cs_reconciliation_login;

GRANT EXECUTE ON FUNCTION calapres_cs.atomic_release_customer_reply_recovery(jsonb)
  TO calapres_cs_webhook_runtime, calapres_cs_webhook_login;

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (13, 'calapres_cs_customer_reply_recovery_retry')
ON CONFLICT (version) DO NOTHING;

COMMIT;
