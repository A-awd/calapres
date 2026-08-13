-- Calapres customer-reply 24-hour unresolved-case SLA escalation.
-- Stores durable case identity and unresolved-since timestamps only, no customer text.
-- Immediate human escalation is reserved for an explicit customer request. Every other
-- unresolved case (Shopify failure, missing identifier, cancellation/refund/complaint,
-- model denial) waits for this durable 24-hour clock instead of labeling immediately.

BEGIN;

CREATE TABLE IF NOT EXISTS calapres_cs.customer_reply_sla_cases (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  account_id integer NOT NULL CHECK (account_id = 179973),
  inbox_id integer NOT NULL CHECK (inbox_id = 128058),
  conversation_id bigint NOT NULL CHECK (conversation_id BETWEEN 1 AND 9007199254740991),
  case_opened_message_id bigint NOT NULL CHECK (
    case_opened_message_id BETWEEN 1 AND 9007199254740991
  ),
  last_activity_message_id bigint NOT NULL CHECK (
    last_activity_message_id BETWEEN 1 AND 9007199254740991
  ),
  state text NOT NULL CHECK (
    state IN ('open', 'claimed_for_escalation', 'escalated', 'resolved')
  ),
  first_unresolved_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  escalation_lease_token text CHECK (
    escalation_lease_token IS NULL OR escalation_lease_token ~ '^sla_[A-Za-z0-9_-]{8,120}$'
  ),
  escalation_lease_expires_at timestamptz,
  escalated_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, account_id, inbox_id, conversation_id, case_opened_message_id),
  CHECK (
    (state = 'claimed_for_escalation' AND escalation_lease_token IS NOT NULL
      AND escalation_lease_expires_at IS NOT NULL)
    OR state <> 'claimed_for_escalation'
  ),
  CHECK ((state = 'escalated' AND escalated_at IS NOT NULL) OR state <> 'escalated'),
  CHECK ((state = 'resolved' AND resolved_at IS NOT NULL) OR state <> 'resolved')
);

-- At most one open (or mid-escalation) unresolved case per conversation, so repeated
-- messages reuse the same case and cannot reset first_unresolved_at.
CREATE UNIQUE INDEX IF NOT EXISTS customer_reply_sla_cases_one_open_per_conversation_idx
  ON calapres_cs.customer_reply_sla_cases (brand_id, account_id, inbox_id, conversation_id)
  WHERE state IN ('open', 'claimed_for_escalation');

CREATE INDEX IF NOT EXISTS customer_reply_sla_cases_due_idx
  ON calapres_cs.customer_reply_sla_cases (brand_id, first_unresolved_at)
  WHERE state = 'open';

COMMENT ON TABLE calapres_cs.customer_reply_sla_cases IS
  'Durable unresolved-case clock. Escalates to the human label only after 24h open, or '
  'immediately on an explicit customer request handled outside this table.';

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
  IF v_account <> 179973 OR v_inbox <> 128058
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

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_due_customer_reply_sla_escalation(
  p_command jsonb
)
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
  v_case calapres_cs.customer_reply_sla_cases%ROWTYPE;
