# 0006 — Retire Supabase and adopt Shopify-native operations

Date: 2026-07-29

Status: Accepted, binding

## Decision

Supabase is removed from the Calapres architecture. It is not a product database, authentication
provider, storage provider, order system, customer system, queue, approval gate, or operational
dependency.

Calapres is Shopify-native:

    owner approval -> Shopify draft -> product review -> Shopify publication

Shopify is the operational source of truth for products, inventory, collections, customers,
orders, markets, policies, and sales-channel publication. GitHub `main` remains the technical
source of truth for theme code, decisions, and sanitized operational state.

## Repository transition

Remove from the current tree:

- The legacy React and Vite application that depended on Supabase.
- Supabase client code, SDK dependencies, environment variables, generated types, migrations, and
  edge functions.
- The retired supplier and Supabase synchronization source and its CI workflow.
- Instructions that require a Supabase record or queue before Shopify publication.

Git history remains intact and is the recovery mechanism. Retired code must not be copied back into
the active tree.

## External systems

This decision disconnects Calapres from Supabase; it does not authorize permanent deletion of an
external project or historical data. Retired external data must not be queried, modified, or
deleted during normal Calapres work. Permanent disposal requires a separate instruction that names
the exact project and acknowledges irreversibility.

n8n is not a product source or mandatory orchestration layer. A future n8n workflow requires a new
decision, must have a narrow Shopify-native purpose, and must not recreate an external catalog
database or supplier pipeline.

## Product approval

A Shopify product remains a draft until the owner approves its title, vendor or brand, description,
price, inventory policy and quantity, media, SEO, collections, and intended sales channels.
Approved products may then be published directly from Shopify.

## Supersession

This decision supersedes:

- The Supabase and n8n architecture clause in decision 0002.
- The database sequence and trigger mechanism in decision 0003.
- Decision 0005's Supabase queue requirement.

The permanent supplier retirement, ban on automatic supplier discovery, existing SKU immutability,
and explicit owner-approval requirements remain in force.
