# Decision Index

Durable Calapres decisions live in the `decisions` directory. GitHub `main` is the authoritative
decision record.

## Active decisions

- [0001 — Adopt the One Brain repository foundation](decisions/0001-one-brain-foundation.md)
- [0002 — Retire Nawadir Dior and adopt an owner-curated catalog](decisions/0002-retire-nawadir-dior.md)
  — supplier retirement remains permanent; its former database architecture is superseded by
  decision 0006.
- [0003 — Calapres SKU format](decisions/0003-calapres-sku-format.md) — existing SKU immutability
  remains active; database-issued SKUs are superseded by decision 0006.
- [0004 — `main` is the single canonical branch](decisions/0004-single-canonical-branch.md)
- [0006 — Retire Supabase and adopt Shopify-native operations](decisions/0006-retire-supabase.md)
- [0007 — Publish an isolated Calapres ownership-proof site](decisions/0007-publish-ownership-proof-site.md)
- [0008 — Adopt the Optix multi-brand customer-service architecture](decisions/0008-optix-customer-service-architecture.md)
  — approved for design and a Calapres-only pilot; n8n remains an orchestration layer and every
  brand's knowledge, credentials, customer context, and store adapter stay isolated.
- [0009 — Adopt a multi-brand ownership-evidence registry](decisions/0009-adopt-multibrand-ownership-evidence-registry.md)
  — repeat the successful permanent ownership-proof pattern for each future verified brand while
  keeping Calapres as the only active implementation.

## Superseded decisions

- [0005 — Agentic discovery cannot bypass catalog governance](decisions/0005-agentic-catalog-governance.md)
  — superseded by decision 0006.

Add a numbered decision when scope, architecture, security posture, source authority, or operating
policy changes.
