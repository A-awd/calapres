-- Calapres customer-reply idempotency, budget reservation, and send outbox.
-- Identifiers and digests only: customer text and contact data are never stored.

BEGIN;

CREATE TABLE IF NOT EXISTS calapres_cs.model_budget_reservations (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  request_ref text NOT NULL CHECK (request_ref ~ '^mb_[A-Za-z0-9_-]{8,120}$'),
  conversation_id text NOT NULL CHECK (conversation_id ~ '^[1-9][0-9]{0,30}$'),
  month_window_start date NOT NULL,
  day_window_start date NOT NULL,
  reservation_microusd bigint NOT NULL CHECK (reservation_microusd BETWEEN 1 AND 50000),
  reserved_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, request_ref)
);

CREATE TABLE IF NOT EXISTS calapres_cs.customer_reply_events (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  account_id integer NOT NULL CHECK (account_id = 179973),
  inbox_id integer NOT NULL CHECK (inbox_id = 128058),
  conversation_id bigint NOT NULL CHECK (conversation_id BETWEEN 1 AND 9007199254740991),
  inbound_message_id bigint NOT NULL CHECK (inbound_message_id BETWEEN 1 AND 9007199254740991),
  request_binding_sha256 text NOT NULL CHECK (request_binding_sha256 ~ '^[a-f0-9]{64}$'),
  state text NOT NULL CHECK (
    state IN ('processing', 'sending', 'sent', 'cancelled', 'escalated', 'failed', 'ambiguous')
  ),
  processing_lease_token text CHECK (
    processing_lease_token IS NULL OR processing_lease_token ~ '^crp_[A-Za-z0-9_-]{8,120}$'
  ),
  processing_lease_expires_at timestamptz,
  processing_attempt_count integer NOT NULL DEFAULT 0 CHECK (processing_attempt_count >= 0),
  decision_kind text CHECK (
    decision_kind IS NULL OR decision_kind IN (
      'greeting', 'faq', 'order', 'model', 'out_of_scope', 'clarification'
    )
  ),
  reply_sha256 text CHECK (reply_sha256 IS NULL OR reply_sha256 ~ '^[a-f0-9]{64}$'),
  final_reread_binding_sha256 text CHECK (
    final_reread_binding_sha256 IS NULL OR final_reread_binding_sha256 ~ '^[a-f0-9]{64}$'
  ),
  final_reread_message_id bigint CHECK (
    final_reread_message_id IS NULL
    OR final_reread_message_id BETWEEN inbound_message_id AND 9007199254740991
  ),
  scope_lease_token text CHECK (
    scope_lease_token IS NULL OR scope_lease_token ~ '^crs_[A-Za-z0-9_-]{8,120}$'
  ),
  send_ref text UNIQUE CHECK (
    send_ref IS NULL OR send_ref ~ '^csr_[A-Za-z0-9_-]{8,120}$'
  ),
  send_lease_token text CHECK (
    send_lease_token IS NULL OR send_lease_token ~ '^crs_[A-Za-z0-9_-]{8,120}$'
  ),
  send_lease_expires_at timestamptz,
  send_attempt_count integer NOT NULL DEFAULT 0 CHECK (send_attempt_count >= 0),
  chatwoot_message_id bigint UNIQUE CHECK (
    chatwoot_message_id IS NULL OR chatwoot_message_id BETWEEN 1 AND 9007199254740991
  ),
  error_code text CHECK (error_code IS NULL OR error_code ~ '^[a-z0-9_]{3,64}$'),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  sent_at timestamptz,
  PRIMARY KEY (brand_id, account_id, inbox_id, conversation_id, inbound_message_id),
  CHECK (
    (state = 'processing' AND processing_lease_token IS NOT NULL
      AND processing_lease_expires_at IS NOT NULL)
    OR state <> 'processing'
  ),
  CHECK (
    (state IN ('sending', 'ambiguous', 'sent') AND send_ref IS NOT NULL
      AND reply_sha256 IS NOT NULL AND decision_kind IS NOT NULL)
    OR state NOT IN ('sending', 'ambiguous', 'sent')
  )
);

CREATE INDEX IF NOT EXISTS customer_reply_events_processing_expiry_idx
  ON calapres_cs.customer_reply_events (brand_id, processing_lease_expires_at)
  WHERE state = 'processing';
CREATE INDEX IF NOT EXISTS customer_reply_events_send_expiry_idx
  ON calapres_cs.customer_reply_events (brand_id, send_lease_expires_at)
  WHERE state = 'sending';

CREATE TABLE IF NOT EXISTS calapres_cs.customer_reply_scope_windows (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  conversation_id bigint NOT NULL CHECK (conversation_id BETWEEN 1 AND 9007199254740991),
  last_sent_at timestamptz,
  lease_token text CHECK (lease_token IS NULL OR lease_token ~ '^crs_[A-Za-z0-9_-]{8,120}$'),
  lease_expires_at timestamptz,
  leased_inbound_message_id bigint CHECK (
    leased_inbound_message_id IS NULL
    OR leased_inbound_message_id BETWEEN 1 AND 9007199254740991
  ),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, conversation_id)
);

