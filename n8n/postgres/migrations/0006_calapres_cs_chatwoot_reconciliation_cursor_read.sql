-- Lease-bound, source-only Chatwoot reconciliation cursor read, migration 0006.
-- Candidate status: implementation_candidate_pending_live_postgres_validation.
-- The caller supplies no clock. The DB clock is consulted only after locking the scan lease.

BEGIN;

CREATE OR REPLACE FUNCTION calapres_cs._chatwoot_sync_business_event_retention_v1()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_storage_key_version text;
BEGIN
  v_storage_key_version := regexp_replace(
    NEW.event_identity_key_version,
    '^calapres-identity-hmac-', 'hmac-sha256-'
  );
  IF NOT EXISTS (
    SELECT 1
    FROM calapres_cs.business_events AS event
    WHERE event.brand_id = NEW.brand_id
      AND event.claim_id = NEW.business_claim_id
  ) OR NOT EXISTS (
    SELECT 1
    FROM calapres_cs.business_event_aliases AS alias
    WHERE alias.brand_id = NEW.brand_id
      AND alias.claim_id = NEW.business_claim_id
      AND alias.key_version = v_storage_key_version
      AND alias.fingerprint = NEW.event_identity_fingerprint
  ) OR EXISTS (
    SELECT 1
    FROM calapres_cs.business_event_aliases AS alias
    WHERE alias.brand_id = NEW.brand_id
      AND alias.claim_id = NEW.business_claim_id
      AND NOT EXISTS (
        SELECT 1
        FROM calapres_cs.storage_key_registry_heads AS head
        JOIN calapres_cs.storage_key_registry AS registry
          ON registry.brand_id = head.brand_id
         AND registry.namespace = head.namespace
         AND registry.registry_version = head.current_registry_version
         AND registry.key_version = alias.key_version
        WHERE head.brand_id = alias.brand_id
          AND head.namespace = 'business_event'
          AND registry.coverage_until >= NEW.retention_until
      )
  ) THEN
    RAISE EXCEPTION 'business event retention binding is incomplete'
      USING ERRCODE = '23514';
  END IF;

  UPDATE calapres_cs.business_events
  SET expires_at = GREATEST(expires_at, NEW.retention_until),
      retention_until = GREATEST(retention_until, NEW.retention_until),
      updated_at = clock_timestamp()
  WHERE brand_id = NEW.brand_id AND claim_id = NEW.business_claim_id;
  UPDATE calapres_cs.business_event_aliases
  SET retention_until = GREATEST(retention_until, NEW.retention_until),
      updated_at = clock_timestamp()
  WHERE brand_id = NEW.brand_id AND claim_id = NEW.business_claim_id;
  RETURN NEW;
END;
$function$;

ALTER FUNCTION calapres_cs._chatwoot_sync_business_event_retention_v1()
  OWNER TO calapres_cs_function_owner;

DO $backfill$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM calapres_cs.conversation_job_queue AS job
    LEFT JOIN calapres_cs.business_events AS event
      ON event.brand_id = job.brand_id AND event.claim_id = job.business_claim_id
    WHERE job.brand_id = 'calapres'
      AND (
        event.claim_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM calapres_cs.business_event_aliases AS exact_alias
          WHERE exact_alias.brand_id = job.brand_id
            AND exact_alias.claim_id = job.business_claim_id
            AND exact_alias.key_version = regexp_replace(
              job.event_identity_key_version,
              '^calapres-identity-hmac-', 'hmac-sha256-'
            )
            AND exact_alias.fingerprint = job.event_identity_fingerprint
        )
        OR EXISTS (
          SELECT 1
          FROM calapres_cs.business_event_aliases AS alias
          WHERE alias.brand_id = job.brand_id
            AND alias.claim_id = job.business_claim_id
            AND NOT EXISTS (
              SELECT 1
              FROM calapres_cs.storage_key_registry_heads AS head
              JOIN calapres_cs.storage_key_registry AS registry
                ON registry.brand_id = head.brand_id
               AND registry.namespace = head.namespace
               AND registry.registry_version = head.current_registry_version
               AND registry.key_version = alias.key_version
              WHERE head.brand_id = alias.brand_id
                AND head.namespace = 'business_event'
                AND registry.coverage_until >= job.retention_until
            )
        )
      )
  ) THEN
    RAISE EXCEPTION 'existing business event retention binding is incomplete'
      USING ERRCODE = '23514';
  END IF;

  WITH bounds AS (
    SELECT brand_id, business_claim_id, max(retention_until) AS retention_until
    FROM calapres_cs.conversation_job_queue
    WHERE brand_id = 'calapres'
    GROUP BY brand_id, business_claim_id
  )
  UPDATE calapres_cs.business_events AS event
  SET expires_at = GREATEST(event.expires_at, bounds.retention_until),
      retention_until = GREATEST(event.retention_until, bounds.retention_until),
      updated_at = clock_timestamp()
  FROM bounds
  WHERE event.brand_id = bounds.brand_id
    AND event.claim_id = bounds.business_claim_id;

  WITH bounds AS (
    SELECT brand_id, business_claim_id, max(retention_until) AS retention_until
    FROM calapres_cs.conversation_job_queue
    WHERE brand_id = 'calapres'
    GROUP BY brand_id, business_claim_id
  )
  UPDATE calapres_cs.business_event_aliases AS alias
  SET retention_until = GREATEST(alias.retention_until, bounds.retention_until),
      updated_at = clock_timestamp()
  FROM bounds
  WHERE alias.brand_id = bounds.brand_id
    AND alias.claim_id = bounds.business_claim_id;
