-- Expand the protected Calapres customer-reply outbox from WhatsApp-only
-- to the three verified Chatwoot inboxes. No website or cross-brand route is allowed.

BEGIN;

ALTER TABLE calapres_cs.customer_reply_events
  DROP CONSTRAINT customer_reply_events_inbox_id_check,
  ADD CONSTRAINT customer_reply_events_inbox_id_check
    CHECK (inbox_id IN (128031, 128033, 128058));

ALTER TABLE calapres_cs.customer_reply_sla_cases
  DROP CONSTRAINT customer_reply_sla_cases_inbox_id_check,
  ADD CONSTRAINT customer_reply_sla_cases_inbox_id_check
    CHECK (inbox_id IN (128031, 128033, 128058));

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_customer_reply_event(p_command jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_brand text := p_command ->> 'brand_id';
  v_account_text text := p_command ->> 'account_id';
  v_inbox_text text := p_command ->> 'inbox_id';
  v_conversation_text text := p_command ->> 'conversation_id';
  v_message_text text := p_command ->> 'inbound_message_id';
  v_binding text := p_command ->> 'request_binding_sha256';
  v_token text := p_command ->> 'processing_lease_token';
  v_ttl_text text := p_command ->> 'lease_duration_seconds';
  v_account integer;
  v_inbox integer;
  v_conversation bigint;
  v_message bigint;
  v_ttl integer;
  v_now timestamptz := transaction_timestamp();
  v_event calapres_cs.customer_reply_events%ROWTYPE;
BEGIN
  IF v_brand <> 'calapres' OR v_account_text !~ '^[1-9][0-9]{0,9}$'
     OR v_inbox_text !~ '^[1-9][0-9]{0,9}$'
     OR v_conversation_text !~ '^[1-9][0-9]{0,15}$'
     OR v_message_text !~ '^[1-9][0-9]{0,15}$'
     OR v_binding !~ '^[a-f0-9]{64}$'
     OR v_token !~ '^crp_[A-Za-z0-9_-]{8,120}$'
     OR v_ttl_text !~ '^[1-9][0-9]{0,2}$' THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_customer_reply_event', 'status', 'rejected',
      'outcome', 'invalid_command', 'error_code', 'schema_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  v_account := v_account_text::integer;
  v_inbox := v_inbox_text::integer;
  v_conversation := v_conversation_text::bigint;
  v_message := v_message_text::bigint;
  v_ttl := v_ttl_text::integer;
  IF v_account <> 179973 OR v_inbox NOT IN (128031, 128033, 128058) OR v_ttl NOT BETWEEN 30 AND 300
     OR v_conversation > 9007199254740991 OR v_message > 9007199254740991 THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_customer_reply_event', 'status', 'rejected',
      'outcome', 'route_invalid', 'error_code', 'route_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;

  INSERT INTO calapres_cs.customer_reply_events
    (brand_id, account_id, inbox_id, conversation_id, inbound_message_id,
      request_binding_sha256, state, processing_lease_token,
      processing_lease_expires_at, processing_attempt_count)
  VALUES
    (v_brand, v_account, v_inbox, v_conversation, v_message,
      v_binding, 'processing', v_token, v_now + make_interval(secs => v_ttl), 1)
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_event
  FROM calapres_cs.customer_reply_events
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message
  FOR UPDATE;

  IF v_event.request_binding_sha256 <> v_binding THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_customer_reply_event', 'status', 'rejected',
      'outcome', 'request_binding_mismatch', 'error_code', 'request_binding_mismatch',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  IF v_event.state = 'processing' AND v_event.processing_lease_token = v_token THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_customer_reply_event', 'status', 'committed',
      'outcome', 'event_claimed', 'error_code', NULL,
      'value', jsonb_build_object('state', v_event.state,
        'processing_lease_token', v_event.processing_lease_token,
        'processing_lease_expires_at', v_event.processing_lease_expires_at,
        'processing_attempt_count', v_event.processing_attempt_count),
      'customer_egress_allowed', false);
  END IF;
  IF v_event.state = 'processing' AND v_event.processing_lease_expires_at <= v_now THEN
    UPDATE calapres_cs.customer_reply_events
    SET processing_lease_token = v_token,
        processing_lease_expires_at = v_now + make_interval(secs => v_ttl),
        processing_attempt_count = processing_attempt_count + 1,
        error_code = NULL, updated_at = v_now
    WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
      AND conversation_id = v_conversation AND inbound_message_id = v_message
    RETURNING * INTO v_event;
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_customer_reply_event', 'status', 'committed',
      'outcome', 'expired_processing_reclaimed', 'error_code', NULL,
      'value', jsonb_build_object('state', v_event.state,
        'processing_lease_token', v_event.processing_lease_token,
        'processing_lease_expires_at', v_event.processing_lease_expires_at,
        'processing_attempt_count', v_event.processing_attempt_count),
      'customer_egress_allowed', false);
  END IF;
  IF v_event.state IN ('sending', 'ambiguous') THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_customer_reply_event', 'status', 'rejected',
      'outcome', 'send_reconciliation_required', 'error_code', 'send_state_uncertain',
      'value', jsonb_build_object('state', v_event.state, 'send_ref', v_event.send_ref),
      'customer_egress_allowed', false);
  END IF;
  RETURN jsonb_build_object('contract_verified', true,
    'operation', 'claim_customer_reply_event', 'status', 'rejected',
    'outcome', CASE WHEN v_event.state = 'processing' THEN 'event_busy' ELSE 'event_terminal' END,
    'error_code', CASE WHEN v_event.state = 'processing' THEN 'lease_busy' ELSE NULL END,
    'value', jsonb_build_object('state', v_event.state),
    'customer_egress_allowed', false);
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_out_of_scope_notice(p_command jsonb)
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
  v_processing_token text := p_command ->> 'processing_lease_token';
  v_scope_token text := p_command ->> 'scope_lease_token';
  v_now timestamptz := transaction_timestamp();
  v_event calapres_cs.customer_reply_events%ROWTYPE;
  v_scope calapres_cs.customer_reply_scope_windows%ROWTYPE;
