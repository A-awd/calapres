# Calapres design service — not activated

Owner approved the two-path unpublished experiment on 2026-09-23. No product,
variant, price, publication, provider funding, or subscription change is included.
The frontend is `sections/design-service.liquid`, in `product.design-service`.
The endpoint is deliberately blank. Upload uses Shopify's existing multipart
line-item attachment mechanism. Generation is visibly unavailable until the
following backend and live acceptance gates are complete; never substitute fonts
or sample images and report them as actual generated artwork.

## Implemented source

`ledger.mjs` uses Node 24 SQLite on one persistent disk. Reservations are atomic
across connections. A pending job is reused on duplicate requests. Nine requested
designs per rolling 24 hours are counted across name changes. All former designs
remain retrievable; browser storage contains only an opaque bearer token. Clearing
browser storage can create a new session; the owner accepts this tradeoff.
The total reservation cap is lifetime, not reset by new sessions or server restart.
No retries or refunds are automatic; failed/ambiguous requests retain their
reservation, avoiding spending again after an unknown provider outcome.

Budget units are integer micro-units of the provider's billing currency, not
rounded display SAR. Budget defaults to zero. The per-batch reservation must cover
the maximum cost of three calls including input/output/thinking tokens, reference
images, validation and any allowed replacements. The reservation ledger is not
proof of a bound on provider invoices until that maximum is derived from the
selected model's enforced token/size limits. Do not enable spend based on output-
image-only estimates. Use one worker process and durable disk; multi-instance
hosting requires shared transactional authority and is not supported here.

## Remaining backend contract

- Install a dedicated Shopify app with an authenticated App Proxy. Validate the
  signature, shop allowlist and timestamp. Restrict body sizes and name input.
- `POST /session {token}` returns `{token, remaining, pending, lastName, designs}`.
- `POST /generate {token,name}` reserves a batch before enqueueing and returns the
  same contract. Do not call the provider when a prior job is pending.
- Each design has `id,name,ordinal,url,receipt,version`. Return all retained
  designs, not only the latest batch. URLs must be immutable HTTPS same-store
  proxy URLs or Shopify CDN URLs. Persist originals before exposing results.
- Generate separate compositions with bounded spelling/similarity screening.
  Do not promise flawless Arabic or guaranteed pairwise artistic uniqueness.
- Bind receipts to immutable file digest, name, session and design version;
  validate against order properties before releasing a generated design to
  manufacturing. A theme checkbox is not checkout enforcement on Basic.
- Resume interrupted work conservatively without replaying paid calls. Define
  session/design retention separately so ordered assets are never casually pruned.
- Provider credential, model choice/quality evidence, hosting and an exact owner
  budget remain unconfigured. No commercial credential was accessed or created.

## Validation

`node --test services/design/ledger.test.mjs`

Before enabling generation, test the actual app proxy, durable assets, concurrent
budget exhaustion, reload/recovery, selecting the first image after all batches,
and an order carrying the exact approved original. Synthetic ledger tests do not
prove deployment, actual generation, Arabic quality, or completed-order receipt.
