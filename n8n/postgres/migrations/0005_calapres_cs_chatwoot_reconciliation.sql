-- Calapres Chatwoot reconciliation scan/cursor state, migration 0005.
-- Candidate status: implementation_candidate_pending_live_postgres_validation.
-- Caller clocks are never accepted. Scan leases and committed-at values use the DB clock.

BEGIN;

CREATE TABLE IF NOT EXISTS calapres_cs.chatwoot_reconciliation_scan_leases (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  account_id integer NOT NULL CHECK (account_id = 179973),
  inbox_id integer NOT NULL CHECK (inbox_id IN (128031, 128033, 128058, 128326)),
  channel text NOT NULL CHECK (channel IN ('instagram', 'tiktok', 'whatsapp', 'email')),
  scan_id text NOT NULL CHECK (scan_id ~ '^cwrs_[a-f0-9]{24}$'),
  lease_owner_id text NOT NULL CHECK (lease_owner_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  lease_token text NOT NULL CHECK (lease_token ~ '^[A-Za-z0-9:_-]{4,160}$'),
  lease_claimed_at timestamptz NOT NULL,
  lease_expires_at timestamptz NOT NULL,
  lease_duration_seconds integer NOT NULL CHECK (lease_duration_seconds BETWEEN 30 AND 900),
  attempt_count integer NOT NULL CHECK (attempt_count BETWEEN 1 AND 2147483647),
  max_pages integer NOT NULL CHECK (max_pages BETWEEN 1 AND 100),
  activation_floor_at timestamptz NOT NULL CHECK (
    activation_floor_at = '2026-08-12T00:00:00.000Z'::timestamptz
  ),
  activation_policy_version text NOT NULL CHECK (
    activation_policy_version = '2026-08-12-v1'
  ),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, account_id, inbox_id),
  UNIQUE (brand_id, scan_id),
  UNIQUE (brand_id, lease_token),
  CHECK (lease_expires_at > lease_claimed_at),
  CHECK (
    (inbox_id = 128031 AND channel = 'instagram')
    OR (inbox_id = 128033 AND channel = 'tiktok')
    OR (inbox_id = 128058 AND channel = 'whatsapp')
    OR (inbox_id = 128326 AND channel = 'email')
  )
);

CREATE INDEX IF NOT EXISTS chatwoot_reconciliation_scan_lease_expiry_idx
  ON calapres_cs.chatwoot_reconciliation_scan_leases (brand_id, lease_expires_at);

CREATE TABLE IF NOT EXISTS calapres_cs.chatwoot_reconciliation_message_cursors (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  account_id integer NOT NULL CHECK (account_id = 179973),
  inbox_id integer NOT NULL CHECK (inbox_id IN (128031, 128033, 128058, 128326)),
  channel text NOT NULL CHECK (channel IN ('instagram', 'tiktok', 'whatsapp', 'email')),
  conversation_id text NOT NULL CHECK (
    CASE WHEN conversation_id ~ '^[1-9][0-9]{0,15}$'
      THEN conversation_id::numeric <= 9007199254740991
      ELSE false
    END
  ),
  after_message_id bigint NOT NULL CHECK (
    after_message_id BETWEEN 0 AND 9007199254740991
  ),
  activation_floor_at timestamptz NOT NULL CHECK (
    activation_floor_at = '2026-08-12T00:00:00.000Z'::timestamptz
  ),
  activation_policy_version text NOT NULL CHECK (
    activation_policy_version = '2026-08-12-v1'
  ),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, account_id, inbox_id, conversation_id),
  CHECK (
    (inbox_id = 128031 AND channel = 'instagram')
    OR (inbox_id = 128033 AND channel = 'tiktok')
    OR (inbox_id = 128058 AND channel = 'whatsapp')
    OR (inbox_id = 128326 AND channel = 'email')
  )
);

