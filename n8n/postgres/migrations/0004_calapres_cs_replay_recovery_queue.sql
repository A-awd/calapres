-- Calapres replay recovery and durable ingress queue, migration 0004.
-- Candidate status: implementation_candidate_pending_live_postgres_validation.
-- No live PostgreSQL concurrency claim is made until this migration is exercised by the live harness.

BEGIN;

CREATE TABLE IF NOT EXISTS calapres_cs.storage_key_registry (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  namespace text NOT NULL CHECK (
    namespace IN ('request_replay', 'business_event', 'message_identity')
  ),
  registry_version text NOT NULL CHECK (
    registry_version ~ '^calapres-storage-keys-v[1-9][0-9]*$'
  ),
  key_version text NOT NULL CHECK (key_version ~ '^hmac-sha256-v[1-9][0-9]*$'),
  key_state text NOT NULL CHECK (key_state IN ('active', 'retained')),
  coverage_until timestamptz NOT NULL DEFAULT 'infinity'::timestamptz,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, namespace, registry_version, key_version)
);

CREATE UNIQUE INDEX IF NOT EXISTS storage_key_registry_one_active_idx
  ON calapres_cs.storage_key_registry (brand_id, namespace, registry_version)
  WHERE key_state = 'active';

CREATE TABLE IF NOT EXISTS calapres_cs.storage_key_registry_heads (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  namespace text NOT NULL CHECK (
    namespace IN ('request_replay', 'business_event', 'message_identity')
  ),
  current_registry_version text NOT NULL CHECK (
    current_registry_version ~ '^calapres-storage-keys-v[1-9][0-9]*$'
  ),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, namespace)
);

INSERT INTO calapres_cs.storage_key_registry (
  brand_id, namespace, registry_version, key_version, key_state, coverage_until
)
SELECT
  'calapres', namespace, 'calapres-storage-keys-v1', 'hmac-sha256-v1', 'active',
  'infinity'::timestamptz
FROM unnest(ARRAY['request_replay', 'business_event', 'message_identity']) AS n(namespace)
ON CONFLICT (brand_id, namespace, registry_version, key_version) DO NOTHING;

INSERT INTO calapres_cs.storage_key_registry_heads (
  brand_id, namespace, current_registry_version
)
SELECT 'calapres', namespace, 'calapres-storage-keys-v1'
FROM unnest(ARRAY['request_replay', 'business_event', 'message_identity']) AS n(namespace)
ON CONFLICT (brand_id, namespace) DO NOTHING;

ALTER TABLE calapres_cs.request_replay_claims
  ADD COLUMN IF NOT EXISTS lease_owner_id text,
  ADD COLUMN IF NOT EXISTS lease_token text,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS business_claim_id text,
  ADD COLUMN IF NOT EXISTS job_id text,
  ADD COLUMN IF NOT EXISTS conversation_id text,
  ADD COLUMN IF NOT EXISTS generation integer,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS request_source text,
  ADD COLUMN IF NOT EXISTS source_binding_sha256 text,
  ADD COLUMN IF NOT EXISTS reconciliation_scan_id text,
  ADD COLUMN IF NOT EXISTS reconciliation_expected_after_message_id bigint,
  ADD COLUMN IF NOT EXISTS reconciliation_page_binding_sha256 text;

ALTER TABLE calapres_cs.request_replay_claims
  DROP CONSTRAINT IF EXISTS request_replay_claims_lifecycle_status_check;

UPDATE calapres_cs.request_replay_claims
SET lifecycle_status = 'legacy_unbound', updated_at = transaction_timestamp()
WHERE lifecycle_status = 'completed' AND job_id IS NULL;

