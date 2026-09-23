# Calapres design service

Status 2026-09-23: source complete and tested. See `READINESS.md` for exact status by layer.

What exists:
- The storefront section is deployed only to unpublished backup theme 166572294400, with its
  endpoint left blank. Generation is visibly unavailable there. Upload works as before.
- The service is NOT hosted.
- The dedicated Shopify app and App Proxy do not exist.
- There is no provider key, and no real image has been generated.

Decisions 0045 (scope) and 0046 (backend boundaries) apply.

## Files

| File | Role |
|---|---|
| `server.mjs` | Entry point: one process, one `DATA_DIR`. Takes a single-worker lease, then recovers interrupted jobs without replaying them. |
| `app.mjs` | App-proxy routes: `POST /proxy/session`, `POST /proxy/generate`, `POST /proxy/approve`, `GET\|HEAD /proxy/a/<sha256>.png`, and the read-only probe `GET /proxy/ping`. Also `POST /webhooks/orders-create` (optional) and `GET /healthz`. |
| `security.mjs` | App-proxy HMAC, webhook HMAC, Arabic name rule, signed session tokens, design and approval receipts, client address. |
| `ledger.mjs` | SQLite quotas, atomic reservation, settlement, halt switch, lease, approvals, webhook dedupe, order checks, prune candidates. |
| `worker.mjs` | Three separate provider calls under an images-per-minute limiter and a queue deadline. Then screening, write-once storage and settlement. |
| `provider.mjs` | OpenAI Images adapter (`gpt-image-2-2026-04-21`, `low`, 1024², PNG, opaque, n=1). Nine layout prompts that spell out the exact letters. |
| `cost.mjs` | Reservation model: worst-case prompt tokens plus a declared output-token ceiling. Settlement uses the returned `usage`. |
| `screen.mjs`, `png.mjs` | Dependency-free PNG decoding and output screening. This is not OCR. |
| `store.mjs` | Content-addressed originals: temp file, fsync, rename. The digest is re-verified on every read. |
| `verify.mjs`, `verify-order.mjs` | Manufacturing release check, and export of the exact original for an order. |
| `maintenance.mjs` | Status, consistent backup, dry-run prune, halt and resume. |
| `Dockerfile`, `deploy/` | `render.yaml` Blueprint (chosen host), container image, one-replica compose file, systemd unit, Caddy config, `shopify.app.toml.example`. |
| `.env.example` | Every setting. Spending controls default to off. |

## Storefront contract

- `POST /apps/calapres-design/session {token}` and `POST /apps/calapres-design/generate {token,name}`
  both return `{token, remaining, pending, lastName, enabled, designs}`.
  `enabled` is false when generation is off, halted, or unable to reserve one more batch.
- Each design is `{id, name, ordinal, url, receipt, version}`. `url` is the same-store proxy
  path `/apps/calapres-design/a/<sha256>.png`: immutable, and it never contains a session token.
- `POST /apps/calapres-design/approve {token,id}` returns `{id, approval, approvedAt}`.
  - Only the session that owns the design can approve it.
  - The approval receipt `a1.<time>.<mac>` binds shop, design id, SHA-256 of the stored original,
    version, name and approval time.
  - The approval is recorded in the ledger.
- Line properties: `طريقة التخصيص`, `نص الحفر`, `تصميم الحفر`, `معرف التصميم`,
  `نسخة التصميم`, `_design_receipt` (the approval receipt) and `اعتماد التصميم`.
  The approval text must be `راجعت الاسم والتصميم الظاهر ووافقت عليه`.
- A storefront session cannot see another session's gallery or approve its designs.

## What the checks do and do not prove

