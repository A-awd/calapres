BEGIN;

-- Correct the v2 key-bundle coverage check. The registry contains one row per
-- namespace; a FULL OUTER JOIN against the whole table made unrelated active
-- namespaces look like missing aliases and blocked every durable write.
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
    SELECT 1 FROM calapres_cs.storage_key_registry_heads heads
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
    CROSS JOIN LATERAL jsonb_to_record(source.item)
      AS x(fingerprint text, key_version text)
  )
  SELECT count(*), COALESCE(
    bool_and(calapres_cs._exact_json_keys(item, ARRAY['fingerprint', 'key_version']))
      AND bool_and(fingerprint ~ '^[a-f0-9]{64}$')
      AND bool_and(key_version ~ '^hmac-sha256-v[1-9][0-9]*$')
      AND count(*) = count(DISTINCT key_version), false
  ) INTO v_alias_count, v_valid FROM supplied;
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
      FULL OUTER JOIN (
        SELECT * FROM calapres_cs.storage_key_registry
        WHERE brand_id = 'calapres'
          AND namespace = p_namespace
          AND registry_version = v_registry_version
          AND coverage_until >= p_required_through
      ) registry ON registry.key_version = supplied.key_version
      WHERE supplied.key_version IS NULL OR registry.key_version IS NULL
    )
  THEN
    RETURN false;
  END IF;

  IF p_namespace = 'request_replay' THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM calapres_cs.request_replay_aliases aliases
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
      SELECT 1 FROM calapres_cs.business_event_aliases aliases
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
    SELECT 1 FROM calapres_cs.conversation_job_message_aliases aliases
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
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$function$;

ALTER FUNCTION calapres_cs._edge_key_bundle_valid(
  jsonb, text, text, text, timestamptz, timestamptz
) OWNER TO calapres_cs_function_owner;

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (9, 'calapres_cs_key_bundle_namespace_join')
ON CONFLICT (version) DO NOTHING;

COMMIT;
