-- Calapres customer-service model budget guard, migration 0008.
-- The model remains disabled by default. This is a deny-first reservation gate;
-- it never stores prompts, responses, phone numbers, or customer text.

BEGIN;

CREATE TABLE IF NOT EXISTS calapres_cs.model_budget_controls (
  brand_id text PRIMARY KEY CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  enabled boolean NOT NULL DEFAULT false,
  kill_switch boolean NOT NULL DEFAULT true,
  monthly_limit_microusd bigint NOT NULL DEFAULT 45000000
    CHECK (monthly_limit_microusd BETWEEN 1 AND 50000000),
  reservation_microusd bigint NOT NULL DEFAULT 50000
    CHECK (reservation_microusd BETWEEN 1 AND 50000),
  daily_conversation_request_limit integer NOT NULL DEFAULT 20
    CHECK (daily_conversation_request_limit BETWEEN 1 AND 20),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);

CREATE TABLE IF NOT EXISTS calapres_cs.model_budget_months (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  window_start date NOT NULL,
  reserved_microusd bigint NOT NULL DEFAULT 0 CHECK (reserved_microusd >= 0),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, window_start),
  FOREIGN KEY (brand_id) REFERENCES calapres_cs.model_budget_controls(brand_id)
);

CREATE TABLE IF NOT EXISTS calapres_cs.model_budget_conversation_days (
  brand_id text NOT NULL CHECK (brand_id ~ '^[a-z][a-z0-9_-]{1,63}$'),
  window_start date NOT NULL,
  conversation_id text NOT NULL CHECK (conversation_id ~ '^[1-9][0-9]{0,30}$'),
  reserved_microusd bigint NOT NULL DEFAULT 0 CHECK (reserved_microusd >= 0),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  PRIMARY KEY (brand_id, window_start, conversation_id),
  FOREIGN KEY (brand_id) REFERENCES calapres_cs.model_budget_controls(brand_id)
);

INSERT INTO calapres_cs.model_budget_controls (brand_id)
VALUES ('calapres')
ON CONFLICT (brand_id) DO NOTHING;

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

CREATE OR REPLACE FUNCTION calapres_cs.owner_set_model_budget_control(p_command jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, calapres_cs, pg_temp
AS $function$
DECLARE
  v_enabled boolean := (p_command ->> 'enabled')::boolean;
  v_kill_switch boolean := (p_command ->> 'kill_switch')::boolean;
  v_limit bigint := (p_command ->> 'monthly_limit_microusd')::bigint;
BEGIN
  IF p_command ->> 'brand_id' <> 'calapres'
     OR v_limit IS NULL OR v_limit < 1 OR v_limit > 50000000 THEN
    RETURN jsonb_build_object('contract_verified', true, 'status', 'rejected',
      'outcome', 'invalid_command', 'error_code', 'schema_invalid',
      'value', NULL, 'customer_egress_allowed', false);
  END IF;
  UPDATE calapres_cs.model_budget_controls
  SET enabled = COALESCE(v_enabled, false), kill_switch = COALESCE(v_kill_switch, true),
      monthly_limit_microusd = v_limit, updated_at = transaction_timestamp()
  WHERE brand_id = 'calapres';
  RETURN jsonb_build_object('contract_verified', true, 'status', 'committed',
    'outcome', 'control_updated', 'error_code', NULL,
    'value', jsonb_build_object('brand_id', 'calapres', 'enabled', COALESCE(v_enabled, false),
      'kill_switch', COALESCE(v_kill_switch, true), 'monthly_limit_microusd', v_limit),
    'customer_egress_allowed', false);
END;
$function$;

ALTER FUNCTION calapres_cs.atomic_reserve_model_budget(jsonb) OWNER TO calapres_cs_function_owner;
ALTER FUNCTION calapres_cs.owner_set_model_budget_control(jsonb) OWNER TO calapres_cs_function_owner;
GRANT SELECT, INSERT, UPDATE ON calapres_cs.model_budget_controls,
  calapres_cs.model_budget_months, calapres_cs.model_budget_conversation_days
  TO calapres_cs_function_owner;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA calapres_cs TO calapres_cs_function_owner;
REVOKE ALL ON ALL TABLES IN SCHEMA calapres_cs
  FROM calapres_cs_edge_runtime, calapres_cs_webhook_runtime,
    calapres_cs_reconciliation_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA calapres_cs
  FROM PUBLIC, calapres_cs_edge_runtime, calapres_cs_webhook_runtime,
    calapres_cs_reconciliation_runtime;
GRANT USAGE ON SCHEMA calapres_cs TO calapres_cs_webhook_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_reserve_model_budget(jsonb)
  TO calapres_cs_webhook_runtime;
GRANT USAGE ON SCHEMA calapres_cs TO calapres_cs_owner_runtime;
GRANT EXECUTE ON FUNCTION calapres_cs.owner_set_model_budget_control(jsonb)
  TO calapres_cs_owner_runtime;

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (8, 'calapres_cs_model_budget_guard')
ON CONFLICT (version) DO NOTHING;

COMMIT;