ALTER TABLE calapres_cs.request_replay_claims
  ALTER COLUMN lifecycle_status SET DEFAULT 'processing';

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'request_replay_claims_recovery_lifecycle_check'
      AND conrelid = 'calapres_cs.request_replay_claims'::regclass
  ) THEN
    ALTER TABLE calapres_cs.request_replay_claims
      ADD CONSTRAINT request_replay_claims_recovery_lifecycle_check CHECK (
        (
          lifecycle_status = 'legacy_unbound'
          AND lease_owner_id IS NULL AND lease_token IS NULL AND lease_expires_at IS NULL
          AND business_claim_id IS NULL AND job_id IS NULL AND conversation_id IS NULL
          AND generation IS NULL AND due_at IS NULL AND completed_at IS NULL
          AND request_source IS NULL AND source_binding_sha256 IS NULL
          AND reconciliation_scan_id IS NULL
          AND reconciliation_expected_after_message_id IS NULL
          AND reconciliation_page_binding_sha256 IS NULL
        ) OR (
          lifecycle_status = 'processing'
          AND lease_owner_id IS NOT NULL AND lease_token IS NOT NULL
          AND lease_owner_id ~ '^[A-Za-z0-9:_-]{4,160}$'
          AND lease_token ~ '^[A-Za-z0-9:_-]{4,160}$'
          AND lease_expires_at IS NOT NULL AND lease_expires_at <= expires_at
          AND attempt_count > 0
          AND business_claim_id IS NULL AND job_id IS NULL AND conversation_id IS NULL
          AND generation IS NULL AND due_at IS NULL AND completed_at IS NULL
          AND request_source IN (
            'chatwoot_signed_webhook_v1', 'chatwoot_reconciliation_api_v1'
          )
          AND source_binding_sha256 ~ '^[a-f0-9]{64}$'
          AND reconciliation_scan_id IS NULL
          AND reconciliation_expected_after_message_id IS NULL
          AND reconciliation_page_binding_sha256 IS NULL
        ) OR (
          lifecycle_status = 'completed'
          AND lease_owner_id IS NOT NULL AND lease_token IS NOT NULL
          AND lease_owner_id ~ '^[A-Za-z0-9:_-]{4,160}$'
          AND lease_token ~ '^[A-Za-z0-9:_-]{4,160}$'
          AND business_claim_id ~ '^[A-Za-z0-9:_-]{4,160}$'
          AND job_id ~ '^[A-Za-z0-9:_-]{4,160}$'
          AND conversation_id ~ '^[1-9][0-9]{0,30}$'
          AND generation > 0 AND due_at IS NOT NULL AND completed_at IS NOT NULL
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
  END IF;
END;
$constraint$;

CREATE UNIQUE INDEX IF NOT EXISTS request_replay_claims_bound_job_idx
  ON calapres_cs.request_replay_claims (brand_id, claim_id, job_id)
  WHERE lifecycle_status = 'completed';
CREATE INDEX IF NOT EXISTS request_replay_claims_processing_lease_idx
  ON calapres_cs.request_replay_claims (brand_id, lifecycle_status, lease_expires_at);

ALTER TABLE calapres_cs.business_events
  ADD COLUMN IF NOT EXISTS lease_token text,
  ADD COLUMN IF NOT EXISTS request_claim_id text,
  ADD COLUMN IF NOT EXISTS job_id text;

ALTER TABLE calapres_cs.observation_outcomes
  ADD COLUMN IF NOT EXISTS job_id text;
ALTER TABLE calapres_cs.audit_events
  ADD COLUMN IF NOT EXISTS job_id text;

CREATE TABLE IF NOT EXISTS calapres_cs.conversation_job_queue (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  job_id text NOT NULL CHECK (job_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  request_claim_id text NOT NULL CHECK (request_claim_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  business_claim_id text NOT NULL CHECK (business_claim_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  account_id integer NOT NULL CHECK (account_id = 179973),
  inbox_id integer NOT NULL CHECK (inbox_id IN (128031, 128033, 128058, 128326)),
  channel text NOT NULL CHECK (channel IN ('instagram', 'tiktok', 'whatsapp', 'email')),
  conversation_id text NOT NULL CHECK (conversation_id ~ '^[1-9][0-9]{0,30}$'),
  anchor_message_id text NOT NULL CHECK (anchor_message_id ~ '^[1-9][0-9]{0,15}$'),
  correlation_id text NOT NULL CHECK (correlation_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  generation integer NOT NULL CHECK (generation > 0),
  event_identity_key_version text NOT NULL CHECK (
    event_identity_key_version ~ '^calapres-identity-hmac-v[1-9][0-9]*$'
  ),
  event_identity_fingerprint text NOT NULL CHECK (
    event_identity_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  conversation_fingerprint text NOT NULL CHECK (conversation_fingerprint ~ '^[a-f0-9]{64}$'),
  message_fingerprint text NOT NULL CHECK (message_fingerprint ~ '^[a-f0-9]{64}$'),
  baseline_fingerprint_key_version text NOT NULL CHECK (
    baseline_fingerprint_key_version ~ '^calapres-hmac-v[1-9][0-9]*$'
  ),
  baseline_status_fingerprint text NOT NULL CHECK (
    baseline_status_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  baseline_assignee_fingerprint text NOT NULL CHECK (
    baseline_assignee_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  delay_policy_version text NOT NULL CHECK (
    delay_policy_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$'
  ),
  delay_seconds integer NOT NULL CHECK (delay_seconds BETWEEN 0 AND 3600),
  knowledge_version text NOT NULL CHECK (
    knowledge_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$'
  ),
  state text NOT NULL CHECK (
    state IN ('pending', 'retry_scheduled', 'retry_running', 'completed', 'cancelled', 'human_owned')
  ),
  due_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL,
  last_safe_error_code text CHECK (
    last_safe_error_code IS NULL OR last_safe_error_code ~ '^[a-z][a-z0-9_]{2,80}$'
  ),
  retry_idempotency_key text CHECK (
    retry_idempotency_key IS NULL OR retry_idempotency_key ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  max_attempts integer CHECK (max_attempts IS NULL OR max_attempts BETWEEN 1 AND 10),
  retry_worker_id text CHECK (
    retry_worker_id IS NULL OR retry_worker_id ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  retry_lease_token text CHECK (
    retry_lease_token IS NULL OR retry_lease_token ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  retry_lease_expires_at timestamptz,
  last_transition_idempotency_key text CHECK (
    last_transition_idempotency_key IS NULL
    OR last_transition_idempotency_key ~ '^[A-Za-z0-9:_-]{4,160}$'
  ),
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, job_id),
  UNIQUE (brand_id, request_claim_id),
  UNIQUE (brand_id, business_claim_id),
  UNIQUE (brand_id, conversation_id, generation),
  FOREIGN KEY (brand_id, request_claim_id)
    REFERENCES calapres_cs.request_replay_claims (brand_id, claim_id),
  FOREIGN KEY (brand_id, business_claim_id)
    REFERENCES calapres_cs.business_events (brand_id, claim_id),
  CHECK (retention_until >= due_at),
  CHECK (
    (inbox_id = 128031 AND channel = 'instagram')
    OR (inbox_id = 128033 AND channel = 'tiktok')
    OR (inbox_id = 128058 AND channel = 'whatsapp')
    OR (inbox_id = 128326 AND channel = 'email')
  ),
  CHECK (correlation_id = 'calapres:' || conversation_id || ':' || anchor_message_id),
  CHECK (max_attempts IS NULL OR attempt_count <= max_attempts),
  CHECK (
    (state = 'retry_running'
      AND retry_worker_id IS NOT NULL
      AND retry_lease_token IS NOT NULL
      AND retry_lease_expires_at IS NOT NULL)
    OR
    (state <> 'retry_running'
      AND retry_worker_id IS NULL
      AND retry_lease_token IS NULL
      AND retry_lease_expires_at IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_job_queue_active_lease_token_idx
  ON calapres_cs.conversation_job_queue (brand_id, retry_lease_token)
  WHERE state = 'retry_running' AND retry_lease_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS conversation_job_queue_due_idx
  ON calapres_cs.conversation_job_queue (brand_id, next_attempt_at, job_id)
  WHERE state IN ('pending', 'retry_scheduled', 'retry_running');
CREATE INDEX IF NOT EXISTS conversation_job_queue_retention_idx
  ON calapres_cs.conversation_job_queue (retention_until);

CREATE TABLE IF NOT EXISTS calapres_cs.conversation_generation_heads (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  conversation_id text NOT NULL CHECK (conversation_id ~ '^[1-9][0-9]{0,30}$'),
  generation integer NOT NULL CHECK (generation > 0),
  current_job_id text NOT NULL CHECK (current_job_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, conversation_id),
  UNIQUE (brand_id, current_job_id),
  FOREIGN KEY (brand_id, current_job_id)
    REFERENCES calapres_cs.conversation_job_queue (brand_id, job_id)
);

CREATE INDEX IF NOT EXISTS conversation_generation_heads_retention_idx
  ON calapres_cs.conversation_generation_heads (retention_until);

CREATE TABLE IF NOT EXISTS calapres_cs.conversation_job_message_aliases (
  brand_id text NOT NULL DEFAULT 'calapres' CHECK (brand_id = 'calapres'),
  key_version text NOT NULL CHECK (key_version ~ '^hmac-sha256-v[1-9][0-9]*$'),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  job_id text NOT NULL CHECK (job_id ~ '^[A-Za-z0-9:_-]{4,160}$'),
  retention_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, key_version, fingerprint),
  FOREIGN KEY (brand_id, job_id)
    REFERENCES calapres_cs.conversation_job_queue (brand_id, job_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS conversation_job_message_aliases_job_idx
  ON calapres_cs.conversation_job_message_aliases (brand_id, job_id);
CREATE INDEX IF NOT EXISTS conversation_job_message_aliases_retention_idx
  ON calapres_cs.conversation_job_message_aliases (retention_until);

COMMENT ON TABLE calapres_cs.storage_key_registry IS
  'Database-authoritative active and retained HMAC versions; commands provide aliases, never coverage clocks.';
COMMENT ON TABLE calapres_cs.conversation_job_queue IS
  'Durable ingress jobs linked to request replay and business event before any HTTP 204 acknowledgement.';
COMMENT ON TABLE calapres_cs.conversation_generation_heads IS
  'Current generation and job pointer for each opaque conversation identifier.';

CREATE OR REPLACE FUNCTION calapres_cs._edge_key_bundle_valid(
  p_command jsonb,
  p_namespace text,
  p_active_fingerprint_field text,
  p_retained_field text,
  p_now timestamptz,
  p_required_through timestamptz
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_aliases jsonb;
  v_registry_version text;
  v_active_key_version text;
  v_alias_count integer;
  v_registry_count integer;
  v_valid boolean;
BEGIN
  IF p_namespace NOT IN ('request_replay', 'business_event', 'message_identity')
    OR jsonb_typeof(p_command -> p_active_fingerprint_field) <> 'string'
    OR (p_command ->> p_active_fingerprint_field) !~ '^[a-f0-9]{64}$'
    OR jsonb_typeof(p_command -> 'active_key_version') <> 'string'
    OR (p_command ->> 'active_key_version') !~ '^hmac-sha256-v[1-9][0-9]*$'
    OR jsonb_typeof(p_command -> p_retained_field) <> 'array'
    OR jsonb_array_length(p_command -> p_retained_field) > 8
    OR NOT calapres_cs._json_text_matches(
      p_command, 'key_registry_version', '^calapres-storage-keys-v[1-9][0-9]*$'
    )
  THEN
    RETURN false;
  END IF;

  v_registry_version := p_command ->> 'key_registry_version';
  IF NOT EXISTS (
    SELECT 1
    FROM calapres_cs.storage_key_registry_heads heads
    WHERE heads.brand_id = 'calapres'
      AND heads.namespace = p_namespace
      AND heads.current_registry_version = v_registry_version
  ) THEN
    RETURN false;
  END IF;
  v_aliases := jsonb_build_array(jsonb_build_object(
    'fingerprint', p_command ->> p_active_fingerprint_field,
    'key_version', p_command ->> 'active_key_version'
  )) || (p_command -> p_retained_field);

  WITH supplied AS (
    SELECT item, x.fingerprint, x.key_version
    FROM jsonb_array_elements(v_aliases) AS source(item)
    CROSS JOIN LATERAL jsonb_to_record(source.item) AS x(fingerprint text, key_version text)
  )
  SELECT count(*), COALESCE(
    bool_and(calapres_cs._exact_json_keys(item, ARRAY['fingerprint', 'key_version']))
      AND bool_and(fingerprint ~ '^[a-f0-9]{64}$')
      AND bool_and(key_version ~ '^hmac-sha256-v[1-9][0-9]*$')
      AND count(*) = count(DISTINCT key_version),
    false
  )
  INTO v_alias_count, v_valid
  FROM supplied;
  IF NOT v_valid THEN RETURN false; END IF;

  SELECT count(*), max(key_version) FILTER (WHERE key_state = 'active')
  INTO v_registry_count, v_active_key_version
  FROM calapres_cs.storage_key_registry
  WHERE brand_id = 'calapres'
    AND namespace = p_namespace
    AND registry_version = v_registry_version
    AND coverage_until >= p_required_through;

  IF v_registry_count <> v_alias_count
    OR v_active_key_version IS DISTINCT FROM (p_command ->> 'active_key_version')
    OR EXISTS (
      WITH supplied AS (
        SELECT x.key_version
        FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
      )
      SELECT 1
      FROM supplied
      FULL OUTER JOIN calapres_cs.storage_key_registry registry
        ON registry.brand_id = 'calapres'
       AND registry.namespace = p_namespace
       AND registry.registry_version = v_registry_version
       AND registry.key_version = supplied.key_version
       AND registry.coverage_until >= p_required_through
      WHERE supplied.key_version IS NULL OR registry.key_version IS NULL
    )
  THEN
    RETURN false;
  END IF;

  IF p_namespace = 'request_replay' THEN
    RETURN NOT EXISTS (
      SELECT 1
      FROM calapres_cs.request_replay_aliases aliases
      JOIN calapres_cs.request_replay_claims claims
        ON claims.brand_id = aliases.brand_id AND claims.claim_id = aliases.claim_id
      WHERE aliases.brand_id = 'calapres' AND claims.expires_at > p_now
        AND NOT EXISTS (
          SELECT 1 FROM calapres_cs.storage_key_registry registry
          WHERE registry.brand_id = aliases.brand_id
            AND registry.namespace = p_namespace
            AND registry.registry_version = v_registry_version
            AND registry.key_version = aliases.key_version
            AND registry.coverage_until >= claims.expires_at
        )
    );
  ELSIF p_namespace = 'business_event' THEN
    RETURN NOT EXISTS (
      SELECT 1
      FROM calapres_cs.business_event_aliases aliases
      JOIN calapres_cs.business_events events
        ON events.brand_id = aliases.brand_id AND events.claim_id = aliases.claim_id
      WHERE aliases.brand_id = 'calapres' AND events.expires_at > p_now
        AND NOT EXISTS (
          SELECT 1 FROM calapres_cs.storage_key_registry registry
          WHERE registry.brand_id = aliases.brand_id
            AND registry.namespace = p_namespace
            AND registry.registry_version = v_registry_version
            AND registry.key_version = aliases.key_version
            AND registry.coverage_until >= events.expires_at
        )
    );
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM calapres_cs.conversation_job_message_aliases aliases
    WHERE aliases.brand_id = 'calapres' AND aliases.retention_until > p_now
      AND NOT EXISTS (
        SELECT 1 FROM calapres_cs.storage_key_registry registry
        WHERE registry.brand_id = aliases.brand_id
          AND registry.namespace = p_namespace
          AND registry.registry_version = v_registry_version
          AND registry.key_version = aliases.key_version
          AND registry.coverage_until >= aliases.retention_until
      )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._job_control_bundle(
  p_job calapres_cs.conversation_job_queue
) RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT jsonb_build_object(
    'account_id', (p_job).account_id,
    'inbox_id', (p_job).inbox_id,
    'channel', (p_job).channel,
    'conversation_id', (p_job).conversation_id,
    'anchor_message_id', (p_job).anchor_message_id,
    'correlation_id', (p_job).correlation_id,
    'event_identity_key_version', (p_job).event_identity_key_version,
    'event_identity_fingerprint', (p_job).event_identity_fingerprint,
    'conversation_fingerprint', (p_job).conversation_fingerprint,
    'message_fingerprint', (p_job).message_fingerprint,
    'baseline_fingerprint_key_version', (p_job).baseline_fingerprint_key_version,
    'baseline_status_fingerprint', (p_job).baseline_status_fingerprint,
    'baseline_assignee_fingerprint', (p_job).baseline_assignee_fingerprint,
    'delay_policy_version', (p_job).delay_policy_version,
    'delay_seconds', (p_job).delay_seconds,
    'knowledge_version', (p_job).knowledge_version
  )
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._job_control_matches_command(
  p_job calapres_cs.conversation_job_queue,
  p_command jsonb
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT
    (p_job).account_id = (p_command ->> 'account_id')::integer
    AND (p_job).inbox_id = (p_command ->> 'inbox_id')::integer
    AND (p_job).channel = p_command ->> 'channel'
    AND (p_job).conversation_id = p_command ->> 'conversation_id'
    AND (p_job).anchor_message_id = p_command ->> 'anchor_message_id'
    AND (p_job).correlation_id = p_command ->> 'correlation_id'
    AND (p_job).event_identity_key_version = p_command ->> 'event_identity_key_version'
    AND (p_job).event_identity_fingerprint = p_command ->> 'event_identity_fingerprint'
    AND (p_job).conversation_fingerprint = p_command ->> 'conversation_fingerprint'
    AND (p_job).message_fingerprint = p_command ->> 'message_fingerprint'
    AND (p_job).baseline_fingerprint_key_version = p_command ->> 'baseline_fingerprint_key_version'
    AND (p_job).baseline_status_fingerprint = p_command ->> 'baseline_status_fingerprint'
    AND (p_job).baseline_assignee_fingerprint = p_command ->> 'baseline_assignee_fingerprint'
    AND (p_job).delay_policy_version = p_command ->> 'delay_policy_version'
    AND (p_job).delay_seconds = (p_command ->> 'delay_seconds')::integer
    AND (p_job).knowledge_version = p_command ->> 'knowledge_version'
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._job_reconciliation_control_matches_command(
  p_job calapres_cs.conversation_job_queue,
  p_command jsonb
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT
    (p_job).account_id = (p_command ->> 'account_id')::integer
    AND (p_job).inbox_id = (p_command ->> 'inbox_id')::integer
    AND (p_job).channel = p_command ->> 'channel'
    AND (p_job).conversation_id = p_command ->> 'conversation_id'
    AND (p_job).anchor_message_id = p_command ->> 'anchor_message_id'
    AND (p_job).correlation_id = p_command ->> 'correlation_id'
    AND (p_job).conversation_fingerprint = p_command ->> 'conversation_fingerprint'
    AND (p_job).baseline_fingerprint_key_version = p_command ->> 'baseline_fingerprint_key_version'
    AND (p_job).baseline_status_fingerprint = p_command ->> 'baseline_status_fingerprint'
    AND (p_job).baseline_assignee_fingerprint = p_command ->> 'baseline_assignee_fingerprint'
    AND (p_job).delay_policy_version = p_command ->> 'delay_policy_version'
    AND (p_job).delay_seconds = (p_command ->> 'delay_seconds')::integer
    AND (p_job).knowledge_version = p_command ->> 'knowledge_version'
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._edge_uint53_text_valid(
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

CREATE OR REPLACE FUNCTION calapres_cs._edge_atomic_dispatch_v2(
  p_operation text,
  p_command jsonb
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_brand text;
  v_now timestamptz;
  v_expires timestamptz;
  v_lease_expires timestamptz;
  v_due timestamptz;
  v_retention timestamptz;
  v_aliases jsonb;
  v_claim_ids text[];
  v_job_ids text[];
  v_claim_id text;
  v_count integer;
  v_generation integer;
  v_recovered boolean;
  v_request calapres_cs.request_replay_claims%ROWTYPE;
  v_event calapres_cs.business_events%ROWTYPE;
  v_job calapres_cs.conversation_job_queue%ROWTYPE;
  v_head calapres_cs.conversation_generation_heads%ROWTYPE;
  v_observation calapres_cs.observation_outcomes%ROWTYPE;
BEGIN
  v_now := clock_timestamp();
  IF jsonb_typeof(p_command) <> 'object' THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  END IF;
  v_brand := p_command ->> 'brand_id';
  IF v_brand <> 'calapres' THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  END IF;

  IF p_operation = 'claim_request_replay' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'claim_id', 'active_fingerprint', 'active_key_version',
      'retained_fingerprints', 'key_registry_version', 'request_source',
      'source_binding_sha256', 'request_ttl_seconds', 'lease_owner_id',
      'lease_token', 'lease_duration_seconds'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'claim_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'lease_owner_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'lease_token', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR jsonb_typeof(p_command -> 'request_source') <> 'string'
      OR p_command ->> 'request_source' NOT IN (
        'chatwoot_signed_webhook_v1', 'chatwoot_reconciliation_api_v1'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'source_binding_sha256', '^[a-f0-9]{64}$'
      )
      OR jsonb_typeof(p_command -> 'request_ttl_seconds') <> 'number'
      OR (p_command ->> 'request_ttl_seconds') !~ '^[1-9][0-9]{1,4}$'
      OR (p_command ->> 'request_ttl_seconds')::integer NOT BETWEEN 60 AND 86400
      OR jsonb_typeof(p_command -> 'lease_duration_seconds') <> 'number'
      OR (p_command ->> 'lease_duration_seconds') !~ '^[1-9][0-9]{0,2}$'
      OR (p_command ->> 'lease_duration_seconds')::integer NOT BETWEEN 1 AND 900
      OR (p_command ->> 'lease_duration_seconds')::integer >
        (p_command ->> 'request_ttl_seconds')::integer
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_expires := v_now + make_interval(
      secs => (p_command ->> 'request_ttl_seconds')::integer
    );
    v_lease_expires := v_now + make_interval(
      secs => (p_command ->> 'lease_duration_seconds')::integer
    );
    v_retention := v_expires + interval '90 days';
    IF NOT calapres_cs._edge_key_bundle_valid(
      p_command, 'request_replay', 'active_fingerprint', 'retained_fingerprints',
      v_now, v_expires
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'key_coverage_incomplete', NULL, 'key_coverage_incomplete'
      );
    END IF;
    v_aliases := jsonb_build_array(jsonb_build_object(
      'fingerprint', p_command ->> 'active_fingerprint',
      'key_version', p_command ->> 'active_key_version'
    )) || (p_command -> 'retained_fingerprints');
    PERFORM pg_advisory_xact_lock(hashtextextended('calapres:request_replay:v2', 0));
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    SELECT array_agg(DISTINCT aliases.claim_id ORDER BY aliases.claim_id)
    INTO v_claim_ids
    FROM calapres_cs.request_replay_aliases aliases
    JOIN supplied
      ON supplied.fingerprint = aliases.fingerprint
     AND supplied.key_version = aliases.key_version
    JOIN calapres_cs.request_replay_claims claims
      ON claims.brand_id = aliases.brand_id AND claims.claim_id = aliases.claim_id
    WHERE aliases.brand_id = v_brand AND claims.expires_at > v_now;
    IF COALESCE(cardinality(v_claim_ids), 0) > 1 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
      );
    END IF;
    IF COALESCE(cardinality(v_claim_ids), 0) = 1 THEN
      v_recovered := true;
      v_claim_id := v_claim_ids[1];
      SELECT * INTO v_request
      FROM calapres_cs.request_replay_claims
      WHERE brand_id = v_brand AND claim_id = v_claim_id
      FOR UPDATE;
    ELSE
      v_recovered := false;
      v_claim_id := p_command ->> 'claim_id';
      INSERT INTO calapres_cs.request_replay_claims (
        brand_id, claim_id, lifecycle_status, claimed_at, expires_at, retention_until,
        lease_owner_id, lease_token, lease_expires_at, attempt_count,
        request_source, source_binding_sha256
      ) VALUES (
        v_brand, v_claim_id, 'processing', v_now, v_expires, v_retention,
        p_command ->> 'lease_owner_id', p_command ->> 'lease_token', v_lease_expires, 1,
        p_command ->> 'request_source', p_command ->> 'source_binding_sha256'
      )
      ON CONFLICT (brand_id, claim_id) DO NOTHING
      RETURNING * INTO v_request;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'claim_id_conflict', NULL, NULL
        );
      END IF;
    END IF;
    IF v_recovered AND (
      v_request.request_source IS DISTINCT FROM p_command ->> 'request_source'
      OR v_request.source_binding_sha256 IS DISTINCT FROM
        p_command ->> 'source_binding_sha256'
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'request_provenance_mismatch', NULL,
        'durable_reference_conflict'
      );
    END IF;
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    SELECT count(*) INTO v_count
    FROM calapres_cs.request_replay_aliases aliases
    JOIN supplied
      ON supplied.fingerprint = aliases.fingerprint
     AND supplied.key_version = aliases.key_version
    JOIN calapres_cs.request_replay_claims claims
      ON claims.brand_id = aliases.brand_id AND claims.claim_id = aliases.claim_id
    WHERE aliases.brand_id = v_brand AND aliases.claim_id <> v_claim_id
      AND claims.expires_at > v_now;
    IF v_count > 0 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
      );
    END IF;
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    INSERT INTO calapres_cs.request_replay_aliases (
      brand_id, key_version, fingerprint, claim_id, retention_until
    )
    SELECT v_brand, supplied.key_version, supplied.fingerprint, v_claim_id,
      GREATEST(v_request.retention_until, v_retention)
    FROM supplied
    ON CONFLICT (brand_id, key_version, fingerprint) DO UPDATE
      SET claim_id = EXCLUDED.claim_id,
          retention_until = GREATEST(
            calapres_cs.request_replay_aliases.retention_until,
            EXCLUDED.retention_until
          ),
          updated_at = v_now;
    IF v_request.lifecycle_status = 'completed' THEN
      SELECT * INTO v_job
      FROM calapres_cs.conversation_job_queue
      WHERE brand_id = v_brand
        AND job_id = v_request.job_id
        AND business_claim_id = v_request.business_claim_id
        AND conversation_id = v_request.conversation_id
        AND generation = v_request.generation
        AND due_at = v_request.due_at;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'bound_job_missing', NULL, 'durable_reference_conflict'
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'duplicate_completed',
        calapres_cs._job_control_bundle(v_job) || jsonb_build_object(
          'claim_id', v_request.claim_id,
          'lifecycle_status', v_request.lifecycle_status,
          'claimed_at', calapres_cs._rfc3339_utc(v_request.claimed_at),
          'expires_at', calapres_cs._rfc3339_utc(v_request.expires_at),
          'lease_expires_at', calapres_cs._rfc3339_utc(v_request.lease_expires_at),
          'attempt_count', v_request.attempt_count,
          'request_source', v_request.request_source,
          'source_binding_sha256', v_request.source_binding_sha256,
          'business_claim_id', v_request.business_claim_id,
          'job_id', v_request.job_id,
          'conversation_id', v_request.conversation_id,
          'generation', v_request.generation,
          'due_at', calapres_cs._rfc3339_utc(v_request.due_at)
        ), NULL
      );
    ELSIF v_request.lifecycle_status = 'legacy_unbound' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_later',
        jsonb_build_object(
          'claim_id', v_request.claim_id,
          'retry_after_at', calapres_cs._rfc3339_utc(v_request.expires_at),
          'request_source', v_request.request_source,
          'source_binding_sha256', v_request.source_binding_sha256
        ), NULL
      );
    ELSIF v_recovered
      AND v_request.lease_owner_id = p_command ->> 'lease_owner_id'
      AND v_request.lease_token = p_command ->> 'lease_token'
      AND v_request.lease_expires_at > v_now
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'committed', 'processing_owned',
        jsonb_build_object(
          'claim_id', v_request.claim_id,
          'lifecycle_status', v_request.lifecycle_status,
          'claimed_at', calapres_cs._rfc3339_utc(v_request.claimed_at),
          'expires_at', calapres_cs._rfc3339_utc(v_request.expires_at),
          'lease_expires_at', calapres_cs._rfc3339_utc(v_request.lease_expires_at),
          'attempt_count', v_request.attempt_count,
          'request_source', v_request.request_source,
          'source_binding_sha256', v_request.source_binding_sha256
        ), NULL
      );
    ELSIF v_recovered AND v_request.lease_expires_at > v_now THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_later',
        jsonb_build_object(
          'claim_id', v_request.claim_id,
          'retry_after_at', calapres_cs._rfc3339_utc(v_request.lease_expires_at),
          'request_source', v_request.request_source,
          'source_binding_sha256', v_request.source_binding_sha256
        ), NULL
      );
    ELSIF v_recovered THEN
      UPDATE calapres_cs.request_replay_claims
      SET lease_owner_id = p_command ->> 'lease_owner_id',
          lease_token = p_command ->> 'lease_token',
          lease_expires_at = LEAST(v_lease_expires, expires_at),
          attempt_count = attempt_count + 1,
          updated_at = v_now
      WHERE brand_id = v_brand AND claim_id = v_request.claim_id
        AND lifecycle_status = 'processing' AND lease_expires_at <= v_now
      RETURNING * INTO v_request;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'committed', 'processing_recovered',
        jsonb_build_object(
          'claim_id', v_request.claim_id,
          'lifecycle_status', v_request.lifecycle_status,
          'claimed_at', calapres_cs._rfc3339_utc(v_request.claimed_at),
          'expires_at', calapres_cs._rfc3339_utc(v_request.expires_at),
          'lease_expires_at', calapres_cs._rfc3339_utc(v_request.lease_expires_at),
          'attempt_count', v_request.attempt_count,
          'request_source', v_request.request_source,
          'source_binding_sha256', v_request.source_binding_sha256
        ), NULL
      );
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed', 'processing_claimed',
      jsonb_build_object(
        'claim_id', v_request.claim_id,
        'lifecycle_status', v_request.lifecycle_status,
        'claimed_at', calapres_cs._rfc3339_utc(v_request.claimed_at),
        'expires_at', calapres_cs._rfc3339_utc(v_request.expires_at),
        'lease_expires_at', calapres_cs._rfc3339_utc(v_request.lease_expires_at),
        'attempt_count', v_request.attempt_count,
        'request_source', v_request.request_source,
        'source_binding_sha256', v_request.source_binding_sha256
      ), NULL
    );

  ELSIF p_operation = 'claim_business_event' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'claim_id', 'active_fingerprint', 'active_key_version',
      'retained_fingerprints', 'key_registry_version', 'event_retention_seconds',
      'lease_owner_id', 'lease_token', 'lease_duration_seconds'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'claim_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'lease_owner_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'lease_token', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR jsonb_typeof(p_command -> 'event_retention_seconds') <> 'number'
      OR (p_command ->> 'event_retention_seconds') !~ '^[1-9][0-9]{2,5}$'
      OR (p_command ->> 'event_retention_seconds')::integer NOT BETWEEN 300 AND 604800
      OR jsonb_typeof(p_command -> 'lease_duration_seconds') <> 'number'
      OR (p_command ->> 'lease_duration_seconds') !~ '^[1-9][0-9]{0,2}$'
      OR (p_command ->> 'lease_duration_seconds')::integer NOT BETWEEN 1 AND 900
      OR (p_command ->> 'lease_duration_seconds')::integer >
        (p_command ->> 'event_retention_seconds')::integer
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_expires := v_now + make_interval(
      secs => (p_command ->> 'event_retention_seconds')::integer
    );
    v_lease_expires := v_now + make_interval(
      secs => (p_command ->> 'lease_duration_seconds')::integer
    );
    v_retention := v_expires;
    IF NOT calapres_cs._edge_key_bundle_valid(
      p_command, 'business_event', 'active_fingerprint', 'retained_fingerprints',
      v_now, v_expires
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'key_coverage_incomplete', NULL, 'key_coverage_incomplete'
      );
    END IF;
    v_aliases := jsonb_build_array(jsonb_build_object(
      'fingerprint', p_command ->> 'active_fingerprint',
      'key_version', p_command ->> 'active_key_version'
    )) || (p_command -> 'retained_fingerprints');
    PERFORM pg_advisory_xact_lock(hashtextextended('calapres:business_event:v2', 0));
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    SELECT array_agg(DISTINCT aliases.claim_id ORDER BY aliases.claim_id)
    INTO v_claim_ids
    FROM calapres_cs.business_event_aliases aliases
    JOIN supplied
      ON supplied.fingerprint = aliases.fingerprint
     AND supplied.key_version = aliases.key_version
    JOIN calapres_cs.business_events events
      ON events.brand_id = aliases.brand_id AND events.claim_id = aliases.claim_id
    WHERE aliases.brand_id = v_brand AND events.expires_at > v_now;
    IF COALESCE(cardinality(v_claim_ids), 0) > 1 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
      );
    END IF;
    IF COALESCE(cardinality(v_claim_ids), 0) = 1 THEN
      v_recovered := true;
      v_claim_id := v_claim_ids[1];
      SELECT * INTO v_event FROM calapres_cs.business_events
      WHERE brand_id = v_brand AND claim_id = v_claim_id FOR UPDATE;
    ELSE
      v_recovered := false;
      v_claim_id := p_command ->> 'claim_id';
      INSERT INTO calapres_cs.business_events (
        brand_id, claim_id, lifecycle_status, claimed_at, expires_at,
        lease_owner_id, lease_token, lease_expires_at, attempt_count, retention_until
      ) VALUES (
        v_brand, v_claim_id, 'prepared', v_now, v_expires,
        p_command ->> 'lease_owner_id', p_command ->> 'lease_token',
        v_lease_expires, 1, v_retention
      )
      ON CONFLICT (brand_id, claim_id) DO NOTHING
      RETURNING * INTO v_event;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'claim_id_conflict', NULL, NULL
        );
      END IF;
    END IF;
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    SELECT count(*) INTO v_count
    FROM calapres_cs.business_event_aliases aliases
    JOIN supplied
      ON supplied.fingerprint = aliases.fingerprint
     AND supplied.key_version = aliases.key_version
    JOIN calapres_cs.business_events events
      ON events.brand_id = aliases.brand_id AND events.claim_id = aliases.claim_id
    WHERE aliases.brand_id = v_brand AND aliases.claim_id <> v_claim_id
      AND events.expires_at > v_now;
    IF v_count > 0 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
      );
    END IF;
    IF v_event.lifecycle_status = 'completed' THEN
      SELECT * INTO v_job
      FROM calapres_cs.conversation_job_queue
      WHERE brand_id = v_brand AND job_id = v_event.job_id
      FOR UPDATE;
      IF NOT FOUND OR v_job.business_claim_id <> v_event.claim_id
        OR v_job.state <> 'completed'
        OR NOT EXISTS (
          SELECT 1
          FROM calapres_cs.business_event_aliases aliases
          WHERE aliases.brand_id = v_brand
            AND aliases.claim_id = v_event.claim_id
            AND aliases.key_version = regexp_replace(
              v_job.event_identity_key_version,
              '^calapres-identity-hmac-', 'hmac-sha256-'
            )
            AND aliases.fingerprint = v_job.event_identity_fingerprint
        )
      THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'completed_binding_invalid', NULL,
          'durable_reference_conflict'
        );
      END IF;
      SELECT * INTO v_observation
      FROM calapres_cs.observation_outcomes
      WHERE brand_id = v_brand AND observation_id = v_event.observation_id
      FOR UPDATE;
      IF NOT FOUND OR v_observation.claim_id <> v_event.claim_id
        OR v_observation.job_id <> v_job.job_id
        OR v_observation.audit_id <> v_event.audit_id
        OR NOT EXISTS (
          SELECT 1
          FROM calapres_cs.audit_events audit
          WHERE audit.brand_id = v_brand
            AND audit.audit_id = v_event.audit_id
            AND audit.event_type = 'business_event_completed'
            AND audit.claim_id = v_event.claim_id
            AND audit.job_id = v_job.job_id
            AND audit.observation_id = v_event.observation_id
        )
      THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'completed_binding_invalid', NULL,
          'durable_reference_conflict'
        );
      END IF;
    END IF;
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    INSERT INTO calapres_cs.business_event_aliases (
      brand_id, key_version, fingerprint, claim_id, retention_until
    )
    SELECT v_brand, supplied.key_version, supplied.fingerprint, v_claim_id,
      GREATEST(v_event.retention_until, v_retention)
    FROM supplied
    ON CONFLICT (brand_id, key_version, fingerprint) DO UPDATE
      SET claim_id = EXCLUDED.claim_id,
          retention_until = GREATEST(
            calapres_cs.business_event_aliases.retention_until,
            EXCLUDED.retention_until
          ),
          updated_at = v_now;
    IF v_event.lifecycle_status = 'completed' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'duplicate_completed',
        calapres_cs._job_control_bundle(v_job) || jsonb_build_object(
          'claim_id', v_event.claim_id,
          'lifecycle_status', v_event.lifecycle_status,
          'job_id', v_job.job_id,
          'generation', v_job.generation,
          'due_at', calapres_cs._rfc3339_utc(v_job.due_at),
          'state', v_job.state,
          'observation_id', v_event.observation_id,
          'audit_id', v_event.audit_id
        ), NULL
      );
    ELSIF v_recovered
      AND v_event.lease_owner_id = p_command ->> 'lease_owner_id'
      AND v_event.lease_token = p_command ->> 'lease_token'
      AND v_event.lease_expires_at > v_now
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'committed', 'prepared_owned',
        jsonb_build_object(
          'claim_id', v_event.claim_id,
          'lease_expires_at', calapres_cs._rfc3339_utc(v_event.lease_expires_at),
          'attempt_count', v_event.attempt_count, 'job_id', v_event.job_id
        ), NULL
      );
    ELSIF v_recovered AND v_event.lease_expires_at > v_now THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'business_retry_later',
        jsonb_build_object(
          'claim_id', v_event.claim_id,
          'retry_after_at', calapres_cs._rfc3339_utc(v_event.lease_expires_at)
        ), NULL
      );
    ELSIF v_recovered THEN
      UPDATE calapres_cs.business_events
      SET lease_owner_id = p_command ->> 'lease_owner_id',
          lease_token = p_command ->> 'lease_token',
          lease_expires_at = LEAST(v_lease_expires, expires_at),
          attempt_count = attempt_count + 1,
          updated_at = v_now
      WHERE brand_id = v_brand AND claim_id = v_event.claim_id
        AND lifecycle_status = 'prepared' AND lease_expires_at <= v_now
      RETURNING * INTO v_event;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'committed', 'recovered_prepared',
        jsonb_build_object(
          'claim_id', v_event.claim_id,
          'lease_expires_at', calapres_cs._rfc3339_utc(v_event.lease_expires_at),
          'attempt_count', v_event.attempt_count, 'job_id', v_event.job_id
        ), NULL
      );
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed', 'prepared',
      jsonb_build_object(
        'claim_id', v_event.claim_id,
        'lease_expires_at', calapres_cs._rfc3339_utc(v_event.lease_expires_at),
        'attempt_count', v_event.attempt_count, 'job_id', v_event.job_id
      ), NULL
    );

  ELSIF p_operation = 'advance_conversation_generation' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'request_claim_id', 'request_lease_owner_id', 'request_lease_token',
      'business_claim_id', 'business_lease_owner_id', 'business_lease_token',
      'request_source', 'source_binding_sha256', 'reconciliation_scan_id',
      'reconciliation_scan_lease_token', 'reconciliation_expected_after_message_id',
      'reconciliation_page_binding_sha256',
      'account_id', 'inbox_id', 'channel', 'conversation_id', 'anchor_message_id',
      'correlation_id', 'job_id', 'event_identity_key_version',
      'event_identity_fingerprint', 'conversation_fingerprint', 'message_fingerprint',
      'active_key_version', 'retained_message_fingerprints', 'key_registry_version',
      'baseline_fingerprint_key_version', 'baseline_status_fingerprint',
      'baseline_assignee_fingerprint', 'delay_policy_version', 'knowledge_version',
      'delay_seconds', 'retention_seconds'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'request_claim_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'request_lease_owner_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'request_lease_token', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'business_claim_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'business_lease_owner_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'business_lease_token', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR (p_command ->> 'request_source') NOT IN (
        'chatwoot_signed_webhook_v1', 'chatwoot_reconciliation_api_v1'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'source_binding_sha256', '^[a-f0-9]{64}$'
      )
      OR NOT (
        (
          (p_command ->> 'request_source') = 'chatwoot_signed_webhook_v1'
          AND jsonb_typeof(p_command -> 'reconciliation_scan_id') = 'null'
          AND jsonb_typeof(p_command -> 'reconciliation_scan_lease_token') = 'null'
          AND jsonb_typeof(
            p_command -> 'reconciliation_expected_after_message_id'
          ) = 'null'
          AND jsonb_typeof(p_command -> 'reconciliation_page_binding_sha256') = 'null'
        ) OR (
          (p_command ->> 'request_source') = 'chatwoot_reconciliation_api_v1'
          AND calapres_cs._json_text_matches(
            p_command, 'reconciliation_scan_id', '^cwrs_[a-f0-9]{24}$'
          )
          AND calapres_cs._json_text_matches(
            p_command, 'reconciliation_scan_lease_token', '^[A-Za-z0-9:_-]{4,160}$'
          )
          AND jsonb_typeof(
            p_command -> 'reconciliation_expected_after_message_id'
          ) = 'number'
          AND calapres_cs._edge_uint53_text_valid(
            p_command ->> 'reconciliation_expected_after_message_id', true
          )
          AND calapres_cs._json_text_matches(
            p_command, 'reconciliation_page_binding_sha256', '^[a-f0-9]{64}$'
          )
          AND calapres_cs._edge_uint53_text_valid(
            p_command ->> 'conversation_id', false
          )
          AND calapres_cs._edge_uint53_text_valid(
            p_command ->> 'anchor_message_id', false
          )
          AND (
            length(p_command ->> 'anchor_message_id') >
              length(p_command ->> 'reconciliation_expected_after_message_id')
            OR (
              length(p_command ->> 'anchor_message_id') =
                length(p_command ->> 'reconciliation_expected_after_message_id')
              AND (p_command ->> 'anchor_message_id') >
                (p_command ->> 'reconciliation_expected_after_message_id')
            )
          )
        )
      )
      OR jsonb_typeof(p_command -> 'account_id') <> 'number'
      OR (p_command ->> 'account_id') <> '179973'
      OR jsonb_typeof(p_command -> 'inbox_id') <> 'number'
      OR (p_command ->> 'inbox_id') !~ '^[1-9][0-9]{5}$'
      OR NOT (
        ((p_command ->> 'inbox_id') = '128031' AND (p_command ->> 'channel') = 'instagram')
        OR ((p_command ->> 'inbox_id') = '128033' AND (p_command ->> 'channel') = 'tiktok')
        OR ((p_command ->> 'inbox_id') = '128058' AND (p_command ->> 'channel') = 'whatsapp')
        OR ((p_command ->> 'inbox_id') = '128326' AND (p_command ->> 'channel') = 'email')
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'conversation_id', '^[1-9][0-9]{0,30}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'anchor_message_id', '^[1-9][0-9]{0,15}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'correlation_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR (p_command ->> 'correlation_id') <>
        'calapres:' || (p_command ->> 'conversation_id') || ':' ||
        (p_command ->> 'anchor_message_id')
      OR NOT calapres_cs._json_text_matches(
        p_command, 'job_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'event_identity_key_version',
        '^calapres-identity-hmac-v[1-9][0-9]*$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'event_identity_fingerprint', '^[a-f0-9]{64}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'conversation_fingerprint', '^[a-f0-9]{64}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'message_fingerprint', '^[a-f0-9]{64}$'
      )
      OR regexp_replace(
        p_command ->> 'event_identity_key_version',
        '^calapres-identity-hmac-', 'hmac-sha256-'
      ) <> p_command ->> 'active_key_version'
      OR NOT calapres_cs._json_text_matches(
        p_command, 'baseline_fingerprint_key_version', '^calapres-hmac-v[1-9][0-9]*$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'baseline_status_fingerprint', '^[a-f0-9]{64}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'baseline_assignee_fingerprint', '^[a-f0-9]{64}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'delay_policy_version',
        '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'knowledge_version',
        '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$'
      )
      OR jsonb_typeof(p_command -> 'delay_seconds') <> 'number'
      OR (p_command ->> 'delay_seconds') !~ '^[0-9]{1,4}$'
      OR (p_command ->> 'delay_seconds')::integer NOT BETWEEN 0 AND 3600
      OR jsonb_typeof(p_command -> 'retention_seconds') <> 'number'
      OR (p_command ->> 'retention_seconds') !~ '^[1-9][0-9]{4,7}$'
      OR (p_command ->> 'retention_seconds')::integer NOT BETWEEN 86400 AND 31536000
      OR (p_command ->> 'retention_seconds')::integer <
        (p_command ->> 'delay_seconds')::integer
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_due := v_now + make_interval(secs => (p_command ->> 'delay_seconds')::integer);
    v_retention := v_now + make_interval(
      secs => (p_command ->> 'retention_seconds')::integer
    );
    IF NOT calapres_cs._edge_key_bundle_valid(
      p_command, 'message_identity', 'message_fingerprint',
      'retained_message_fingerprints', v_now, v_retention
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'key_coverage_incomplete', NULL, 'key_coverage_incomplete'
      );
    END IF;
    v_aliases := jsonb_build_array(jsonb_build_object(
      'fingerprint', p_command ->> 'message_fingerprint',
      'key_version', p_command ->> 'active_key_version'
    )) || (p_command -> 'retained_message_fingerprints');
    PERFORM pg_advisory_xact_lock(hashtextextended(
      v_brand || ':conversation:v2:' || (p_command ->> 'conversation_id'), 0
    ));
    SELECT * INTO v_request FROM calapres_cs.request_replay_claims
    WHERE brand_id = v_brand AND claim_id = p_command ->> 'request_claim_id'
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'request_claim_not_found', NULL, NULL
      );
    ELSIF v_request.request_source IS DISTINCT FROM p_command ->> 'request_source'
      OR v_request.source_binding_sha256 IS DISTINCT FROM
        p_command ->> 'source_binding_sha256'
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'request_provenance_mismatch', NULL,
        'durable_reference_conflict'
      );
    ELSIF v_request.lifecycle_status = 'completed' THEN
      IF v_request.reconciliation_scan_id IS DISTINCT FROM CASE
          WHEN (p_command ->> 'request_source') = 'chatwoot_reconciliation_api_v1'
            THEN p_command ->> 'reconciliation_scan_id'
          ELSE NULL
        END
        OR v_request.reconciliation_expected_after_message_id IS DISTINCT FROM CASE
          WHEN (p_command ->> 'request_source') = 'chatwoot_reconciliation_api_v1'
            THEN (p_command ->> 'reconciliation_expected_after_message_id')::bigint
          ELSE NULL
        END
        OR v_request.reconciliation_page_binding_sha256 IS DISTINCT FROM CASE
          WHEN (p_command ->> 'request_source') = 'chatwoot_reconciliation_api_v1'
            THEN p_command ->> 'reconciliation_page_binding_sha256'
          ELSE NULL
        END
      THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'request_ingress_binding_mismatch', NULL,
          'durable_reference_conflict'
        );
      END IF;
      SELECT * INTO v_job FROM calapres_cs.conversation_job_queue
      WHERE brand_id = v_brand AND job_id = v_request.job_id
      FOR UPDATE;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'bound_job_missing', NULL, 'durable_reference_conflict'
        );
      END IF;
      SELECT * INTO v_event FROM calapres_cs.business_events
      WHERE brand_id = v_brand AND claim_id = v_request.business_claim_id
      FOR UPDATE;
      IF NOT FOUND OR v_request.business_claim_id <> p_command ->> 'business_claim_id'
        OR v_request.job_id <> p_command ->> 'job_id'
        OR v_request.conversation_id <> p_command ->> 'conversation_id'
        OR v_request.generation <> v_job.generation
        OR v_request.due_at <> v_job.due_at
        OR v_event.job_id <> v_job.job_id
        OR v_job.business_claim_id <> v_event.claim_id
        OR NOT calapres_cs._job_reconciliation_control_matches_command(v_job, p_command)
        OR NOT EXISTS (
          SELECT 1
          FROM calapres_cs.business_event_aliases aliases
          WHERE aliases.brand_id = v_brand
            AND aliases.claim_id = v_event.claim_id
            AND aliases.key_version = p_command ->> 'active_key_version'
            AND aliases.fingerprint = p_command ->> 'event_identity_fingerprint'
        )
      THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'request_already_bound', NULL, NULL
        );
      END IF;
      WITH supplied AS (
        SELECT x.fingerprint, x.key_version
        FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
      )
      SELECT count(*) INTO v_count
      FROM supplied
      JOIN calapres_cs.conversation_job_message_aliases aliases
        ON aliases.brand_id = v_brand
       AND aliases.job_id = v_job.job_id
       AND aliases.key_version = supplied.key_version
       AND aliases.fingerprint = supplied.fingerprint
       AND aliases.retention_until > v_now;
      IF v_count <> jsonb_array_length(v_aliases) THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'request_already_bound', NULL, NULL
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'duplicate_ingress_bound',
        calapres_cs._job_control_bundle(v_job) || jsonb_build_object(
          'request_claim_id', v_request.claim_id,
          'business_claim_id', v_request.business_claim_id,
          'job_id', v_request.job_id,
          'conversation_id', v_request.conversation_id,
          'generation', v_request.generation,
          'due_at', calapres_cs._rfc3339_utc(v_request.due_at),
          'state', v_job.state,
          'request_source', v_request.request_source,
          'source_binding_sha256', v_request.source_binding_sha256,
          'reconciliation_scan_id', v_request.reconciliation_scan_id,
          'reconciliation_expected_after_message_id',
            v_request.reconciliation_expected_after_message_id,
          'reconciliation_page_binding_sha256',
            v_request.reconciliation_page_binding_sha256
        ), NULL
      );
    ELSIF v_request.lifecycle_status <> 'processing'
      OR v_request.lease_owner_id <> p_command ->> 'request_lease_owner_id'
      OR v_request.lease_token <> p_command ->> 'request_lease_token'
      OR v_request.lease_expires_at <= v_now
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'request_lease_not_owned', NULL, NULL
      );
    END IF;
    SELECT * INTO v_event FROM calapres_cs.business_events
    WHERE brand_id = v_brand AND claim_id = p_command ->> 'business_claim_id'
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'business_claim_not_found', NULL, NULL
      );
    ELSIF NOT EXISTS (
      SELECT 1
      FROM calapres_cs.business_event_aliases aliases
      WHERE aliases.brand_id = v_brand
        AND aliases.claim_id = v_event.claim_id
        AND aliases.key_version = p_command ->> 'active_key_version'
        AND aliases.fingerprint = p_command ->> 'event_identity_fingerprint'
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'event_identity_binding_mismatch', NULL, NULL
      );
    ELSIF v_event.job_id IS NOT NULL THEN
      SELECT * INTO v_job FROM calapres_cs.conversation_job_queue
      WHERE brand_id = v_brand AND job_id = v_event.job_id
      FOR UPDATE;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'bound_job_missing', NULL, 'durable_reference_conflict'
        );
      ELSIF v_event.job_id <> p_command ->> 'job_id'
        OR v_job.business_claim_id <> v_event.claim_id
        OR v_job.conversation_id <> p_command ->> 'conversation_id'
        OR NOT calapres_cs._job_reconciliation_control_matches_command(v_job, p_command)
      THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'business_binding_mismatch', NULL, NULL
        );
      END IF;
      IF v_event.lifecycle_status = 'completed' THEN
        SELECT * INTO v_observation
        FROM calapres_cs.observation_outcomes
        WHERE brand_id = v_brand AND observation_id = v_event.observation_id;
        IF v_job.state <> 'completed'
          OR NOT FOUND
          OR v_observation.claim_id <> v_event.claim_id
          OR v_observation.job_id <> v_job.job_id
          OR v_observation.audit_id <> v_event.audit_id
          OR NOT EXISTS (
            SELECT 1
            FROM calapres_cs.business_event_aliases aliases
            WHERE aliases.brand_id = v_brand
              AND aliases.claim_id = v_event.claim_id
              AND aliases.key_version = regexp_replace(
                v_job.event_identity_key_version,
                '^calapres-identity-hmac-', 'hmac-sha256-'
              )
              AND aliases.fingerprint = v_job.event_identity_fingerprint
          )
          OR NOT EXISTS (
            SELECT 1
            FROM calapres_cs.audit_events audit
            WHERE audit.brand_id = v_brand
              AND audit.audit_id = v_event.audit_id
              AND audit.event_type = 'business_event_completed'
              AND audit.claim_id = v_event.claim_id
              AND audit.job_id = v_job.job_id
              AND audit.observation_id = v_event.observation_id
          )
        THEN
          RETURN calapres_cs._atomic_envelope(
            p_operation, 'unknown', 'completed_binding_invalid', NULL,
            'durable_reference_conflict'
          );
        END IF;
      END IF;
      PERFORM pg_advisory_xact_lock(hashtextextended('calapres:message_identity:v2', 0));
      WITH supplied AS (
        SELECT x.fingerprint, x.key_version
        FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
      )
      SELECT count(*) INTO v_count
      FROM calapres_cs.conversation_job_message_aliases aliases
      JOIN supplied
        ON supplied.fingerprint = aliases.fingerprint
       AND supplied.key_version = aliases.key_version
      WHERE aliases.brand_id = v_brand AND aliases.job_id = v_job.job_id
        AND aliases.retention_until > v_now;
      IF v_count = 0 THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'message_identity_binding_mismatch', NULL, NULL
        );
      END IF;
      WITH supplied AS (
        SELECT x.fingerprint, x.key_version
        FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
      )
      SELECT count(*) INTO v_count
      FROM calapres_cs.conversation_job_message_aliases aliases
      JOIN supplied ON supplied.key_version = aliases.key_version
      WHERE aliases.brand_id = v_brand AND aliases.job_id = v_job.job_id
        AND aliases.retention_until > v_now
        AND aliases.fingerprint <> supplied.fingerprint;
      IF v_count > 0 THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
        );
      END IF;
      WITH supplied AS (
        SELECT x.fingerprint, x.key_version
        FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
      )
      SELECT count(*) INTO v_count
      FROM calapres_cs.conversation_job_message_aliases aliases
      JOIN supplied
        ON supplied.fingerprint = aliases.fingerprint
       AND supplied.key_version = aliases.key_version
      WHERE aliases.brand_id = v_brand AND aliases.job_id <> v_job.job_id
        AND aliases.retention_until > v_now;
      IF v_count > 0 THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
        );
      END IF;
      WITH supplied AS (
        SELECT x.fingerprint, x.key_version
        FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
      )
      INSERT INTO calapres_cs.conversation_job_message_aliases (
        brand_id, key_version, fingerprint, job_id, retention_until
      )
      SELECT v_brand, supplied.key_version, supplied.fingerprint, v_job.job_id,
        GREATEST(v_job.retention_until, v_retention)
      FROM supplied
      ON CONFLICT (brand_id, key_version, fingerprint) DO UPDATE
        SET job_id = EXCLUDED.job_id,
          retention_until = GREATEST(
          calapres_cs.conversation_job_message_aliases.retention_until,
          EXCLUDED.retention_until
        ), updated_at = v_now
        WHERE calapres_cs.conversation_job_message_aliases.job_id = EXCLUDED.job_id
          OR calapres_cs.conversation_job_message_aliases.retention_until <= v_now;
      WITH supplied AS (
        SELECT x.fingerprint, x.key_version
        FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
      )
      SELECT count(*) INTO v_count
      FROM supplied
      JOIN calapres_cs.conversation_job_message_aliases aliases
        ON aliases.brand_id = v_brand
       AND aliases.job_id = v_job.job_id
       AND aliases.key_version = supplied.key_version
       AND aliases.fingerprint = supplied.fingerprint;
      IF v_count <> jsonb_array_length(v_aliases) THEN
        RAISE EXCEPTION 'calapres message alias reconciliation failed';
      END IF;
      UPDATE calapres_cs.conversation_job_queue
      SET retention_until = GREATEST(retention_until, v_retention),
          updated_at = v_now
      WHERE brand_id = v_brand AND job_id = v_job.job_id
      RETURNING * INTO v_job;
      UPDATE calapres_cs.request_replay_claims
      SET lifecycle_status = 'completed', business_claim_id = v_event.claim_id,
          job_id = v_job.job_id, conversation_id = v_job.conversation_id,
          generation = v_job.generation, due_at = v_job.due_at,
          reconciliation_scan_id = CASE
            WHEN v_request.request_source = 'chatwoot_reconciliation_api_v1'
              THEN p_command ->> 'reconciliation_scan_id'
            ELSE NULL
          END,
          reconciliation_expected_after_message_id = CASE
            WHEN v_request.request_source = 'chatwoot_reconciliation_api_v1'
              THEN (p_command ->> 'reconciliation_expected_after_message_id')::bigint
            ELSE NULL
          END,
          reconciliation_page_binding_sha256 = CASE
            WHEN v_request.request_source = 'chatwoot_reconciliation_api_v1'
              THEN p_command ->> 'reconciliation_page_binding_sha256'
            ELSE NULL
          END,
          completed_at = v_now, updated_at = v_now
      WHERE brand_id = v_brand AND claim_id = v_request.claim_id
        AND lifecycle_status = 'processing'
        AND lease_owner_id = p_command ->> 'request_lease_owner_id'
        AND lease_token = p_command ->> 'request_lease_token'
        AND request_source = p_command ->> 'request_source'
        AND source_binding_sha256 = p_command ->> 'source_binding_sha256'
        AND lease_expires_at > v_now
      RETURNING * INTO v_request;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'completed business replay binding CAS failed'
          USING ERRCODE = '40001';
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'duplicate_ingress_bound',
        calapres_cs._job_control_bundle(v_job) || jsonb_build_object(
          'request_claim_id', v_request.claim_id,
          'business_claim_id', v_event.claim_id,
          'job_id', v_job.job_id,
          'conversation_id', v_job.conversation_id,
          'generation', v_job.generation,
          'due_at', calapres_cs._rfc3339_utc(v_job.due_at),
          'state', v_job.state,
          'request_source', v_request.request_source,
          'source_binding_sha256', v_request.source_binding_sha256,
          'reconciliation_scan_id', v_request.reconciliation_scan_id,
          'reconciliation_expected_after_message_id',
            v_request.reconciliation_expected_after_message_id,
          'reconciliation_page_binding_sha256',
            v_request.reconciliation_page_binding_sha256
        ), NULL
      );
    ELSIF v_event.lease_owner_id <> p_command ->> 'business_lease_owner_id'
      OR v_event.lease_token <> p_command ->> 'business_lease_token'
      OR v_event.lease_expires_at <= v_now
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'business_lease_not_owned', NULL, NULL
      );
    END IF;
    IF EXISTS (
      SELECT 1 FROM calapres_cs.conversation_job_queue
      WHERE brand_id = v_brand AND job_id = p_command ->> 'job_id'
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'job_id_conflict', NULL, 'durable_reference_conflict'
      );
    END IF;
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    SELECT array_agg(DISTINCT aliases.job_id ORDER BY aliases.job_id)
    INTO v_job_ids
    FROM calapres_cs.conversation_job_message_aliases aliases
    JOIN supplied
      ON supplied.fingerprint = aliases.fingerprint
     AND supplied.key_version = aliases.key_version
    WHERE aliases.brand_id = v_brand AND aliases.retention_until > v_now;
    IF COALESCE(cardinality(v_job_ids), 0) > 1 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
      );
    ELSIF COALESCE(cardinality(v_job_ids), 0) = 1 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'message_already_bound',
        jsonb_build_object('job_id', v_job_ids[1]), NULL
      );
    END IF;
    SELECT * INTO v_head FROM calapres_cs.conversation_generation_heads
    WHERE brand_id = v_brand AND conversation_id = p_command ->> 'conversation_id'
    FOR UPDATE;
    IF FOUND THEN
      v_generation := v_head.generation + 1;
      UPDATE calapres_cs.conversation_job_queue
      SET state = 'cancelled', retry_worker_id = NULL, retry_lease_token = NULL,
          retry_lease_expires_at = NULL, updated_at = v_now
      WHERE brand_id = v_brand AND job_id = v_head.current_job_id
        AND state IN ('pending', 'retry_scheduled', 'retry_running');
    ELSE
      v_generation := 1;
    END IF;
    INSERT INTO calapres_cs.conversation_job_queue (
      brand_id, job_id, request_claim_id, business_claim_id,
      account_id, inbox_id, channel, conversation_id, anchor_message_id, correlation_id,
      generation, event_identity_key_version, event_identity_fingerprint,
      conversation_fingerprint, message_fingerprint, baseline_fingerprint_key_version,
      baseline_status_fingerprint, baseline_assignee_fingerprint,
      delay_policy_version, delay_seconds, knowledge_version,
      state, due_at, attempt_count, next_attempt_at, retention_until
    ) VALUES (
      v_brand, p_command ->> 'job_id', v_request.claim_id, v_event.claim_id,
      (p_command ->> 'account_id')::integer, (p_command ->> 'inbox_id')::integer,
      p_command ->> 'channel', p_command ->> 'conversation_id',
      p_command ->> 'anchor_message_id', p_command ->> 'correlation_id', v_generation,
      p_command ->> 'event_identity_key_version', p_command ->> 'event_identity_fingerprint',
      p_command ->> 'conversation_fingerprint', p_command ->> 'message_fingerprint',
      p_command ->> 'baseline_fingerprint_key_version',
      p_command ->> 'baseline_status_fingerprint', p_command ->> 'baseline_assignee_fingerprint',
      p_command ->> 'delay_policy_version', (p_command ->> 'delay_seconds')::integer,
      p_command ->> 'knowledge_version',
      'pending', v_due, 0, v_due, v_retention
    )
    RETURNING * INTO v_job;
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    INSERT INTO calapres_cs.conversation_job_message_aliases (
      brand_id, key_version, fingerprint, job_id, retention_until
    )
    SELECT v_brand, supplied.key_version, supplied.fingerprint, v_job.job_id, v_retention
    FROM supplied
    ON CONFLICT (brand_id, key_version, fingerprint) DO UPDATE
      SET job_id = EXCLUDED.job_id,
          retention_until = EXCLUDED.retention_until,
          updated_at = v_now
      WHERE calapres_cs.conversation_job_message_aliases.retention_until <= v_now;
    INSERT INTO calapres_cs.conversation_generation_heads (
      brand_id, conversation_id, generation, current_job_id, retention_until, updated_at
    ) VALUES (
      v_brand, v_job.conversation_id, v_job.generation, v_job.job_id,
      v_job.retention_until, v_now
    )
    ON CONFLICT (brand_id, conversation_id) DO UPDATE
      SET generation = EXCLUDED.generation,
          current_job_id = EXCLUDED.current_job_id,
          retention_until = GREATEST(
            calapres_cs.conversation_generation_heads.retention_until,
            EXCLUDED.retention_until
          ),
          updated_at = v_now;
    UPDATE calapres_cs.business_events
    SET request_claim_id = v_request.claim_id, job_id = v_job.job_id, updated_at = v_now
    WHERE brand_id = v_brand AND claim_id = v_event.claim_id
      AND lifecycle_status = 'prepared' AND job_id IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'business binding CAS failed' USING ERRCODE = '40001';
    END IF;
    UPDATE calapres_cs.request_replay_claims
    SET lifecycle_status = 'completed', business_claim_id = v_event.claim_id,
        job_id = v_job.job_id, conversation_id = v_job.conversation_id,
        generation = v_job.generation, due_at = v_job.due_at,
        reconciliation_scan_id = CASE
          WHEN v_request.request_source = 'chatwoot_reconciliation_api_v1'
            THEN p_command ->> 'reconciliation_scan_id'
          ELSE NULL
        END,
        reconciliation_expected_after_message_id = CASE
          WHEN v_request.request_source = 'chatwoot_reconciliation_api_v1'
            THEN (p_command ->> 'reconciliation_expected_after_message_id')::bigint
          ELSE NULL
        END,
        reconciliation_page_binding_sha256 = CASE
          WHEN v_request.request_source = 'chatwoot_reconciliation_api_v1'
            THEN p_command ->> 'reconciliation_page_binding_sha256'
          ELSE NULL
        END,
        completed_at = v_now, updated_at = v_now
    WHERE brand_id = v_brand AND claim_id = v_request.claim_id
      AND lifecycle_status = 'processing'
      AND lease_owner_id = p_command ->> 'request_lease_owner_id'
      AND lease_token = p_command ->> 'request_lease_token'
      AND request_source = p_command ->> 'request_source'
      AND source_binding_sha256 = p_command ->> 'source_binding_sha256'
      AND lease_expires_at > v_now
    RETURNING * INTO v_request;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'request binding CAS failed' USING ERRCODE = '40001';
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed', 'ingress_bound',
      calapres_cs._job_control_bundle(v_job) || jsonb_build_object(
        'request_claim_id', v_request.claim_id,
        'business_claim_id', v_event.claim_id,
        'job_id', v_job.job_id,
        'conversation_id', v_job.conversation_id,
        'generation', v_job.generation,
        'due_at', calapres_cs._rfc3339_utc(v_job.due_at),
        'state', v_job.state,
        'request_source', v_request.request_source,
        'source_binding_sha256', v_request.source_binding_sha256,
        'reconciliation_scan_id', v_request.reconciliation_scan_id,
        'reconciliation_expected_after_message_id',
          v_request.reconciliation_expected_after_message_id,
        'reconciliation_page_binding_sha256',
          v_request.reconciliation_page_binding_sha256
      ), NULL
    );

  ELSIF p_operation = 'read_generation' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'conversation_id', 'expected_generation'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'conversation_id', '^[1-9][0-9]{0,30}$'
      )
      OR jsonb_typeof(p_command -> 'expected_generation') <> 'number'
      OR (p_command ->> 'expected_generation') !~ '^[1-9][0-9]{0,9}$'
      OR (p_command ->> 'expected_generation')::integer < 1
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    SELECT * INTO v_head FROM calapres_cs.conversation_generation_heads
    WHERE brand_id = v_brand AND conversation_id = p_command ->> 'conversation_id';
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'generation_absent',
        jsonb_build_object(
          'conversation_id', p_command ->> 'conversation_id',
          'expected_generation', (p_command ->> 'expected_generation')::integer,
          'generation', NULL, 'current', false, 'job_id', NULL
        ), NULL
      );
    END IF;
    SELECT * INTO v_job FROM calapres_cs.conversation_job_queue
    WHERE brand_id = v_brand AND job_id = v_head.current_job_id;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'head_job_missing', NULL, 'durable_reference_conflict'
      );
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed', 'generation_read',
      calapres_cs._job_control_bundle(v_job) || jsonb_build_object(
        'conversation_id', v_head.conversation_id,
        'expected_generation', (p_command ->> 'expected_generation')::integer,
        'generation', v_head.generation,
        'current', v_head.generation = (p_command ->> 'expected_generation')::integer,
        'job_id', v_head.current_job_id,
        'due_at', calapres_cs._rfc3339_utc(v_job.due_at),
        'state', v_job.state
      ), NULL
    );

  ELSIF p_operation = 'schedule_conversation_retry' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'job_id', 'conversation_id', 'expected_generation',
      'retry_idempotency_key', 'max_attempts', 'safe_error_code', 'delay_seconds',
      'retention_seconds', 'expected_worker_id', 'expected_lease_token'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'job_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'conversation_id', '^[1-9][0-9]{0,30}$'
      )
      OR jsonb_typeof(p_command -> 'expected_generation') <> 'number'
      OR (p_command ->> 'expected_generation') !~ '^[1-9][0-9]{0,9}$'
      OR NOT calapres_cs._json_text_matches(
        p_command, 'retry_idempotency_key', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR jsonb_typeof(p_command -> 'max_attempts') <> 'number'
      OR (p_command ->> 'max_attempts') !~ '^[1-9][0-9]?$'
      OR (p_command ->> 'max_attempts')::integer NOT BETWEEN 1 AND 10
      OR NOT calapres_cs._json_text_matches(
        p_command, 'safe_error_code', '^[a-z][a-z0-9_]{2,80}$'
      )
      OR jsonb_typeof(p_command -> 'delay_seconds') <> 'number'
      OR (p_command ->> 'delay_seconds') !~ '^[1-9][0-9]{0,4}$'
      OR (p_command ->> 'delay_seconds')::integer NOT BETWEEN 1 AND 86400
      OR jsonb_typeof(p_command -> 'retention_seconds') <> 'number'
      OR (p_command ->> 'retention_seconds') !~ '^[1-9][0-9]{4,7}$'
      OR (p_command ->> 'retention_seconds')::integer NOT BETWEEN 86400 AND 31536000
      OR (p_command ->> 'retention_seconds')::integer <
        (p_command ->> 'delay_seconds')::integer
      OR NOT calapres_cs._json_text_matches(
        p_command, 'expected_worker_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'expected_lease_token', '^[A-Za-z0-9:_-]{4,160}$'
      )
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    SELECT * INTO v_job FROM calapres_cs.conversation_job_queue
    WHERE brand_id = v_brand AND job_id = p_command ->> 'job_id' FOR UPDATE;
    IF NOT FOUND OR v_job.conversation_id <> p_command ->> 'conversation_id' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'job_not_found', NULL, NULL
      );
    ELSIF v_job.generation <> (p_command ->> 'expected_generation')::integer THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'stale_generation',
        jsonb_build_object('generation', v_job.generation), NULL
      );
    ELSIF v_job.retry_idempotency_key = p_command ->> 'retry_idempotency_key' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'duplicate_retry_schedule',
        jsonb_build_object(
          'job_id', v_job.job_id, 'generation', v_job.generation,
          'attempt_count', v_job.attempt_count,
          'next_attempt_at', calapres_cs._rfc3339_utc(v_job.next_attempt_at)
        ), NULL
      );
    ELSIF v_job.state <> 'retry_running' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_not_running',
        jsonb_build_object('state', v_job.state), NULL
      );
    ELSIF v_job.retry_worker_id <> p_command ->> 'expected_worker_id'
      OR v_job.retry_lease_token <> p_command ->> 'expected_lease_token'
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_lease_cas_failed', NULL, NULL
      );
    ELSIF v_job.retry_lease_expires_at <= v_now THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_lease_expired', NULL, NULL
      );
    ELSIF v_job.attempt_count >= (p_command ->> 'max_attempts')::integer THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_exhausted',
        jsonb_build_object(
          'attempt_count', v_job.attempt_count,
          'max_attempts', (p_command ->> 'max_attempts')::integer
        ), NULL
      );
    END IF;
    v_due := v_now + make_interval(secs => (p_command ->> 'delay_seconds')::integer);
    v_retention := v_now + make_interval(
      secs => (p_command ->> 'retention_seconds')::integer
    );
    UPDATE calapres_cs.conversation_job_queue
    SET state = 'retry_scheduled', next_attempt_at = v_due,
        retention_until = GREATEST(retention_until, v_retention),
        last_safe_error_code = p_command ->> 'safe_error_code',
        retry_idempotency_key = p_command ->> 'retry_idempotency_key',
        max_attempts = (p_command ->> 'max_attempts')::integer,
        retry_worker_id = NULL, retry_lease_token = NULL,
        retry_lease_expires_at = NULL, updated_at = v_now
    WHERE brand_id = v_brand AND job_id = v_job.job_id
      AND state = 'retry_running'
      AND retry_worker_id = p_command ->> 'expected_worker_id'
      AND retry_lease_token = p_command ->> 'expected_lease_token'
      AND retry_lease_expires_at > v_now
    RETURNING * INTO v_job;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
      );
    END IF;
    UPDATE calapres_cs.conversation_generation_heads
    SET retention_until = GREATEST(retention_until, v_job.retention_until), updated_at = v_now
    WHERE brand_id = v_brand AND conversation_id = v_job.conversation_id
      AND current_job_id = v_job.job_id;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed', 'retry_scheduled',
      jsonb_build_object(
        'job_id', v_job.job_id, 'generation', v_job.generation,
        'attempt_count', v_job.attempt_count,
        'next_attempt_at', calapres_cs._rfc3339_utc(v_job.next_attempt_at),
        'safe_error_code', v_job.last_safe_error_code
      ), NULL
    );

  ELSIF p_operation = 'claim_due_conversation_retry' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'worker_id', 'lease_token', 'lease_duration_seconds'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'worker_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'lease_token', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR jsonb_typeof(p_command -> 'lease_duration_seconds') <> 'number'
      OR (p_command ->> 'lease_duration_seconds') !~ '^[1-9][0-9]{0,2}$'
      OR (p_command ->> 'lease_duration_seconds')::integer NOT BETWEEN 1 AND 900
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_lease_expires := v_now + make_interval(
      secs => (p_command ->> 'lease_duration_seconds')::integer
    );
    SELECT * INTO v_job FROM calapres_cs.conversation_job_queue
    WHERE brand_id = v_brand AND state = 'retry_running'
      AND retry_worker_id = p_command ->> 'worker_id'
      AND retry_lease_token = p_command ->> 'lease_token'
    FOR UPDATE;
    IF FOUND AND v_job.retry_lease_expires_at > v_now THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'committed', 'job_lease_owned',
        calapres_cs._job_control_bundle(v_job) || jsonb_build_object(
          'job_id', v_job.job_id, 'conversation_id', v_job.conversation_id,
          'generation', v_job.generation, 'business_claim_id', v_job.business_claim_id,
          'due_at', calapres_cs._rfc3339_utc(v_job.due_at),
          'worker_id', v_job.retry_worker_id, 'lease_token', v_job.retry_lease_token,
          'lease_expires_at', calapres_cs._rfc3339_utc(v_job.retry_lease_expires_at),
          'attempt_count', v_job.attempt_count
        ), NULL
      );
    ELSIF FOUND THEN
      IF v_job.max_attempts IS NOT NULL AND v_job.attempt_count >= v_job.max_attempts THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'retry_exhausted',
          jsonb_build_object(
            'attempt_count', v_job.attempt_count, 'max_attempts', v_job.max_attempts
          ), NULL
        );
      END IF;
      v_recovered := true;
    ELSE
      SELECT * INTO v_job
      FROM calapres_cs.conversation_job_queue
      WHERE brand_id = v_brand AND next_attempt_at <= v_now
        AND (
          state = 'pending'
          OR (state = 'retry_scheduled'
            AND (max_attempts IS NULL OR attempt_count < max_attempts))
          OR (state = 'retry_running' AND retry_lease_expires_at <= v_now
            AND (max_attempts IS NULL OR attempt_count < max_attempts))
        )
      ORDER BY next_attempt_at, job_id
      FOR UPDATE SKIP LOCKED
      LIMIT 1;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'no_due_job', NULL, NULL
        );
      END IF;
      v_recovered := v_job.state = 'retry_running';
    END IF;
    UPDATE calapres_cs.conversation_job_queue
    SET state = 'retry_running', retry_worker_id = p_command ->> 'worker_id',
        retry_lease_token = p_command ->> 'lease_token',
        retry_lease_expires_at = v_lease_expires,
        attempt_count = attempt_count + 1, updated_at = v_now
    WHERE brand_id = v_brand AND job_id = v_job.job_id
      AND next_attempt_at <= v_now
      AND (
        state IN ('pending', 'retry_scheduled')
        OR (state = 'retry_running' AND retry_lease_expires_at <= v_now)
      )
      AND (max_attempts IS NULL OR attempt_count < max_attempts)
    RETURNING * INTO v_job;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
      );
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed',
      CASE WHEN v_recovered THEN 'job_lease_recovered' ELSE 'job_claimed' END,
      calapres_cs._job_control_bundle(v_job) || jsonb_build_object(
        'job_id', v_job.job_id, 'conversation_id', v_job.conversation_id,
        'generation', v_job.generation, 'business_claim_id', v_job.business_claim_id,
        'due_at', calapres_cs._rfc3339_utc(v_job.due_at),
        'worker_id', v_job.retry_worker_id, 'lease_token', v_job.retry_lease_token,
        'lease_expires_at', calapres_cs._rfc3339_utc(v_job.retry_lease_expires_at),
        'attempt_count', v_job.attempt_count
      ), NULL
    );

  ELSIF p_operation = 'transition_conversation_job' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'job_id', 'conversation_id', 'expected_generation',
      'from_state', 'to_state', 'transition_idempotency_key'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'job_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'conversation_id', '^[1-9][0-9]{0,30}$'
      )
      OR jsonb_typeof(p_command -> 'expected_generation') <> 'number'
      OR (p_command ->> 'expected_generation') !~ '^[1-9][0-9]{0,9}$'
      OR NOT calapres_cs._json_text_matches(
        p_command, 'from_state',
        '^(pending|retry_scheduled|retry_running|completed|cancelled|human_owned)$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'to_state', '^(cancelled|human_owned)$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'transition_idempotency_key', '^[A-Za-z0-9:_-]{4,160}$'
      )
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    SELECT * INTO v_job FROM calapres_cs.conversation_job_queue
    WHERE brand_id = v_brand AND job_id = p_command ->> 'job_id' FOR UPDATE;
    IF NOT FOUND OR v_job.conversation_id <> p_command ->> 'conversation_id' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'job_not_found', NULL, NULL
      );
    ELSIF v_job.generation <> (p_command ->> 'expected_generation')::integer THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'stale_generation',
        jsonb_build_object('generation', v_job.generation), NULL
      );
    ELSIF v_job.last_transition_idempotency_key = p_command ->> 'transition_idempotency_key' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'duplicate_transition',
        jsonb_build_object('state', v_job.state), NULL
      );
    ELSIF v_job.state <> p_command ->> 'from_state' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'state_compare_failed',
        jsonb_build_object('state', v_job.state), NULL
      );
    ELSIF v_job.state NOT IN ('pending', 'retry_scheduled', 'retry_running') THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'invalid_job_transition',
        jsonb_build_object('state', v_job.state), NULL
      );
    END IF;
    UPDATE calapres_cs.conversation_job_queue
    SET state = p_command ->> 'to_state', retry_worker_id = NULL,
        retry_lease_token = NULL, retry_lease_expires_at = NULL,
        last_transition_idempotency_key = p_command ->> 'transition_idempotency_key',
        updated_at = v_now
    WHERE brand_id = v_brand AND job_id = v_job.job_id
      AND state = p_command ->> 'from_state'
    RETURNING * INTO v_job;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed', 'job_transitioned',
      jsonb_build_object(
        'job_id', v_job.job_id, 'generation', v_job.generation, 'state', v_job.state
      ), NULL
    );

  ELSIF p_operation = 'complete_business_event' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'claim_id', 'job_id', 'conversation_id', 'expected_generation',
      'worker_id', 'lease_token', 'observation_id', 'observation_digest', 'audit_id',
      'outcome_class', 'reason_code', 'risk_level', 'risk_digest', 'incident_id'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'claim_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'job_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'conversation_id', '^[1-9][0-9]{0,30}$'
      )
      OR jsonb_typeof(p_command -> 'expected_generation') <> 'number'
      OR (p_command ->> 'expected_generation') !~ '^[1-9][0-9]{0,9}$'
      OR NOT calapres_cs._json_text_matches(
        p_command, 'worker_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'lease_token', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'observation_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'observation_digest', '^[a-f0-9]{64}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'audit_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'outcome_class',
        '^(observation_only|routine_candidate|owner_escalation|fail_closed)$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'reason_code', '^[a-z][a-z0-9_]{2,80}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'risk_level', '^(none|low|medium|high|critical)$'
      )
      OR NOT (
        jsonb_typeof(p_command -> 'risk_digest') = 'null'
        OR calapres_cs._json_text_matches(p_command, 'risk_digest', '^[a-f0-9]{64}$')
      )
      OR NOT (
        (
          p_command ->> 'outcome_class' = 'owner_escalation'
          AND calapres_cs._json_text_matches(
            p_command, 'incident_id', '^inc_[A-Za-z0-9_-]{8,80}$'
          )
        ) OR (
          p_command ->> 'outcome_class' <> 'owner_escalation'
          AND jsonb_typeof(p_command -> 'incident_id') = 'null'
        )
      )
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    SELECT * INTO v_event FROM calapres_cs.business_events
    WHERE brand_id = v_brand AND claim_id = p_command ->> 'claim_id' FOR UPDATE;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'claim_not_found', NULL, NULL
      );
    ELSIF v_event.lifecycle_status = 'completed' THEN
      SELECT * INTO v_observation FROM calapres_cs.observation_outcomes
      WHERE brand_id = v_brand AND observation_id = v_event.observation_id;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'observation_missing', NULL, 'durable_reference_conflict'
        );
      END IF;
      IF v_event.job_id = p_command ->> 'job_id'
        AND v_event.observation_id = p_command ->> 'observation_id'
        AND v_event.observation_digest = p_command ->> 'observation_digest'
        AND v_event.audit_id = p_command ->> 'audit_id'
        AND v_observation.outcome_class = p_command ->> 'outcome_class'
        AND v_observation.reason_code = p_command ->> 'reason_code'
        AND v_observation.risk_level = p_command ->> 'risk_level'
        AND v_observation.risk_digest IS NOT DISTINCT FROM p_command ->> 'risk_digest'
        AND v_observation.incident_id IS NOT DISTINCT FROM p_command ->> 'incident_id'
      THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'duplicate_completed',
          jsonb_build_object(
            'claim_id', v_event.claim_id, 'job_id', v_event.job_id,
            'observation_id', v_event.observation_id, 'audit_id', v_event.audit_id
          ), NULL
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'completion_digest_conflict', NULL, NULL
      );
    END IF;
    SELECT * INTO v_job FROM calapres_cs.conversation_job_queue
    WHERE brand_id = v_brand AND job_id = p_command ->> 'job_id' FOR UPDATE;
    IF NOT FOUND OR v_job.business_claim_id <> v_event.claim_id
      OR v_job.conversation_id <> p_command ->> 'conversation_id'
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'job_binding_mismatch', NULL, NULL
      );
    ELSIF v_job.generation <> (p_command ->> 'expected_generation')::integer THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'stale_generation',
        jsonb_build_object('generation', v_job.generation), NULL
      );
    END IF;
    SELECT * INTO v_head FROM calapres_cs.conversation_generation_heads
    WHERE brand_id = v_brand AND conversation_id = v_job.conversation_id FOR UPDATE;
    IF NOT FOUND OR v_head.current_job_id <> v_job.job_id
      OR v_head.generation <> v_job.generation
    THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'stale_generation',
          jsonb_build_object('generation', v_head.generation), NULL
        );
    ELSIF v_job.state <> 'retry_running'
      OR v_job.retry_worker_id <> p_command ->> 'worker_id'
      OR v_job.retry_lease_token <> p_command ->> 'lease_token'
      OR v_job.retry_lease_expires_at <= v_now
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'job_lease_not_owned', NULL, NULL
      );
    END IF;
    IF EXISTS (
      SELECT 1 FROM calapres_cs.observation_outcomes
      WHERE brand_id = v_brand AND observation_id = p_command ->> 'observation_id'
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'observation_id_conflict', NULL, 'durable_reference_conflict'
      );
    ELSIF EXISTS (
      SELECT 1 FROM calapres_cs.audit_events
      WHERE brand_id = v_brand AND audit_id = p_command ->> 'audit_id'
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'audit_id_conflict', NULL, 'durable_reference_conflict'
      );
    ELSIF p_command ->> 'incident_id' IS NOT NULL AND EXISTS (
      SELECT 1 FROM calapres_cs.incidents
      WHERE brand_id = v_brand AND incident_id = p_command ->> 'incident_id'
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'incident_id_conflict', NULL, 'durable_reference_conflict'
      );
    END IF;
    v_retention := GREATEST(v_event.retention_until, v_job.retention_until);
    INSERT INTO calapres_cs.observation_outcomes (
      brand_id, observation_id, claim_id, job_id, observation_digest, audit_id,
      outcome_class, reason_code, risk_level, risk_digest, incident_id,
      completed_at, retention_until
    ) VALUES (
      v_brand, p_command ->> 'observation_id', v_event.claim_id, v_job.job_id,
      p_command ->> 'observation_digest', p_command ->> 'audit_id',
      p_command ->> 'outcome_class', p_command ->> 'reason_code',
      p_command ->> 'risk_level', p_command ->> 'risk_digest',
      p_command ->> 'incident_id', v_now, v_retention
    );
    INSERT INTO calapres_cs.audit_events (
      brand_id, audit_id, event_type, claim_id, job_id, observation_id,
      observation_digest, incident_id, outcome_class, reason_code, risk_level,
      risk_digest, created_at, retention_until
    ) VALUES (
      v_brand, p_command ->> 'audit_id', 'business_event_completed',
      v_event.claim_id, v_job.job_id, p_command ->> 'observation_id',
      p_command ->> 'observation_digest', p_command ->> 'incident_id',
      p_command ->> 'outcome_class', p_command ->> 'reason_code',
      p_command ->> 'risk_level', p_command ->> 'risk_digest', v_now, v_retention
    );
    IF p_command ->> 'incident_id' IS NOT NULL THEN
      INSERT INTO calapres_cs.incidents (
        brand_id, incident_id, revision, status, source_observation_id,
        source_observation_digest, retention_until, updated_at
      ) VALUES (
        v_brand, p_command ->> 'incident_id', 1, 'awaiting_owner_preparation',
        p_command ->> 'observation_id', p_command ->> 'observation_digest',
        v_retention, v_now
      );
    END IF;
    UPDATE calapres_cs.business_events
    SET lifecycle_status = 'completed', observation_id = p_command ->> 'observation_id',
        observation_digest = p_command ->> 'observation_digest',
        audit_id = p_command ->> 'audit_id', completed_at = v_now, updated_at = v_now
    WHERE brand_id = v_brand AND claim_id = v_event.claim_id
      AND lifecycle_status = 'prepared';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'business completion CAS failed' USING ERRCODE = '40001';
    END IF;
    UPDATE calapres_cs.conversation_job_queue
    SET state = 'completed', retry_worker_id = NULL, retry_lease_token = NULL,
        retry_lease_expires_at = NULL, updated_at = v_now
    WHERE brand_id = v_brand AND job_id = v_job.job_id
      AND state = 'retry_running'
      AND retry_worker_id = p_command ->> 'worker_id'
      AND retry_lease_token = p_command ->> 'lease_token'
      AND retry_lease_expires_at > v_now;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'job completion CAS failed' USING ERRCODE = '40001';
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed', 'completed',
      jsonb_build_object(
        'claim_id', v_event.claim_id, 'job_id', v_job.job_id,
        'observation_id', p_command ->> 'observation_id',
        'audit_id', p_command ->> 'audit_id',
        'incident_id', p_command ->> 'incident_id',
        'outcome_class', p_command ->> 'outcome_class',
        'completed_at', calapres_cs._rfc3339_utc(v_now)
      ), NULL
    );
  END IF;

  RETURN calapres_cs._atomic_envelope(
    p_operation, 'unknown', 'uncertain', NULL, 'unsupported_operation'
  );
