# 0046 — Design-service backend boundaries

Date: 2026-09-23. Owner direction: continue implementation in Claude, keep the provider key and
paid generation for the final step, work only in unpublished theme 166572294400.

## Decision

The generated-name path of decision 0045 uses one small Node 24 service with no third-party runtime
dependencies:

- Storefront traffic reaches it only through a dedicated Shopify app's App Proxy at
  `/apps/calapres-design`. Every request is verified with the app-proxy HMAC, exact shop, exact
  `path_prefix` and a 5-minute timestamp window. The theme holds no credential.
- One process owns one persistent data directory: a SQLite ledger (sessions, jobs, calls,
  designs, order checks) and write-once originals named by SHA-256. Multi-instance hosting is not
  supported, because the ledger is the single budget authority.
- Browser sessions are signed opaque tokens. A session is stored only when its first batch is
  reserved, so minting tokens cannot grow the database.
- Each batch first reserves an amount from the owner's budget. That amount is three images ×
  (maximum prompt tokens × text rate + an operator-declared output-token ceiling × image-output rate).
  - This is a reservation policy, not a provider-enforced maximum: the API cannot cap billed
    output tokens.
  - Settlement records the best-known spend, from the provider's `usage` where it was reported.
    That spend may be lower or higher than the reservation. An observed overshoot is recorded and
    halts generation after that batch.
  - Ambiguous outcomes (timeout, 5xx, 400, network, missing usage) are counted at the ceiling.
  - Calls that were refused or never sent (401/403/404/429, queue deadline, halt, lost lease)
    cost nothing.
  - Possibly billed calls are never retried, and interrupted jobs are never replayed after a
    restart.
  - There is no verified hard invoice cap. Provider-side limits reduce exposure but can lag.
    A dispatched request that times out may still be billed.
- A single-worker lease stored in the ledger means only one process per data directory can call
  the provider.
- Limits: at most 9 possibly-billed images (3 per batch) per session per rolling 24 h — slots the
  provider certainly refused do not count (amended 2026-09-23); a lifetime global budget; global
  jobs per hour; maximum pending jobs; provider images per minute; per-IP request rate.
- Outputs are screened locally: PNG validity, exact size, blank or over-filled, colour content,
  ink touching the edges, near-duplicates within the session. Screening is not spelling
  verification. Arabic correctness remains the customer's review of the exact image plus
  production's check.
- Every visible design carries a design receipt: an HMAC over shop, design id, SHA-256 of the
  stored original, version and normalized name.
- Approval is confirmed by the server. Only the owning session can approve a design; the server
  records the approval time and returns an approval receipt that also binds that time. This
  receipt is what goes into the cart.
- The `orders/create` webhook (HMAC-verified and deduplicated by delivery id) and the
  `verify-order.mjs` CLI release a design for manufacturing only if all of these hold:
  - the approval receipt is valid and recorded for the owning session;
  - the name, version and asset digest match;
  - the approval text is present;
  - the stored original is intact.
- Asset URLs in order properties are parsed, never fetched. Production exports the stored
  original and never regenerates.
- Originals that were approved or referenced by a verified order are never pruned.

## Consequences

This narrows, and does not widen, the external-storage exception in 0045. It adds no Supabase
and no customer accounts, and it does not move catalog or order authority away from Shopify.

Activation still requires all of the following. Each needs owner or commercial action.

1. A dedicated app in the Shopify Dev Dashboard with custom distribution to `unywbe-ub`. Its
   only scope is `write_app_proxy`. The orders webhook is optional; it would add `read_orders` and
   protected-customer-data access.
2. A host with TLS and a persistent disk.
3. A dedicated OpenAI key.
4. On the activation day, re-verified official prices and an output-token ceiling.
5. An explicit budget.
6. A bounded real Arabic test, then an order test.

Until then, `GENERATION_ENABLED` stays false, the budget stays 0, and the theme endpoint stays
blank.

## 2026-09-23 audit amendment

The audit changes listed above were added in this amendment: server-confirmed approval, the
lease, the queue deadline, recorded overshoot, webhook dedupe, the trusted-hop client address and
the bounded listing.

Documentation no longer states any number of designs per budget. The per-image ceiling and
prices stay unverified until the final activation test.

## 2026-09-23 host amendment

- Host prepared: Render, one Starter instance with a 1 GB persistent disk
  (`services/design/deploy/render.yaml`). The service refuses to start unless the disk is mounted.
  No ephemeral fallback.
- Render's MCP connector cannot create disks or Blueprints, so creating the Blueprint is a dashboard
  step, and it is the commercial approval point.
- App scopes reduced to `write_app_proxy`. Order verification works through `verify-order.mjs`
  without the webhook.
- A signed-only `GET /proxy/ping` probe verifies the live proxy path without spending anything.

## 2026-09-23 partial-batch amendment

- Live batches returned 1 and then 2 of 3 images. The logs held no `design_rejected` event, so the
  missing images were provider-call failures. In the deployed code these were recorded only in the
  private ledger, not logged.
- Changes:
  - Every image that does not become a design is now logged with a safe code: `call_failed` with
    an HTTP status code, the provider's short machine code (never its message) and the billed
    class. It is also recorded per slot.
  - `maintenance.mjs calls [N]` reads the per-slot outcomes, without names.
  - Only HTTP 429, which the provider refuses before generation, is retried: at most twice, within
    the queue deadline.
  - Possibly billed failures are still never retried.
  - Quota counts possibly billed images, not batches, so certain refusals no longer use the
    customer's 9.
- Screening is unchanged.