BEGIN
  IF v_brand <> 'calapres'
     OR p_command ->> 'account_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'inbox_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'conversation_id' !~ '^[1-9][0-9]{0,15}$'
     OR p_command ->> 'inbound_message_id' !~ '^[1-9][0-9]{0,15}$'
     OR v_processing_token !~ '^crp_[A-Za-z0-9_-]{8,120}$'
     OR v_scope_token !~ '^crs_[A-Za-z0-9_-]{8,120}$' THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_out_of_scope_notice', 'status', 'rejected',
      'outcome', 'invalid_command', 'error_code', 'schema_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  v_account := (p_command ->> 'account_id')::integer;
  v_inbox := (p_command ->> 'inbox_id')::integer;
  v_conversation := (p_command ->> 'conversation_id')::bigint;
  v_message := (p_command ->> 'inbound_message_id')::bigint;
  IF v_account <> 179973 OR v_inbox NOT IN (128031, 128033, 128058)
     OR v_conversation > 9007199254740991 OR v_message > 9007199254740991 THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_out_of_scope_notice', 'status', 'rejected',
      'outcome', 'route_invalid', 'error_code', 'route_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;

  SELECT * INTO v_event FROM calapres_cs.customer_reply_events
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message
  FOR UPDATE;
  IF NOT FOUND OR v_event.state <> 'processing'
     OR v_event.processing_lease_token <> v_processing_token
     OR v_event.processing_lease_expires_at <= v_now THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_out_of_scope_notice', 'status', 'rejected',
      'outcome', 'processing_lease_invalid', 'error_code', 'lease_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;

  INSERT INTO calapres_cs.customer_reply_scope_windows (brand_id, conversation_id)
  VALUES (v_brand, v_conversation)
  ON CONFLICT DO NOTHING;
  SELECT * INTO v_scope FROM calapres_cs.customer_reply_scope_windows
  WHERE brand_id = v_brand AND conversation_id = v_conversation
  FOR UPDATE;

  IF v_scope.last_sent_at IS NOT NULL AND v_scope.last_sent_at > v_now - interval '24 hours' THEN
    UPDATE calapres_cs.customer_reply_events
    SET state = 'cancelled', decision_kind = 'out_of_scope',
        processing_lease_token = NULL, processing_lease_expires_at = NULL,
        error_code = 'scope_notice_suppressed', updated_at = v_now
    WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
      AND conversation_id = v_conversation AND inbound_message_id = v_message;
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_out_of_scope_notice', 'status', 'committed',
      'outcome', 'notice_suppressed', 'error_code', NULL,
      'value', jsonb_build_object('last_sent_at', v_scope.last_sent_at),
      'customer_egress_allowed', false);
  END IF;
  IF v_scope.lease_token IS NOT NULL AND v_scope.lease_expires_at > v_now
     AND v_scope.lease_token <> v_scope_token THEN
    UPDATE calapres_cs.customer_reply_events
    SET state = 'cancelled', decision_kind = 'out_of_scope',
        processing_lease_token = NULL, processing_lease_expires_at = NULL,
        error_code = 'scope_notice_inflight', updated_at = v_now
    WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
      AND conversation_id = v_conversation AND inbound_message_id = v_message;
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_out_of_scope_notice', 'status', 'committed',
      'outcome', 'notice_inflight', 'error_code', NULL,
      'value', NULL, 'customer_egress_allowed', false);
  END IF;

  UPDATE calapres_cs.customer_reply_scope_windows
  SET lease_token = v_scope_token, lease_expires_at = v_now + interval '10 minutes',
      leased_inbound_message_id = v_message, updated_at = v_now
  WHERE brand_id = v_brand AND conversation_id = v_conversation;
  UPDATE calapres_cs.customer_reply_events
  SET decision_kind = 'out_of_scope', scope_lease_token = v_scope_token, updated_at = v_now
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message;
  RETURN jsonb_build_object('contract_verified', true,
    'operation', 'claim_out_of_scope_notice', 'status', 'committed',
    'outcome', 'notice_claimed', 'error_code', NULL,
    'value', jsonb_build_object('scope_lease_token', v_scope_token,
      'scope_lease_expires_at', v_now + interval '10 minutes'),
    'customer_egress_allowed', false);
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_customer_reply_send(p_command jsonb)
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
  v_final_message bigint;
  v_processing_token text := p_command ->> 'processing_lease_token';
  v_decision text := p_command ->> 'decision_kind';
  v_reply_sha text := p_command ->> 'reply_sha256';
  v_reread_sha text := p_command ->> 'final_reread_binding_sha256';
  v_send_ref text := p_command ->> 'send_ref';
  v_send_token text := p_command ->> 'send_lease_token';
  v_scope_token text := p_command ->> 'scope_lease_token';
  v_ttl integer;
  v_now timestamptz := transaction_timestamp();
  v_event calapres_cs.customer_reply_events%ROWTYPE;
  v_scope calapres_cs.customer_reply_scope_windows%ROWTYPE;
