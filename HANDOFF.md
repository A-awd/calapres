# Calapres handoff

## Resume Captain reply correction — 2026-09-24

Read [the dated Captain reply audit](docs/handoffs/2026-09-24-captain-reply-audit.md) and decision 0031. The owner is deciding whether to stop automatic replies until a real 60–120-second delay is available and whether explicit requests for a person should trigger handoff. The reply-length guideline was tightened in live Chatwoot and read back; a private test improved length but did not eliminate an unnecessary question. Do not claim response delay or a complete behavior fix from that test. No customer message was sent.

## Resume current Shopify product-page work — 2026-09-24

Read [the dated live product-page and gift-card checkpoint](docs/handoffs/2026-09-24-product-page-gift-card-live-checkpoint.md)
and [decision 0048](decisions/0048-compact-personalization-and-physical-gift-card.md). Verify
latest GitHub `main` and Shopify theme roles first. At the last live read, the accepted theme
`166625181952` was MAIN and `166623314176` was the only backup. The owner's rejected mobile-card
draft `166628622592` was deleted without publication. Do not restore it or reinterpret its
simulated-keyboard tests as owner approval. Older status and rollback details below are historical.

The owner prefers future coding/design delegated to Claude using a clear English brief; Codex
relays and verifies rather than interrupting active Claude work with new prompts. Preserve the
current preferred storefront and the two-theme workflow. The card-writing visibility concern
remains open for a separately reviewed visual proposal. Completed-order card property receipt,
cart thumbnail, and print production were not fully verified in this continuation.

## Style-example pivot in source — 2026-09-23 (Claude, reviewed by Codex)

Details: [style-example pivot brief and handoff](docs/handoffs/2026-09-23-style-examples-pivot.md) and [decision 0047](decisions/0047-style-examples-instead-of-live-generation.md).

- Owner pivot: no on-page generation. Six curated «مثال» style examples; exact typed name; explicit "example only" acknowledgement; Calapres makes the artwork after the order. Upload path, variants and prices unchanged. No new app.
- Patch B was applied to the backup section/template source, its JSDOM test, decision 0047 and zero-cost Arabic checks. The six example images are still missing; the source change is not yet deployed to theme `166572294400`.
- The six example images are BLOCKED: font-derived candidates pass the spelling prefilter but look typeset and stacked ones read «لمثا». Placeholders ship; the fulfilment designer should supply six «مثال» examples to the brief's specification.
- Patch A archives the superseded one-batch/quality-gate backend work; do not apply.
- Recommended: set `GENERATION_ENABLED=false` on the running service until it is retired or reused.

## Claude evidence continuation and recovery cross-check — 2026-09-23 ~14:50 UTC

Details: [evidence continuation](docs/research/2026-09-23-arabic-lettering-evidence-continuation.md).

- Independent cross-check of recovery `78c8d07`: the research markdown and HTML recovered here from the old chat transcript are byte-identical to `main`; `main` `sections/design-service.liquid` and `templates/product.design-service.json` are MD5-identical to live backup `166572294400` (`3d7bd498…`, `0d8c9749…`). The deployed backend runtime was not compared (no Hostinger read access in this session).
- Read-only: exactly two themes; MAIN `166066389248` last updated 2026-09-22 17:57Z.
- Evidence: no app or model has tested proof of exact Arabic artistic lettering. Only Calapres tests: gpt-image-2 prompt-only (rejected) and a zero-cost local exact-letter skeleton (letters kept by construction, but permitted overlaps produced «الزحمن» and «عبل» misreadings; font-like). Automated reading cannot certify calligraphy (DuwatBench best exact match 0.42). Human approval stays mandatory.
- Proposed, **not approved**: two-stage comparison, Nano Banana Pro then Seedream 5.0 Pro, each in prompt-only and exact-skeleton modes, 12 images per stage, 12 SAR cap.
- Customily trial ends 2026-10-01 (per 2026-09-22 record); decide before then. No paid request, price, theme, server, subscription or credential change in this session.