END;
$backfill$;

DROP TRIGGER IF EXISTS chatwoot_sync_business_event_retention_v1
  ON calapres_cs.conversation_job_queue;
CREATE TRIGGER chatwoot_sync_business_event_retention_v1
AFTER INSERT OR UPDATE OF business_claim_id, event_identity_key_version,
  event_identity_fingerprint, retention_until
ON calapres_cs.conversation_job_queue
FOR EACH ROW
EXECUTE FUNCTION calapres_cs._chatwoot_sync_business_event_retention_v1();

CREATE OR REPLACE FUNCTION calapres_cs._chatwoot_reconciliation_proofs_valid(
  p_command jsonb,
  p_now timestamptz,
  p_require_durable boolean
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_row jsonb;
  v_previous bigint;
  v_message bigint;
  v_expected bigint;
  v_new bigint;
  v_generation integer;
  v_reason text;
  v_created_at bigint;
  v_message_type integer;
  v_sender_type text;
  v_match_count integer;
BEGIN
  IF jsonb_typeof(p_command -> 'proof_rows') <> 'array'
    OR jsonb_array_length(p_command -> 'proof_rows') NOT BETWEEN 1 AND 99
    OR jsonb_typeof(p_command -> 'row_count') <> 'number'
    OR (p_command ->> 'row_count') !~ '^[1-9][0-9]?$'
    OR (p_command ->> 'row_count')::integer <>
      jsonb_array_length(p_command -> 'proof_rows')
  THEN RETURN false; END IF;

  v_expected := (p_command ->> 'expected_after_message_id')::bigint;
  v_new := (p_command ->> 'new_after_message_id')::bigint;
  v_previous := v_expected;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_command -> 'proof_rows') LOOP
    IF NOT calapres_cs._exact_json_keys(v_row, ARRAY[
      'message_id', 'classification', 'outcome', 'reason_code', 'created_at',
      'message_type', 'private', 'sender_type', 'event_identity_key_version',
      'event_identity_fingerprint', 'business_claim_id', 'job_id', 'generation'
    ])
      OR jsonb_typeof(v_row -> 'message_id') <> 'string'
      OR NOT calapres_cs._chatwoot_uint53_text_valid(v_row ->> 'message_id', false)
    THEN RETURN false; END IF;
    v_message := (v_row ->> 'message_id')::bigint;
    IF v_message <= v_previous OR v_message <= v_expected OR v_message > v_new THEN
      RETURN false;
    END IF;
    v_previous := v_message;

    IF v_row ->> 'classification' = 'event_candidate' THEN
      IF jsonb_typeof(v_row -> 'outcome') <> 'string'
        OR v_row ->> 'outcome' NOT IN ('durable_bound', 'durable_duplicate')
        OR v_row -> 'reason_code' <> 'null'::jsonb
        OR v_row -> 'created_at' <> 'null'::jsonb
        OR v_row -> 'message_type' <> 'null'::jsonb
        OR v_row -> 'private' <> 'null'::jsonb
        OR v_row -> 'sender_type' <> 'null'::jsonb
        OR NOT calapres_cs._json_text_matches(
          v_row, 'event_identity_key_version', '^calapres-identity-hmac-v[1-9][0-9]*$'
        )
        OR NOT calapres_cs._json_text_matches(
          v_row, 'event_identity_fingerprint', '^[a-f0-9]{64}$'
        )
        OR NOT calapres_cs._json_text_matches(
          v_row, 'business_claim_id', '^bev_claim_[A-Za-z0-9_-]{4,120}$'
        )
        OR NOT calapres_cs._json_text_matches(
          v_row, 'job_id', '^job_[A-Za-z0-9_-]{4,120}$'
        )
        OR jsonb_typeof(v_row -> 'generation') <> 'number'
        OR (v_row ->> 'generation') !~ '^[1-9][0-9]{0,9}$'
        OR (v_row ->> 'generation')::numeric > 2147483647
      THEN RETURN false; END IF;
      v_generation := (v_row ->> 'generation')::integer;

      IF p_require_durable THEN
        SELECT count(*) INTO v_match_count
        FROM calapres_cs.business_event_aliases AS alias
        JOIN calapres_cs.business_events AS event
          ON event.brand_id = alias.brand_id AND event.claim_id = alias.claim_id
        JOIN calapres_cs.conversation_job_queue AS job
          ON job.brand_id = event.brand_id AND job.job_id = event.job_id
        WHERE alias.brand_id = 'calapres'
          AND alias.key_version = regexp_replace(
            v_row ->> 'event_identity_key_version',
            '^calapres-identity-hmac-', 'hmac-sha256-'
          )
          AND alias.fingerprint = v_row ->> 'event_identity_fingerprint'
          AND alias.retention_until > p_now
          AND event.claim_id = v_row ->> 'business_claim_id'
          AND event.job_id = v_row ->> 'job_id'
          AND event.retention_until > p_now
          AND job.business_claim_id = event.claim_id
          AND job.account_id = (p_command ->> 'account_id')::integer
          AND job.inbox_id = (p_command ->> 'inbox_id')::integer
          AND job.channel = p_command ->> 'channel'
          AND job.conversation_id = p_command ->> 'conversation_id'
          AND job.anchor_message_id = v_row ->> 'message_id'
          AND job.generation = v_generation
          AND job.retention_until > p_now;
        IF v_match_count <> 1 THEN RETURN false; END IF;
      END IF;
    ELSIF v_row ->> 'classification' = 'deterministically_excluded' THEN
      IF jsonb_typeof(v_row -> 'outcome') <> 'string'
        OR v_row ->> 'outcome' <> 'deterministically_excluded'
        OR jsonb_typeof(v_row -> 'reason_code') <> 'string'
        OR jsonb_typeof(v_row -> 'created_at') <> 'number'
        OR (v_row ->> 'created_at') !~ '^(0|[1-9][0-9]{0,11})$'
        OR (v_row ->> 'created_at')::numeric > 253402300799
        OR jsonb_typeof(v_row -> 'message_type') <> 'number'
        OR (v_row ->> 'message_type') !~ '^[0-3]$'
        OR jsonb_typeof(v_row -> 'private') <> 'boolean'
        OR NOT (
          v_row -> 'sender_type' = 'null'::jsonb
          OR (
            jsonb_typeof(v_row -> 'sender_type') = 'string'
            AND v_row ->> 'sender_type' IN ('contact', 'user', 'agent', 'agent_bot', 'bot')
          )
        )
        OR v_row -> 'event_identity_key_version' <> 'null'::jsonb
        OR v_row -> 'event_identity_fingerprint' <> 'null'::jsonb
        OR v_row -> 'business_claim_id' <> 'null'::jsonb
        OR v_row -> 'job_id' <> 'null'::jsonb
        OR v_row -> 'generation' <> 'null'::jsonb
      THEN RETURN false; END IF;
      v_created_at := (v_row ->> 'created_at')::bigint;
      v_message_type := (v_row ->> 'message_type')::integer;
      v_sender_type := v_row ->> 'sender_type';
      v_reason := CASE
        WHEN to_timestamp(v_created_at) < '2026-08-12T00:00:00.000Z'::timestamptz
          THEN 'before_activation_floor'
        WHEN (v_row ->> 'private')::boolean THEN 'private_message'
        WHEN v_message_type = 1 THEN 'outgoing_message'
        WHEN v_message_type = 2 THEN 'activity_message'
        WHEN v_message_type = 3 THEN 'template_message'
        WHEN v_sender_type IN ('agent_bot', 'bot') THEN 'bot_echo'
        ELSE NULL
      END;
      IF v_reason IS NULL OR v_reason <> v_row ->> 'reason_code' THEN RETURN false; END IF;
    ELSE
      RETURN false;
    END IF;
  END LOOP;
  RETURN v_previous = v_new;
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range
    OR datetime_field_overflow THEN RETURN false;
