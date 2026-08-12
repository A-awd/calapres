BEGIN;

-- n8n connects with LOGIN roles. Keep the runtime roles as the privilege
-- boundary, but grant the exact callable surface to the corresponding LOGIN
-- role because the hosted Postgres session does not inherit the NOLOGIN role
-- ACL in the n8n connection.
GRANT USAGE ON SCHEMA calapres_cs
  TO calapres_cs_webhook_login, calapres_cs_reconciliation_login;

GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_signed_webhook_request_replay(jsonb)
  TO calapres_cs_webhook_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_business_event(jsonb)
  TO calapres_cs_webhook_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_complete_business_event(jsonb)
  TO calapres_cs_webhook_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_advance_signed_webhook_conversation_generation(jsonb)
  TO calapres_cs_webhook_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_read_generation(jsonb)
  TO calapres_cs_webhook_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_schedule_conversation_retry(jsonb)
  TO calapres_cs_webhook_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_due_conversation_retry(jsonb)
  TO calapres_cs_webhook_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_transition_conversation_job(jsonb)
  TO calapres_cs_webhook_login;

GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_reconciliation_request_replay(jsonb)
  TO calapres_cs_reconciliation_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_business_event(jsonb)
  TO calapres_cs_reconciliation_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_advance_reconciliation_conversation_generation(jsonb)
  TO calapres_cs_reconciliation_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_claim_chatwoot_reconciliation_scan(jsonb)
  TO calapres_cs_reconciliation_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_compare_and_advance_chatwoot_message_cursor(jsonb)
  TO calapres_cs_reconciliation_login;
GRANT EXECUTE ON FUNCTION calapres_cs.atomic_read_chatwoot_reconciliation_cursor(jsonb)
  TO calapres_cs_reconciliation_login;

INSERT INTO calapres_cs.schema_migrations (version, migration_name)
VALUES (10, 'calapres_cs_login_role_execute_grants')
ON CONFLICT (version) DO NOTHING;

COMMIT;