## Recovery completed in isolated worktree — 2026-09-23

The exact Claude source transfer patch and research attachments were downloaded
from the old conversation. Patch SHA-256 matched the recorded value; its changes
apply to GitHub `main` without force push. The Markdown comparison and HTML view
are in `docs/research/`; the source patch itself remains in local Downloads as
provenance, while its code and documentation are restored in this repository.
Consult the first section of `STATE.md` for current read-only Shopify/service
findings and `docs/research/2026-09-23-name-art-evaluation-gate.md` for the next
quality test. The earlier statements below about missing source are historical.
Keep the old Claude chat until remote GitHub revision is verified. No new paid
generation was made. The running spend ledger, exact app trial deadlines and
completed-order receipt still need direct verification before release.

## New Codex/Claude conversation entry — 2026-09-23

Read [the name-design chat-reset checkpoint](docs/handoffs/2026-09-23-name-design-chat-reset.md) and decision 0045. Verify current GitHub `main`, backup theme, Hostinger service, app trials and spending before action. Owner requires actual generated Arabic calligraphy with exact letters and three distinctly composed options per batch; no generic font fallback. The present images are not accepted. The old Claude chat still holds the source transfer patch and detailed research attachments, which failed to download/copy in this handoff. Recover and reconcile them first; do not delete the old chat or claim complete source backup. Published theme and prices remain unchanged; cart receipt is not a completed order.

## Verified deployed batch repair — 2026-09-23 01:24 UTC

Frontend follow-up: Claude reports backup section saved and read back with MD5
3d7bd498dffe4c357ceec14db8c91923 (source head373e118). Two focused UI
regressions fail on old code and pass on new code, according to Claude. Codex
reopened preview and verified the selected new-name design and all three images
restored. No additional paid call was made after this frontend patch, so the
pending-job reload scenario remains synthetic-test evidence only. Full source
transfer patch SHA256764e98a06b1c055c0e9ec86586729f200924e0421d53dd0f86e40b47518f8d45
is still in Claude, not imported into GitHub; base7997978.

Owner pressed Deploy; Hostinger startup at 01:22:06.979Z verified the new 14-file
runtime. Same budget, keys, persistent data and network settings retained.
One subsequent live batch completed in 14.5 seconds with visible=3, refused=0,
failed=0, screened=0, duplicate=0. Three new designs were visually verified in
the backup gallery. Prior three designs remained; remaining quota changed from
6 to3 as expected. This supersedes the pending-Deploy note below.

Found a separate frontend issue: after changing names and generating, refresh
restored the old approved name/selection and hid new results until name was typed
again. Claude is fixing only that backup section with a focused regression.
No new payment/order or publication. Source import from Claude still pending.


## Live generation and cart proof — 2026-09-23 01:07 UTC

Pending owner Deploy: Claude source 72b8c22 prepared diagnostics, bounded 429-only
retry, and per-image quota accounting. Codex verified all 14 shipped hashes and
syntax, retained every existing environment setting and data bind mount. Prepared
28,147-character compose in Hostinger editor; environment unchanged. Deployment
NOT clicked, so these fixes are NOT live. Gallery and selection restoration after
page navigation were independently verified. Latest transfer patch remains in
Claude and must be imported before claiming GitHub source reconciliation.

This observation supersedes earlier statements below that hosting/proxy/provider
are unimplemented. Owner approved existing Hostinger VPS deployment and a SAR 20
trial cap. Isolated calapres-design Docker service is running on VPS 1335184;
Shopify app proxy /apps/calapres-design is installed and works. No main-theme
publication or product/price mutation was made. Backup remains 166572294400.

Direct OpenAI gpt-image-2-2026-04-21 generation succeeded HTTP 200. The service key
remains Restricted: Images Request plus List models Read. After model allow-list
and key permission correction, real images appeared in backup product design-service.
A temporary one-day All-permissions diagnostic key was revoked after the test.
No credential is stored in this repository.