END;
$function$;

ALTER FUNCTION calapres_cs._chatwoot_reconciliation_proofs_valid(
  jsonb, timestamptz, boolean
) OWNER TO calapres_cs_function_owner;

CREATE OR REPLACE FUNCTION calapres_cs._chatwoot_reconciliation_cursor_read_v1(
  p_command jsonb
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_account integer;
  v_inbox integer;
  v_channel text;
  v_now timestamptz;
  v_scan calapres_cs.chatwoot_reconciliation_scan_leases%ROWTYPE;
  v_cursor calapres_cs.chatwoot_reconciliation_message_cursors%ROWTYPE;
  v_current bigint;
BEGIN
  IF jsonb_typeof(p_command) <> 'object'
    OR NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'schema_version', 'kind', 'operation', 'source', 'brand_id', 'account_id',
      'inbox_id', 'channel', 'conversation_id', 'scan_id', 'lease_token',
      'activation_floor_at', 'activation_policy_version', 'customer_egress_allowed'
    ])
    OR p_command -> 'schema_version' <> '"1.0"'::jsonb
    OR p_command -> 'kind' <>
      '"chatwoot_reconciliation_cursor_read_command_v1"'::jsonb
    OR p_command -> 'operation' <>
      '"read_chatwoot_reconciliation_cursor"'::jsonb
    OR p_command -> 'source' <> '"chatwoot_reconciliation_v1"'::jsonb
    OR p_command -> 'brand_id' <> '"calapres"'::jsonb
    OR jsonb_typeof(p_command -> 'account_id') <> 'number'
    OR p_command ->> 'account_id' <> '179973'
    OR jsonb_typeof(p_command -> 'inbox_id') <> 'number'
    OR (p_command ->> 'inbox_id') !~ '^[1-9][0-9]{5}$'
    OR jsonb_typeof(p_command -> 'channel') <> 'string'
    OR jsonb_typeof(p_command -> 'conversation_id') <> 'string'
    OR NOT calapres_cs._chatwoot_uint53_text_valid(
      p_command ->> 'conversation_id', false
    )
    OR NOT calapres_cs._json_text_matches(
      p_command, 'scan_id', '^cwrs_[a-f0-9]{24}$'
    )
    OR NOT calapres_cs._json_text_matches(
      p_command, 'lease_token', '^[A-Za-z0-9:_-]{4,160}$'
    )
    OR p_command -> 'activation_floor_at' <> '"2026-08-12T00:00:00.000Z"'::jsonb
    OR p_command -> 'activation_policy_version' <> '"2026-08-12-v1"'::jsonb
    OR p_command -> 'customer_egress_allowed' <> 'false'::jsonb
  THEN
    RETURN calapres_cs._atomic_envelope(
      'read_chatwoot_reconciliation_cursor',
      'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  END IF;

  v_account := (p_command ->> 'account_id')::integer;
  v_inbox := (p_command ->> 'inbox_id')::integer;
  v_channel := p_command ->> 'channel';
  IF NOT calapres_cs._chatwoot_reconciliation_route_valid(
    v_account, v_inbox, v_channel
  ) THEN
    RETURN calapres_cs._atomic_envelope(
      'read_chatwoot_reconciliation_cursor',
      'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  END IF;

  -- This row lock is the linearization point shared with scan recovery and cursor CAS.
  SELECT * INTO v_scan
  FROM calapres_cs.chatwoot_reconciliation_scan_leases
  WHERE brand_id = 'calapres' AND account_id = v_account AND inbox_id = v_inbox
  FOR UPDATE;
  v_now := clock_timestamp();
  IF NOT FOUND OR v_scan.channel <> v_channel
    OR v_scan.scan_id <> p_command ->> 'scan_id'
    OR v_scan.lease_token <> p_command ->> 'lease_token'
    OR v_scan.lease_expires_at <= v_now
    OR v_scan.activation_floor_at <> '2026-08-12T00:00:00.000Z'::timestamptz
    OR v_scan.activation_policy_version <> '2026-08-12-v1'
  THEN
    RETURN calapres_cs._atomic_envelope(
      'read_chatwoot_reconciliation_cursor',
      'duplicate_or_conflict', 'scan_lease_not_owned', NULL, NULL
    );
  END IF;

  SELECT * INTO v_cursor
  FROM calapres_cs.chatwoot_reconciliation_message_cursors
  WHERE brand_id = 'calapres' AND account_id = v_account AND inbox_id = v_inbox
    AND conversation_id = p_command ->> 'conversation_id';
  IF FOUND THEN
    IF v_cursor.channel <> v_channel
      OR v_cursor.activation_floor_at <> '2026-08-12T00:00:00.000Z'::timestamptz
      OR v_cursor.activation_policy_version <> '2026-08-12-v1'
    THEN
      RETURN calapres_cs._atomic_envelope(
        'read_chatwoot_reconciliation_cursor',
        'unknown', 'cursor_state_invalid', NULL, 'durable_reference_conflict'
      );
    END IF;
    v_current := v_cursor.after_message_id;
  ELSE
    v_current := 0;
  END IF;

  RETURN calapres_cs._atomic_envelope(
    'read_chatwoot_reconciliation_cursor',
    'committed', 'cursor_read',
    jsonb_build_object(
      'account_id', v_account,
      'inbox_id', v_inbox,
      'channel', v_channel,
      'conversation_id', p_command ->> 'conversation_id',
      'scan_id', p_command ->> 'scan_id',
      'current_after_message_id', v_current,
      'activation_floor_at', '2026-08-12T00:00:00.000Z',
      'activation_policy_version', '2026-08-12-v1'
    ), NULL
  );
EXCEPTION
  WHEN serialization_failure OR deadlock_detected THEN
    RETURN calapres_cs._atomic_envelope(
      'read_chatwoot_reconciliation_cursor',
      'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
    );
  WHEN invalid_text_representation OR numeric_value_out_of_range
    OR datetime_field_overflow THEN
    RETURN calapres_cs._atomic_envelope(
      'read_chatwoot_reconciliation_cursor',
      'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  WHEN OTHERS THEN
    RETURN calapres_cs._atomic_envelope(
      'read_chatwoot_reconciliation_cursor',
      'unknown', 'uncertain', NULL, 'database_function_unknown'
    );
END;
$function$;

ALTER FUNCTION calapres_cs._chatwoot_reconciliation_cursor_read_v1(jsonb)
  OWNER TO calapres_cs_function_owner;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_read_chatwoot_reconciliation_cursor(
  p_command jsonb
) RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._chatwoot_reconciliation_cursor_read_v1(p_command)
$function$;

ALTER FUNCTION calapres_cs.atomic_read_chatwoot_reconciliation_cursor(jsonb)
  OWNER TO calapres_cs_function_owner;

REVOKE ALL ON FUNCTION calapres_cs._chatwoot_sync_business_event_retention_v1()
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._chatwoot_reconciliation_proofs_valid(
  jsonb, timestamptz, boolean
) FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._chatwoot_reconciliation_cursor_read_v1(jsonb)
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_read_chatwoot_reconciliation_cursor(jsonb)
  FROM PUBLIC, calapres_cs_owner_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_edge_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_owner_runtime;

GRANT EXECUTE ON FUNCTION calapres_cs.atomic_read_chatwoot_reconciliation_cursor(jsonb)
  TO calapres_cs_edge_runtime;

COMMENT ON ROLE calapres_cs_edge_runtime IS
  'NOLOGIN edge membership role: eleven non-owner atomic functions only; deployment login is separate.';
COMMENT ON FUNCTION calapres_cs.atomic_read_chatwoot_reconciliation_cursor(jsonb) IS
  'Reads one exact Calapres conversation cursor only for the currently owned DB-clock scan lease.';

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (6, 'calapres_cs_chatwoot_reconciliation_cursor_read')
ON CONFLICT (version) DO NOTHING;

COMMIT;