CREATE TABLE IF NOT EXISTS calapres_cs.chatwoot_reconciliation_cursor_commits (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  account_id integer NOT NULL CHECK (account_id = 179973),
  inbox_id integer NOT NULL CHECK (inbox_id IN (128031, 128033, 128058, 128326)),
  channel text NOT NULL CHECK (channel IN ('instagram', 'tiktok', 'whatsapp', 'email')),
  conversation_id text NOT NULL CHECK (
    CASE WHEN conversation_id ~ '^[1-9][0-9]{0,15}$'
      THEN conversation_id::numeric <= 9007199254740991
      ELSE false
    END
  ),
  scan_id text NOT NULL CHECK (scan_id ~ '^cwrs_[a-f0-9]{24}$'),
  lease_token text NOT NULL CHECK (lease_token ~ '^[A-Za-z0-9:_-]{4,160}$'),
  expected_after_message_id bigint NOT NULL CHECK (
    expected_after_message_id BETWEEN 0 AND 9007199254740991
  ),
  new_after_message_id bigint NOT NULL CHECK (
    new_after_message_id BETWEEN 1 AND 9007199254740991
  ),
  proof_rows jsonb NOT NULL CHECK (
    jsonb_typeof(proof_rows) = 'array'
    AND jsonb_array_length(proof_rows) BETWEEN 1 AND 99
  ),
  page_binding_sha256 text NOT NULL CHECK (page_binding_sha256 ~ '^[a-f0-9]{64}$'),
  outcome_digest text NOT NULL CHECK (outcome_digest ~ '^[a-f0-9]{64}$'),
  row_count integer NOT NULL CHECK (row_count BETWEEN 1 AND 99),
  activation_floor_at timestamptz NOT NULL CHECK (
    activation_floor_at = '2026-08-12T00:00:00.000Z'::timestamptz
  ),
  activation_policy_version text NOT NULL CHECK (
    activation_policy_version = '2026-08-12-v1'
  ),
  advanced_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (
    brand_id, account_id, inbox_id, conversation_id, expected_after_message_id
  ),
  UNIQUE (brand_id, account_id, inbox_id, conversation_id, new_after_message_id),
  CHECK (new_after_message_id > expected_after_message_id),
  CHECK (row_count = jsonb_array_length(proof_rows)),
  CHECK (
    (inbox_id = 128031 AND channel = 'instagram')
    OR (inbox_id = 128033 AND channel = 'tiktok')
    OR (inbox_id = 128058 AND channel = 'whatsapp')
    OR (inbox_id = 128326 AND channel = 'email')
  )
);

COMMENT ON TABLE calapres_cs.chatwoot_reconciliation_scan_leases IS
  'One DB-clock scan lease slot per exact Calapres inbox; no raw message content.';
COMMENT ON TABLE calapres_cs.chatwoot_reconciliation_message_cursors IS
  'Durable per-conversation reconciliation cursor for the pinned activation policy.';
COMMENT ON TABLE calapres_cs.chatwoot_reconciliation_cursor_commits IS
  'Permanent identifiers-only proof ledger for exact retry after later cursor advances.';