COMMENT ON TABLE calapres_cs.model_budget_reservations IS
  'Opaque request references make model-budget reservation retries idempotent.';
COMMENT ON TABLE calapres_cs.customer_reply_events IS
  'Identifiers, state, and digests for one-winner Calapres customer-reply delivery.';
COMMENT ON TABLE calapres_cs.customer_reply_scope_windows IS
  'DB-clock suppression window for the deterministic out-of-scope notice.';

CREATE OR REPLACE FUNCTION calapres_cs.atomic_reserve_model_budget(p_command jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_brand text := p_command ->> 'brand_id';
  v_conversation text := p_command ->> 'conversation_id';
  v_request_ref text := p_command ->> 'request_ref';
  v_now timestamptz := transaction_timestamp();
  v_day date := (v_now AT TIME ZONE 'UTC')::date;
  v_month date := date_trunc('month', (v_now AT TIME ZONE 'UTC'))::date;
  v_control calapres_cs.model_budget_controls%ROWTYPE;
  v_month_row calapres_cs.model_budget_months%ROWTYPE;
  v_day_row calapres_cs.model_budget_conversation_days%ROWTYPE;
  v_reservation calapres_cs.model_budget_reservations%ROWTYPE;
BEGIN
  IF v_brand IS NULL OR v_brand <> 'calapres'
     OR v_conversation IS NULL OR v_conversation !~ '^[1-9][0-9]{0,30}$'
     OR v_request_ref IS NULL OR v_request_ref !~ '^mb_[A-Za-z0-9_-]{8,120}$' THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'reserve_model_budget',
      'status', 'rejected', 'outcome', 'invalid_command', 'error_code', 'schema_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('calapres:model-budget:' || v_brand, 0));
  SELECT * INTO v_control
  FROM calapres_cs.model_budget_controls
  WHERE brand_id = v_brand
  FOR UPDATE;

  IF NOT FOUND OR NOT v_control.enabled OR v_control.kill_switch THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'reserve_model_budget',
      'status', 'rejected', 'outcome', 'model_disabled', 'error_code', 'model_kill_switch',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;

  SELECT * INTO v_reservation
  FROM calapres_cs.model_budget_reservations
  WHERE brand_id = v_brand AND request_ref = v_request_ref;
  IF FOUND THEN
    IF v_reservation.conversation_id <> v_conversation THEN
      RETURN jsonb_build_object(
        'contract_verified', true, 'operation', 'reserve_model_budget',
        'status', 'rejected', 'outcome', 'request_ref_collision',
        'error_code', 'request_binding_mismatch', 'value', NULL,
        'customer_egress_allowed', false);
    END IF;
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'reserve_model_budget',
      'status', 'committed', 'outcome', 'reservation_reused', 'error_code', NULL,
      'value', jsonb_build_object(
        'brand_id', v_brand, 'conversation_id', v_conversation,
        'request_ref', v_request_ref,
        'window_start', v_reservation.month_window_start,
        'reservation_microusd', v_reservation.reservation_microusd,
        'monthly_limit_microusd', v_control.monthly_limit_microusd,
        'conversation_daily_request_limit', v_control.daily_conversation_request_limit),
      'customer_egress_allowed', false);
  END IF;

  INSERT INTO calapres_cs.model_budget_months (brand_id, window_start)
  VALUES (v_brand, v_month)
  ON CONFLICT (brand_id, window_start) DO NOTHING;
  SELECT * INTO v_month_row
  FROM calapres_cs.model_budget_months
  WHERE brand_id = v_brand AND window_start = v_month
  FOR UPDATE;

  INSERT INTO calapres_cs.model_budget_conversation_days
    (brand_id, window_start, conversation_id)
  VALUES (v_brand, v_day, v_conversation)
  ON CONFLICT (brand_id, window_start, conversation_id) DO NOTHING;
  SELECT * INTO v_day_row
  FROM calapres_cs.model_budget_conversation_days
  WHERE brand_id = v_brand AND window_start = v_day AND conversation_id = v_conversation
  FOR UPDATE;

  IF v_month_row.reserved_microusd + v_control.reservation_microusd
       > v_control.monthly_limit_microusd THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'reserve_model_budget',
      'status', 'rejected', 'outcome', 'monthly_budget_exhausted',
      'error_code', 'model_budget_exhausted', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;
  IF v_day_row.request_count >= v_control.daily_conversation_request_limit THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'reserve_model_budget',
      'status', 'rejected', 'outcome', 'conversation_daily_cap',
      'error_code', 'conversation_model_cap', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;

  INSERT INTO calapres_cs.model_budget_reservations
    (brand_id, request_ref, conversation_id, month_window_start,
      day_window_start, reservation_microusd, reserved_at)
  VALUES
    (v_brand, v_request_ref, v_conversation, v_month,
      v_day, v_control.reservation_microusd, v_now);
  UPDATE calapres_cs.model_budget_months
  SET reserved_microusd = reserved_microusd + v_control.reservation_microusd,
      request_count = request_count + 1, updated_at = v_now
  WHERE brand_id = v_brand AND window_start = v_month;
  UPDATE calapres_cs.model_budget_conversation_days
  SET reserved_microusd = reserved_microusd + v_control.reservation_microusd,
      request_count = request_count + 1, updated_at = v_now
  WHERE brand_id = v_brand AND window_start = v_day AND conversation_id = v_conversation;

  RETURN jsonb_build_object(
    'contract_verified', true, 'operation', 'reserve_model_budget',
    'status', 'committed', 'outcome', 'reservation_committed', 'error_code', NULL,
    'value', jsonb_build_object(
      'brand_id', v_brand, 'conversation_id', v_conversation,
      'request_ref', v_request_ref, 'window_start', v_month,
      'reservation_microusd', v_control.reservation_microusd,
      'monthly_reserved_microusd', v_month_row.reserved_microusd + v_control.reservation_microusd,
      'monthly_limit_microusd', v_control.monthly_limit_microusd,
      'conversation_daily_request_count', v_day_row.request_count + 1,
      'conversation_daily_request_limit', v_control.daily_conversation_request_limit),
    'customer_egress_allowed', false);