BEGIN
  IF v_brand <> 'calapres'
     OR p_command ->> 'account_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'inbox_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'conversation_id' !~ '^[1-9][0-9]{0,15}$'
     OR p_command ->> 'inbound_message_id' !~ '^[1-9][0-9]{0,15}$'
     OR p_command ->> 'final_reread_message_id' !~ '^[1-9][0-9]{0,15}$'
     OR p_command ->> 'lease_duration_seconds' !~ '^[1-9][0-9]{0,2}$'
     OR v_processing_token !~ '^crp_[A-Za-z0-9_-]{8,120}$'
     OR v_decision NOT IN ('greeting', 'faq', 'order', 'model', 'out_of_scope', 'clarification')
     OR v_reply_sha !~ '^[a-f0-9]{64}$' OR v_reread_sha !~ '^[a-f0-9]{64}$'
     OR v_send_ref !~ '^csr_[A-Za-z0-9_-]{8,120}$'
     OR v_send_token !~ '^crs_[A-Za-z0-9_-]{8,120}$' THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_customer_reply_send', 'status', 'rejected',
      'outcome', 'invalid_command', 'error_code', 'schema_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  v_account := (p_command ->> 'account_id')::integer;
  v_inbox := (p_command ->> 'inbox_id')::integer;
  v_conversation := (p_command ->> 'conversation_id')::bigint;
  v_message := (p_command ->> 'inbound_message_id')::bigint;
  v_final_message := (p_command ->> 'final_reread_message_id')::bigint;
  v_ttl := (p_command ->> 'lease_duration_seconds')::integer;
  IF v_account <> 179973 OR v_inbox NOT IN (128031, 128033, 128058) OR v_ttl NOT BETWEEN 30 AND 300
     OR v_conversation > 9007199254740991 OR v_message > 9007199254740991
     OR v_final_message > 9007199254740991 OR v_final_message < v_message THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_customer_reply_send', 'status', 'rejected',
      'outcome', 'route_invalid', 'error_code', 'route_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;

  SELECT * INTO v_event FROM calapres_cs.customer_reply_events
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message
  FOR UPDATE;
  IF NOT FOUND OR v_event.state <> 'processing'
     OR v_event.processing_lease_token <> v_processing_token
     OR v_event.processing_lease_expires_at <= v_now THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_customer_reply_send', 'status', 'rejected',
      'outcome', 'processing_lease_invalid', 'error_code', 'lease_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  IF v_event.decision_kind IS NOT NULL AND v_event.decision_kind <> v_decision THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_customer_reply_send', 'status', 'rejected',
      'outcome', 'decision_mismatch', 'error_code', 'request_binding_mismatch',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  IF v_decision = 'out_of_scope' THEN
    IF v_scope_token !~ '^crs_[A-Za-z0-9_-]{8,120}$'
       OR v_event.scope_lease_token <> v_scope_token THEN
      RETURN jsonb_build_object('contract_verified', true,
        'operation', 'claim_customer_reply_send', 'status', 'rejected',
        'outcome', 'scope_lease_invalid', 'error_code', 'lease_invalid',
        'value', NULL, 'customer_egress_allowed', false);
    END IF;
    SELECT * INTO v_scope FROM calapres_cs.customer_reply_scope_windows
    WHERE brand_id = v_brand AND conversation_id = v_conversation FOR UPDATE;
    IF NOT FOUND OR v_scope.lease_token <> v_scope_token OR v_scope.lease_expires_at <= v_now
       OR v_scope.leased_inbound_message_id <> v_message THEN
      RETURN jsonb_build_object('contract_verified', true,
        'operation', 'claim_customer_reply_send', 'status', 'rejected',
        'outcome', 'scope_lease_invalid', 'error_code', 'lease_invalid',
        'value', NULL, 'customer_egress_allowed', false);
    END IF;
  END IF;

  UPDATE calapres_cs.customer_reply_events
  SET state = 'sending', decision_kind = v_decision, reply_sha256 = v_reply_sha,
      final_reread_binding_sha256 = v_reread_sha,
      final_reread_message_id = v_final_message, send_ref = v_send_ref,
      send_lease_token = v_send_token,
      send_lease_expires_at = v_now + make_interval(secs => v_ttl),
      send_attempt_count = send_attempt_count + 1,
      processing_lease_token = NULL, processing_lease_expires_at = NULL,
      error_code = NULL, updated_at = v_now
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message
  RETURNING * INTO v_event;
  RETURN jsonb_build_object('contract_verified', true,
    'operation', 'claim_customer_reply_send', 'status', 'committed',
    'outcome', 'send_claimed', 'error_code', NULL,
    'value', jsonb_build_object('state', v_event.state, 'send_ref', v_event.send_ref,
      'send_lease_token', v_event.send_lease_token,
      'send_lease_expires_at', v_event.send_lease_expires_at,
      'send_attempt_count', v_event.send_attempt_count),
    'customer_egress_allowed', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'claim_customer_reply_send', 'status', 'rejected',
      'outcome', 'send_ref_collision', 'error_code', 'request_binding_mismatch',
      'value', NULL, 'customer_egress_allowed', false);
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_complete_customer_reply_send(p_command jsonb)
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
  v_chatwoot_message bigint;
  v_send_ref text := p_command ->> 'send_ref';
  v_send_token text := p_command ->> 'send_lease_token';
  v_now timestamptz := transaction_timestamp();
  v_event calapres_cs.customer_reply_events%ROWTYPE;