BEGIN
  IF COALESCE(v_brand, '') <> 'calapres'
     OR COALESCE(v_worker_token, '') !~ '^sla_recovery_[A-Za-z0-9_-]{8,110}$'
     OR COALESCE(p_command ->> 'minimum_age_seconds', '') !~ '^[1-9][0-9]{0,6}$'
     OR COALESCE(p_command ->> 'lease_duration_seconds', '') !~ '^[1-9][0-9]{0,2}$' THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'claim_due_customer_reply_sla_escalation',
      'status', 'rejected', 'outcome', 'invalid_command',
      'error_code', 'schema_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;
  v_min_age := (p_command ->> 'minimum_age_seconds')::integer;
  v_lease_ttl := (p_command ->> 'lease_duration_seconds')::integer;
  IF v_min_age NOT BETWEEN 82800 AND 172800 OR v_lease_ttl NOT BETWEEN 30 AND 300 THEN
    -- 82800s (23h) floor guards against clock skew, 172800s (48h) ceiling is a sanity bound.
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'claim_due_customer_reply_sla_escalation',
      'status', 'rejected', 'outcome', 'range_invalid',
      'error_code', 'schema_invalid', 'value', NULL,
      'customer_egress_allowed', false);
  END IF;

  SELECT * INTO v_case
  FROM calapres_cs.customer_reply_sla_cases
  WHERE brand_id = v_brand
    AND state IN ('open', 'claimed_for_escalation')
    AND first_unresolved_at <= v_now - make_interval(secs => v_min_age)
    AND (escalation_lease_expires_at IS NULL OR escalation_lease_expires_at <= v_now)
  ORDER BY first_unresolved_at, conversation_id
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'contract_verified', true, 'operation', 'claim_due_customer_reply_sla_escalation',
      'status', 'committed', 'outcome', 'sla_queue_empty',
      'error_code', NULL, 'value', NULL,
      'customer_egress_allowed', false);
  END IF;

  UPDATE calapres_cs.customer_reply_sla_cases
  SET state = 'claimed_for_escalation', escalation_lease_token = v_worker_token,
      escalation_lease_expires_at = v_now + make_interval(secs => v_lease_ttl),
      updated_at = v_now
  WHERE brand_id = v_case.brand_id AND account_id = v_case.account_id
    AND inbox_id = v_case.inbox_id AND conversation_id = v_case.conversation_id
    AND case_opened_message_id = v_case.case_opened_message_id
  RETURNING * INTO v_case;

  RETURN jsonb_build_object(
    'contract_verified', true, 'operation', 'claim_due_customer_reply_sla_escalation',
    'status', 'committed', 'outcome', 'sla_case_claimed', 'error_code', NULL,
    'value', jsonb_build_object(
      'brand_id', v_case.brand_id, 'account_id', v_case.account_id,
      'inbox_id', v_case.inbox_id, 'conversation_id', v_case.conversation_id,
      'case_opened_message_id', v_case.case_opened_message_id,
      'first_unresolved_at', v_case.first_unresolved_at,
      'escalation_lease_token', v_case.escalation_lease_token,
      'escalation_lease_expires_at', v_case.escalation_lease_expires_at),
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
  IF v_account <> 179973 OR v_inbox <> 128058
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

ALTER FUNCTION calapres_cs.atomic_upsert_customer_reply_sla_case(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_claim_due_customer_reply_sla_escalation(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_finalize_customer_reply_sla_escalation(jsonb)
  OWNER TO calapres_cs_function_owner;

GRANT SELECT, INSERT, UPDATE ON calapres_cs.customer_reply_sla_cases
  TO calapres_cs_function_owner;

REVOKE ALL ON TABLE calapres_cs.customer_reply_sla_cases
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_webhook_runtime,
    calapres_cs_reconciliation_runtime, calapres_cs_owner_runtime,
    calapres_cs_webhook_login, calapres_cs_reconciliation_login;

REVOKE ALL ON FUNCTION calapres_cs.atomic_upsert_customer_reply_sla_case(jsonb),
  calapres_cs.atomic_claim_due_customer_reply_sla_escalation(jsonb),
  calapres_cs.atomic_finalize_customer_reply_sla_escalation(jsonb)
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_reconciliation_runtime,
    calapres_cs_owner_runtime, calapres_cs_reconciliation_login;

GRANT EXECUTE ON FUNCTION calapres_cs.atomic_upsert_customer_reply_sla_case(jsonb),
  calapres_cs.atomic_claim_due_customer_reply_sla_escalation(jsonb),
  calapres_cs.atomic_finalize_customer_reply_sla_escalation(jsonb)
  TO calapres_cs_webhook_runtime, calapres_cs_webhook_login;

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (14, 'calapres_cs_customer_reply_sla_escalation')
ON CONFLICT (version) DO NOTHING;

COMMIT;
