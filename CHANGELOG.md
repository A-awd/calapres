# Changelog

## 2026-07-29

- Retired Supabase from the Calapres architecture by owner decision.
- Removed the unused React and Vite application, Supabase client, SDK dependency, migrations,
  edge functions, and lock files from the active tree.
- Removed the retired supplier, n8n, and Supabase synchronization source.
- Adopted a Shopify-native draft, review, approval, and publication workflow.
- Added decision 0006 and a Shopify-only CI guard.

## 2026-06-04

- Added `sync/config.js` as the Calapres sync source of truth for store domain, API versions, markup, chunking, tags, namespaces, credentials, supplier constants, and collection mapping.
- Added chunked catalog state, canCreate guards, crawl source carry-through parsing, normalization/categorization, enrichment helpers, run reports, and stricter Shopify payload validation.
- Added deterministic n8n Code-node bundler output in `sync/n8n-build/` plus CI guards for syntax, tests, dry run, docs, secrets, and generated artifacts.
- Expanded offline tests to 55 tests / 323 assertions and added dry-run Markdown reporting.