BEGIN
  IF v_brand <> 'calapres'
     OR p_command ->> 'account_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'inbox_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'conversation_id' !~ '^[1-9][0-9]{0,15}$'
     OR p_command ->> 'inbound_message_id' !~ '^[1-9][0-9]{0,15}$'
     OR p_command ->> 'chatwoot_message_id' !~ '^[1-9][0-9]{0,15}$'
     OR v_send_ref !~ '^csr_[A-Za-z0-9_-]{8,120}$'
     OR v_send_token !~ '^crs_[A-Za-z0-9_-]{8,120}$' THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'complete_customer_reply_send', 'status', 'rejected',
      'outcome', 'invalid_command', 'error_code', 'schema_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  v_account := (p_command ->> 'account_id')::integer;
  v_inbox := (p_command ->> 'inbox_id')::integer;
  v_conversation := (p_command ->> 'conversation_id')::bigint;
  v_message := (p_command ->> 'inbound_message_id')::bigint;
  v_chatwoot_message := (p_command ->> 'chatwoot_message_id')::bigint;
  IF v_account <> 179973 OR v_inbox NOT IN (128031, 128033, 128058)
     OR v_conversation > 9007199254740991 OR v_message > 9007199254740991
     OR v_chatwoot_message > 9007199254740991 THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'complete_customer_reply_send', 'status', 'rejected',
      'outcome', 'route_invalid', 'error_code', 'route_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  SELECT * INTO v_event FROM calapres_cs.customer_reply_events
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'complete_customer_reply_send', 'status', 'rejected',
      'outcome', 'event_missing', 'error_code', 'state_missing',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  IF v_event.state = 'sent' AND v_event.send_ref = v_send_ref
     AND v_event.chatwoot_message_id = v_chatwoot_message THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'complete_customer_reply_send', 'status', 'committed',
      'outcome', 'send_already_completed', 'error_code', NULL,
      'value', jsonb_build_object('state', v_event.state,
        'send_ref', v_event.send_ref, 'chatwoot_message_id', v_event.chatwoot_message_id),
      'customer_egress_allowed', false);
  END IF;
  IF v_event.state NOT IN ('sending', 'ambiguous') OR v_event.send_ref <> v_send_ref
     OR v_event.send_lease_token <> v_send_token THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'complete_customer_reply_send', 'status', 'rejected',
      'outcome', 'send_lease_invalid', 'error_code', 'lease_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;

  UPDATE calapres_cs.customer_reply_events
  SET state = 'sent', chatwoot_message_id = v_chatwoot_message,
      send_lease_expires_at = NULL, error_code = NULL,
      sent_at = v_now, updated_at = v_now
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message
  RETURNING * INTO v_event;
  IF v_event.decision_kind = 'out_of_scope' THEN
    UPDATE calapres_cs.customer_reply_scope_windows
    SET last_sent_at = v_now, lease_token = NULL, lease_expires_at = NULL,
        leased_inbound_message_id = NULL, updated_at = v_now
    WHERE brand_id = v_brand AND conversation_id = v_conversation
      AND lease_token = v_event.scope_lease_token;
  END IF;
  RETURN jsonb_build_object('contract_verified', true,
    'operation', 'complete_customer_reply_send', 'status', 'committed',
    'outcome', 'send_completed', 'error_code', NULL,
    'value', jsonb_build_object('state', v_event.state,
      'send_ref', v_event.send_ref, 'chatwoot_message_id', v_event.chatwoot_message_id,
      'sent_at', v_event.sent_at),
    'customer_egress_allowed', false);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'complete_customer_reply_send', 'status', 'rejected',
      'outcome', 'chatwoot_message_collision', 'error_code', 'request_binding_mismatch',
      'value', NULL, 'customer_egress_allowed', false);
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_finalize_customer_reply_event(p_command jsonb)
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
  v_target text := p_command ->> 'target_state';
  v_error text := p_command ->> 'error_code';
  v_processing_token text := p_command ->> 'processing_lease_token';
  v_send_token text := p_command ->> 'send_lease_token';
  v_now timestamptz := transaction_timestamp();
  v_event calapres_cs.customer_reply_events%ROWTYPE;