Two live batches returned partial results: one image, then two images. Three
actual images appeared in the retained gallery. Selection/approval/add-to-cart
succeeded; cart drawer displayed the name and the selected durable design link.
This proves cart retention only, NOT completed-order receipt or production readiness.
No checkout/payment was performed. Provider failure details remain to be diagnosed;
logs showed no image screening rejection for those batches.

Claude is preparing bounded per-image diagnostics and accurate partial-batch quota
handling in the existing research conversation. Keep main 166066389248 unchanged.
Hostinger deployment remains owner-click only after the previous automation review
denial; do not route around that denial. Preserve data, budget and prior designs.

Source drift is explicit: Claude's latest reported UI source is cf4c84bc43fa2f0b2c11ce513641b30d6aa68655,
not yet imported into GitHub. Deployed backup section reported MD5
ed7fb826a176ede5e092aee1d1e32035; template 0d8c974971a8529e153641647940d09e.
Local outputs/calapres-design.compact.compose.yaml holds the deployed credential-free
compact runtime. Next: import verified final Claude patch, reconcile runtime,
finish partial-batch repair, test retained gallery and order linkage without payment.


## Claude — name kept through batch completion, backup only, 2026-09-23 04:30

- Defect: with a saved choice for "عبدالرحمن", a session restore while a "مدى" batch was pending
  re-selected "عبدالرحمن". The new designs stayed hidden until the name was typed again.
  - The saved choice also survived name edits.
  - Reproduced in JSDOM: a reload while the batch was pending.
- Fix, in `sections/design-service.liquid` only:
  - The saved choice is restored only on an untouched initial load.
  - A pending batch shows its own requested name.
  - Editing the name or switching mode drops the saved choice.
  - Completion never assigns the name.
  - Old designs stay reachable by their name.
- Tests: UI scenarios 9 and 10 fail on the previous section and pass now. The 36 backend tests
  pass. No backend change.
- Deployed only to backup 166572294400. Read back `sections/design-service.liquid` MD5
  3d7bd498dffe4c357ceec14db8c91923, equal to the repo.
- Unchanged: template 0d8c9749…, main settings_data cc9d382e…, two themes, product template
  suffix null, prices 390/400.

## Claude — partial-batch diagnosis and fix (not deployed), 2026-09-23 04:20

- Evidence and root cause, from the code plus the owner's observations:
  - Live batches: job 5890d35c returned 1 of 3 images; job 827c78b6 returned 2 of 3.
  - The logs held no `design_rejected` event. In the deployed worker, the only drop path that is
    not logged is a provider-call error. Those errors are recorded only in the private SQLite
    `calls` table, with their internal code.
  - So the 3 missing images were provider-call failures. Their exact codes are in that table and
    are not yet read.
  - Job 827c78b6 took 49 s. That matches the service's own 5 images/min limiter (the third call
    waited for job 5890d35c's window). It is not by itself evidence of a provider rate limit.
- Quota defect: the ledger counted batches, so 3 visible designs used 6 of the 9.
- Fix (source only; nothing deployed):
  - `provider.mjs` keeps the provider's short error code (never the message) and `retry-after`.
  - `worker.mjs`:
    - logs `call_failed {job, slot, code, providerCode, billed}`;
    - records `visible`, `screen:<reason>`, `duplicate` or `<code>:<providerCode>` per slot;
    - `job_done` gains per-category counts;
    - retries only HTTP 429, at most twice, within the queue deadline.
  - `ledger.mjs`: the quota counts possibly billed images (9 per session per 24 h, whole batches of
    3). Certain refusals are free. Pending, interrupted or unrecorded batches count 3.
  - `maintenance.mjs calls [N]` gives per-slot outcomes without names.
  - Screening is unchanged. The pinned model, prices, 20 SAR budget and theme are unchanged.
- Tests: 36 backend tests plus the UI suite pass. The same 36 also pass on the shipped
  (comment-stripped) runtime.
