-- Calapres customer-service callable atomic boundary, migration 0002.
-- Candidate status: implementation_candidate_pending_live_postgres_validation.
-- Each public function accepts one JSONB command and returns one tri-state JSONB envelope.

BEGIN;

DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'calapres_cs_function_owner') THEN
    CREATE ROLE calapres_cs_function_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'calapres_cs_edge_runtime') THEN
    CREATE ROLE calapres_cs_edge_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'calapres_cs_owner_runtime') THEN
    CREATE ROLE calapres_cs_owner_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END;
$roles$;

-- Managed PostgreSQL providers may not allow role ownership changes unless
-- the current administrative role is explicitly a member of the owner role.
GRANT calapres_cs_function_owner TO postgres;
GRANT USAGE, CREATE ON SCHEMA calapres_cs TO calapres_cs_function_owner;

CREATE OR REPLACE FUNCTION calapres_cs._atomic_envelope(
  p_operation text,
  p_status text,
  p_outcome text,
  p_value jsonb,
  p_error_code text
) RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT jsonb_build_object(
    'contract_verified', true,
    'status', p_status,
    'operation', p_operation,
    'outcome', p_outcome,
    'value', p_value,
    'error_code', p_error_code
  )
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._exact_json_keys(
  p_value jsonb,
  p_expected text[]
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT jsonb_typeof(p_value) = 'object'
    AND (
      SELECT COALESCE(array_agg(k ORDER BY k), ARRAY[]::text[])
      FROM jsonb_object_keys(p_value) AS actual(k)
    ) = (
      SELECT COALESCE(array_agg(k ORDER BY k), ARRAY[]::text[])
      FROM unnest(p_expected) AS expected(k)
    )
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._iso_timestamp_valid(p_value jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
BEGIN
  IF jsonb_typeof(p_value) <> 'string'
    OR (p_value #>> '{}') !~
      '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
  THEN
    RETURN false;
  END IF;
  PERFORM (p_value #>> '{}')::timestamptz;
  RETURN true;
EXCEPTION
  WHEN invalid_text_representation OR datetime_field_overflow THEN
    RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._rfc3339_utc(p_value timestamptz)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT to_char(
    p_value AT TIME ZONE 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  )
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._json_text_matches(
  p_object jsonb,
  p_key text,
  p_pattern text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT COALESCE(
    jsonb_typeof(p_object -> p_key) = 'string'
      AND (p_object ->> p_key) ~ p_pattern,
    false
  )
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._fingerprint_bundle_valid(
  p_command jsonb,
  p_active_fingerprint_field text,
  p_retained_field text,
  p_now timestamptz,
  p_required_through timestamptz
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_aliases jsonb;
  v_coverage jsonb;
  v_valid boolean;
BEGIN
  IF jsonb_typeof(p_command -> p_retained_field) <> 'array'
    OR jsonb_array_length(p_command -> p_retained_field) > 8
    OR NOT calapres_cs._exact_json_keys(
      p_command -> 'keyring_coverage',
      ARRAY['required_key_versions', 'verified_at', 'valid_until']
    )
    OR jsonb_typeof(p_command #> '{keyring_coverage,required_key_versions}') <> 'array'
    OR jsonb_array_length(p_command #> '{keyring_coverage,required_key_versions}') NOT BETWEEN 1 AND 9
    OR NOT calapres_cs._iso_timestamp_valid(p_command #> '{keyring_coverage,verified_at}')
    OR NOT calapres_cs._iso_timestamp_valid(p_command #> '{keyring_coverage,valid_until}')
    OR jsonb_typeof(p_command -> p_active_fingerprint_field) <> 'string'
    OR jsonb_typeof(p_command -> 'active_key_version') <> 'string'
  THEN
    RETURN false;
  END IF;

  v_aliases := jsonb_build_array(jsonb_build_object(
    'fingerprint', p_command ->> p_active_fingerprint_field,
    'key_version', p_command ->> 'active_key_version'
  )) || (p_command -> p_retained_field);
  v_coverage := p_command -> 'keyring_coverage';

  WITH supplied AS (
    SELECT x.fingerprint, x.key_version, source.item
    FROM jsonb_array_elements(v_aliases) AS source(item)
    CROSS JOIN LATERAL jsonb_to_record(source.item) AS x(fingerprint text, key_version text)
  ), required AS (
    SELECT value AS key_version
    FROM jsonb_array_elements_text(v_coverage -> 'required_key_versions') AS r(value)
  )
  SELECT
    count(*) BETWEEN 1 AND 9
    AND count(*) = count(DISTINCT supplied.key_version)
    AND bool_and(calapres_cs._exact_json_keys(supplied.item, ARRAY['fingerprint', 'key_version']))
    AND bool_and(jsonb_typeof(supplied.item -> 'fingerprint') = 'string')
    AND bool_and(jsonb_typeof(supplied.item -> 'key_version') = 'string')
    AND bool_and(supplied.fingerprint ~ '^[a-f0-9]{64}$')
    AND bool_and(supplied.key_version ~ '^hmac-sha256-v[1-9][0-9]*$')
    AND (SELECT count(*) = count(DISTINCT required.key_version) FROM required)
    AND NOT EXISTS (
      (SELECT supplied.key_version FROM supplied)
      EXCEPT
      (SELECT required.key_version FROM required)
    )
    AND NOT EXISTS (
      (SELECT required.key_version FROM required)
      EXCEPT
      (SELECT supplied.key_version FROM supplied)
    )
  INTO v_valid
  FROM supplied;

  RETURN COALESCE(v_valid, false)
    AND (v_coverage ->> 'verified_at')::timestamptz <= p_now
    AND (v_coverage ->> 'valid_until')::timestamptz >= p_required_through;
END;
$function$;



CREATE OR REPLACE FUNCTION calapres_cs._decision_option_valid(p_option jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_action text;
  v_proposal text;
  v_base text;
  v_target text;
  v_supersedes text;
BEGIN
  IF NOT calapres_cs._exact_json_keys(p_option, ARRAY[
    'action', 'command_digest', 'case_reply_sha256', 'knowledge_proposal_sha256',
    'base_knowledge_version', 'knowledge_version_to_publish',
    'supersedes_knowledge_version'
  ]) THEN
    RETURN false;
  END IF;
  v_action := p_option ->> 'action';
  v_proposal := p_option ->> 'knowledge_proposal_sha256';
  v_base := p_option ->> 'base_knowledge_version';
  v_target := p_option ->> 'knowledge_version_to_publish';
  v_supersedes := p_option ->> 'supersedes_knowledge_version';
  IF NOT calapres_cs._json_text_matches(
      p_option, 'action', '^(reply_only|approve|approve_until|correct)$'
    )
    OR NOT calapres_cs._json_text_matches(p_option, 'command_digest', '^[a-f0-9]{64}$')
    OR NOT calapres_cs._json_text_matches(p_option, 'case_reply_sha256', '^[a-f0-9]{64}$')
    OR (v_proposal IS NOT NULL AND jsonb_typeof(p_option -> 'knowledge_proposal_sha256') <> 'string')
    OR (v_base IS NOT NULL AND jsonb_typeof(p_option -> 'base_knowledge_version') <> 'string')
    OR (v_target IS NOT NULL AND jsonb_typeof(p_option -> 'knowledge_version_to_publish') <> 'string')
    OR (v_supersedes IS NOT NULL AND jsonb_typeof(p_option -> 'supersedes_knowledge_version') <> 'string')
    OR v_action NOT IN ('reply_only', 'approve', 'approve_until', 'correct')
    OR (p_option ->> 'command_digest') !~ '^[a-f0-9]{64}$'
    OR (p_option ->> 'case_reply_sha256') !~ '^[a-f0-9]{64}$'
    OR (v_proposal IS NOT NULL AND v_proposal !~ '^[a-f0-9]{64}$')
    OR (v_base IS NOT NULL AND v_base !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$')
    OR (v_target IS NOT NULL AND v_target !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$')
    OR (v_supersedes IS NOT NULL AND v_supersedes !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-v[1-9][0-9]*$')
  THEN
    RETURN false;
  END IF;
  RETURN COALESCE((
    (v_action = 'reply_only' AND v_proposal IS NULL AND v_base IS NULL
      AND v_target IS NULL AND v_supersedes IS NULL)
    OR
    (v_action IN ('approve', 'approve_until') AND v_proposal IS NOT NULL
      AND v_base IS NOT NULL AND v_target IS NOT NULL AND v_supersedes IS NULL)
    OR
    (v_action = 'correct' AND v_proposal IS NOT NULL
      AND v_base IS NOT NULL AND v_target IS NOT NULL AND v_supersedes IS NOT NULL)
  ), false);
END;
$function$;

CREATE OR REPLACE FUNCTION calapres_cs._atomic_dispatch(
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
  v_longest_expiry timestamptz;
  v_retention timestamptz;
  v_aliases jsonb;
  v_decision jsonb;
  v_required_versions text[];
  v_active_versions text[];
  v_claim_ids text[];
  v_claim_id text;
  v_count integer;
  v_generation integer;
  v_revision integer;
  v_recovered boolean;
  v_row record;
  v_job calapres_cs.conversation_jobs%ROWTYPE;
  v_event calapres_cs.business_events%ROWTYPE;
  v_incident calapres_cs.incidents%ROWTYPE;
  v_nonce calapres_cs.owner_nonces%ROWTYPE;
  v_approval calapres_cs.owner_approvals%ROWTYPE;
  v_option calapres_cs.owner_decision_options%ROWTYPE;
BEGIN
  v_now := clock_timestamp();
  IF jsonb_typeof(p_command) <> 'object' THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  END IF;
  v_brand := p_command ->> 'brand_id';
  IF v_brand <> 'calapres' OR NOT calapres_cs._json_text_matches(
    p_command, 'brand_id', '^[a-z][a-z0-9_-]{1,63}$'
  ) THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  END IF;

  IF p_operation = 'claim_request_replay' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'claim_id', 'active_fingerprint', 'active_key_version',
      'retained_fingerprints', 'keyring_coverage', 'expires_at'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'claim_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._iso_timestamp_valid(p_command -> 'expires_at')
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_expires := (p_command ->> 'expires_at')::timestamptz;
    IF v_expires <= v_now OR NOT calapres_cs._fingerprint_bundle_valid(
      p_command, 'active_fingerprint', 'retained_fingerprints', v_now, v_expires
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_aliases := jsonb_build_array(jsonb_build_object(
      'fingerprint', p_command ->> 'active_fingerprint',
      'key_version', p_command ->> 'active_key_version'
    )) || (p_command -> 'retained_fingerprints');
    SELECT array_agg(value ORDER BY value)
    INTO v_required_versions
    FROM jsonb_array_elements_text(
      p_command #> '{keyring_coverage,required_key_versions}'
    ) AS required(value);
    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_brand || ':request_replay', 0)
    );
    SELECT array_agg(DISTINCT a.key_version ORDER BY a.key_version), max(c.expires_at)
    INTO v_active_versions, v_longest_expiry
    FROM calapres_cs.request_replay_claims c
    JOIN calapres_cs.request_replay_aliases a
      ON a.brand_id = c.brand_id AND a.claim_id = c.claim_id
    WHERE c.brand_id = v_brand AND c.expires_at > v_now;
    IF EXISTS (
      SELECT 1 FROM unnest(COALESCE(v_active_versions, ARRAY[]::text[])) AS active(version)
      WHERE NOT (active.version = ANY(v_required_versions))
    ) OR (v_longest_expiry IS NOT NULL
      AND (p_command #>> '{keyring_coverage,valid_until}')::timestamptz < v_longest_expiry)
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'key_coverage_incomplete', NULL, 'key_coverage_incomplete'
      );
    END IF;
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    SELECT array_agg(DISTINCT a.claim_id ORDER BY a.claim_id)
    INTO v_claim_ids
    FROM calapres_cs.request_replay_aliases a
    JOIN supplied s
      ON s.fingerprint = a.fingerprint AND s.key_version = a.key_version
    JOIN calapres_cs.request_replay_claims c
      ON c.brand_id = a.brand_id AND c.claim_id = a.claim_id
    WHERE a.brand_id = v_brand AND c.expires_at > v_now;
    IF cardinality(v_claim_ids) > 1 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
      );
    END IF;
    v_retention := v_expires + interval '90 days';
    IF cardinality(v_claim_ids) = 1 THEN
      v_claim_id := v_claim_ids[1];
      SELECT c.claimed_at, c.expires_at
      INTO v_row
      FROM calapres_cs.request_replay_claims c
      WHERE c.brand_id = v_brand AND c.claim_id = v_claim_id
      FOR UPDATE;
    ELSE
      v_claim_id := p_command ->> 'claim_id';
      INSERT INTO calapres_cs.request_replay_claims (
        brand_id, claim_id, lifecycle_status, claimed_at, expires_at, retention_until
      ) VALUES (v_brand, v_claim_id, 'completed', v_now, v_expires, v_retention)
      ON CONFLICT (brand_id, claim_id) DO NOTHING;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count <> 1 THEN
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
    FROM calapres_cs.request_replay_aliases a
    JOIN supplied s
      ON s.fingerprint = a.fingerprint AND s.key_version = a.key_version
    JOIN calapres_cs.request_replay_claims c
      ON c.brand_id = a.brand_id AND c.claim_id = a.claim_id
    WHERE a.brand_id = v_brand AND a.claim_id <> v_claim_id AND c.expires_at > v_now;
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
    SELECT v_brand, s.key_version, s.fingerprint, v_claim_id, v_retention
    FROM supplied s
    ON CONFLICT (brand_id, key_version, fingerprint) DO UPDATE
      SET claim_id = EXCLUDED.claim_id,
          retention_until = GREATEST(
            calapres_cs.request_replay_aliases.retention_until,
            EXCLUDED.retention_until
          ),
          updated_at = v_now;
    IF cardinality(v_claim_ids) = 1 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation,
        'duplicate_or_conflict',
        'duplicate',
        jsonb_build_object(
          'claim_id', v_claim_id,
          'claimed_at', calapres_cs._rfc3339_utc(v_row.claimed_at),
          'expires_at', calapres_cs._rfc3339_utc(v_row.expires_at)
        ),
        NULL
      );
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation,
      'committed',
      'claimed',
      jsonb_build_object(
        'claim_id', v_claim_id,
        'claimed_at', calapres_cs._rfc3339_utc(v_now),
        'expires_at', p_command ->> 'expires_at'
      ),
      NULL
    );

  ELSIF p_operation = 'claim_business_event' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'claim_id', 'active_fingerprint', 'active_key_version',
      'retained_fingerprints', 'keyring_coverage', 'expires_at',
      'lease_owner_id', 'lease_duration_seconds'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'claim_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'lease_owner_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._iso_timestamp_valid(p_command -> 'expires_at')
      OR jsonb_typeof(p_command -> 'lease_duration_seconds') <> 'number'
      OR (p_command ->> 'lease_duration_seconds') !~ '^[1-9][0-9]{0,2}$'
      OR (p_command ->> 'lease_duration_seconds')::integer NOT BETWEEN 1 AND 900
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_expires := (p_command ->> 'expires_at')::timestamptz;
    v_lease_expires := v_now + make_interval(
      secs => (p_command ->> 'lease_duration_seconds')::integer
    );
    IF v_expires <= v_now
      OR v_lease_expires > v_expires
      OR NOT calapres_cs._fingerprint_bundle_valid(
        p_command, 'active_fingerprint', 'retained_fingerprints', v_now, v_expires
      )
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_aliases := jsonb_build_array(jsonb_build_object(
      'fingerprint', p_command ->> 'active_fingerprint',
      'key_version', p_command ->> 'active_key_version'
    )) || (p_command -> 'retained_fingerprints');
    SELECT array_agg(value ORDER BY value)
    INTO v_required_versions
    FROM jsonb_array_elements_text(
      p_command #> '{keyring_coverage,required_key_versions}'
    ) AS required(value);
    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_brand || ':business_event', 0)
    );
    SELECT array_agg(DISTINCT a.key_version ORDER BY a.key_version), max(c.expires_at)
    INTO v_active_versions, v_longest_expiry
    FROM calapres_cs.business_events c
    JOIN calapres_cs.business_event_aliases a
      ON a.brand_id = c.brand_id AND a.claim_id = c.claim_id
    WHERE c.brand_id = v_brand AND c.expires_at > v_now;
    IF EXISTS (
      SELECT 1 FROM unnest(COALESCE(v_active_versions, ARRAY[]::text[])) AS active(version)
      WHERE NOT (active.version = ANY(v_required_versions))
    ) OR (v_longest_expiry IS NOT NULL
      AND (p_command #>> '{keyring_coverage,valid_until}')::timestamptz < v_longest_expiry)
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'key_coverage_incomplete', NULL, 'key_coverage_incomplete'
      );
    END IF;
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    SELECT array_agg(DISTINCT a.claim_id ORDER BY a.claim_id)
    INTO v_claim_ids
    FROM calapres_cs.business_event_aliases a
    JOIN supplied s
      ON s.fingerprint = a.fingerprint AND s.key_version = a.key_version
    JOIN calapres_cs.business_events c
      ON c.brand_id = a.brand_id AND c.claim_id = a.claim_id
    WHERE a.brand_id = v_brand AND c.expires_at > v_now;
    IF cardinality(v_claim_ids) > 1 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
      );
    END IF;
    v_retention := v_expires + interval '90 days';
    IF cardinality(v_claim_ids) = 1 THEN
      v_claim_id := v_claim_ids[1];
      SELECT * INTO v_event
      FROM calapres_cs.business_events
      WHERE brand_id = v_brand AND claim_id = v_claim_id
      FOR UPDATE;
    ELSE
      v_claim_id := p_command ->> 'claim_id';
      INSERT INTO calapres_cs.business_events (
        brand_id, claim_id, lifecycle_status, claimed_at, expires_at,
        lease_owner_id, lease_expires_at, attempt_count, retention_until
      ) VALUES (
        v_brand, v_claim_id, 'prepared', v_now, v_expires,
        p_command ->> 'lease_owner_id',
        v_lease_expires,
        1,
        v_retention
      )
      ON CONFLICT (brand_id, claim_id) DO NOTHING;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      IF v_count <> 1 THEN
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
    FROM calapres_cs.business_event_aliases a
    JOIN supplied s
      ON s.fingerprint = a.fingerprint AND s.key_version = a.key_version
    JOIN calapres_cs.business_events c
      ON c.brand_id = a.brand_id AND c.claim_id = a.claim_id
    WHERE a.brand_id = v_brand AND a.claim_id <> v_claim_id AND c.expires_at > v_now;
    IF v_count > 0 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
      );
    END IF;
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    INSERT INTO calapres_cs.business_event_aliases (
      brand_id, key_version, fingerprint, claim_id, retention_until
    )
    SELECT v_brand, s.key_version, s.fingerprint, v_claim_id, v_retention
    FROM supplied s
    ON CONFLICT (brand_id, key_version, fingerprint) DO UPDATE
      SET claim_id = EXCLUDED.claim_id,
          retention_until = GREATEST(
            calapres_cs.business_event_aliases.retention_until,
            EXCLUDED.retention_until
          ),
          updated_at = v_now;
    IF cardinality(v_claim_ids) IS NULL THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation,
        'committed',
        'prepared',
        jsonb_build_object(
          'claim_id', v_claim_id,
          'lease_owner_id', p_command ->> 'lease_owner_id',
          'lease_expires_at', calapres_cs._rfc3339_utc(v_lease_expires),
          'attempt_count', 1
        ),
        NULL
      );
    END IF;
    IF v_event.lifecycle_status = 'completed' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation,
        'duplicate_or_conflict',
        'duplicate_completed',
        jsonb_build_object(
          'claim_id', v_event.claim_id,
          'observation_id', v_event.observation_id,
          'audit_id', v_event.audit_id
        ),
        NULL
      );
    END IF;
    IF v_event.lease_owner_id = p_command ->> 'lease_owner_id'
      AND v_event.lease_expires_at > v_now
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation,
        'committed',
        'prepared_owned',
        jsonb_build_object(
          'claim_id', v_event.claim_id,
          'lease_owner_id', v_event.lease_owner_id,
          'lease_expires_at', calapres_cs._rfc3339_utc(v_event.lease_expires_at),
          'attempt_count', v_event.attempt_count
        ),
        NULL
      );
    END IF;
    IF v_event.lease_expires_at <= v_now THEN
      IF v_lease_expires > v_event.expires_at THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'lease_exceeds_claim_lifetime', NULL, NULL
        );
      END IF;
      UPDATE calapres_cs.business_events
      SET lease_owner_id = p_command ->> 'lease_owner_id',
          lease_expires_at = v_lease_expires,
          attempt_count = attempt_count + 1,
          updated_at = v_now
      WHERE brand_id = v_brand AND claim_id = v_claim_id
        AND lifecycle_status = 'prepared'
        AND lease_expires_at <= v_now
      RETURNING * INTO v_event;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation,
        'committed',
        'recovered_prepared',
        jsonb_build_object(
          'claim_id', v_event.claim_id,
          'lease_owner_id', v_event.lease_owner_id,
          'lease_expires_at', calapres_cs._rfc3339_utc(v_event.lease_expires_at),
          'attempt_count', v_event.attempt_count
        ),
        NULL
      );
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation,
      'duplicate_or_conflict',
      'duplicate_prepared_lease_held',
      jsonb_build_object(
        'claim_id', v_event.claim_id,
        'lease_expires_at', calapres_cs._rfc3339_utc(v_event.lease_expires_at)
      ),
      NULL
    );

  ELSIF p_operation = 'complete_business_event' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'claim_id', 'active_fingerprint', 'active_key_version',
      'retained_fingerprints', 'keyring_coverage', 'lease_owner_id',
      'observation_id', 'observation_digest', 'audit_id', 'outcome_class',
      'reason_code', 'risk_level', 'risk_digest', 'incident_id'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'claim_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'lease_owner_id', '^[A-Za-z0-9:_-]{4,160}$'
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
        p_command,
        'outcome_class',
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
      OR (((p_command ->> 'outcome_class') = 'owner_escalation') <>
        (p_command ->> 'incident_id' IS NOT NULL))
      OR NOT (
        jsonb_typeof(p_command -> 'incident_id') = 'null'
        OR calapres_cs._json_text_matches(
          p_command, 'incident_id', '^inc_[A-Za-z0-9_-]{8,80}$'
        )
      )
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    IF NOT calapres_cs._fingerprint_bundle_valid(
      p_command, 'active_fingerprint', 'retained_fingerprints', v_now, v_now
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_aliases := jsonb_build_array(jsonb_build_object(
      'fingerprint', p_command ->> 'active_fingerprint',
      'key_version', p_command ->> 'active_key_version'
    )) || (p_command -> 'retained_fingerprints');
    SELECT array_agg(value ORDER BY value)
    INTO v_required_versions
    FROM jsonb_array_elements_text(
      p_command #> '{keyring_coverage,required_key_versions}'
    ) AS required(value);
    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_brand || ':business_event', 0)
    );
    SELECT array_agg(DISTINCT a.key_version ORDER BY a.key_version), max(c.expires_at)
    INTO v_active_versions, v_longest_expiry
    FROM calapres_cs.business_events c
    JOIN calapres_cs.business_event_aliases a
      ON a.brand_id = c.brand_id AND a.claim_id = c.claim_id
    WHERE c.brand_id = v_brand AND c.expires_at > v_now;
    IF EXISTS (
      SELECT 1 FROM unnest(COALESCE(v_active_versions, ARRAY[]::text[])) AS active(version)
      WHERE NOT (active.version = ANY(v_required_versions))
    ) OR (v_longest_expiry IS NOT NULL
      AND (p_command #>> '{keyring_coverage,valid_until}')::timestamptz < v_longest_expiry)
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'key_coverage_incomplete', NULL, 'key_coverage_incomplete'
      );
    END IF;
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    SELECT array_agg(DISTINCT a.claim_id ORDER BY a.claim_id)
    INTO v_claim_ids
    FROM calapres_cs.business_event_aliases a
    JOIN supplied s
      ON s.fingerprint = a.fingerprint AND s.key_version = a.key_version
    JOIN calapres_cs.business_events c
      ON c.brand_id = a.brand_id AND c.claim_id = a.claim_id
    WHERE a.brand_id = v_brand AND c.expires_at > v_now;
    IF cardinality(v_claim_ids) > 1 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
      );
    ELSIF cardinality(v_claim_ids) IS NULL THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'claim_not_found', NULL, NULL
      );
    END IF;
    v_claim_id := v_claim_ids[1];
    SELECT * INTO v_event
    FROM calapres_cs.business_events
    WHERE brand_id = v_brand AND claim_id = v_claim_id
    FOR UPDATE;
    IF v_event.claim_id <> p_command ->> 'claim_id' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'claim_id_mismatch', NULL, NULL
      );
    END IF;
    IF v_event.lifecycle_status = 'completed' THEN
      SELECT * INTO v_row
      FROM calapres_cs.observation_outcomes
      WHERE brand_id = v_brand AND claim_id = v_claim_id
      FOR UPDATE;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'uncertain', NULL, 'durable_reference_conflict'
        );
      END IF;
      IF v_event.observation_id = p_command ->> 'observation_id'
        AND v_event.observation_digest = p_command ->> 'observation_digest'
        AND v_event.audit_id = p_command ->> 'audit_id'
        AND v_row.outcome_class = p_command ->> 'outcome_class'
        AND v_row.reason_code = p_command ->> 'reason_code'
        AND v_row.risk_level = p_command ->> 'risk_level'
        AND v_row.risk_digest IS NOT DISTINCT FROM p_command ->> 'risk_digest'
        AND v_row.incident_id IS NOT DISTINCT FROM p_command ->> 'incident_id'
      THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation,
          'duplicate_or_conflict',
          'duplicate_completed',
          jsonb_build_object(
            'claim_id', v_event.claim_id,
            'observation_id', v_event.observation_id,
            'audit_id', v_event.audit_id
          ),
          NULL
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'completion_digest_conflict', NULL, NULL
      );
    END IF;
    IF v_event.lease_owner_id <> p_command ->> 'lease_owner_id'
      OR v_now >= v_event.lease_expires_at
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'lease_not_owned', NULL, NULL
      );
    END IF;
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    SELECT count(*) INTO v_count
    FROM calapres_cs.business_event_aliases a
    JOIN supplied s
      ON s.fingerprint = a.fingerprint AND s.key_version = a.key_version
    JOIN calapres_cs.business_events c
      ON c.brand_id = a.brand_id AND c.claim_id = a.claim_id
    WHERE a.brand_id = v_brand AND a.claim_id <> v_claim_id AND c.expires_at > v_now;
    IF v_count > 0 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
      );
    END IF;
    v_retention := v_event.expires_at + interval '90 days';
    WITH supplied AS (
      SELECT x.fingerprint, x.key_version
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
    )
    INSERT INTO calapres_cs.business_event_aliases (
      brand_id, key_version, fingerprint, claim_id, retention_until
    )
    SELECT v_brand, s.key_version, s.fingerprint, v_claim_id, v_retention
    FROM supplied s
    ON CONFLICT (brand_id, key_version, fingerprint) DO UPDATE
      SET claim_id = EXCLUDED.claim_id,
          retention_until = GREATEST(
            calapres_cs.business_event_aliases.retention_until,
            EXCLUDED.retention_until
          ),
          updated_at = v_now;
    IF EXISTS (
      SELECT 1 FROM calapres_cs.observation_outcomes
      WHERE brand_id = v_brand AND observation_id = p_command ->> 'observation_id'
    ) OR EXISTS (
      SELECT 1 FROM calapres_cs.audit_events
      WHERE brand_id = v_brand AND audit_id = p_command ->> 'audit_id'
    ) OR (
      p_command ->> 'incident_id' IS NOT NULL AND EXISTS (
        SELECT 1 FROM calapres_cs.incidents
        WHERE brand_id = v_brand AND incident_id = p_command ->> 'incident_id'
      )
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'durable_reference_conflict', NULL, 'durable_reference_conflict'
      );
    END IF;
    UPDATE calapres_cs.business_events
    SET lifecycle_status = 'completed',
        observation_id = p_command ->> 'observation_id',
        observation_digest = p_command ->> 'observation_digest',
        audit_id = p_command ->> 'audit_id',
        completed_at = v_now,
        updated_at = v_now
    WHERE brand_id = v_brand AND claim_id = v_claim_id
      AND lifecycle_status = 'prepared'
      AND lease_owner_id = p_command ->> 'lease_owner_id'
      AND lease_expires_at > v_now;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
      );
    END IF;
    INSERT INTO calapres_cs.observation_outcomes (
      brand_id, observation_id, claim_id, observation_digest, audit_id,
      outcome_class, reason_code, risk_level, risk_digest, incident_id,
      completed_at, retention_until
    ) VALUES (
      v_brand,
      p_command ->> 'observation_id',
      v_claim_id,
      p_command ->> 'observation_digest',
      p_command ->> 'audit_id',
      p_command ->> 'outcome_class',
      p_command ->> 'reason_code',
      p_command ->> 'risk_level',
      p_command ->> 'risk_digest',
      p_command ->> 'incident_id',
      v_now,
      v_retention
    );
    IF p_command ->> 'incident_id' IS NOT NULL THEN
      INSERT INTO calapres_cs.incidents (
        brand_id, incident_id, revision, status,
        source_observation_id, source_observation_digest, retention_until
      ) VALUES (
        v_brand,
        p_command ->> 'incident_id',
        1,
        'awaiting_owner_preparation',
        p_command ->> 'observation_id',
        p_command ->> 'observation_digest',
        v_retention
      );
    END IF;
    INSERT INTO calapres_cs.audit_events (
      brand_id, audit_id, event_type, claim_id, observation_id,
      observation_digest, incident_id, outcome_class, reason_code,
      risk_level, risk_digest, created_at, retention_until
    ) VALUES (
      v_brand,
      p_command ->> 'audit_id',
      'business_event_completed',
      v_claim_id,
      p_command ->> 'observation_id',
      p_command ->> 'observation_digest',
      p_command ->> 'incident_id',
      p_command ->> 'outcome_class',
      p_command ->> 'reason_code',
      p_command ->> 'risk_level',
      p_command ->> 'risk_digest',
      v_now,
      v_retention
    );
    RETURN calapres_cs._atomic_envelope(
      p_operation,
      'committed',
      'completed',
      jsonb_build_object(
        'claim_id', v_claim_id,
        'observation_id', p_command ->> 'observation_id',
        'audit_id', p_command ->> 'audit_id',
        'incident_id', p_command -> 'incident_id',
        'outcome_class', p_command ->> 'outcome_class',
        'completed_at', calapres_cs._rfc3339_utc(v_now)
      ),
      NULL
    );

  ELSIF p_operation = 'advance_conversation_generation' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'conversation_id', 'active_message_fingerprint',
      'active_key_version', 'retained_message_fingerprints', 'keyring_coverage',
      'due_at'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'conversation_id', '^[1-9][0-9]{0,30}$'
      )
      OR NOT calapres_cs._iso_timestamp_valid(p_command -> 'due_at')
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_expires := (p_command ->> 'due_at')::timestamptz;
    IF v_expires < v_now THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_aliases := jsonb_build_array(jsonb_build_object(
      'fingerprint', p_command ->> 'active_message_fingerprint',
      'key_version', p_command ->> 'active_key_version'
    )) || (p_command -> 'retained_message_fingerprints');
    SELECT array_agg(value ORDER BY value)
    INTO v_required_versions
    FROM jsonb_array_elements_text(
      p_command #> '{keyring_coverage,required_key_versions}'
    ) AS required(value);
    PERFORM pg_advisory_xact_lock(hashtextextended(
      v_brand || ':conversation:' || (p_command ->> 'conversation_id'),
      0
    ));
    SELECT * INTO v_job
    FROM calapres_cs.conversation_jobs
    WHERE brand_id = v_brand AND conversation_id = p_command ->> 'conversation_id'
    FOR UPDATE;
    IF FOUND THEN v_count := 1; ELSE v_count := 0; END IF;
    v_retention := v_expires + interval '90 days';
    IF v_count = 1 THEN
      v_retention := GREATEST(v_retention, v_job.retention_until);
    END IF;
    SELECT GREATEST(v_retention, COALESCE(max(a.retention_until), v_retention))
    INTO v_retention
    FROM calapres_cs.conversation_message_aliases a
    WHERE a.brand_id = v_brand
      AND a.conversation_id = p_command ->> 'conversation_id';
    IF NOT calapres_cs._fingerprint_bundle_valid(
      p_command,
      'active_message_fingerprint',
      'retained_message_fingerprints',
      v_now,
      v_retention
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'key_coverage_incomplete', NULL, 'key_coverage_incomplete'
      );
    END IF;
    IF EXISTS (
      SELECT 1
      FROM calapres_cs.conversation_message_aliases a
      WHERE a.brand_id = v_brand
        AND a.conversation_id = p_command ->> 'conversation_id'
        AND NOT (a.key_version = ANY(v_required_versions))
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'key_coverage_incomplete', NULL, 'key_coverage_incomplete'
      );
    END IF;
    IF v_count = 1 AND EXISTS (
      SELECT 1
      FROM calapres_cs.conversation_message_aliases a
      JOIN jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
        ON x.fingerprint = a.fingerprint AND x.key_version = a.key_version
      WHERE a.brand_id = v_brand
        AND a.conversation_id = p_command ->> 'conversation_id'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM calapres_cs.conversation_message_aliases a
        JOIN jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
          ON x.key_version = a.key_version AND x.fingerprint <> a.fingerprint
        WHERE a.brand_id = v_brand
          AND a.conversation_id = p_command ->> 'conversation_id'
      ) THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'alias_conflict', NULL, 'key_alias_conflict'
        );
      END IF;
      INSERT INTO calapres_cs.conversation_message_aliases (
        brand_id, conversation_id, generation, key_version, fingerprint, retention_until
      )
      SELECT
        v_brand,
        p_command ->> 'conversation_id',
        v_job.generation,
        x.key_version,
        x.fingerprint,
        v_retention
      FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text)
      ON CONFLICT (brand_id, conversation_id, key_version, fingerprint) DO UPDATE
        SET retention_until = GREATEST(
          calapres_cs.conversation_message_aliases.retention_until,
          EXCLUDED.retention_until
        );
      UPDATE calapres_cs.conversation_jobs
      SET retention_until = GREATEST(retention_until, v_retention),
          updated_at = v_now
      WHERE brand_id = v_brand
        AND conversation_id = p_command ->> 'conversation_id'
        AND generation = v_job.generation;
      RETURN calapres_cs._atomic_envelope(
        p_operation,
        'duplicate_or_conflict',
        'duplicate_message_generation',
        jsonb_build_object(
          'conversation_id', v_job.conversation_id,
          'generation', v_job.generation,
          'state', v_job.state
        ),
        NULL
      );
    END IF;
    IF v_count = 0 THEN
      INSERT INTO calapres_cs.conversation_jobs (
        brand_id, conversation_id, generation, state, due_at,
        attempt_count, next_attempt_at, retention_until
      ) VALUES (
        v_brand,
        p_command ->> 'conversation_id',
        1,
        'pending',
        v_expires,
        0,
        v_expires,
        v_retention
      )
      RETURNING * INTO v_job;
    ELSE
      UPDATE calapres_cs.conversation_jobs
      SET generation = generation + 1,
          state = 'pending',
          due_at = v_expires,
          attempt_count = 0,
          next_attempt_at = v_expires,
          last_safe_error_code = NULL,
          retry_idempotency_key = NULL,
          max_attempts = NULL,
          retry_worker_id = NULL,
          retry_lease_token = NULL,
          retry_lease_expires_at = NULL,
          last_transition_idempotency_key = NULL,
          retention_until = v_retention,
          updated_at = v_now
      WHERE brand_id = v_brand
        AND conversation_id = p_command ->> 'conversation_id'
        AND generation = v_job.generation
      RETURNING * INTO v_job;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
        );
      END IF;
    END IF;
    DELETE FROM calapres_cs.conversation_message_aliases
    WHERE brand_id = v_brand AND conversation_id = p_command ->> 'conversation_id';
    INSERT INTO calapres_cs.conversation_message_aliases (
      brand_id, conversation_id, generation, key_version, fingerprint, retention_until
    )
    SELECT
      v_brand,
      p_command ->> 'conversation_id',
      v_job.generation,
      x.key_version,
      x.fingerprint,
      v_retention
    FROM jsonb_to_recordset(v_aliases) AS x(fingerprint text, key_version text);
    RETURN calapres_cs._atomic_envelope(
      p_operation,
      'committed',
      'generation_advanced',
      jsonb_build_object(
        'conversation_id', v_job.conversation_id,
        'generation', v_job.generation,
        'due_at', p_command ->> 'due_at',
        'state', v_job.state
      ),
      NULL
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
    SELECT * INTO v_job
    FROM calapres_cs.conversation_jobs
    WHERE brand_id = v_brand AND conversation_id = p_command ->> 'conversation_id';
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation,
        'duplicate_or_conflict',
        'generation_absent',
        jsonb_build_object(
          'conversation_id', p_command ->> 'conversation_id',
          'expected_generation', (p_command ->> 'expected_generation')::integer,
          'generation', NULL,
          'current', false
        ),
        NULL
      );
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation,
      'committed',
      'generation_read',
      jsonb_build_object(
        'conversation_id', v_job.conversation_id,
        'expected_generation', (p_command ->> 'expected_generation')::integer,
        'generation', v_job.generation,
        'current', v_job.generation = (p_command ->> 'expected_generation')::integer,
        'state', v_job.state
      ),
      NULL
    );

  ELSIF p_operation = 'schedule_conversation_retry' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'conversation_id', 'expected_generation', 'retry_idempotency_key',
      'max_attempts', 'safe_error_code', 'next_attempt_at',
      'expected_retry_worker_id', 'expected_retry_lease_token'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'conversation_id', '^[1-9][0-9]{0,30}$'
      )
      OR jsonb_typeof(p_command -> 'expected_generation') <> 'number'
      OR (p_command ->> 'expected_generation') !~ '^[1-9][0-9]{0,9}$'
      OR (p_command ->> 'expected_generation')::integer < 1
      OR NOT calapres_cs._json_text_matches(
        p_command, 'retry_idempotency_key', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR jsonb_typeof(p_command -> 'max_attempts') <> 'number'
      OR (p_command ->> 'max_attempts') !~ '^[1-9][0-9]?$'
      OR (p_command ->> 'max_attempts')::integer NOT BETWEEN 1 AND 10
      OR NOT calapres_cs._json_text_matches(
        p_command, 'safe_error_code', '^[a-z][a-z0-9_]{2,80}$'
      )
      OR NOT calapres_cs._iso_timestamp_valid(p_command -> 'next_attempt_at')
      OR NOT (
        (
          jsonb_typeof(p_command -> 'expected_retry_worker_id') = 'null'
          AND jsonb_typeof(p_command -> 'expected_retry_lease_token') = 'null'
        )
        OR (
          calapres_cs._json_text_matches(
            p_command, 'expected_retry_worker_id', '^[A-Za-z0-9:_-]{4,160}$'
          )
          AND calapres_cs._json_text_matches(
            p_command, 'expected_retry_lease_token', '^[A-Za-z0-9:_-]{4,160}$'
          )
        )
      )
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    IF (p_command ->> 'next_attempt_at')::timestamptz <= v_now THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(
      v_brand || ':conversation:' || (p_command ->> 'conversation_id'),
      0
    ));
    SELECT * INTO v_job
    FROM calapres_cs.conversation_jobs
    WHERE brand_id = v_brand AND conversation_id = p_command ->> 'conversation_id'
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'generation_absent', NULL, NULL
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
          'generation', v_job.generation,
          'attempt_count', v_job.attempt_count,
          'next_attempt_at', calapres_cs._rfc3339_utc(v_job.next_attempt_at)
        ), NULL
      );
    ELSIF v_job.state IN ('completed', 'cancelled', 'human_owned') THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'terminal_job_state',
        jsonb_build_object('state', v_job.state), NULL
      );
    ELSIF v_job.state = 'retry_running'
      AND p_command ->> 'expected_retry_worker_id' IS NULL
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_running_cas_required', NULL, NULL
      );
    ELSIF v_job.state = 'retry_running'
      AND (
        v_job.retry_worker_id <> p_command ->> 'expected_retry_worker_id'
        OR v_job.retry_lease_token <> p_command ->> 'expected_retry_lease_token'
      )
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_lease_cas_failed', NULL, NULL
      );
    ELSIF v_job.state = 'retry_running' AND v_job.retry_lease_expires_at <= v_now THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_lease_expired', NULL, NULL
      );
    ELSIF v_job.state <> 'retry_running'
      AND p_command ->> 'expected_retry_worker_id' IS NOT NULL
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_lease_cas_not_applicable', NULL, NULL
      );
    ELSIF v_job.state NOT IN ('pending', 'retry_scheduled', 'retry_running') THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_not_schedulable',
        jsonb_build_object('state', v_job.state), NULL
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
    UPDATE calapres_cs.conversation_jobs
    SET state = 'retry_scheduled',
        attempt_count = attempt_count + 1,
        next_attempt_at = (p_command ->> 'next_attempt_at')::timestamptz,
        last_safe_error_code = p_command ->> 'safe_error_code',
        retry_idempotency_key = p_command ->> 'retry_idempotency_key',
        max_attempts = (p_command ->> 'max_attempts')::integer,
        retry_worker_id = NULL,
        retry_lease_token = NULL,
        retry_lease_expires_at = NULL,
        updated_at = v_now
    WHERE brand_id = v_brand
      AND conversation_id = p_command ->> 'conversation_id'
      AND generation = (p_command ->> 'expected_generation')::integer
      AND (
        (
          state IN ('pending', 'retry_scheduled')
          AND p_command ->> 'expected_retry_worker_id' IS NULL
        )
        OR (
          state = 'retry_running'
          AND retry_worker_id = p_command ->> 'expected_retry_worker_id'
          AND retry_lease_token = p_command ->> 'expected_retry_lease_token'
          AND retry_lease_expires_at > v_now
        )
      )
      AND attempt_count < (p_command ->> 'max_attempts')::integer
    RETURNING * INTO v_job;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
      );
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed', 'retry_scheduled',
      jsonb_build_object(
        'generation', v_job.generation,
        'attempt_count', v_job.attempt_count,
        'next_attempt_at', calapres_cs._rfc3339_utc(v_job.next_attempt_at),
        'safe_error_code', v_job.last_safe_error_code
      ), NULL
    );

  ELSIF p_operation = 'claim_due_conversation_retry' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'conversation_id', 'expected_generation', 'retry_idempotency_key',
      'worker_id', 'lease_token', 'lease_duration_seconds'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'conversation_id', '^[1-9][0-9]{0,30}$'
      )
      OR jsonb_typeof(p_command -> 'expected_generation') <> 'number'
      OR (p_command ->> 'expected_generation') !~ '^[1-9][0-9]{0,9}$'
      OR (p_command ->> 'expected_generation')::integer < 1
      OR NOT calapres_cs._json_text_matches(
        p_command, 'retry_idempotency_key', '^[A-Za-z0-9:_-]{4,160}$'
      )
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
    PERFORM pg_advisory_xact_lock(hashtextextended(
      v_brand || ':conversation:' || (p_command ->> 'conversation_id'),
      0
    ));
    SELECT * INTO v_job
    FROM calapres_cs.conversation_jobs
    WHERE brand_id = v_brand AND conversation_id = p_command ->> 'conversation_id'
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'generation_absent', NULL, NULL
      );
    ELSIF v_job.generation <> (p_command ->> 'expected_generation')::integer THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'stale_generation',
        jsonb_build_object('generation', v_job.generation), NULL
      );
    ELSIF v_job.retry_idempotency_key <> p_command ->> 'retry_idempotency_key' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_key_mismatch', NULL, NULL
      );
    END IF;
    IF v_job.state = 'retry_running' THEN
      IF v_job.retry_worker_id = p_command ->> 'worker_id'
        AND v_job.retry_lease_token = p_command ->> 'lease_token'
        AND v_job.retry_lease_expires_at > v_now
      THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'committed', 'retry_lease_owned',
          jsonb_build_object(
            'generation', v_job.generation,
            'worker_id', v_job.retry_worker_id,
            'lease_token', v_job.retry_lease_token,
            'lease_expires_at', calapres_cs._rfc3339_utc(v_job.retry_lease_expires_at)
          ), NULL
        );
      ELSIF v_job.retry_lease_expires_at > v_now THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'retry_lease_held', NULL, NULL
        );
      END IF;
      v_recovered := true;
    ELSIF v_job.state <> 'retry_scheduled' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_not_scheduled',
        jsonb_build_object('state', v_job.state), NULL
      );
    ELSE
      v_recovered := false;
    END IF;
    IF v_job.next_attempt_at > v_now THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'retry_not_due', NULL, NULL
      );
    END IF;
    UPDATE calapres_cs.conversation_jobs
    SET state = 'retry_running',
        retry_worker_id = p_command ->> 'worker_id',
        retry_lease_token = p_command ->> 'lease_token',
        retry_lease_expires_at = v_lease_expires,
        updated_at = v_now
    WHERE brand_id = v_brand
      AND conversation_id = p_command ->> 'conversation_id'
      AND generation = (p_command ->> 'expected_generation')::integer
      AND retry_idempotency_key = p_command ->> 'retry_idempotency_key'
      AND next_attempt_at <= v_now
      AND (
        state = 'retry_scheduled'
        OR (state = 'retry_running' AND retry_lease_expires_at <= v_now)
      )
    RETURNING * INTO v_job;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
      );
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation,
      'committed',
      CASE WHEN v_recovered THEN 'retry_lease_recovered' ELSE 'retry_claimed' END,
      jsonb_build_object(
        'generation', v_job.generation,
        'worker_id', v_job.retry_worker_id,
        'lease_token', v_job.retry_lease_token,
        'lease_expires_at', calapres_cs._rfc3339_utc(v_job.retry_lease_expires_at)
      ), NULL
    );

  ELSIF p_operation = 'transition_conversation_job' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'conversation_id', 'expected_generation', 'from_state',
      'to_state', 'transition_idempotency_key'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'conversation_id', '^[1-9][0-9]{0,30}$'
      )
      OR jsonb_typeof(p_command -> 'expected_generation') <> 'number'
      OR (p_command ->> 'expected_generation') !~ '^[1-9][0-9]{0,9}$'
      OR (p_command ->> 'expected_generation')::integer < 1
      OR NOT calapres_cs._json_text_matches(
        p_command, 'transition_idempotency_key', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command,
        'from_state',
        '^(pending|retry_scheduled|retry_running|completed|cancelled|human_owned)$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command,
        'to_state',
        '^(pending|retry_scheduled|retry_running|completed|cancelled|human_owned)$'
      )
      OR p_command ->> 'from_state' = p_command ->> 'to_state'
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(
      v_brand || ':conversation:' || (p_command ->> 'conversation_id'),
      0
    ));
    SELECT * INTO v_job
    FROM calapres_cs.conversation_jobs
    WHERE brand_id = v_brand AND conversation_id = p_command ->> 'conversation_id'
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'generation_absent', NULL, NULL
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
    END IF;
    IF NOT (
      (v_job.state = 'pending' AND p_command ->> 'to_state' IN (
        'completed', 'cancelled', 'human_owned'
      ))
      OR (v_job.state = 'retry_scheduled' AND p_command ->> 'to_state' IN (
        'cancelled', 'human_owned'
      ))
      OR (v_job.state = 'retry_running' AND p_command ->> 'to_state' IN (
        'completed', 'cancelled', 'human_owned'
      ))
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'invalid_job_transition',
        jsonb_build_object('state', v_job.state), NULL
      );
    END IF;
    UPDATE calapres_cs.conversation_jobs
    SET state = p_command ->> 'to_state',
        retry_worker_id = NULL,
        retry_lease_token = NULL,
        retry_lease_expires_at = NULL,
        last_transition_idempotency_key = p_command ->> 'transition_idempotency_key',
        updated_at = v_now
    WHERE brand_id = v_brand
      AND conversation_id = p_command ->> 'conversation_id'
      AND generation = (p_command ->> 'expected_generation')::integer
      AND state = p_command ->> 'from_state'
      AND (
        last_transition_idempotency_key IS NULL
        OR last_transition_idempotency_key <> p_command ->> 'transition_idempotency_key'
      )
    RETURNING * INTO v_job;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
      );
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'committed', 'job_transitioned',
      jsonb_build_object('generation', v_job.generation, 'state', v_job.state), NULL
    );

  ELSIF p_operation = 'prepare_owner_review' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'preparation_id', 'incident_id', 'expected_incident_revision',
      'source_observation_id', 'source_observation_digest', 'review_snapshot_digest',
      'decision_options', 'nonce_fingerprint', 'nonce_key_version',
      'nonce_ttl_seconds'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'preparation_id', '^prep_[A-Za-z0-9_-]{8,80}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'incident_id', '^inc_[A-Za-z0-9_-]{8,80}$'
      )
      OR jsonb_typeof(p_command -> 'expected_incident_revision') <> 'number'
      OR (p_command ->> 'expected_incident_revision') !~ '^[1-9][0-9]{0,9}$'
      OR (p_command ->> 'expected_incident_revision')::integer < 1
      OR NOT calapres_cs._json_text_matches(
        p_command, 'source_observation_id', '^[A-Za-z0-9:_-]{4,160}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'source_observation_digest', '^[a-f0-9]{64}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'review_snapshot_digest', '^[a-f0-9]{64}$'
      )
      OR jsonb_typeof(p_command -> 'decision_options') <> 'array'
      OR jsonb_array_length(p_command -> 'decision_options') NOT BETWEEN 1 AND 8
      OR NOT calapres_cs._json_text_matches(
        p_command, 'nonce_fingerprint', '^[a-f0-9]{64}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'nonce_key_version', '^hmac-sha256-v[1-9][0-9]*$'
      )
      OR jsonb_typeof(p_command -> 'nonce_ttl_seconds') <> 'number'
      OR (p_command ->> 'nonce_ttl_seconds') !~ '^[1-9][0-9]{1,3}$'
      OR (p_command ->> 'nonce_ttl_seconds')::integer NOT BETWEEN 30 AND 1800
      OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_command -> 'decision_options') AS options(item)
        WHERE NOT calapres_cs._decision_option_valid(options.item)
      )
      OR (
        SELECT count(*) <> count(DISTINCT item ->> 'command_digest')
        FROM jsonb_array_elements(p_command -> 'decision_options') AS options(item)
      )
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_lease_expires := v_now + make_interval(
      secs => (p_command ->> 'nonce_ttl_seconds')::integer
    );
    PERFORM pg_advisory_xact_lock(hashtextextended(
      v_brand || ':owner_review:' || (p_command ->> 'incident_id'),
      0
    ));
    SELECT * INTO v_row
    FROM calapres_cs.owner_review_preparations
    WHERE brand_id = v_brand AND preparation_id = p_command ->> 'preparation_id'
    FOR UPDATE;
    IF FOUND THEN
      IF v_row.incident_id = p_command ->> 'incident_id'
        AND v_row.review_snapshot_digest = p_command ->> 'review_snapshot_digest'
        AND v_row.nonce_fingerprint = p_command ->> 'nonce_fingerprint'
      THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation,
          'duplicate_or_conflict',
          'duplicate_owner_review_preparation',
          jsonb_build_object(
            'preparation_id', v_row.preparation_id,
            'incident_revision', v_row.committed_incident_revision
          ),
          NULL
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'preparation_id_conflict', NULL, NULL
      );
    END IF;
    SELECT * INTO v_incident
    FROM calapres_cs.incidents
    WHERE brand_id = v_brand AND incident_id = p_command ->> 'incident_id'
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'incident_not_found', NULL, NULL
      );
    ELSIF v_incident.status NOT IN ('awaiting_owner_preparation', 'awaiting_owner') THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'incident_not_awaiting_preparation',
        jsonb_build_object('incident_revision', v_incident.revision), NULL
      );
    ELSIF v_incident.revision <> (p_command ->> 'expected_incident_revision')::integer THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'stale_incident_revision',
        jsonb_build_object('incident_revision', v_incident.revision), NULL
      );
    ELSIF v_incident.source_observation_id <> p_command ->> 'source_observation_id'
      OR v_incident.source_observation_digest <> p_command ->> 'source_observation_digest'
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'source_observation_mismatch', NULL, NULL
      );
    END IF;
    IF v_incident.status = 'awaiting_owner' THEN
      SELECT * INTO v_nonce
      FROM calapres_cs.owner_nonces
      WHERE brand_id = v_brand AND preparation_id = v_incident.preparation_id
      FOR UPDATE;
      IF NOT FOUND THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'unknown', 'uncertain', NULL, 'durable_reference_conflict'
        );
      ELSIF v_nonce.consumed_by IS NOT NULL THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'owner_review_already_decided', NULL, NULL
        );
      ELSIF v_nonce.expires_at > v_now THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation, 'duplicate_or_conflict', 'owner_review_window_active',
          jsonb_build_object(
            'nonce_expires_at', calapres_cs._rfc3339_utc(v_nonce.expires_at)
          ), NULL
        );
      END IF;
    END IF;
    IF EXISTS (
      SELECT 1 FROM calapres_cs.owner_nonces
      WHERE brand_id = v_brand
        AND key_version = p_command ->> 'nonce_key_version'
        AND nonce_fingerprint = p_command ->> 'nonce_fingerprint'
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'nonce_id_conflict', NULL, NULL
      );
    END IF;
    v_revision := v_incident.revision + 1;
    v_retention := v_lease_expires + interval '90 days';
    UPDATE calapres_cs.incidents
    SET revision = revision + 1,
        status = 'awaiting_owner',
        preparation_id = p_command ->> 'preparation_id',
        review_snapshot_digest = p_command ->> 'review_snapshot_digest',
        updated_at = v_now
    WHERE brand_id = v_brand
      AND incident_id = p_command ->> 'incident_id'
      AND revision = (p_command ->> 'expected_incident_revision')::integer
      AND status IN ('awaiting_owner_preparation', 'awaiting_owner')
    RETURNING revision INTO v_count;
    IF NOT FOUND OR v_count <> v_revision THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'concurrent_state_unknown'
      );
    END IF;
    INSERT INTO calapres_cs.owner_review_preparations (
      brand_id, preparation_id, incident_id, committed_incident_revision,
      source_observation_id, source_observation_digest, review_snapshot_digest,
      nonce_fingerprint, nonce_key_version, nonce_issued_at, nonce_expires_at,
      prepared_at, retention_until
    ) VALUES (
      v_brand,
      p_command ->> 'preparation_id',
      p_command ->> 'incident_id',
      v_revision,
      p_command ->> 'source_observation_id',
      p_command ->> 'source_observation_digest',
      p_command ->> 'review_snapshot_digest',
      p_command ->> 'nonce_fingerprint',
      p_command ->> 'nonce_key_version',
      v_now,
      v_lease_expires,
      v_now,
      v_retention
    );
    INSERT INTO calapres_cs.owner_decision_options (
      brand_id, incident_id, preparation_id, command_digest, action,
      case_reply_sha256, knowledge_proposal_sha256, base_knowledge_version,
      knowledge_version_to_publish, supersedes_knowledge_version, retention_until
    )
    SELECT
      v_brand,
      p_command ->> 'incident_id',
      p_command ->> 'preparation_id',
      option ->> 'command_digest',
      option ->> 'action',
      option ->> 'case_reply_sha256',
      option ->> 'knowledge_proposal_sha256',
      option ->> 'base_knowledge_version',
      option ->> 'knowledge_version_to_publish',
      option ->> 'supersedes_knowledge_version',
      v_retention
    FROM jsonb_array_elements(p_command -> 'decision_options') AS options(option);
    INSERT INTO calapres_cs.owner_nonces (
      brand_id, key_version, nonce_fingerprint, preparation_id,
      issued_at, expires_at, retention_until
    ) VALUES (
      v_brand,
      p_command ->> 'nonce_key_version',
      p_command ->> 'nonce_fingerprint',
      p_command ->> 'preparation_id',
      v_now,
      v_lease_expires,
      v_retention
    );
    RETURN calapres_cs._atomic_envelope(
      p_operation,
      'committed',
      'owner_review_prepared',
      jsonb_build_object(
        'preparation_id', p_command ->> 'preparation_id',
        'incident_id', p_command ->> 'incident_id',
        'incident_revision', v_revision,
        'option_count', jsonb_array_length(p_command -> 'decision_options'),
        'nonce_expires_at', calapres_cs._rfc3339_utc(v_lease_expires)
      ), NULL
    );

  ELSIF p_operation = 'compare_and_commit_owner_decision' THEN
    IF NOT calapres_cs._exact_json_keys(p_command, ARRAY[
      'brand_id', 'decision_id', 'approval_id', 'audit_id', 'incident_id',
      'expected_incident_revision', 'action', 'command_digest', 'case_reply_sha256',
      'knowledge_proposal_sha256', 'base_knowledge_version',
      'knowledge_version_to_publish', 'supersedes_knowledge_version',
      'nonce_fingerprint', 'nonce_key_version'
    ])
      OR NOT calapres_cs._json_text_matches(
        p_command, 'decision_id', '^dec_[A-Za-z0-9_-]{8,80}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'approval_id', '^dec_[A-Za-z0-9_-]{8,80}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'audit_id', '^aud_[A-Za-z0-9_-]{8,80}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'incident_id', '^inc_[A-Za-z0-9_-]{8,80}$'
      )
      OR jsonb_typeof(p_command -> 'expected_incident_revision') <> 'number'
      OR (p_command ->> 'expected_incident_revision') !~ '^[1-9][0-9]{0,9}$'
      OR (p_command ->> 'expected_incident_revision')::integer < 1
      OR NOT calapres_cs._json_text_matches(
        p_command, 'nonce_fingerprint', '^[a-f0-9]{64}$'
      )
      OR NOT calapres_cs._json_text_matches(
        p_command, 'nonce_key_version', '^hmac-sha256-v[1-9][0-9]*$'
      )
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    v_decision := p_command - ARRAY[
      'brand_id', 'decision_id', 'approval_id', 'audit_id', 'incident_id',
      'expected_incident_revision', 'nonce_fingerprint', 'nonce_key_version'
    ];
    IF NOT calapres_cs._decision_option_valid(v_decision) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
      );
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(
      v_brand || ':owner_review:' || (p_command ->> 'incident_id'),
      0
    ));
    IF p_command ->> 'decision_id' <> p_command ->> 'approval_id' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'approval_decision_id_mismatch', NULL, NULL
      );
    END IF;
    SELECT * INTO v_approval
    FROM calapres_cs.owner_approvals
    WHERE brand_id = v_brand AND approval_id = p_command ->> 'approval_id'
    FOR UPDATE;
    IF FOUND THEN
      IF v_approval.incident_id = p_command ->> 'incident_id'
        AND v_approval.action = p_command ->> 'action'
        AND v_approval.command_digest = p_command ->> 'command_digest'
        AND v_approval.case_reply_sha256 = p_command ->> 'case_reply_sha256'
        AND v_approval.knowledge_proposal_sha256 IS NOT DISTINCT FROM p_command ->> 'knowledge_proposal_sha256'
        AND v_approval.base_knowledge_version IS NOT DISTINCT FROM p_command ->> 'base_knowledge_version'
        AND v_approval.knowledge_version_to_publish IS NOT DISTINCT FROM p_command ->> 'knowledge_version_to_publish'
        AND v_approval.supersedes_knowledge_version IS NOT DISTINCT FROM p_command ->> 'supersedes_knowledge_version'
      THEN
        RETURN calapres_cs._atomic_envelope(
          p_operation,
          'duplicate_or_conflict',
          'duplicate_owner_decision',
          jsonb_build_object(
            'approval_id', v_approval.approval_id,
            'audit_id', v_approval.audit_id,
            'incident_revision', v_approval.committed_incident_revision
          ), NULL
        );
      END IF;
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'decision_id_conflict', NULL, NULL
      );
    END IF;
    SELECT * INTO v_incident
    FROM calapres_cs.incidents
    WHERE brand_id = v_brand AND incident_id = p_command ->> 'incident_id'
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'incident_not_found', NULL, NULL
      );
    ELSIF v_incident.status <> 'awaiting_owner' THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'incident_not_awaiting_owner',
        jsonb_build_object('incident_revision', v_incident.revision), NULL
      );
    ELSIF v_incident.revision <> (p_command ->> 'expected_incident_revision')::integer THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'stale_incident_revision',
        jsonb_build_object('incident_revision', v_incident.revision), NULL
      );
    END IF;
    SELECT * INTO v_option
    FROM calapres_cs.owner_decision_options
    WHERE brand_id = v_brand
      AND incident_id = p_command ->> 'incident_id'
      AND preparation_id = v_incident.preparation_id
      AND command_digest = p_command ->> 'command_digest'
    FOR UPDATE;
    IF NOT FOUND
      OR v_option.action <> p_command ->> 'action'
      OR v_option.case_reply_sha256 <> p_command ->> 'case_reply_sha256'
      OR v_option.knowledge_proposal_sha256 IS DISTINCT FROM p_command ->> 'knowledge_proposal_sha256'
      OR v_option.base_knowledge_version IS DISTINCT FROM p_command ->> 'base_knowledge_version'
      OR v_option.knowledge_version_to_publish IS DISTINCT FROM p_command ->> 'knowledge_version_to_publish'
      OR v_option.supersedes_knowledge_version IS DISTINCT FROM p_command ->> 'supersedes_knowledge_version'
    THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'owner_decision_digest_mismatch', NULL, NULL
      );
    END IF;
    SELECT * INTO v_nonce
    FROM calapres_cs.owner_nonces
    WHERE brand_id = v_brand
      AND key_version = p_command ->> 'nonce_key_version'
      AND nonce_fingerprint = p_command ->> 'nonce_fingerprint'
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'nonce_not_found', NULL, NULL
      );
    ELSIF v_nonce.preparation_id <> v_incident.preparation_id THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'nonce_window_mismatch', NULL, NULL
      );
    ELSIF v_now < v_nonce.issued_at THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'nonce_not_yet_issued', NULL, NULL
      );
    ELSIF v_now >= v_nonce.expires_at THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'nonce_expired', NULL, NULL
      );
    ELSIF v_nonce.consumed_by IS NOT NULL THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'nonce_already_consumed', NULL, NULL
      );
    END IF;
    IF EXISTS (
      SELECT 1 FROM calapres_cs.audit_events
      WHERE brand_id = v_brand AND audit_id = p_command ->> 'audit_id'
    ) THEN
      RETURN calapres_cs._atomic_envelope(
        p_operation, 'duplicate_or_conflict', 'audit_id_conflict', NULL, NULL
      );
    END IF;
    v_revision := v_incident.revision + 1;
    v_retention := v_nonce.expires_at + interval '90 days';
    INSERT INTO calapres_cs.owner_approvals (
      brand_id, approval_id, decision_id, incident_id, committed_incident_revision,
      audit_id, action, command_digest, case_reply_sha256,
      knowledge_proposal_sha256, base_knowledge_version,
      knowledge_version_to_publish, supersedes_knowledge_version,
      nonce_fingerprint, nonce_key_version, nonce_issued_at, nonce_expires_at,
      decided_at, retention_until
    ) VALUES (
      v_brand,
      p_command ->> 'approval_id',
      p_command ->> 'decision_id',
      p_command ->> 'incident_id',
      v_revision,
      p_command ->> 'audit_id',
      p_command ->> 'action',
      p_command ->> 'command_digest',
      p_command ->> 'case_reply_sha256',
      p_command ->> 'knowledge_proposal_sha256',
      p_command ->> 'base_knowledge_version',
      p_command ->> 'knowledge_version_to_publish',
      p_command ->> 'supersedes_knowledge_version',
      p_command ->> 'nonce_fingerprint',
      p_command ->> 'nonce_key_version',
      v_nonce.issued_at,
      v_nonce.expires_at,
      v_now,
      v_retention
    );
    INSERT INTO calapres_cs.audit_events (
      brand_id, audit_id, event_type, incident_id, approval_id,
      action, command_digest, created_at, retention_until
    ) VALUES (
      v_brand,
      p_command ->> 'audit_id',
      'owner_decision_committed',
      p_command ->> 'incident_id',
      p_command ->> 'approval_id',
      p_command ->> 'action',
      p_command ->> 'command_digest',
      v_now,
      v_retention
    );
    UPDATE calapres_cs.owner_nonces
    SET consumed_by = p_command ->> 'decision_id',
        consumed_digest = p_command ->> 'command_digest',
        consumed_at = v_now
    WHERE brand_id = v_brand
      AND key_version = p_command ->> 'nonce_key_version'
      AND nonce_fingerprint = p_command ->> 'nonce_fingerprint'
      AND preparation_id = v_incident.preparation_id
      AND consumed_by IS NULL
      AND issued_at <= v_now AND v_now < expires_at;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'owner nonce CAS failed';
    END IF;
    UPDATE calapres_cs.incidents
    SET revision = revision + 1,
        status = 'owner_decision_recorded',
        owner_decision_ref = p_command ->> 'approval_id',
        audit_ref = p_command ->> 'audit_id',
        decided_at = v_now,
        updated_at = v_now
    WHERE brand_id = v_brand
      AND incident_id = p_command ->> 'incident_id'
      AND revision = (p_command ->> 'expected_incident_revision')::integer
      AND status = 'awaiting_owner'
    RETURNING revision INTO v_count;
    IF NOT FOUND OR v_count <> v_revision THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'incident revision CAS failed';
    END IF;
    RETURN calapres_cs._atomic_envelope(
      p_operation,
      'committed',
      'owner_decision_committed',
      jsonb_build_object(
        'approval_id', p_command ->> 'approval_id',
        'audit_id', p_command ->> 'audit_id',
        'incident_revision', v_revision,
        'action', p_command ->> 'action',
        'command_digest', p_command ->> 'command_digest',
        'case_reply_sha256', p_command ->> 'case_reply_sha256',
        'knowledge_proposal_sha256', p_command -> 'knowledge_proposal_sha256',
        'base_knowledge_version', p_command -> 'base_knowledge_version',
        'knowledge_version_to_publish', p_command -> 'knowledge_version_to_publish',
        'supersedes_knowledge_version', p_command -> 'supersedes_knowledge_version'
      ), NULL
    );

  ELSE
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  END IF;