BEGIN
  IF v_brand <> 'calapres'
     OR p_command ->> 'account_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'inbox_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'conversation_id' !~ '^[1-9][0-9]{0,15}$'
     OR p_command ->> 'inbound_message_id' !~ '^[1-9][0-9]{0,15}$'
     OR v_target NOT IN ('cancelled', 'escalated', 'failed', 'ambiguous')
     OR v_error !~ '^[a-z0-9_]{3,64}$' THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'finalize_customer_reply_event', 'status', 'rejected',
      'outcome', 'invalid_command', 'error_code', 'schema_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  v_account := (p_command ->> 'account_id')::integer;
  v_inbox := (p_command ->> 'inbox_id')::integer;
  v_conversation := (p_command ->> 'conversation_id')::bigint;
  v_message := (p_command ->> 'inbound_message_id')::bigint;
  IF v_account <> 179973 OR v_inbox NOT IN (128031, 128033, 128058)
     OR v_conversation > 9007199254740991 OR v_message > 9007199254740991 THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'finalize_customer_reply_event', 'status', 'rejected',
      'outcome', 'route_invalid', 'error_code', 'route_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  SELECT * INTO v_event FROM calapres_cs.customer_reply_events
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message
  FOR UPDATE;
  IF NOT FOUND OR v_event.state = 'sent' THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'finalize_customer_reply_event', 'status', 'rejected',
      'outcome', CASE WHEN FOUND THEN 'event_already_sent' ELSE 'event_missing' END,
      'error_code', 'state_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;
  IF v_target = 'ambiguous' THEN
    IF v_event.state <> 'sending' OR v_send_token IS NULL
       OR v_event.send_lease_token <> v_send_token THEN
      RETURN jsonb_build_object('contract_verified', true,
        'operation', 'finalize_customer_reply_event', 'status', 'rejected',
        'outcome', 'send_lease_invalid', 'error_code', 'lease_invalid',
        'value', NULL, 'customer_egress_allowed', false);
    END IF;
  ELSE
    IF v_event.state <> 'processing' OR v_processing_token IS NULL
       OR v_event.processing_lease_token <> v_processing_token THEN
      RETURN jsonb_build_object('contract_verified', true,
        'operation', 'finalize_customer_reply_event', 'status', 'rejected',
        'outcome', 'processing_lease_invalid', 'error_code', 'lease_invalid',
        'value', NULL, 'customer_egress_allowed', false);
    END IF;
  END IF;

  UPDATE calapres_cs.customer_reply_events
  SET state = v_target, error_code = v_error,
      processing_lease_token = NULL, processing_lease_expires_at = NULL,
      send_lease_expires_at = CASE WHEN v_target = 'ambiguous'
        THEN send_lease_expires_at ELSE NULL END,
      updated_at = v_now
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message
  RETURNING * INTO v_event;
  IF v_event.scope_lease_token IS NOT NULL AND v_target <> 'ambiguous' THEN
    UPDATE calapres_cs.customer_reply_scope_windows
    SET lease_token = NULL, lease_expires_at = NULL,
        leased_inbound_message_id = NULL, updated_at = v_now
    WHERE brand_id = v_brand AND conversation_id = v_conversation
      AND lease_token = v_event.scope_lease_token;
  END IF;
  RETURN jsonb_build_object('contract_verified', true,
    'operation', 'finalize_customer_reply_event', 'status', 'committed',
    'outcome', 'event_finalized', 'error_code', NULL,
    'value', jsonb_build_object('state', v_event.state,
      'send_ref', v_event.send_ref, 'error_code', v_event.error_code),
    'customer_egress_allowed', false);
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_read_customer_reply_event(p_command jsonb)
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
  v_event calapres_cs.customer_reply_events%ROWTYPE;
