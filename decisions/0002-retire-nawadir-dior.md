# 0002 — Retire Nawadir Dior and adopt an owner-curated catalog

Date: 2026-07-27

Status: Accepted. Supplier retirement is permanent. The former Supabase and n8n architecture in
this decision was superseded by decision 0006 on 2026-07-29.

## Decision

Nawadir Dior is removed from the Calapres operating architecture. It is no longer a supplier, data
source, catalog source, pricing source, inventory source, or operational dependency.

Calapres is an owner-curated catalog. Products are selected and approved manually.

The original version of this decision designated Supabase as the canonical product database and
n8n as the orchestration layer. That designation is no longer active. Decision 0006 makes Shopify
the operational source of truth and prohibits restoring the retired database and synchronization
path.

Permanently prohibited: supplier crawling, supplier sitemap discovery, supplier price
synchronization, supplier stock synchronization, supplier image ingestion, supplier
reconciliation, and automatic product discovery.

## Transition method

The supplier automation was severed while the existing Shopify catalog was preserved for gradual
owner review. The store was not subjected to an automatic bulk draft or deletion.

## Consequences

- Legacy products keep their historical vendor, tags, and SKUs until reviewed.
- Legacy products can never be republished, repriced, restocked, or re-imaged automatically.
- Historical external data is not an active project dependency.
- Nothing reaches a Shopify sales channel without explicit owner approval.