- Compact compose (repo builder): 27 934 characters. It keeps the project name, the
  `calapres-runtime` volume, the `calapres-design-net` network and `/opt/calapres-design/data`.
  - The data mount must equal the running project's before the owner replaces the compose.
    Otherwise the ledger and the 20 SAR spend record would start empty.
- Remaining manual action: the owner deploys it in hPanel (the automatic review denied it before).
  Then run one batch and read `call_failed` and `job_done` in the logs.

## Claude — storefront empty-batch fix, backup only, 2026-09-23 03:58

- Live context reported by Codex; not re-verified by Claude:
  - Generation is enabled: budget 5 333 333 µUSD (20 SAR), key restricted to Images.
  - Every live job so far ended released with `visible=0`.
  - Direct OpenAI calls return 403 `model_not_found` for `gpt-image-2-2026-04-21` and for the
    alias, even after the project allowlist was edited. **Unresolved.**
  - No model switch, no redeploy, no extra paid calls.
- Fixed in `sections/design-service.liquid`:
  1. An empty gallery guides the customer ("اكتب الاسم ثم اضغط «اعرض 3 تصاميم».", i.e. type the
     name, then press "show 3 designs") and never invites a choice.
  2. A batch that ends with no new design shows "تعذر إنشاء التصاميم. لم يصلنا أي تصميم؛ حاول
     لاحقاً أو ارفع تصميمك." ("the designs could not be created; no design reached us; try later or
     upload your design"). Progress stops, and older designs and the selection are kept.
  3. A late session reply never overwrites or re-fills a name the customer typed or cleared.
  - No provider detail is shown, because the session API has none.
- Tests:
  - The UI suite gained three regression scenarios: empty completion, keeping older designs and
    the selection, and late restore. They fail on the previous section and pass now.
  - 35 backend tests pass.
- Deployed **only** to backup 166572294400: `sections/design-service.liquid`, read-back MD5
  ed7fb826a176ede5e092aee1d1e32035, equal to the repo.
- Unchanged:
  - template 0d8c9749… with the endpoint `/apps/calapres-design`;
  - main theme settings_data cc9d382e…;
  - two themes;
  - product template suffix null;
  - prices 390/400.
- Backend follow-up, prepared as a design only and not implemented or deployed:
  - Add to the `/session` contract a `lastBatch: {state, visible, code}`, with `code` from a
    fixed safe set: `PROVIDER_UNAVAILABLE` when all calls were refused unbilled, `SCREENED_OUT`,
    or `FAILED`.
  - The storefront would then map the code to Arabic text. It would never pass provider messages
    through.

## Claude continuation — Shopify integration live, backup connected, 2026-09-23 03:40

- The app `Calapres Name Design` (426882269185) was created by Codex in the Dev Dashboard:
  - version `calapres-design-proxy-1`;
  - scope `write_app_proxy` only;
  - proxy `apps/calapres-design` → `https://calapres-design.srv1335184.hstgr.cloud/proxy`;
  - installed on the store.
  - Its secret is only in the Docker Manager environment.
- Verified by Claude:
  - `https://calapres.com/apps/calapres-design/ping` → 200 `{"ok":true,"proxied":true,"generation":false}`.
- Verified by Codex:
  - backend `/healthz` → `proxy:true`, `generation:false`.
- Backup theme 166572294400 only:
  - `templates/product.design-service.json` now has `settings.endpoint = "/apps/calapres-design"`.
  - Read back MD5 0d8c974971a8529e153641647940d09e; the rest of the file is unchanged. The repo
    copy is identical.
- Unchanged:
  - primary theme settings_data cc9d382e…;
  - two themes;
  - product template suffix null;
  - prices 390/400;
  - section ec8d5d29….
- Not done:
  - the live browser check of the preview (robots.txt blocks it here);
  - OpenAI activation (last);
  - the real Arabic test;
  - the order test, including the absolute order image URL.
- Generation stays false, and the budget stays 0.

## Claude continuation — hosting live, Shopify app pending, 2026-09-23 03:35