BEGIN
  IF v_brand <> 'calapres'
     OR p_command ->> 'account_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'inbox_id' !~ '^[1-9][0-9]{0,9}$'
     OR p_command ->> 'conversation_id' !~ '^[1-9][0-9]{0,15}$'
     OR p_command ->> 'inbound_message_id' !~ '^[1-9][0-9]{0,15}$' THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'read_customer_reply_event', 'status', 'rejected',
      'outcome', 'invalid_command', 'error_code', 'schema_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  v_account := (p_command ->> 'account_id')::integer;
  v_inbox := (p_command ->> 'inbox_id')::integer;
  v_conversation := (p_command ->> 'conversation_id')::bigint;
  v_message := (p_command ->> 'inbound_message_id')::bigint;
  IF v_account <> 179973 OR v_inbox NOT IN (128031, 128033, 128058)
     OR v_conversation > 9007199254740991 OR v_message > 9007199254740991 THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'read_customer_reply_event', 'status', 'rejected',
      'outcome', 'route_invalid', 'error_code', 'route_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  SELECT * INTO v_event FROM calapres_cs.customer_reply_events
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND inbound_message_id = v_message;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('contract_verified', true,
      'operation', 'read_customer_reply_event', 'status', 'committed',
      'outcome', 'event_missing', 'error_code', NULL,
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  RETURN jsonb_build_object('contract_verified', true,
    'operation', 'read_customer_reply_event', 'status', 'committed',
    'outcome', 'event_read', 'error_code', NULL,
    'value', jsonb_build_object(
      'state', v_event.state, 'decision_kind', v_event.decision_kind,
      'send_ref', v_event.send_ref, 'reply_sha256', v_event.reply_sha256,
      'chatwoot_message_id', v_event.chatwoot_message_id,
      'error_code', v_event.error_code, 'updated_at', v_event.updated_at),
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
  IF v_account <> 179973 OR v_inbox NOT IN (128031, 128033, 128058)
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
  IF v_account <> 179973 OR v_inbox NOT IN (128031, 128033, 128058)
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

CREATE OR REPLACE FUNCTION calapres_cs.atomic_upsert_customer_reply_sla_case(p_command jsonb)
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
  v_outcome text := p_command ->> 'outcome';
  v_now timestamptz := transaction_timestamp();
  v_case calapres_cs.customer_reply_sla_cases%ROWTYPE;
BEGIN
  IF COALESCE(v_brand, '') <> 'calapres'
     OR COALESCE(p_command ->> 'account_id', '') !~ '^[1-9][0-9]{0,9}$'
     OR COALESCE(p_command ->> 'inbox_id', '') !~ '^[1-9][0-9]{0,9}$'
     OR COALESCE(p_command ->> 'conversation_id', '') !~ '^[1-9][0-9]{0,15}$'
     OR COALESCE(p_command ->> 'inbound_message_id', '') !~ '^[1-9][0-9]{0,15}$'
     OR COALESCE(v_outcome, '') NOT IN ('touch', 'resolve') THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'upsert_customer_reply_sla_case',
      'status', 'rejected', 'outcome', 'invalid_command',
      'error_code', 'schema_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;
  v_account := (p_command ->> 'account_id')::integer;
  v_inbox := (p_command ->> 'inbox_id')::integer;
  v_conversation := (p_command ->> 'conversation_id')::bigint;
  v_message := (p_command ->> 'inbound_message_id')::bigint;
  IF v_account <> 179973 OR v_inbox NOT IN (128031, 128033, 128058)
     OR v_conversation > 9007199254740991 OR v_message > 9007199254740991 THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'upsert_customer_reply_sla_case',
      'status', 'rejected', 'outcome', 'route_invalid',
      'error_code', 'route_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'calapres:sla-case:' || v_brand || ':' || v_conversation, 0));

  SELECT * INTO v_case FROM calapres_cs.customer_reply_sla_cases
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND state IN ('open', 'claimed_for_escalation')
  FOR UPDATE;

  IF v_outcome = 'resolve' THEN
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'contract_verified', true, 'operation', 'upsert_customer_reply_sla_case',
        'status', 'committed', 'outcome', 'no_open_case', 'error_code', NULL,
        'value', NULL, 'customer_egress_allowed', false);
    END IF;
    IF v_case.last_activity_message_id > v_message THEN
      -- A newer unresolved message already reopened/extended this case, do not resolve
      -- a case out from under a message that arrived after the one being finalized.
      RETURN jsonb_build_object(
        'contract_verified', true, 'operation', 'upsert_customer_reply_sla_case',
        'status', 'committed', 'outcome', 'superseded_by_newer_activity', 'error_code', NULL,
        'value', NULL, 'customer_egress_allowed', false);
    END IF;
    UPDATE calapres_cs.customer_reply_sla_cases
    SET state = 'resolved', resolved_at = v_now,
        escalation_lease_token = NULL, escalation_lease_expires_at = NULL,
        updated_at = v_now
    WHERE brand_id = v_case.brand_id AND account_id = v_case.account_id
      AND inbox_id = v_case.inbox_id AND conversation_id = v_case.conversation_id
      AND case_opened_message_id = v_case.case_opened_message_id
    RETURNING * INTO v_case;
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'upsert_customer_reply_sla_case',
      'status', 'committed', 'outcome', 'case_resolved', 'error_code', NULL,
      'value', jsonb_build_object('state', v_case.state, 'resolved_at', v_case.resolved_at),
      'customer_egress_allowed', false);
  END IF;

  -- outcome = 'touch': open a new case only if none is currently open, never move
  -- first_unresolved_at backward or forward for an already-open case.
  IF FOUND THEN
    IF v_case.last_activity_message_id >= v_message THEN
      RETURN jsonb_build_object(
        'contract_verified', true, 'operation', 'upsert_customer_reply_sla_case',
        'status', 'committed', 'outcome', 'already_touched', 'error_code', NULL,
        'value', jsonb_build_object('state', v_case.state,
          'first_unresolved_at', v_case.first_unresolved_at),
        'customer_egress_allowed', false);
    END IF;
    UPDATE calapres_cs.customer_reply_sla_cases
    SET last_activity_message_id = v_message, updated_at = v_now
    WHERE brand_id = v_case.brand_id AND account_id = v_case.account_id
      AND inbox_id = v_case.inbox_id AND conversation_id = v_case.conversation_id
      AND case_opened_message_id = v_case.case_opened_message_id
    RETURNING * INTO v_case;
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'upsert_customer_reply_sla_case',
      'status', 'committed', 'outcome', 'case_touched', 'error_code', NULL,
      'value', jsonb_build_object('state', v_case.state,
        'first_unresolved_at', v_case.first_unresolved_at),
      'customer_egress_allowed', false);
  END IF;

  BEGIN
    INSERT INTO calapres_cs.customer_reply_sla_cases
      (brand_id, account_id, inbox_id, conversation_id, case_opened_message_id,
        last_activity_message_id, state, first_unresolved_at)
    VALUES
      (v_brand, v_account, v_inbox, v_conversation, v_message, v_message, 'open', v_now)
    RETURNING * INTO v_case;
  EXCEPTION WHEN unique_violation THEN
    -- Concurrent opener won, reread and touch instead of erroring.
    SELECT * INTO v_case FROM calapres_cs.customer_reply_sla_cases
    WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
      AND conversation_id = v_conversation AND state IN ('open', 'claimed_for_escalation')
    FOR UPDATE;
    IF FOUND AND v_case.last_activity_message_id < v_message THEN
      UPDATE calapres_cs.customer_reply_sla_cases
      SET last_activity_message_id = v_message, updated_at = v_now
      WHERE brand_id = v_case.brand_id AND account_id = v_case.account_id
        AND inbox_id = v_case.inbox_id AND conversation_id = v_case.conversation_id
        AND case_opened_message_id = v_case.case_opened_message_id
      RETURNING * INTO v_case;
    END IF;
  END;
  RETURN jsonb_build_object(
    'contract_verified', true, 'operation', 'upsert_customer_reply_sla_case',
    'status', 'committed', 'outcome', 'case_opened', 'error_code', NULL,
    'value', jsonb_build_object('state', v_case.state,
      'first_unresolved_at', v_case.first_unresolved_at),
    'customer_egress_allowed', false);
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_finalize_customer_reply_sla_escalation(
  p_command jsonb
)
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
  v_case_message bigint;
  v_lease_token text := p_command ->> 'escalation_lease_token';
  v_outcome text := p_command ->> 'outcome';
  v_retry_delay integer;
  v_now timestamptz := transaction_timestamp();
  v_case calapres_cs.customer_reply_sla_cases%ROWTYPE;
