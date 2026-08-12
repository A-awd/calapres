-- Source-separated ingress provenance and reconciliation first-effect gate, migration 0007.
-- Candidate status: implementation_candidate_pending_live_postgres_validation.
-- op4 uses the live scan token as first-effect authority but never copies it into request/job
-- provenance or an op4 result; the scan subsystem retains its own lease state.

BEGIN;

DO $roles$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'calapres_cs_webhook_runtime'
  ) THEN
    CREATE ROLE calapres_cs_webhook_runtime
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'calapres_cs_reconciliation_runtime'
  ) THEN
    CREATE ROLE calapres_cs_reconciliation_runtime
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END;
$roles$;

ALTER ROLE calapres_cs_webhook_runtime
  NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
ALTER ROLE calapres_cs_reconciliation_runtime
  NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

REVOKE calapres_cs_webhook_runtime FROM calapres_cs_reconciliation_runtime;
REVOKE calapres_cs_reconciliation_runtime FROM calapres_cs_webhook_runtime;
REVOKE calapres_cs_edge_runtime FROM calapres_cs_webhook_runtime;
REVOKE calapres_cs_edge_runtime FROM calapres_cs_reconciliation_runtime;

ALTER TABLE calapres_cs.request_replay_claims
  ADD COLUMN IF NOT EXISTS request_source text,
  ADD COLUMN IF NOT EXISTS source_binding_sha256 text,
  ADD COLUMN IF NOT EXISTS reconciliation_scan_id text,
  ADD COLUMN IF NOT EXISTS reconciliation_expected_after_message_id bigint,
  ADD COLUMN IF NOT EXISTS reconciliation_page_binding_sha256 text;

ALTER TABLE calapres_cs.request_replay_claims
  DROP CONSTRAINT IF EXISTS request_replay_claims_ingress_provenance_check;