| Check | Proves | Does not prove |
|---|---|---|
| App-proxy signature | The request passed through Shopify's proxy for this shop within 5 minutes | Who the customer is; the body is not signed |
| Session token (HMAC) | The browser holds a token this service issued | A person's identity. Clearing storage gives a new session (accepted by the owner). |
| Exact-byte digest | The file served, approved and exported is byte-identical | Anything about its content |
| Duplicate screening (dHash distance ≤ 4) | Near-identical repeats inside one session are hidden | That the remaining designs are artistically different |
| Local screening | PNG, 1024², not blank or overfilled, near-monochrome, not touching the edges | Spelling, absence of tashkeel, absence of ornaments |
| Customer review and approval | The customer saw this exact image and confirmed it | That the Arabic is correct. Production staff should still read it before printing. |
| Order-line verification | The ordered line matches a stored original, name, version and a recorded in-session approval | That checkout itself was blocked without approval. On Basic, the checkbox is a storefront control only. |

## Cost controls (read before activation)

- The budget is a **reservation policy enforced by this service**, not a provider invoice cap. The
  Images API has no parameter that caps billed output tokens.
- Each batch reserves `3 × (max prompt tokens × text price + MAX_OUTPUT_TOKENS_PER_IMAGE × output price)`.
  The prompt maximum is bounded by the UTF-8 bytes of the longest valid name, plus 64 tokens.
- `MAX_OUTPUT_TOKENS_PER_IMAGE` is an operator assumption until real usage is observed. If a
  response reports more, the real amount is recorded (not capped) and generation halts after that
  batch. **One batch can therefore cost more than its reservation.**
- Ambiguous outcomes (timeout, 5xx, 400, network, missing usage) are counted at the per-image
  ceiling and never retried. Calls that were certainly not sent or were refused
  (401/403/404/429, queue deadline, halt, lost lease) cost nothing.
- There is no verified hard invoice cap. A provider-side limit (for example a prepaid balance with
  auto-recharge off, or a project budget) reduces exposure. It is not a mathematically guaranteed
  ceiling, because dispatch, usage reporting and the provider's cutoff can lag. The service stays
  fail-closed: budget 0 means no dispatch.
- Only these calls are certainly free: calls never dispatched (queue deadline, halt, lost lease)
  and calls refused before generation (401/403/404/429). A dispatched request that times out or
  fails ambiguously may still be billed. It is counted at the ceiling, never retried, and never
  assumed refunded.

### Illustration only, not verified

The official page read on 2026-09-23 gave these list prices for `gpt-image-2`: text input
$2.50 / 1M tokens and image output $15 / 1M tokens. Both must be re-read on activation day.

With those prices and an assumed ceiling of 4,160 output tokens per image, the service would
reserve 65,530 µUSD per image. That is about **25 SAR per 100 designs** (6.55 USD at 3.75, rounded
up).

This is the reservation, not the expected invoice. The real cost per 100 designs is unknown until
real `usage` is measured. The ceiling itself is unverified. No guarantee of a number of designs
per budget is made.

## Tests (Node ≥ 24; the provider is a fake inside tests only)

    cd services/design && npm install && npm test

The suite has 36 backend tests plus a JSDOM storefront suite. They cover:

- the Shopify-documented proxy signature vector, including a repeated query parameter;
- rejection of a wrong shop, prefix, timestamp or signature, and of bad bodies and routes;
- the name rule with hamza;
- token, design-receipt and approval-receipt tampering;
- client-address spoofing;
- the OpenAI request shape and billed/unbilled classification (mocked `fetch`);
- PNG screening outcomes;
- write-once storage and corruption detection;
- the limiter;
- config off-by-default;
- five duplicate clicks, which make exactly one batch;
- the 3/6/9 gallery, with the first design still selectable after nine, plus the cap;
- partial batches: a safe `call_failed` code for each missing image; certain refusals do not use the quota; bounded retry of 429 only; ambiguous failures are never retried; the `maintenance.mjs calls` output carries no names;
- gallery isolation between visitors;
- the bounded listing;
- zero or disabled budget, and `enabled:false` when the budget is spent;
- the concurrent global budget;
- settlement: proven usage, ambiguous, unbilled, missing usage, and recorded overshoot;
- screening, and the cost-breach halt;
- restart while pending, with no replay;
- the queue deadline, the halt and lease-loss skips, and the lease semantics;
- the per-IP limit;
- webhook HMAC, shop, topic and dedupe, plus order verification: verified; name, receipt, asset,
  approval and version tampering; a design receipt used as an approval; an unrecorded approval;
  upload lines;
