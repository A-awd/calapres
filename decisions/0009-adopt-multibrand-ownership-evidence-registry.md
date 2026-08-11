# 0009 — Adopt a multi-brand ownership-evidence registry

Date: 2026-08-11

Status: Accepted for future verified brands; Calapres remains the only active implementation

## Context

The permanent Calapres ownership page on `awd-businesses.com` was followed by Meta approval of the
WhatsApp display name `Calapres | كالابريز`. The owner accepts this result as sufficient business
evidence to standardize the same ownership-proof method before future brand-name submissions.

The approval timing does not expose Meta's internal review mechanism and does not change Meta's
authority over later reviews. The durable decision is to provide stronger, consistent, public
evidence rather than rely on repeated spelling experiments or unverified portfolios.

## Decision

Use `awd-businesses.com` as the future public ownership-evidence registry for brands whose
ownership and public details have been verified:

- keep a neutral legal-owner home page;
- publish one permanent, crawlable URL per brand under `/brands/<brand>/`;
- use the exact brand spelling and a truthful Arabic and English ownership relationship;
- link the brand's official domain, email, logo, and public profiles when verified;
- include unique canonical, Open Graph, Organization, Brand, and WebPage metadata;
- serve every page directly over HTTPS with `index,follow` and include it in the sitemap;
- add reciprocal evidence on the brand's own website when practical;
- keep the evidence page live and accurate after approval.

The existing Calapres page remains Calapres-specific. Another brand must not be inserted into it
or into the Calapres repository surface merely for convenience. When the next brand is authorized,
move or extend the ownership site through a neutral repository and a separately reviewed change.

## Boundaries

- This decision does not authorize onboarding, submitting, connecting, or modifying another brand.
- A brand page may be published only after the owner confirms the legal relationship and its
  public domain, spelling, contact details, and logo.
- Never publish WABA IDs, phone-number IDs, catalog IDs, pixels, tokens, payment data, or other
  internal platform identifiers on a public evidence page.
- Do not create a separate unverified Meta portfolio as a substitute for proving the relationship
  to the verified legal owner.
- The pattern improves the evidence available to automated or human review; it is not an API
  bypass and cannot force a specific Meta decision.

## Consequences

- Future brand setup gains a repeatable identity-evidence gate before Meta onboarding.
- Evidence stays public, auditable, and reusable across platforms without modifying a live store.
- The ownership registry becomes a shared legal-owner surface, while each brand's commerce,
  customer data, credentials, and channel assets remain isolated.