EXCEPTION
  WHEN invalid_text_representation OR datetime_field_overflow OR numeric_value_out_of_range THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'schema_invalid'
    );
  WHEN unique_violation OR foreign_key_violation OR check_violation
    OR serialization_failure OR deadlock_detected THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'database_state_unknown'
    );
  WHEN OTHERS THEN
    RETURN calapres_cs._atomic_envelope(
      p_operation, 'unknown', 'uncertain', NULL, 'database_function_unknown'
    );
END;
$function$;

ALTER FUNCTION calapres_cs._atomic_envelope(text, text, text, jsonb, text)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._exact_json_keys(jsonb, text[])
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._iso_timestamp_valid(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._rfc3339_utc(timestamptz)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._json_text_matches(jsonb, text, text)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._fingerprint_bundle_valid(jsonb, text, text, timestamptz, timestamptz)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._decision_option_valid(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs._atomic_dispatch(text, jsonb)
  OWNER TO calapres_cs_function_owner;

GRANT USAGE, CREATE ON SCHEMA calapres_cs TO calapres_cs_function_owner;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA calapres_cs TO calapres_cs_function_owner;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA calapres_cs FROM PUBLIC;

COMMENT ON FUNCTION calapres_cs._atomic_dispatch(text, jsonb) IS
  'Internal provider-neutral atomic dispatcher; never granted to the runtime role.';

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (2, 'calapres_cs_atomic_dispatch')
ON CONFLICT (version) DO NOTHING;

COMMIT;
