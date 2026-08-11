# 0007 — Publish an isolated Calapres ownership-proof site

Date: 2026-08-11
Status: Accepted

## Problem

The verified legal entity is `مؤسسة عبق الخيل للتجارة`, while the Calapres brand uses a different
public name. The existing `awd-businesses.com` surface is only a parked Squarespace page and does
not publish the relationship between the legal entity and Calapres. Repeated WhatsApp display-name
reviews therefore have no direct, crawlable ownership statement to evaluate.

The live Shopify store must not be modified as part of this work.

## Decision

Publish a small static site from the canonical public `A-awd/calapres` repository:

- keep the files isolated under `owner-site/` and out of the Shopify theme directories;
- deploy only that directory with a dedicated GitHub Pages workflow from `main`;
- use `awd-businesses.com` as the custom domain after the generated Pages site is verified;
- make the exact Calapres-to-legal-entity relationship visible in Arabic and English and expose the
  same relationship as structured Organization and Brand data;
- link to the official Calapres store without changing or proxying it;
- preserve Google Workspace MX, SPF, DKIM, and Meta domain-verification records when moving the web
  apex and `www` records away from the parked Squarespace page.

No other brand is included until its ownership and public details are separately verified.

## Consequences

- The ownership proof is free to host, independently crawlable, and reversible without a Shopify
  deployment.
- `calapres.com` and the live Shopify theme remain unchanged.
- Repository changes to `owner-site/` can update the proof page through the same audited `main`
  history.
- DNS changes must be limited to the web-hosting records. Resetting the DNS zone or deleting mail,
  verification, or unrelated custom records is prohibited.
- The page improves the evidence available to Meta but does not guarantee a display-name approval;
  Meta retains the final decision.