EXCEPTION
  WHEN serialization_failure THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
    );
  WHEN OTHERS THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'database_function_unknown'
    );
END;
$function$;

ALTER FUNCTION calapres_cs._edge_key_bundle_valid(
  jsonb, text, text, text, timestamptz, timestamptz
) OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._edge_uint53_text_valid(text, boolean)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._job_control_bundle(calapres_cs.conversation_job_queue)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._job_control_matches_command(
  calapres_cs.conversation_job_queue, jsonb
) OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._job_reconciliation_control_matches_command(
  calapres_cs.conversation_job_queue, jsonb
) OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._edge_atomic_dispatch_v2(text, jsonb)
  OWNER TO calapres_cs_function_owner;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON calapres_cs.storage_key_registry,
     calapres_cs.storage_key_registry_heads,
     calapres_cs.conversation_job_queue,
     calapres_cs.conversation_generation_heads,
     calapres_cs.conversation_job_message_aliases
  TO calapres_cs_function_owner;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_request_replay(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._edge_atomic_dispatch_v2('claim_request_replay', p_command)
$function$;
CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_business_event(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._edge_atomic_dispatch_v2('claim_business_event', p_command)
$function$;
CREATE OR REPLACE FUNCTION calapres_cs.atomic_complete_business_event(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._edge_atomic_dispatch_v2('complete_business_event', p_command)
$function$;
CREATE OR REPLACE FUNCTION calapres_cs.atomic_advance_conversation_generation(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._edge_atomic_dispatch_v2('advance_conversation_generation', p_command)
$function$;
CREATE OR REPLACE FUNCTION calapres_cs.atomic_read_generation(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._edge_atomic_dispatch_v2('read_generation', p_command)
$function$;
CREATE OR REPLACE FUNCTION calapres_cs.atomic_schedule_conversation_retry(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._edge_atomic_dispatch_v2('schedule_conversation_retry', p_command)
$function$;
CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_due_conversation_retry(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._edge_atomic_dispatch_v2('claim_due_conversation_retry', p_command)
$function$;
CREATE OR REPLACE FUNCTION calapres_cs.atomic_transition_conversation_job(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._edge_atomic_dispatch_v2('transition_conversation_job', p_command)
$function$;

ALTER FUNCTION calapres_cs.atomic_claim_request_replay(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_claim_business_event(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_complete_business_event(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_advance_conversation_generation(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_read_generation(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_schedule_conversation_retry(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_claim_due_conversation_retry(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_transition_conversation_job(jsonb)
  OWNER TO calapres_cs_function_owner;

REVOKE ALL ON FUNCTION calapres_cs._edge_key_bundle_valid(
  jsonb, text, text, text, timestamptz, timestamptz
) FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._edge_uint53_text_valid(text, boolean)
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._job_control_bundle(
  calapres_cs.conversation_job_queue
) FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._job_control_matches_command(
  calapres_cs.conversation_job_queue, jsonb
) FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._job_reconciliation_control_matches_command(
  calapres_cs.conversation_job_queue, jsonb
) FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs._edge_atomic_dispatch_v2(text, jsonb)
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_claim_request_replay(jsonb)
  FROM PUBLIC, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_claim_business_event(jsonb)
  FROM PUBLIC, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_complete_business_event(jsonb)
  FROM PUBLIC, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_advance_conversation_generation(jsonb)
  FROM PUBLIC, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_read_generation(jsonb)
  FROM PUBLIC, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_schedule_conversation_retry(jsonb)
  FROM PUBLIC, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_claim_due_conversation_retry(jsonb)
  FROM PUBLIC, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_transition_conversation_job(jsonb)
  FROM PUBLIC, calapres_cs_owner_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_prepare_owner_review(jsonb)
  FROM calapres_cs_edge_runtime;
REVOKE ALL ON FUNCTION calapres_cs.atomic_compare_and_commit_owner_decision(jsonb)
  FROM calapres_cs_edge_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_edge_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_owner_runtime;

GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_request_replay(jsonb)
  TO calapres_cs_edge_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_business_event(jsonb)
  TO calapres_cs_edge_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_complete_business_event(jsonb)
  TO calapres_cs_edge_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_advance_conversation_generation(jsonb)
  TO calapres_cs_edge_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_read_generation(jsonb)
  TO calapres_cs_edge_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_schedule_conversation_retry(jsonb)
  TO calapres_cs_edge_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_due_conversation_retry(jsonb)
  TO calapres_cs_edge_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_transition_conversation_job(jsonb)
  TO calapres_cs_edge_runtime;

COMMENT ON FUNCTION calapres_cs.atomic_advance_conversation_generation(jsonb) IS
  'Combined ingress commit: binds processing replay and business claim to one durable DB-timed job.';
COMMENT ON FUNCTION calapres_cs.atomic_claim_due_conversation_retry(jsonb) IS
  'Claims the next due Calapres job without caller knowledge of conversation_id.';

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (4, 'calapres_cs_replay_recovery_queue')
ON CONFLICT (version) DO NOTHING;

COMMIT;
