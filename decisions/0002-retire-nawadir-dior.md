# 0002 — Retire Nawadir Dior and adopt an owner-curated catalog

Date: 2026-07-27
Status: Accepted, permanent

## Decision

Nawadir Dior is removed from the Calapres operating architecture. It is no longer a supplier, a
data source, a catalog source, a pricing source, an inventory source, or an operational
dependency.

Calapres is an owner-curated catalog. Products are selected and approved manually. Supabase is the
canonical product database. n8n is the only orchestration layer. Shopify is a sales channel only.

Prohibited permanently: supplier crawling, supplier sitemap discovery, supplier price
synchronization, supplier stock synchronization, supplier image ingestion, supplier reconciliation,
and automatic product discovery of any kind.

## Transition method

Gradual, not a store blackout. Every active Shopify product originates from the retired pipeline
and the store is trading, so an immediate bulk Draft would have taken the storefront from 2497
published products to zero. Instead the automation was severed completely and immediately while the
existing products remain as a static catalog, retired in batches as owner-curated replacements are
approved.

## Consequences

- Legacy products keep their supplier vendor, supplier tags, and `CAL-ND-*` SKUs until reviewed.
- Legacy products can never be republished, repriced, or restocked automatically.
- Historical supplier data is preserved read-only in the `archive` schema for audit and accounting.
- Nothing reaches Shopify without explicit owner approval.