END;
$function$;

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
  IF v_account <> 179973 OR v_inbox <> 128058 OR v_ttl NOT BETWEEN 30 AND 300
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
  IF v_account <> 179973 OR v_inbox <> 128058
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
  IF v_account <> 179973 OR v_inbox <> 128058 OR v_ttl NOT BETWEEN 30 AND 300
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
  IF v_account <> 179973 OR v_inbox <> 128058
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
  IF v_account <> 179973 OR v_inbox <> 128058
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
  IF v_account <> 179973 OR v_inbox <> 128058
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

ALTER FUNCTION calapres_cs.atomic_reserve_model_budget(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_claim_customer_reply_event(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_claim_out_of_scope_notice(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_claim_customer_reply_send(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_complete_customer_reply_send(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_finalize_customer_reply_event(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_read_customer_reply_event(jsonb)
  OWNER TO calapres_cs_function_owner;

GRANT SELECT, INSERT, UPDATE ON
  calapres_cs.model_budget_reservations,
  calapres_cs.customer_reply_events,
  calapres_cs.customer_reply_scope_windows
  TO calapres_cs_function_owner;
GRANT SELECT, INSERT, UPDATE ON
  calapres_cs.model_budget_controls,
  calapres_cs.model_budget_months,
  calapres_cs.model_budget_conversation_days
  TO calapres_cs_function_owner;

REVOKE ALL ON TABLE calapres_cs.model_budget_reservations,
  calapres_cs.customer_reply_events,
  calapres_cs.customer_reply_scope_windows
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_webhook_runtime,
    calapres_cs_reconciliation_runtime, calapres_cs_owner_runtime,
    calapres_cs_webhook_login, calapres_cs_reconciliation_login;

REVOKE ALL ON FUNCTION calapres_cs.atomic_reserve_model_budget(jsonb),
  calapres_cs.atomic_claim_customer_reply_event(jsonb),
  calapres_cs.atomic_claim_out_of_scope_notice(jsonb),
  calapres_cs.atomic_claim_customer_reply_send(jsonb),
  calapres_cs.atomic_complete_customer_reply_send(jsonb),
  calapres_cs.atomic_finalize_customer_reply_event(jsonb),
  calapres_cs.atomic_read_customer_reply_event(jsonb)
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_reconciliation_runtime,
    calapres_cs_owner_runtime, calapres_cs_reconciliation_login;

GRANT USAGE ON SCHEMA calapres_cs
  TO calapres_cs_webhook_runtime, calapres_cs_webhook_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_reserve_model_budget(jsonb),
  calapres_cs.atomic_claim_customer_reply_event(jsonb),
  calapres_cs.atomic_claim_out_of_scope_notice(jsonb),
  calapres_cs.atomic_claim_customer_reply_send(jsonb),
  calapres_cs.atomic_complete_customer_reply_send(jsonb),
  calapres_cs.atomic_finalize_customer_reply_event(jsonb),
  calapres_cs.atomic_read_customer_reply_event(jsonb)
  TO calapres_cs_webhook_runtime, calapres_cs_webhook_login;

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (11, 'calapres_cs_customer_reply_outbox')
ON CONFLICT (version) DO NOTHING;

COMMIT;