- **Deployed and verified by Codex** on the existing Hostinger VPS 1335184:
  - The owner pressed Deploy in hPanel for project `calapres-design`, using Codex's compact
    compose (26 879 characters; the Hostinger limit is 32 768).
  - The main container is running; init exited as expected.
  - `GET https://calapres-design.srv1335184.hstgr.cloud/healthz` returned 200
    `{"ok":true,"proxy":false,"generation":false}`, with no TLS bypass.
  - n8n and traefik are still running. Traefik config was unchanged; the project owns the
    `calapres-design-net` bridge.
  - This workspace cannot reach the VPS itself, so Claude has not re-checked it.
- Repo: `deploy/hostinger/build-compose.mjs` now builds an equivalent compact compose (32 222
  characters). The same 35 backend tests plus the UI suite pass. The old oversized builder output
  is withdrawn. The deployed file itself should be committed by Codex.
- **Not done:**
  - Dev Dashboard app and App Proxy. `/apps/calapres-design/ping` returns 404.
  - Backup theme endpoint, still blank.
  - The OpenAI step (last).
  - Any generation or order test.
- Store re-read 03:35:
  - two themes;
  - primary settings_data cc9d382e…;
  - backup section ec8d5d29…;
  - backup template c63e7e65… with empty settings;
  - product template suffix null;
  - prices 390/400.

## Claude continuation — Hostinger deployment attempt, 2026-09-23 03:05

- The owner chose the existing Hostinger VPS (no Render purchase).
- Hostinger connector, live read: `KVM 4` active, next billing 2026-10-22. No VPS read tools are
  exposed.
- Prepared and verified locally (commits after 1610165):
  - Hostinger compose builder: isolated project, integrity-checked init, resource limits, no
    ports.
  - Server-generated service secret.
  - Closed proxy until the app secret exists.
  - Tests: 34 backend tests plus the UI suite. The same suite passes on the minified shipped
    bytes, and the exact shipped code and env ran locally.
- **The deploy call was blocked by this session's permission classifier. Nothing is deployed and
  the VPS is unchanged.** n8n and traefik were not touched.
- Unverifiable from here: the workspace and web fetch cannot reach the VPS. Live checks go
  through the Shopify proxy (`/apps/calapres-design/ping`) once the app exists.
- Theme unchanged:
  - backup section MD5 ec8d5d29…, endpoint blank;
  - two themes;
  - primary settings_data cc9d382e…;
  - prices 390/400.
- Next: see READINESS "Smallest unblock". Deploy first, then the Dev Dashboard app, then the
  agent verifies and connects the backup theme only.

## Claude continuation — host and app preparation, 2026-09-23 02:40

- Status by layer: `services/design/READINESS.md` (implemented, locally tested, deployed, live,
  blocked). **Nothing is deployed. There is no app, and no live proxy.**
- Added:
  - `services/design/deploy/render.yaml`: Starter + 1 GB disk, Frankfurt, generation off, budget 0.
  - `REQUIRE_MOUNTED_DATA_DIR` guard: the service refuses disposable storage.
  - Signed-only `GET /proxy/ping` for the live proxy check.
  - A one-time `proxy_client_chain` log line, to confirm `TRUSTED_PROXY_HOPS`.
  - App scope reduced to `write_app_proxy`; the order webhook is optional.
  - Exact Dev Dashboard field values in the README Deploy section.
- Tests: 33 backend tests plus the UI suite pass. The Render build and start were simulated with
  the Blueprint's exact environment.
- Live, read-only, 02:35:
  - exactly two themes;
  - primary settings_data MD5 cc9d382e…, unchanged;
  - backup `sections/design-service.liquid` MD5 ec8d5d29…, equal to the repo, endpoint blank;
  - product template suffix null;
  - variants 390.00 and 400.00.
  - The storefront is reachable via WebFetch. `/apps/calapres-design/ping` is 404 today, as
    expected with no app.
- Next, in order (details in READINESS):
  1. Import the delivery bundle via Codex.
  2. Owner approves Render at about 28 SAR/month, enables Render in this chat, and creates the
     Blueprint.
  3. Owner creates and installs the Dev Dashboard app.
  4. Agent verifies live and connects the backup endpoint.

