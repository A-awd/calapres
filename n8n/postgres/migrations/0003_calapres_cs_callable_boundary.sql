-- Calapres callable atomic function boundary, migration 0003.
-- Candidate status: implementation_candidate_pending_live_postgres_validation.
-- SECURITY DEFINER is required because the runtime role has no table privileges.

BEGIN;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_request_replay(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._atomic_dispatch('claim_request_replay', p_command)
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_business_event(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._atomic_dispatch('claim_business_event', p_command)
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_complete_business_event(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._atomic_dispatch('complete_business_event', p_command)
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_advance_conversation_generation(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._atomic_dispatch('advance_conversation_generation', p_command)
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_read_generation(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._atomic_dispatch('read_generation', p_command)
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_schedule_conversation_retry(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._atomic_dispatch('schedule_conversation_retry', p_command)
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_claim_due_conversation_retry(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._atomic_dispatch('claim_due_conversation_retry', p_command)
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_transition_conversation_job(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._atomic_dispatch('transition_conversation_job', p_command)
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_prepare_owner_review(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._atomic_dispatch('prepare_owner_review', p_command)
$function$;

CREATE OR REPLACE FUNCTION calapres_cs.atomic_compare_and_commit_owner_decision(p_command jsonb)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
  SELECT calapres_cs._atomic_dispatch('compare_and_commit_owner_decision', p_command)
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
ALTER FUNCTION calapres_cs.atomic_prepare_owner_review(jsonb)
  OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.atomic_compare_and_commit_owner_decision(jsonb)
  OWNER TO calapres_cs_function_owner;

REVOKE ALL ON SCHEMA calapres_cs FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA calapres_cs FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_edge_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA calapres_cs FROM calapres_cs_edge_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA calapres_cs FROM calapres_cs_edge_runtime;
REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs FROM calapres_cs_owner_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA calapres_cs FROM calapres_cs_owner_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA calapres_cs FROM calapres_cs_owner_runtime;

GRANT USAGE ON SCHEMA calapres_cs TO calapres_cs_edge_runtime;
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

GRANT USAGE ON SCHEMA calapres_cs TO calapres_cs_owner_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_prepare_owner_review(jsonb)
  TO calapres_cs_owner_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_compare_and_commit_owner_decision(jsonb)
  TO calapres_cs_owner_runtime;

COMMENT ON ROLE calapres_cs_function_owner IS
  'NOLOGIN owner for the locked customer-service atomic function boundary.';
COMMENT ON ROLE calapres_cs_edge_runtime IS
  'NOLOGIN edge membership role: eight non-owner atomic functions only; deployment login is separate.';
COMMENT ON ROLE calapres_cs_owner_runtime IS
  'NOLOGIN owner membership role: schema visibility plus two owner-decision functions only; deployment login is separate.';
COMMENT ON SCHEMA calapres_cs IS
  'Transactional state. Provision separate LOGIN principals outside migrations and grant exactly one runtime membership role.';
COMMENT ON FUNCTION calapres_cs.atomic_complete_business_event(jsonb) IS
  'Commits completion, sanitized outcome, audit, and optional incident together.';
COMMENT ON FUNCTION calapres_cs.atomic_prepare_owner_review(jsonb) IS
  'CAS-prepares trusted decision options and a single-use owner window.';
COMMENT ON FUNCTION calapres_cs.atomic_compare_and_commit_owner_decision(jsonb) IS
  'Consumes the current window and commits approval, incident revision, and audit together.';

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (3, 'calapres_cs_callable_boundary')
ON CONFLICT (version) DO NOTHING;

COMMIT;
