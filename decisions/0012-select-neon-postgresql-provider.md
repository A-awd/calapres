# Decision 0012 — Select Neon PostgreSQL for Calapres customer-service state

Date: 2026-08-12
Status: accepted for the inactive test and observation gate

## Decision

Use the existing Neon project `shiny-hill-38628371` and database `neondb` as the PostgreSQL
provider for the Calapres-only customer-service runtime. Keep the existing n8n Cloud workflow
`e442GlRmKP4IO8pm` as the sole Edge target. Do not create a duplicate workflow or activate,
publish, or connect live customer traffic at this decision.

## Evidence

- Repository migrations 0001–0007 are applied in Neon.
- The database contains 22 Calapres tables and 40 routines.
- Separate Webhook and Reconciliation login roles exist and inherit only their runtime roles;
  Owner functions remain separately bounded.
- Both restricted n8n PostgreSQL credentials passed SSL-required connection tests.
- Targeted Node tests passed 39/39 after making migration 0002 compatible with Neon’s absence of
  a login role named `postgres`.

## Not yet proven

Real two-session transaction/concurrency, lease recovery, backup/restore, signed Chatwoot
fixture, and live observation remain gates. No customer message or Shopify write is authorized.