## Claude implementation checkpoint — design service, 2026-09-23 (audit pass)

- Source `services/design/` (decision 0046, audit amendment):
  - app-proxy HMAC and signed sessions;
  - reserve-then-settle budget, with recorded overshoot and a halt switch;
  - single-worker lease;
  - queue deadline;
  - server-confirmed approval receipts;
  - webhook HMAC, topic and delivery dedupe;
  - write-once SHA-256 originals;
  - maintenance CLI (status, backup, prune, halt, resume);
  - Dockerfile, compose, systemd and Caddy templates.
- Tests (Node 24.21, fake provider only): 32 backend tests plus the JSDOM storefront suite pass.
  The real `server.mjs` was started with generation disabled, a second instance was refused, and
  the Docker file set was started. These prove plumbing, never Arabic quality.
- Cost wording corrected. The budget is a reservation policy, not a provider invoice cap. No
  designs-per-budget number is claimed. Prices and the per-image ceiling stay unverified until
  activation.
- Theme: only `sections/design-service.liquid` changed on backup 166572294400. Its MD5
  ec8d5d291e54c0b961ed86eb2f6db343 equals the repo copy.
  - Added: server-confirmed approval, choice restore after reload (the approval is never
    restored), batch grouping for 9 designs, and a full-size preview link.
  - The endpoint is still blank.
  - Checked in Chromium at 390 px using labelled placeholder tiles.
- Verified unchanged: exactly two themes; primary settings_data MD5 cc9d382e…, with
  product.json and main-product dated 2026-09-09; product 9575273300224 template suffix null;
  variants 390.00 and 400.00 SAR.
- Blocked, with exact actions in `services/design/READINESS.md`:
  - No accessible host. The VPS is unreachable. Catalyst has no organization. Render and Vercel
    are not enabled in this chat, and Render needs a paid disk.
  - Dev Dashboard app and App Proxy.
  - GitHub push, which the session proxy refuses.
- The superseded font-reference experiment is preserved locally on branch
  `preserve/font-reference-20260922` (commits f23d88b, a4f1341). Its files remain on the backup
  theme only.
- Re-checked 2026-09-23 02:20:
  - Push is still 403.
  - Catalyst has no organization.
  - Render, Cloudflare, Vercel and Neon are connected to the account but not enabled in this chat.
  - No tool can create a Shopify app.
  - Nothing was deployed.
  - Cost and timeout wording was tightened: a dispatched request that times out may still be
    billed, and provider limits are not verified hard caps.
- Next safe action: the owner provides a host (VPS access or an approved Render service) and the
  Dev Dashboard app. Then run `README.md` deploy steps 1–6 with generation off. The key, prices,
  ceiling, budget and provider-side limit come last.

## Owner-directed Claude continuation — 2026-09-23

Owner explicitly deferred all API-key setup: implement the remaining unpublished
Shopify personalization first; bind the key and test paid generation last. Owner
then requested continuation in the existing Claude Calapres research conversation:
https://claude.ai/chat/f993608e-437c-40c8-bb98-a2692e03004b

Fresh Shopify read reconfirmed exactly two themes: MAIN 166066389248 and
UNPUBLISHED 166572294400. No theme mutation occurred during this continuation.
Added source drafts only: services/design/security.mjs (proxy HMAC, exact Arabic
name validation, signed receipts) and provider.mjs (direct OpenAI image adapter,
low quality, three separate calls planned, nine layout prompts, no paid retries).
Both passed syntax checks only. They are NOT integrated, deployed or behaviorally
tested. Existing ledger/UI tests are from the previous checkpoint. No API request
or paid image generation occurred. No key is saved in this repository.