- CLI export of the exact bytes;
- the maintenance CLI: status, backup, dry-run prune, halt and resume;
- the real `server.mjs` with generation disabled, a second instance refused, and startup without
  secrets refused;
- the signed-only `GET /proxy/ping` probe;
- the compact Hostinger compose: under 32 768 characters, byte-identical restore, refusal of a tampered runtime;
- the closed-proxy mode without `SHOPIFY_API_SECRET`, and the generated `SERVICE_SECRET_FILE` (0600, reused, never logged);
- refusal to start on a missing or non-mounted data directory when `REQUIRE_MOUNTED_DATA_DIR=true`;
- `.env.example` parsing.

The storefront suite covers:

- batches in the gallery;
- server-confirmed approval, ignoring stale and failed replies;
- choice restore after reload, never restoring the approval;
- selection at zero quota;
- pending restore;
- the exact cart properties;
- the invalid-name block;
- disabled states.

The fake images are synthetic fixtures. They prove plumbing only, never Arabic quality.

## Deploy (generation still OFF)

Requirements: one Node 24 process with TLS and a persistent disk.

**Host: the existing Hostinger VPS.** KVM 4, id 1335184, running Docker Manager and Traefik. No new
purchase.

**Deployed 2026-09-23** by the owner in hPanel, using a compact compose that Codex prepared.

Facts read on the server:
- Hostinger rejects compose content above 32 768 characters.
- Traefik runs with `network_mode: host`, the docker provider, entrypoint `websecure` and resolver
  `letsencrypt`.
- There is no shared `traefik-proxy` network. The project owns a bridge network,
  `calapres-design-net`.

`node deploy/hostinger/build-compose.mjs <out.yaml> <git-head>` is the repository's reproducible
equivalent (under 32 768 characters, tested):
- The runtime is one brotli+base64 config.
- An init container restores it into the `calapres-runtime` volume and checks every SHA-256. The
  service mounts that volume read-only.
- Data lives in `/opt/calapres-design/data`.
- No published ports. Limits: 384 MB and 0.5 CPU. `cap_drop: ALL`.
- It is **not byte-identical to the deployed file**. Do not replace the running project without
  comparing the two.

Secrets:
- `SERVICE_SECRET` is generated on the data volume at first start.
- Until `SHOPIFY_API_SECRET` is set, every proxy and webhook route answers 503, and `/healthz`
  reports `proxy:false`.

**Secure key-entry location:** hPanel > Docker Manager > `calapres-design` > environment. Enter
`SHOPIFY_API_SECRET` now, and `OPENAI_API_KEY` plus the activation values last. Then redeploy the
same project with the same compose. Never put these values in chat, the theme or GitHub.

Render (`deploy/render.yaml`) remains a prepared alternative and is not used. A plain VPS with
`deploy/` (systemd or compose plus Caddy) is another.

Order matters, because each step needs a value from the previous one. Nothing here enters a key.

1. **Code on GitHub.** `main` must contain this service (import the delivery bundle if needed).
2. **Shopify app, part 1 (Dev Dashboard, owner signed in).**
   - Apps > Create app > Start from Dev Dashboard. Name: `Calapres Name Design`.
   - Open the app's Settings and keep the page open: its **Client secret** is used in step 3.
3. **Render Blueprint (starts billing; needs commercial approval).**
   - New > Blueprint > repository `A-awd/calapres`, branch `main`,
     Blueprint path `services/design/deploy/render.yaml`.
   - Render asks for `SHOPIFY_API_SECRET`: paste the client secret from step 2. `SERVICE_SECRET` is
     generated by Render.
   - Result: service `calapres-design` (Starter, Frankfurt) with a 1 GB disk at `/var/data`. The
     service refuses to start if the disk is not mounted (`REQUIRE_MOUNTED_DATA_DIR=true`).
   - Note the service URL, for example `https://calapres-design.onrender.com`.
