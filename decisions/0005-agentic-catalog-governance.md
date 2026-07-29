# 0005 — Agentic discovery cannot bypass catalog governance

Date: 2026-07-29
Status: Accepted

## Problem

Shopify Agentic, Shopify Catalog, Knowledge Base, and connected AI tools can expose store content
to external agents. Four products also existed directly in Shopify without corresponding canonical
Supabase records. Enabling discovery must not create a second product-publication path or weaken
the approval gates adopted in decision 0002.

## Decision

Shopify Agentic and Knowledge Base may expose approved policies, FAQs, collections, and public
store metadata. Shopify connector access may be used for verified Calapres operations, but no
credential, customer data, order data, or secret may be stored in this repository.

Products may enter Shopify Catalog or any Agentic channel only after they pass the existing
canonical path:

    owner approval -> Supabase ready_for_shopify -> shopify_sync_queue -> n8n -> Shopify

Agentic settings, `Allow Shopify to manage for me`, or a direct Shopify draft never authorize
publication. A product missing approved inventory, price, media, or its Supabase record remains
blocked.

Operational configuration that does not publish products—such as policies, verified FAQs, and
empty collections—may be maintained directly in Shopify and then recorded in GitHub.

Opening a new market, changing international commercial terms, or adopting a payment-country
entity requires a recorded owner decision. No unsupported-country workaround may be used to
obtain Shopify Payments or Shop eligibility.

The live theme is ahead of `main`. No theme-code write may be made until the live source is
reconciled into the canonical branch and the competing deployment branch is retired or converted
into a non-authoritative delivery mechanism.
