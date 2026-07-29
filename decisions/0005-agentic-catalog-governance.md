# 0005 — Agentic discovery cannot bypass catalog governance

Date: 2026-07-29

Status: Superseded by decision 0006 on 2026-07-29.

## Historical context

This decision originally required products to pass through a Supabase queue and n8n before
entering Shopify Catalog or an Agentic channel. The owner later confirmed that Supabase had already
been cancelled for Calapres. That external queue requirement was therefore incorrect and is no
longer active.

## Current rule

Decision 0006 is binding. Shopify is the operational source of truth. Agentic and Knowledge Base
may expose only content and products approved in Shopify. Product draft status, owner approval,
complete product data, and approved sales-channel publication are the applicable gates.

Agentic settings or automated management do not authorize publication by themselves. Opening a
new market, changing international commercial terms, or using a new legal entity still requires an
owner decision.