CREATE OR REPLACE FUNCTION calapres_cs._chatwoot_uint53_text_valid(
  p_value text,
  p_allow_zero boolean
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_number numeric;
BEGIN
  IF p_value IS NULL OR p_value !~ '^(0|[1-9][0-9]{0,15})$' THEN
    RETURN false;
  END IF;
  IF NOT p_allow_zero AND p_value = '0' THEN RETURN false; END IF;
  v_number := p_value::numeric;
  RETURN v_number <= 9007199254740991;
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._chatwoot_reconciliation_route_valid(
  p_account_id integer,
  p_inbox_id integer,
  p_channel text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT p_account_id = 179973 AND (
    (p_inbox_id = 128031 AND p_channel = 'instagram')
    OR (p_inbox_id = 128033 AND p_channel = 'tiktok')
    OR (p_inbox_id = 128058 AND p_channel = 'whatsapp')
    OR (p_inbox_id = 128326 AND p_channel = 'email')
  )
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._chatwoot_reconciliation_scan_value(
  p_scan calapres_cs.chatwoot_reconciliation_scan_leases
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT jsonb_build_object(
    'account_id', p_scan.account_id,
    'inbox_id', p_scan.inbox_id,
    'channel', p_scan.channel,
    'scan_id', p_scan.scan_id,
    'lease_owner_id', p_scan.lease_owner_id,
    'lease_token', p_scan.lease_token,
    'lease_claimed_at', calapres_cs._rfc3339_utc(p_scan.lease_claimed_at),
    'lease_expires_at', calapres_cs._rfc3339_utc(p_scan.lease_expires_at),
    'lease_duration_seconds', p_scan.lease_duration_seconds,
    'attempt_count', p_scan.attempt_count,
    'max_pages', p_scan.max_pages,
    'activation_floor_at', calapres_cs._rfc3339_utc(p_scan.activation_floor_at),
    'activation_policy_version', p_scan.activation_policy_version
  )
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._chatwoot_reconciliation_cursor_value(
  p_commit calapres_cs.chatwoot_reconciliation_cursor_commits
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT jsonb_build_object(
    'account_id', p_commit.account_id,
    'inbox_id', p_commit.inbox_id,
    'channel', p_commit.channel,
    'conversation_id', p_commit.conversation_id,
    'scan_id', p_commit.scan_id,
    'expected_after_message_id', p_commit.expected_after_message_id,
    'new_after_message_id', p_commit.new_after_message_id,
    'page_binding_sha256', p_commit.page_binding_sha256,
    'outcome_digest', p_commit.outcome_digest,
    'row_count', p_commit.row_count,
    'advanced_at', calapres_cs._rfc3339_utc(p_commit.advanced_at),
    'activation_floor_at', calapres_cs._rfc3339_utc(p_commit.activation_floor_at),
    'activation_policy_version', p_commit.activation_policy_version
  )
$function$;

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
    OR (p_command ->> 'row_count')::integer <> jsonb_array_length(p_command -> 'proof_rows')
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
          AND event.expires_at > p_now
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
  WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow
    THEN RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._chatwoot_reconciliation_atomic_dispatch_v1(
  p_operation text,
  p_command jsonb
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_now timestamptz;
  v_account integer;
  v_inbox integer;
  v_channel text;
  v_lease_expires timestamptz;
  v_scan calapres_cs.chatwoot_reconciliation_scan_leases%ROWTYPE;
  v_commit calapres_cs.chatwoot_reconciliation_cursor_commits%ROWTYPE;
  v_cursor calapres_cs.chatwoot_reconciliation_message_cursors%ROWTYPE;
  v_current bigint;
  v_count integer;
  v_same_identity boolean;
  v_same_binding boolean;
  v_scan_found boolean;
BEGIN
  IF jsonb_typeof(p_command) <> 'object' OR p_command ->> 'brand_id' <> 'calapres' THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  END IF;

  IF p_operation = 'claim_chatwoot_reconciliation_scan' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'schema_version', 'kind', 'operation', 'source', 'brand_id', 'account_id',
      'inbox_id', 'channel', 'scan_id', 'lease_owner_id', 'lease_token',
      'lease_duration_seconds', 'max_pages', 'activation_floor_at',
      'activation_policy_version', 'customer_egress_allowed'
    ])
      OR p_command -> 'schema_version' <> '"1.0"'::jsonb
      OR p_command -> 'kind' <> '"chatwoot_reconciliation_scan_claim_command_v1"'::jsonb
      OR p_command -> 'operation' <> '"claim_chatwoot_reconciliation_scan"'::jsonb
      OR p_command -> 'source' <> '"chatwoot_reconciliation_v1"'::jsonb
      OR p_command -> 'brand_id' <> '"calapres"'::jsonb
      OR jsonb_typeof(p_command -> 'account_id') <> 'number'
      OR p_command ->> 'account_id' <> '179973'
      OR jsonb_typeof(p_command -> 'inbox_id') <> 'number'
      OR (p_command ->> 'inbox_id') !~ '^[1-9][0-9]{5}$'
      OR jsonb_typeof(p_command -> 'channel') <> 'string'
      OR NOT calapres_cs._json_text_matches(p_command, 'scan_id', '^cwrs_[a-f0-9]{24}$')
      OR NOT calapres_cs._json_text_matches(
        p_command, 'lease_owner_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'lease_token', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR jsonb_typeof(p_command -> 'lease_duration_seconds') <> 'number'
      OR (p_command ->> 'lease_duration_seconds') !~ '^[1-9][0-9]{1,2}$'
      OR (p_command ->> 'lease_duration_seconds')::integer NOT BETWEEN 30 AND 900
      OR jsonb_typeof(p_command -> 'max_pages') <> 'number'
      OR (p_command ->> 'max_pages') !~ '^[1-9][0-9]{0,2}$'
      OR (p_command ->> 'max_pages')::integer NOT BETWEEN 1 AND 100
      OR p_command -> 'activation_floor_at' <> '"2026-08-12T00:00:00.000Z"'::jsonb
      OR p_command -> 'activation_policy_version' <> '"2026-08-12-v1"'::jsonb
      OR p_command -> 'customer_egress_allowed' <> 'false'::jsonb
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_account := (p_command ->> 'account_id')::integer;
    v_inbox := (p_command ->> 'inbox_id')::integer;
    v_channel := p_command ->> 'channel';
    IF NOT calapres_cs._chatwoot_reconciliation_route_valid(v_account, v_inbox, v_channel) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(
      'calapres:chatwoot-reconciliation-scan:v1', 0
    ));
    SELECT * INTO v_scan
    FROM calapres_cs.chatwoot_reconciliation_scan_leases
    WHERE brand_id = 'calapres' AND account_id = v_account AND inbox_id = v_inbox
    FOR UPDATE;
    v_scan_found := FOUND;
    -- The lease window starts only after the serialized scan state is authoritative.
    v_now := clock_timestamp();
    v_lease_expires := v_now + make_interval(
      secs => (p_command ->> 'lease_duration_seconds')::integer
    );

    SELECT count(*) INTO v_count
    FROM calapres_cs.chatwoot_reconciliation_scan_leases AS other
    WHERE other.brand_id = 'calapres'
      AND (other.account_id, other.inbox_id) <> (v_account, v_inbox)
      AND (other.scan_id = p_command ->> 'scan_id'
        OR other.lease_token = p_command ->> 'lease_token');
    IF v_count > 0 THEN
      IF EXISTS (
        SELECT 1 FROM calapres_cs.chatwoot_reconciliation_scan_leases AS other
        WHERE other.brand_id = 'calapres'
          AND (other.account_id, other.inbox_id) <> (v_account, v_inbox)
          AND other.scan_id = p_command ->> 'scan_id'
      ) THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'scan_id_conflict', NULL, NULL
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'scan_lease_token_conflict', NULL, NULL
      );
    END IF;

    IF NOT v_scan_found THEN
      INSERT INTO calapres_cs.chatwoot_reconciliation_scan_leases (
        brand_id, account_id, inbox_id, channel, scan_id, lease_owner_id, lease_token,
        lease_claimed_at, lease_expires_at, lease_duration_seconds, attempt_count,
        max_pages, activation_floor_at, activation_policy_version, created_at, updated_at
      ) VALUES (
        'calapres', v_account, v_inbox, v_channel, p_command ->> 'scan_id',
        p_command ->> 'lease_owner_id', p_command ->> 'lease_token', v_now,
        v_lease_expires, (p_command ->> 'lease_duration_seconds')::integer, 1,
        (p_command ->> 'max_pages')::integer,
        '2026-08-12T00:00:00.000Z'::timestamptz, '2026-08-12-v1', v_now, v_now
      ) RETURNING * INTO v_scan;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'committed', 'scan_lease_claimed',
        calapres_cs._chatwoot_reconciliation_scan_value(v_scan), NULL
      );
    END IF;

    v_same_identity := v_scan.scan_id = p_command ->> 'scan_id'
      AND v_scan.lease_owner_id = p_command ->> 'lease_owner_id'
      AND v_scan.lease_token = p_command ->> 'lease_token';
    v_same_binding := v_scan.channel = v_channel
      AND v_scan.lease_duration_seconds = (p_command ->> 'lease_duration_seconds')::integer
      AND v_scan.max_pages = (p_command ->> 'max_pages')::integer
      AND v_scan.activation_floor_at = '2026-08-12T00:00:00.000Z'::timestamptz
      AND v_scan.activation_policy_version = '2026-08-12-v1';
    IF v_scan.lease_expires_at > v_now THEN
      IF v_same_identity AND v_same_binding THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'committed', 'scan_lease_owned',
          calapres_cs._chatwoot_reconciliation_scan_value(v_scan), NULL
        );
      ELSIF v_same_identity THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'scan_binding_mismatch', NULL, NULL
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'scan_retry_later',
        jsonb_build_object(
          'account_id', v_scan.account_id, 'inbox_id', v_scan.inbox_id,
          'channel', v_scan.channel,
          'retry_after_at', calapres_cs._rfc3339_utc(v_scan.lease_expires_at)
        ), NULL
      );
    END IF;
    IF v_scan.scan_id = p_command ->> 'scan_id' AND NOT v_same_identity THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'scan_id_conflict', NULL, NULL
      );
    ELSIF v_scan.lease_token = p_command ->> 'lease_token' AND NOT v_same_identity THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'scan_lease_token_conflict', NULL, NULL
      );
    ELSIF v_same_identity AND NOT v_same_binding THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'scan_binding_mismatch', NULL, NULL
      );
    END IF;
    UPDATE calapres_cs.chatwoot_reconciliation_scan_leases
    SET channel = v_channel,
        scan_id = p_command ->> 'scan_id',
        lease_owner_id = p_command ->> 'lease_owner_id',
        lease_token = p_command ->> 'lease_token',
        lease_claimed_at = v_now,
        lease_expires_at = v_lease_expires,
        lease_duration_seconds = (p_command ->> 'lease_duration_seconds')::integer,
        attempt_count = attempt_count + 1,
        max_pages = (p_command ->> 'max_pages')::integer,
        activation_floor_at = '2026-08-12T00:00:00.000Z'::timestamptz,
        activation_policy_version = '2026-08-12-v1',
        updated_at = v_now
    WHERE brand_id = 'calapres' AND account_id = v_account AND inbox_id = v_inbox
      AND lease_expires_at <= v_now
    RETURNING * INTO v_scan;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
      );
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed', 'scan_lease_recovered',
      calapres_cs._chatwoot_reconciliation_scan_value(v_scan), NULL
    );

  ELSIF p_operation = 'compare_and_advance_chatwoot_message_cursor' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'schema_version', 'kind', 'operation', 'source', 'brand_id', 'account_id',
      'inbox_id', 'channel', 'conversation_id', 'scan_id', 'lease_token',
      'expected_after_message_id', 'new_after_message_id', 'proof_rows',
      'page_binding_sha256', 'outcome_digest', 'row_count', 'activation_floor_at',
      'activation_policy_version', 'customer_egress_allowed'
    ])
      OR p_command -> 'schema_version' <> '"1.0"'::jsonb
      OR p_command -> 'kind' <>
        '"chatwoot_reconciliation_cursor_advance_command_v1"'::jsonb
      OR p_command -> 'operation' <>
        '"compare_and_advance_chatwoot_message_cursor"'::jsonb
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
      OR NOT calapres_cs._json_text_matches(p_command, 'scan_id', '^cwrs_[a-f0-9]{24}$')
      OR NOT calapres_cs._json_text_matches(
        p_command, 'lease_token', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR jsonb_typeof(p_command -> 'expected_after_message_id') <> 'number'
      OR NOT calapres_cs._chatwoot_uint53_text_valid(
        p_command ->> 'expected_after_message_id', true
      )
      OR jsonb_typeof(p_command -> 'new_after_message_id') <> 'number'
      OR NOT calapres_cs._chatwoot_uint53_text_valid(
        p_command ->> 'new_after_message_id', false
      )
      OR (p_command ->> 'new_after_message_id')::numeric <=
        (p_command ->> 'expected_after_message_id')::numeric
      OR NOT calapres_cs._json_text_matches(
        p_command, 'page_binding_sha256', '^[a-f0-9]{64}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'outcome_digest', '^[a-f0-9]{64}$'
      )
      OR p_command -> 'activation_floor_at' <> '"2026-08-12T00:00:00.000Z"'::jsonb
      OR p_command -> 'activation_policy_version' <> '"2026-08-12-v1"'::jsonb
      OR p_command -> 'customer_egress_allowed' <> 'false'::jsonb
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_account := (p_command ->> 'account_id')::integer;
    v_inbox := (p_command ->> 'inbox_id')::integer;
    v_channel := p_command ->> 'channel';
    IF NOT calapres_cs._chatwoot_reconciliation_route_valid(v_account, v_inbox, v_channel)
      OR NOT calapres_cs._chatwoot_reconciliation_proofs_valid(p_command, NULL, false)
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(
      'calapres:chatwoot-reconciliation-cursor:v1:' || v_account::text || ':' ||
      v_inbox::text || ':' || (p_command ->> 'conversation_id'), 0
    ));
    SELECT * INTO v_commit
    FROM calapres_cs.chatwoot_reconciliation_cursor_commits
    WHERE brand_id = 'calapres' AND account_id = v_account AND inbox_id = v_inbox
      AND conversation_id = p_command ->> 'conversation_id'
      AND expected_after_message_id = (p_command ->> 'expected_after_message_id')::bigint
    FOR UPDATE;
    IF FOUND THEN
      IF v_commit.channel = v_channel
        AND v_commit.scan_id = p_command ->> 'scan_id'
        AND v_commit.lease_token = p_command ->> 'lease_token'
        AND v_commit.new_after_message_id = (p_command ->> 'new_after_message_id')::bigint
        AND v_commit.proof_rows = p_command -> 'proof_rows'
        AND v_commit.page_binding_sha256 = p_command ->> 'page_binding_sha256'
        AND v_commit.outcome_digest = p_command ->> 'outcome_digest'
        AND v_commit.row_count = (p_command ->> 'row_count')::integer
        AND v_commit.activation_floor_at = '2026-08-12T00:00:00.000Z'::timestamptz
        AND v_commit.activation_policy_version = '2026-08-12-v1'
      THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'duplicate_cursor_advance',
          calapres_cs._chatwoot_reconciliation_cursor_value(v_commit), NULL
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'cursor_finalization_conflict', NULL, NULL
      );
    END IF;

    SELECT * INTO v_scan
    FROM calapres_cs.chatwoot_reconciliation_scan_leases
    WHERE brand_id = 'calapres' AND account_id = v_account AND inbox_id = v_inbox
    FOR UPDATE;
    v_scan_found := FOUND;

    SELECT * INTO v_cursor
    FROM calapres_cs.chatwoot_reconciliation_message_cursors
    WHERE brand_id = 'calapres' AND account_id = v_account AND inbox_id = v_inbox
      AND conversation_id = p_command ->> 'conversation_id'
    FOR UPDATE;
    v_current := CASE WHEN FOUND THEN v_cursor.after_message_id ELSE 0 END;
    -- A blocked writer must validate the lease against time observed after every state lock.
    v_now := clock_timestamp();
    IF NOT v_scan_found OR v_scan.channel <> v_channel
      OR v_scan.scan_id <> p_command ->> 'scan_id'
      OR v_scan.lease_token <> p_command ->> 'lease_token'
      OR v_scan.lease_expires_at <= v_now
      OR v_scan.activation_floor_at <> '2026-08-12T00:00:00.000Z'::timestamptz
      OR v_scan.activation_policy_version <> '2026-08-12-v1'
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'scan_lease_not_owned', NULL, NULL
      );
    END IF;
    IF v_current <> (p_command ->> 'expected_after_message_id')::bigint THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'cursor_compare_failed',
        jsonb_build_object(
          'account_id', v_account, 'inbox_id', v_inbox, 'channel', v_channel,
          'conversation_id', p_command ->> 'conversation_id',
          'current_after_message_id', v_current
        ), NULL
      );
    END IF;
    IF NOT calapres_cs._chatwoot_reconciliation_proofs_valid(p_command, v_now, true) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'cursor_durable_proof_invalid', NULL,
        'durable_reference_conflict'
      );
    END IF;

    INSERT INTO calapres_cs.chatwoot_reconciliation_cursor_commits (
      brand_id, account_id, inbox_id, channel, conversation_id, scan_id, lease_token,
      expected_after_message_id, new_after_message_id, proof_rows, page_binding_sha256,
      outcome_digest, row_count, activation_floor_at, activation_policy_version,
      advanced_at, created_at
    ) VALUES (
      'calapres', v_account, v_inbox, v_channel, p_command ->> 'conversation_id',
      p_command ->> 'scan_id', p_command ->> 'lease_token',
      (p_command ->> 'expected_after_message_id')::bigint,
      (p_command ->> 'new_after_message_id')::bigint, p_command -> 'proof_rows',
      p_command ->> 'page_binding_sha256', p_command ->> 'outcome_digest',
      (p_command ->> 'row_count')::integer,
      '2026-08-12T00:00:00.000Z'::timestamptz, '2026-08-12-v1', v_now, v_now
    ) RETURNING * INTO v_commit;
    INSERT INTO calapres_cs.chatwoot_reconciliation_message_cursors (
      brand_id, account_id, inbox_id, channel, conversation_id, after_message_id,
      activation_floor_at, activation_policy_version, created_at, updated_at
    ) VALUES (
      'calapres', v_account, v_inbox, v_channel, p_command ->> 'conversation_id',
      (p_command ->> 'new_after_message_id')::bigint,
      '2026-08-12T00:00:00.000Z'::timestamptz, '2026-08-12-v1', v_now, v_now
    ) ON CONFLICT (brand_id, account_id, inbox_id, conversation_id) DO UPDATE
      SET channel = EXCLUDED.channel,
          after_message_id = EXCLUDED.after_message_id,
          activation_floor_at = EXCLUDED.activation_floor_at,
          activation_policy_version = EXCLUDED.activation_policy_version,
          updated_at = v_now
      WHERE calapres_cs.chatwoot_reconciliation_message_cursors.after_message_id =
        (p_command ->> 'expected_after_message_id')::bigint;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'chatwoot cursor CAS failed' USING ERRCODE = '40001';
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed', 'cursor_advanced',
      calapres_cs._chatwoot_reconciliation_cursor_value(v_commit), NULL
    );
  END IF;

  RETURN calapres_cs._atomic_envelope(
    p_operation, 'unknown', 'uncertain', NULL, 'unsupported_operation'
  );