BEGIN
  IF COALESCE(v_brand, '') <> 'calapres'
     OR COALESCE(p_command ->> 'account_id', '') !~ '^[1-9][0-9]{0,9}$'
     OR COALESCE(p_command ->> 'inbox_id', '') !~ '^[1-9][0-9]{0,9}$'
     OR COALESCE(p_command ->> 'conversation_id', '') !~ '^[1-9][0-9]{0,15}$'
     OR COALESCE(p_command ->> 'case_opened_message_id', '') !~ '^[1-9][0-9]{0,15}$'
     OR COALESCE(v_lease_token, '') !~ '^sla_recovery_[A-Za-z0-9_-]{8,110}$'
     OR COALESCE(v_outcome, '') NOT IN ('escalated', 'released', 'ineligible') THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'finalize_customer_reply_sla_escalation',
      'status', 'rejected', 'outcome', 'invalid_command',
      'error_code', 'schema_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;
  v_account := (p_command ->> 'account_id')::integer;
  v_inbox := (p_command ->> 'inbox_id')::integer;
  v_conversation := (p_command ->> 'conversation_id')::bigint;
  v_case_message := (p_command ->> 'case_opened_message_id')::bigint;
  IF v_account <> 179973 OR v_inbox NOT IN (128031, 128033, 128058)
     OR v_conversation > 9007199254740991 OR v_case_message > 9007199254740991 THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'finalize_customer_reply_sla_escalation',
      'status', 'rejected', 'outcome', 'route_invalid',
      'error_code', 'route_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;

  SELECT * INTO v_case FROM calapres_cs.customer_reply_sla_cases
  WHERE brand_id = v_brand AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = v_conversation AND case_opened_message_id = v_case_message
  FOR UPDATE;
  IF NOT FOUND OR v_case.state <> 'claimed_for_escalation'
     OR v_case.escalation_lease_token <> v_lease_token
     OR v_case.escalation_lease_expires_at <= v_now THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'finalize_customer_reply_sla_escalation',
      'status', 'rejected', 'outcome', 'sla_lease_invalid',
      'error_code', 'lease_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;

  IF v_outcome = 'escalated' THEN
    UPDATE calapres_cs.customer_reply_sla_cases
    SET state = 'escalated', escalated_at = v_now,
        escalation_lease_token = NULL, escalation_lease_expires_at = NULL,
        updated_at = v_now
    WHERE brand_id = v_case.brand_id AND account_id = v_case.account_id
      AND inbox_id = v_case.inbox_id AND conversation_id = v_case.conversation_id
      AND case_opened_message_id = v_case.case_opened_message_id
    RETURNING * INTO v_case;
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'finalize_customer_reply_sla_escalation',
      'status', 'committed', 'outcome', 'sla_escalated', 'error_code', NULL,
      'value', jsonb_build_object('state', v_case.state, 'escalated_at', v_case.escalated_at),
      'customer_egress_allowed', false);
  END IF;

  IF v_outcome = 'ineligible' THEN
    -- Chatwoot reread showed the case is already human-labelled, resolved, or otherwise
    -- no longer eligible, resolve it here so the scheduler never reclaims it again.
    UPDATE calapres_cs.customer_reply_sla_cases
    SET state = 'resolved', resolved_at = v_now,
        escalation_lease_token = NULL, escalation_lease_expires_at = NULL,
        updated_at = v_now
    WHERE brand_id = v_case.brand_id AND account_id = v_case.account_id
      AND inbox_id = v_case.inbox_id AND conversation_id = v_case.conversation_id
      AND case_opened_message_id = v_case.case_opened_message_id
    RETURNING * INTO v_case;
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'finalize_customer_reply_sla_escalation',
      'status', 'committed', 'outcome', 'sla_case_ineligible_resolved', 'error_code', NULL,
      'value', jsonb_build_object('state', v_case.state),
      'customer_egress_allowed', false);
  END IF;

  -- outcome = 'released': transient Chatwoot failure, retry later without resetting
  -- first_unresolved_at and without granting any label-application authority.
  IF COALESCE(p_command ->> 'retry_delay_seconds', '') !~ '^[1-9][0-9]{1,3}$' THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'finalize_customer_reply_sla_escalation',
      'status', 'rejected', 'outcome', 'invalid_command',
      'error_code', 'schema_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;
  v_retry_delay := (p_command ->> 'retry_delay_seconds')::integer;
  IF v_retry_delay NOT BETWEEN 60 AND 900 THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'finalize_customer_reply_sla_escalation',
      'status', 'rejected', 'outcome', 'range_invalid',
      'error_code', 'schema_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;
  UPDATE calapres_cs.customer_reply_sla_cases
  SET state = 'open', escalation_lease_token = NULL,
      escalation_lease_expires_at = v_now + make_interval(secs => v_retry_delay),
      updated_at = v_now
  WHERE brand_id = v_case.brand_id AND account_id = v_case.account_id
    AND inbox_id = v_case.inbox_id AND conversation_id = v_case.conversation_id
    AND case_opened_message_id = v_case.case_opened_message_id
  RETURNING * INTO v_case;
  RETURN jsonb_build_object(
    'contract_verified', true, 'operation', 'finalize_customer_reply_sla_escalation',
    'status', 'committed', 'outcome', 'sla_released_for_retry', 'error_code', NULL,
    'value', jsonb_build_object('state', v_case.state,
      'retry_not_before', v_case.escalation_lease_expires_at),
    'customer_egress_allowed', false);
END;
$function$;

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (15, 'calapres_cs_customer_reply_omnichannel')
ON CONFLICT (version) DO NOTHING;

COMMIT;