Remaining: implement HTTP endpoints and durable original storage, integrate
ledger/worker/receipts, test invalid signatures/names, concurrency, restart, quotas,
approval persistence, gallery restoration and upload/cart. Fix initial pending-job
restoration in the frontend; deploy only changed files to backup. Arrange hosting
and the dedicated Shopify app/proxy through available authorized access; report
real access or paid-hosting blockers. Keep generation disabled until credentials,
validated cost reservation and an explicit budget are configured. Do not claim
that only the OpenAI key remains before hosting and Shopify proxy actually work.

The browser-controlled OpenAI account created a key named Calapres Shopify Name
Designs, but local-save confirmation did not approve any write. No plaintext was
read or retained. The owner sees Codex on MacBook Air while this task runs on Mac
mini; remote browser state must not be claimed visible on the owner's device. Do
not repeat key-creation/confirmation flows; owner explicitly postponed this work.


## Active task — design services, 2026-09-23

Continue decision 0045 and `services/design/README.md`. The two-path UI is deployed
only to backup 166572294400 at product view `design-service`; native upload uses
the existing paid-upload variant. No price changes, publication or default product
template reassignment. AI is deliberately unavailable in preview until a real
backend is activated. The global reservation ledger is source-only and tested;
the provider, app proxy, hosting, image storage and receipts are still unimplemented.
Owner was asked for a numerical trial budget (20/50 SAR or keep disabled); no answer
was received during this checkpoint. Do not confuse UI or synthetic tests with a
live generation or manufacturing-ready design. Next: establish exact cap and
dedicated provider access, finish/deploy backend, then run a bounded actual Arabic
generation and exact-selection/order test. Main and prior trial files were preserved.

Updated: 2026-09-13

Canonical repository: `A-awd/calapres`. Approved branch: `main`.

## Telegram owner-bridge live root cause — 2026-09-22

The bridge is published and Telegram ingress works. Live executions `52691` and `50456` both fail
at `Ask Owner Agent From Text` because n8n Gateway credits are depleted; the current credit balance
was displayed as zero. The reply node is therefore never reached. The workspace also completed an
n8n 2.41.0 restart and returned Online, but the same depleted-credit error predates that restart.

No production setting was changed. Resume only after the owner chooses either Gateway funding or a
separately approved dedicated direct OpenAI credential. Bind only the chosen model path, run one
bounded owner text canary and one owner voice canary, and verify the Telegram reply before claiming
recovery.

## MCP-first operations health checkpoint — 2026-09-22

A source-only, inactive Calapres operations-health MCP gateway now exists. It exposes one fixed
read-only tool and cannot manage n8n, send messages, modify commerce/ads, read credentials, or
return customer content. The Easy Life MCP gateway was intentionally left unchanged.

This is not a live repair or proof of current Telegram/Chatwoot state. Resume by reviewing decision
0044, the gateway template, deployment manifest, schema, tests, and documentation. The next
production step requires explicit owner approval: import inactive, bind dedicated least-privilege
credentials, deploy the separate sanitized producer, run synthetic cases, verify exactly one tool,
and only then decide whether to activate and register the connector.

## Chatwoot routing checkpoint — 2026-09-14

Chatwoot is an existing, project-owned operational system for Calapres, not an unconnected future
source. Canonical decisions record Captain attached to the WhatsApp, Instagram, and TikTok inboxes,
with the legacy all-purpose n8n responder unpublished. Two isolated read-only Captain bridges and
the separately approved paid-order WhatsApp workflow are also recorded as implemented.

The paid-order owner canary reached Chatwoot and was recorded as delivered, with a normal replay
stopped before a second send. The unresolved proof is narrower: the next fresh production payment
event and new-contact path remain unobserved end to end, and every dated Chatwoot/n8n configuration
fact must be refreshed before current operational claims.

If Easy Life lacks a Chatwoot reader or credential, report `monitoring unavailable`; do not convert
that access limitation into `Chatwoot missing` or `disconnected`. No live platform was changed by
this checkpoint.

## Resume here

Read `README.md`, `AGENTS.md`, `STATE.md`, `DECISIONS.md`,
`LAUNCHER.md` and the directly relevant decision. Refresh live Shopify,
Chatwoot, OTO, analytics or campaign facts only when the selected task needs
them.