EXCEPTION
  WHEN serialization_failure OR unique_violation THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
    );
  WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  WHEN OTHERS THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'database_function_unknown'
    );
END;
$function$;

ALTER FUNCTION calapres_cs._chatwoot_uint53_text_valid(text, boolean)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._chatwoot_reconciliation_route_valid(integer, integer, text)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._chatwoot_reconciliation_scan_value(
  calapres_cs.chatwoot_reconciliation_scan_leases
) OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._chatwoot_reconciliation_cursor_value(
  calapres_cs.chatwoot_reconciliation_cursor_commits
) OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._chatwoot_reconciliation_proofs_valid(jsonb, timestamptz, boolean)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._chatwoot_reconciliation_atomic_dispatch_v1(text, jsonb)
  OWNER TO calapres_cs_function_owner;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON calapres_cs.chatwoot_reconciliation_scan_leases,
     calapres_cs.chatwoot_reconciliation_message_cursors,
     calapres_cs.chatwoot_reconciliation_cursor_commits
  TO calapres_cs_function_owner;
GRANT SELECT
  ON calapres_cs.business_event_aliases,
     calapres_cs.business_events,
     calapres_cs.conversation_job_queue
  TO calapres_cs_function_owner;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_chatwoot_reconciliation_scan(
  p_command jsonb
) RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._chatwoot_reconciliation_atomic_dispatch_v1(
    'claim_chatwoot_reconciliation_scan', p_command
  )
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_compare_and_advance_chatwoot_message_cursor(
  p_command jsonb
) RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._chatwoot_reconciliation_atomic_dispatch_v1(
    'compare_and_advance_chatwoot_message_cursor', p_command
  )