ALTER TABLE calapres_cs.request_replay_claims
  ADD CONSTRAINT request_replay_claims_ingress_provenance_check CHECK (
    (
      lifecycle_status = 'legacy_unbound'
      AND request_source IS NULL
      AND source_binding_sha256 IS NULL
      AND reconciliation_scan_id IS NULL
      AND reconciliation_expected_after_message_id IS NULL
      AND reconciliation_page_binding_sha256 IS NULL
    ) OR (
      lifecycle_status = 'processing'
      AND request_source IN (
        'chatwoot_signed_webhook_v1', 'chatwoot_reconciliation_api_v1'
      )
      AND source_binding_sha256 ~ '^[a-f0-9]{64}$'
      AND reconciliation_scan_id IS NULL
      AND reconciliation_expected_after_message_id IS NULL
      AND reconciliation_page_binding_sha256 IS NULL
    ) OR (
      lifecycle_status = 'completed'
      AND request_source IN (
        'chatwoot_signed_webhook_v1', 'chatwoot_reconciliation_api_v1'
      )
      AND source_binding_sha256 ~ '^[a-f0-9]{64}$'
      AND (
        (
          request_source = 'chatwoot_signed_webhook_v1'
          AND reconciliation_scan_id IS NULL
          AND reconciliation_expected_after_message_id IS NULL
          AND reconciliation_page_binding_sha256 IS NULL
        ) OR (
          request_source = 'chatwoot_reconciliation_api_v1'
          AND reconciliation_scan_id ~ '^cwrs_[a-f0-9]{24}$'
          AND reconciliation_expected_after_message_id BETWEEN 0 AND 9007199254740991
          AND reconciliation_page_binding_sha256 ~ '^[a-f0-9]{64}$'
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION calapres_cs._advance_reconciliation_ingress_v1(
  p_command jsonb
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_request calapres_cs.request_replay_claims%ROWTYPE;
  v_scan calapres_cs.chatwoot_reconciliation_scan_leases%ROWTYPE;
  v_cursor calapres_cs.chatwoot_reconciliation_message_cursors%ROWTYPE;
  v_account integer;
  v_inbox integer;
  v_channel text;
  v_current bigint;
  v_now timestamptz;
BEGIN
  IF jsonb_typeof(p_command) <> 'object'
    OR p_command ->> 'brand_id' <> 'calapres'
    OR p_command ->> 'request_source' <> 'chatwoot_reconciliation_api_v1'
    OR NOT calapres_cs._json_text_matches(
      p_command, 'request_claim_id', '^[A-Za-z0-9:_-]{4,160}$'
    )
    OR NOT calapres_cs._json_text_matches(
      p_command, 'source_binding_sha256', '^[a-f0-9]{64}$'
    )
    OR jsonb_typeof(p_command -> 'account_id') <> 'number'
    OR p_command ->> 'account_id' <> '179973'
    OR jsonb_typeof(p_command -> 'inbox_id') <> 'number'
    OR (p_command ->> 'inbox_id') !~ '^[1-9][0-9]{5}$'
    OR jsonb_typeof(p_command -> 'channel') <> 'string'
    OR NOT calapres_cs._chatwoot_uint53_text_valid(
      p_command ->> 'conversation_id', false
    )
    OR NOT calapres_cs._json_text_matches(
      p_command, 'reconciliation_scan_id', '^cwrs_[a-f0-9]{24}$'
    )
    OR NOT calapres_cs._json_text_matches(
      p_command, 'reconciliation_scan_lease_token', '^[A-Za-z0-9:_-]{4,160}$'
    )
    OR jsonb_typeof(
      p_command -> 'reconciliation_expected_after_message_id'
    ) <> 'number'
    OR NOT calapres_cs._chatwoot_uint53_text_valid(
      p_command ->> 'reconciliation_expected_after_message_id', true
    )
    OR NOT calapres_cs._json_text_matches(
      p_command, 'reconciliation_page_binding_sha256', '^[a-f0-9]{64}$'
    )
  THEN
    RETURN calapres_cs._atomic_envelope(
      'advance_conversation_generation', 'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  END IF;

  v_account := (p_command ->> 'account_id')::integer;
  v_inbox := (p_command ->> 'inbox_id')::integer;
  v_channel := p_command ->> 'channel';
  IF NOT calapres_cs._chatwoot_reconciliation_route_valid(
    v_account, v_inbox, v_channel
  ) THEN
    RETURN calapres_cs._atomic_envelope(
      'advance_conversation_generation', 'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  END IF;

  -- Match the op4 lock order before inspecting the request lifecycle.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'calapres:conversation:v2:' || (p_command ->> 'conversation_id'), 0
  ));
  SELECT * INTO v_request
  FROM calapres_cs.request_replay_claims
  WHERE brand_id = 'calapres' AND claim_id = p_command ->> 'request_claim_id'
  FOR UPDATE;

  IF NOT FOUND OR v_request.lifecycle_status = 'completed' THEN
    -- Missing requests cannot mutate. Completed requests use only their durable provenance
    -- so timeout recovery still works after cursor movement or scan-lease expiry.
    RETURN calapres_cs._edge_atomic_dispatch_v2(
      'advance_conversation_generation', p_command
    );
  END IF;

  IF v_request.lifecycle_status <> 'processing'
    OR v_request.request_source IS DISTINCT FROM 'chatwoot_reconciliation_api_v1'
    OR v_request.source_binding_sha256 IS DISTINCT FROM
      p_command ->> 'source_binding_sha256'
  THEN
    RETURN calapres_cs._atomic_envelope(
      'advance_conversation_generation', 'unknown', 'request_provenance_mismatch', NULL,
      'durable_reference_conflict'
    );
  END IF;

  -- This is the same per-conversation advisory lock used by op12.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'calapres:chatwoot-reconciliation-cursor:v1:' || v_account::text || ':' ||
      v_inbox::text || ':' || (p_command ->> 'conversation_id'), 0
  ));
  SELECT * INTO v_scan
  FROM calapres_cs.chatwoot_reconciliation_scan_leases
  WHERE brand_id = 'calapres' AND account_id = v_account AND inbox_id = v_inbox
  FOR UPDATE;
  v_now := clock_timestamp();
  IF NOT FOUND OR v_scan.channel <> v_channel
    OR v_scan.scan_id <> p_command ->> 'reconciliation_scan_id'
    OR v_scan.lease_token <> p_command ->> 'reconciliation_scan_lease_token'
    OR v_scan.lease_expires_at <= v_now
    OR v_scan.activation_floor_at <> '2026-08-12T00:00:00.000Z'::timestamptz
    OR v_scan.activation_policy_version <> '2026-08-12-v1'
  THEN
    RETURN calapres_cs._atomic_envelope(
      'advance_conversation_generation', 'unknown',
      'reconciliation_ingress_binding_invalid', NULL, 'durable_reference_conflict'
    );
  END IF;

  SELECT * INTO v_cursor
  FROM calapres_cs.chatwoot_reconciliation_message_cursors
  WHERE brand_id = 'calapres' AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = p_command ->> 'conversation_id'
  FOR UPDATE;
  IF FOUND AND (
    v_cursor.channel <> v_channel
    OR v_cursor.activation_floor_at <> '2026-08-12T00:00:00.000Z'::timestamptz
    OR v_cursor.activation_policy_version <> '2026-08-12-v1'
  ) THEN
    RETURN calapres_cs._atomic_envelope(
      'advance_conversation_generation', 'unknown',
      'reconciliation_ingress_binding_invalid', NULL, 'durable_reference_conflict'
    );
  END IF;
  v_current := CASE WHEN FOUND THEN v_cursor.after_message_id ELSE 0 END;
  IF v_current <> (p_command ->> 'reconciliation_expected_after_message_id')::bigint THEN
    RETURN calapres_cs._atomic_envelope(
      'advance_conversation_generation', 'unknown',
      'reconciliation_ingress_binding_invalid', NULL, 'durable_reference_conflict'
    );
  END IF;

  RETURN calapres_cs._edge_atomic_dispatch_v2(
    'advance_conversation_generation', p_command
  );
EXCEPTION
  WHEN serialization_failure OR deadlock_detected THEN
    RETURN calapres_cs._atomic_envelope(
      'advance_conversation_generation', 'unknown', 'uncertain', NULL,
      'concurrent_state_unknown'
    );
  WHEN invalid_text_representation OR numeric_value_out_of_range
    OR datetime_field_overflow THEN
    RETURN calapres_cs._atomic_envelope(
      'advance_conversation_generation', 'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  WHEN OTHERS THEN
    RETURN calapres_cs._atomic_envelope(
      'advance_conversation_generation', 'unknown', 'uncertain', NULL,
      'database_function_unknown'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_signed_webhook_request_replay(
  p_command jsonb
) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT CASE
    WHEN p_command ->> 'request_source' = 'chatwoot_signed_webhook_v1'
      THEN calapres_cs._edge_atomic_dispatch_v2('claim_request_replay', p_command)
    ELSE calapres_cs._atomic_envelope(
      'claim_request_replay', 'unknown', 'uncertain', NULL, 'schema_invalid'
    )
  END
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_reconciliation_request_replay(
  p_command jsonb
) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT CASE
    WHEN p_command ->> 'request_source' = 'chatwoot_reconciliation_api_v1'
      THEN calapres_cs._edge_atomic_dispatch_v2('claim_request_replay', p_command)
    ELSE calapres_cs._atomic_envelope(
      'claim_request_replay', 'unknown', 'uncertain', NULL, 'schema_invalid'
    )
  END
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_advance_signed_webhook_conversation_generation(
  p_command jsonb
) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT CASE
    WHEN p_command ->> 'request_source' = 'chatwoot_signed_webhook_v1'
      AND jsonb_typeof(p_command -> 'reconciliation_scan_id') = 'null'
      AND jsonb_typeof(p_command -> 'reconciliation_scan_lease_token') = 'null'
      AND jsonb_typeof(
        p_command -> 'reconciliation_expected_after_message_id'
      ) = 'null'
      AND jsonb_typeof(p_command -> 'reconciliation_page_binding_sha256') = 'null'
      THEN calapres_cs._edge_atomic_dispatch_v2(
        'advance_conversation_generation', p_command
      )
    ELSE calapres_cs._atomic_envelope(
      'advance_conversation_generation', 'unknown', 'uncertain', NULL, 'schema_invalid'
    )
  END
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_advance_reconciliation_conversation_generation(
  p_command jsonb
) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT CASE
    WHEN p_command ->> 'request_source' = 'chatwoot_reconciliation_api_v1'
      THEN calapres_cs._advance_reconciliation_ingress_v1(p_command)
    ELSE calapres_cs._atomic_envelope(
      'advance_conversation_generation', 'unknown', 'uncertain', NULL, 'schema_invalid'
    )
  END
$function$;

ALTER FUNCTION calapres_cs._advance_reconciliation_ingress_v1(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_claim_signed_webhook_request_replay(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_claim_reconciliation_request_replay(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_advance_signed_webhook_conversation_generation(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_advance_reconciliation_conversation_generation(jsonb)
  OWNER TO calapres_cs_function_owner;

REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs
  FROM calapres_cs_edge_runtime, calapres_cs_webhook_runtime,
    calapres_cs_reconciliation_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA calapres_cs
  FROM calapres_cs_edge_runtime, calapres_cs_webhook_runtime,
    calapres_cs_reconciliation_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA calapres_cs
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_webhook_runtime,
    calapres_cs_reconciliation_runtime;

GRANT USAGE ON SCHEMA calapres_cs TO calapres_cs_webhook_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_signed_webhook_request_replay(jsonb)
  TO calapres_cs_webhook_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_business_event(jsonb)
  TO calapres_cs_webhook_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_complete_business_event(jsonb)
  TO calapres_cs_webhook_runtime;
GRANT EXECUTE ON FUNCTION
  calapres_cs.atomic_advance_signed_webhook_conversation_generation(jsonb)
  TO calapres_cs_webhook_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_read_generation(jsonb)
  TO calapres_cs_webhook_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_schedule_conversation_retry(jsonb)
  TO calapres_cs_webhook_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_due_conversation_retry(jsonb)
  TO calapres_cs_webhook_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_transition_conversation_job(jsonb)
  TO calapres_cs_webhook_runtime;

GRANT USAGE ON SCHEMA calapres_cs TO calapres_cs_reconciliation_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_reconciliation_request_replay(jsonb)
  TO calapres_cs_reconciliation_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_business_event(jsonb)
  TO calapres_cs_reconciliation_runtime;
GRANT EXECUTE ON FUNCTION
  calapres_cs.atomic_advance_reconciliation_conversation_generation(jsonb)
  TO calapres_cs_reconciliation_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_chatwoot_reconciliation_scan(jsonb)
  TO calapres_cs_reconciliation_runtime;
GRANT EXECUTE ON FUNCTION
  calapres_cs.atomic_compare_and_advance_chatwoot_message_cursor(jsonb)
  TO calapres_cs_reconciliation_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_read_chatwoot_reconciliation_cursor(jsonb)
  TO calapres_cs_reconciliation_runtime;

COMMENT ON ROLE calapres_cs_edge_runtime IS
  'Deprecated NOLOGIN role with no callable customer-service functions after migration 0007.';
COMMENT ON ROLE calapres_cs_webhook_runtime IS
  'NOLOGIN signed-webhook and worker boundary; no reconciliation or owner functions.';
COMMENT ON ROLE calapres_cs_reconciliation_runtime IS
  'NOLOGIN reconciliation-only boundary; no signed-webhook, worker, or owner functions.';
COMMENT ON FUNCTION calapres_cs.atomic_claim_signed_webhook_request_replay(jsonb) IS
  'Forces signed-webhook provenance before the op1 atomic claim.';
COMMENT ON FUNCTION calapres_cs.atomic_claim_reconciliation_request_replay(jsonb) IS
  'Forces reconciliation provenance before the op1 atomic claim.';
COMMENT ON FUNCTION
  calapres_cs.atomic_advance_reconciliation_conversation_generation(jsonb) IS
  'Requires a live DB-clock scan lease and exact cursor before the first op4 effect.';

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (7, 'calapres_cs_ingress_provenance_boundary')
ON CONFLICT (version) DO NOTHING;

COMMIT;