The latest safe continuation is a read-only check of the MDA
partnership/publication state and existing purchase-attribution evidence. The
`/mda` redirect was verified on 2026-09-11, but campaign publication and
purchase attribution were not. The owner's acceptance report supersedes older
text that says the partnership was pending; live acceptance remains unverified.

## Current boundaries

- Do not repeat an owner payment merely to test telemetry.
- Do not create a shipping label at booking. Current policy releases it manually
  after customization is ready.
- Do not send customer messages, buy shipping, activate a campaign, publish a
  theme, delete history or change permissions without the applicable authority.
- Keep private evidence and media in the verified iCloud project location.
  GitHub receives sanitized locators and outcomes only.
- Preserve Drive originals. The 42-file identity/size match is not remote byte
  identity, version-history completeness or deletion approval.
- Treat all dated live observations as stale until refreshed.

## Confirmed continuation state

The latest recorded theme fixed duplicate add-to-cart tracking. Apple Pay
succeeded on owner test order #1003, while purchase telemetry remained
unverified. Chatwoot was set to reopen the same conversation; historical
experimental conversations remain. Customer-message drafts exist but were not
activated. Embedded OTO label automation was most recently recorded off;
standalone rules remain unchecked.

## Durable history and rollback

The complete former root handoff is preserved byte-for-byte at
[`HANDOFF.full-through-2026-09-11.md`](HANDOFF.full-through-2026-09-11.md).
The adjacent `receipt.json` records its SHA-256, byte count and source commit.
Restoring those archived bytes to the root paths reverses this compaction.

Detailed current campaign evidence is in
[`docs/handoffs/2026-09-11-mda-snapchat-continuation.md`](docs/handoffs/2026-09-11-mda-snapchat-continuation.md).

## Completion

This next step is complete only when the live partnership/publication and
existing purchase evidence are read, their timestamps and unavailable sources
are explicit, no new payment or production mutation was used as a shortcut, and
`STATE.md` records confirmed results, pending work, blockers and the exact next
action.

## Engraving personalization research — 2026-09-22

- Research only: [Arabic decision report](docs/research/2026-09-22-engraving-personalization.md) compares seven Shopify apps with a custom three-template theme experience.
- Live read-only observation: Calapres is on Basic; the white burner page shows the existing text-only and uploaded-design paths. No three-design approval interface was observed.
- Recommended evaluation: deterministic approved templates, no runtime generative-image dependency; Customily first for documented manufacturing exports, Cloudlift with its paid Export extension as a conditional economical alternative. Arabic shaping, simultaneous previews, output fidelity, machine compatibility, and performance remain untested acceptance gates.
- Basic constraint: custom apps containing Shopify Functions require Plus; a theme-only required checkbox is not server-side checkout enforcement. Any new backend/storage boundary remains a proposal, not an approved architecture change.
- No app installation, theme/product/cart change, order, customer/vendor message, payment, or deployment occurred. No new recurring automation was created.
- Next safe action: obtain the three intended design examples and manufacturing area/file requirements; then scope a bounded unpublished pilot. Do not infer permission to install a paid app or publish a theme from this research request.


## Engraving app trials installed — 2026-09-22

Owner explicitly approved all four installations and GitHub-based unpublished theme experiments. Shopify Installed apps now verifies Customily, Cloudlift LPO, Zepto and Teeinblue. Customily trial ends Oct 1, Teeinblue Oct 6, Zepto Oct 7; Cloudlift is installed with setup pending and no subscription trial date verified. No theme was published or edited in this installation step. Live theme is 166066389248 despite its “test” name. App-created global resources require an audit before preview activation; do not equate an unpublished theme with isolated app installation. See [trial evidence and next action](docs/research/2026-09-22-engraving-app-trials.md). Earlier manual-install blocker is resolved. Daily deadline follow-up is recorded as automation-2. Next: identify GitHub binding, prepare an unpublished experiment target, configure and compare the apps, then retain the proven winner and cancel three losers before trial renewal.