$function$;

ALTER FUNCTION calapres_cs.atomic_claim_chatwoot_reconciliation_scan(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_compare_and_advance_chatwoot_message_cursor(jsonb)
  OWNER TO calapres_cs_function_owner;

REVOKE ALL ON FUNCTION calapres_cs._chatwoot_uint53_text_valid(text, boolean)
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._chatwoot_reconciliation_route_valid(
  integer, integer, text
) FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._chatwoot_reconciliation_scan_value(
  calapres_cs.chatwoot_reconciliation_scan_leases
) FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._chatwoot_reconciliation_cursor_value(
  calapres_cs.chatwoot_reconciliation_cursor_commits
) FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._chatwoot_reconciliation_proofs_valid(
  jsonb, timestamptz, boolean
) FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._chatwoot_reconciliation_atomic_dispatch_v1(text, jsonb)
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_claim_chatwoot_reconciliation_scan(jsonb)
  FROM PUBLIC, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_compare_and_advance_chatwoot_message_cursor(jsonb)
  FROM PUBLIC, calapres_cs_owner_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_edge_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_owner_runtime;

GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_chatwoot_reconciliation_scan(jsonb)
  TO calapres_cs_edge_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_compare_and_advance_chatwoot_message_cursor(jsonb)
  TO calapres_cs_edge_runtime;

COMMENT ON ROLE calapres_cs_edge_runtime IS
  'NOLOGIN edge membership role: ten non-owner atomic functions only; deployment login is separate.';
COMMENT ON FUNCTION calapres_cs.atomic_claim_chatwoot_reconciliation_scan(jsonb) IS
  'Claims one DB-clock reconciliation scan lease for an exact Calapres inbox.';
COMMENT ON FUNCTION calapres_cs.atomic_compare_and_advance_chatwoot_message_cursor(jsonb) IS
  'CAS-advances one cursor only after exact durable candidate or deterministic exclusion proofs.';

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (5, 'calapres_cs_chatwoot_reconciliation')
ON CONFLICT (version) DO NOTHING;

COMMIT;