4. **Shopify app (Dev Dashboard, owner signed in; needs no CLI).** Values for the deployed host:
   1. Apps > Create app > Start from Dev Dashboard. Name: `Calapres Name Design`.
   2. Versions > Create a version, then Release:
      - App URL: `https://calapres-design.srv1335184.hstgr.cloud/healthz` (not embedded)
      - Scopes: `write_app_proxy` (nothing else)
      - App proxy: prefix `apps`, subpath `calapres-design`, URL
        `https://calapres-design.srv1335184.hstgr.cloud/proxy`
   3. Home > Distribution > Custom distribution > `unywbe-ub.myshopify.com` > Generate link. Open
      it and install. Set prefix and subpath **before** installing: Shopify applies later changes
      only to new installs.
   4. Settings > Client secret. Paste it straight into hPanel > Docker Manager > `calapres-design`
      > environment `SHOPIFY_API_SECRET`, then redeploy that project.
   - Use a new, dedicated app. A Shopify app has only one proxy route, and the store connector
     here cannot list the apps already installed.
5. **Verification (agent).**
   - `https://<service URL>/healthz` returns `{"ok":true,"generation":false}`.
   - `https://calapres.com/apps/calapres-design/ping` returns `{"ok":true,"proxied":true,"generation":false}`.
     Only a correctly signed Shopify proxy request gets this. The same path directly on the service
     returns 401.
   - The logs show one `proxy_client_chain` line. Adjust `TRUSTED_PROXY_HOPS` if the entry count
     shows it is wrong.
   - A restart keeps the ledger (`node maintenance.mjs status` in the Render shell).
6. **Theme.** Only then set the backup theme section's endpoint to `/apps/calapres-design`. The
   page then shows the honest "unavailable" state until activation.

Automatic order checking by webhook is optional. It needs `read_orders` plus Shopify's
protected-customer-data access. Without it, production runs `verify-order.mjs` on the exported
order JSON.

VPS alternative: copy the service, install `deploy/calapres-design.service` (or the compose
file), put the env file at `/etc/calapres-design/env` (from `.env.example`, mode 0640), add TLS with
`deploy/Caddyfile.example`, then follow steps 2, 4, 5 and 6.

### Backup and restore

- Backup, safe while running: `node maintenance.mjs backup /var/backups/calapres-design`
  (a consistent `VACUUM INTO` snapshot plus a digest manifest), then copy `DATA_DIR/originals/`.
  The originals are write-once, so rsync is safe.
- Restore: stop the service. Put the snapshot at `DATA_DIR/ledger.sqlite` and the originals under
  `DATA_DIR/originals/`. Start. Confirm with `node maintenance.mjs status`.
- Per-image outcomes (no names): `node maintenance.mjs calls 20`. Each missing image also has a `call_failed` or `design_rejected` log line.
- Retention: `node maintenance.mjs prune --older-than-days 90` lists unordered, unapproved
  originals. Add `--apply` to delete them. Approved or ordered originals are never candidates.

## Activation (last step; owner-approved)

Put the dedicated OpenAI key in the server environment only (Render > `calapres-design` > Environment > `OPENAI_API_KEY`; never in chat, theme or GitHub). Also set the re-read prices,
`MAX_OUTPUT_TOKENS_PER_IMAGE`, an explicit `BUDGET_USD_MICROS`, a provider-side spending limit,
and `GENERATION_ENABLED=true`.

Then run a bounded real test of 6–10 varied names: long, hamza, madda, ta marbuta, and names with
detached dots. A human checks spelling, the absence of marks, and artistic variety.

Then place one exact selection and order test, and run
`node verify-order.mjs <order.json> --export <dir>`.

Nothing is published before the owner accepts the result.

Still undecided at that point: the physical print size, the file format for the printer and the
colour are acceptance inputs.
