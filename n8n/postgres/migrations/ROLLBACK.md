# Migration rollback policy

Migrations `0001_calapres_cs_atomic_state.sql`,
`0002_calapres_cs_atomic_functions.sql`,
`0003_calapres_cs_callable_boundary.sql`, and
`0004_calapres_cs_replay_recovery_queue.sql`, and
`0005_calapres_cs_chatwoot_reconciliation.sql` are intentionally forward-only.

There is no automated `DROP SCHEMA` rollback because it could erase durable replay,
incident, approval, and audit evidence. Before this candidate is used against a live
PostgreSQL instance, rollback must be a separately reviewed forward migration that:

1. stops writers and proves their state;
2. exports and reconciles every table in `calapres_cs`;
3. restores or migrates that state into the approved replacement; and
4. removes old objects only under explicit production authorization.

No command in this directory drops live state.

Before any runtime login is granted, the isolated-database validation must also inspect
`pg_proc.proconfig`/`proacl` and prove that every callable or helper function pins
`pg_catalog, calapres_cs, pg_temp` in that order. From each runtime login, create temporary objects
whose names shadow internal tables/functions and prove the reviewed functions still resolve only
the qualified Calapres objects. This test complements, and does not replace, the direct-table
revocation and split Edge/owner EXECUTE-grant checks.
