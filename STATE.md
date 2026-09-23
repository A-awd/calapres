# Calapres current state

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

## Source recovery and live read-only check — 2026-09-23 14:30 UTC

Recovered `calapres-transfer.patch` from the original Claude chat. Its SHA-256 is
`764e98a06b1c055c0e9ec86586729f200924e0421d53dd0f86e40b47518f8d45`,
matching the recorded checksum. Applied its source changes and Claude's research
patch to a clean worktree based on GitHub `main` `3066162`, without force push.
The recovered Markdown report matches the separately downloaded document byte for
byte; its HTML presentation is preserved in `docs/research/`. No credential values
were found in the imported files by the targeted secret scan. Backend tests passed
36/36 and the UI regression suite passed after installing locked dependencies.

Shopify currently has exactly two themes: primary `166066389248` published and
backup `166572294400` unpublished. Product `9575273300224` still has the default
template and variants at 390 and 400 SAR. Shopify's app settings show Customily,
Zepto and Teeinblue installed with a `Free trial` label, plus Live Product Options
and Calapres Name Design installed; exact trial expiry and subscription charges
were not verified. Service `/healthz` and app-proxy `/ping` each returned HTTP 200
and `generation:true`; this is a health/configuration signal, not a spend-ledger
or output-quality check. The backup preview displayed stored name designs and zero
remaining designs for this browser session in the 24-hour window. No paid image,
cart action, order, publication, deployment or price change was requested here.

The current `مدى` art remains rejected. See the fresh evaluation note at
`docs/research/2026-09-23-name-art-evaluation-gate.md`. Do not make a shopper-facing
quality claim or another paid attempt until exact Arabic letters and materially
different compositions are demonstrated on the benchmark names. Completed-order
retention and the running service's spend ledger remain unverified.

## Conversation reset checkpoint — 2026-09-23

The full sanitized continuation is in [the name-design handoff](docs/handoffs/2026-09-23-name-design-chat-reset.md). Latest old-Claude research was read: no Shopify app was demonstrated to generate artistic Arabic names with exact letters; Cloudlift and Zakeke are candidate trials only, not accepted solutions. The owner rejected the current `مدى` designs because letters changed and results looked alike. The next objective is to preserve the missing Claude source/research attachments, then compare actual Arabic visual output before further implementation or spending.

GitHub is still missing Claude's deployed source transfer patch (reported SHA-256 `764e98a06b1c055c0e9ec86586729f200924e0421d53dd0f86e40b47518f8d45`) and complete research attachments. Keep the old Claude chat and do not call this a safe-to-delete checkpoint yet. No production publication, price change, additional paid request, or completed-order proof occurred during this handoff.

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


## Latest personalization implementation — 2026-09-23

- Owner now approved upload-or-generated-name services, no login, retained 3/6/9
  gallery and global spend cap. Explicitly deferred every price change; do not apply SAR 19.
- Live backup 166572294400 now has `sections/design-service.liquid` and
  `templates/product.design-service.json`; main remains 166066389248. No publication
  or product template/price/variant mutation occurred.
- Preview: https://calapres.com/products/مبخرة-كالابريز-الفاخرة-الأبيض?view=design-service&preview_theme_id=166572294400
- Theme/UI checks passed. Generation visibly disabled because endpoint is blank.
  Native upload UI/submission is implemented; new completed-order receipt is untested.
- Tested source-only quota ledger lives in `services/design/`; no backend is hosted.
  Synthetic checks prove accumulated gallery and persistent cap logic, not actual AI output.
- Blockers: no exact spending cap response, dedicated provider credential or hosting
  binding. Remaining work includes real provider adapter, app proxy authentication,
  durable original-image delivery, Arabic/style quality and order receipt verification.
- Resume with decision 0045; preserve existing current variant prices. Earlier
  font-only/app-comparison plans are not the accepted customer experience.

Updated: 2026-09-13. Latest live observations below are dated 2026-09-11 or
earlier and must be refreshed before operational action.

Canonical repository: `A-awd/calapres`. Approved branch: `main`.

## Live Telegram owner-bridge diagnosis — 2026-09-22

- [Live verified] n8n workflow `Owner Telegram Voice Bridge` (`0EQB4mv5NknrXsHM`) is published and
  the Telegram trigger receives owner messages.
- [Live verified] executions `52691` (2026-09-21 23:56:54) and `50456`
  (2026-09-18 22:10:13) both reached `Ask Owner Agent From Text` and failed with
  `Your Gateway credits have been depleted. Please top up to continue.`
- [Live verified] n8n Cloud showed Gateway credits at zero. The failure occurs before the Telegram
  reply node, so no reply is sent.
- [Live verified] the workspace briefly showed `In progress` while applying n8n 2.41.0, then returned
  `Online`. That restart explains temporary availability only; it does not explain the repeated
  September 18/21 agent failures.
- [No production mutation] No workflow, credential, model, message, credit balance, webhook, or
  platform setting was changed. Recovery requires an owner choice between funding Gateway credits
  or separately approving migration to a dedicated direct OpenAI credential; either path requires
  a bounded canary before declaring Telegram restored.

## MCP-first operations health source — 2026-09-22

- [Repository-confirmed] A separate, inactive Calapres operations-health MCP gateway source now
  exposes exactly one read-only tool: `Get_Calapres_Operations_Health`.
- [Repository-confirmed] Its closed schema permits sanitized Telegram owner-bridge health,
  Chatwoot monitoring status, bounded timestamps/counts, and non-secret failure codes only.
- [Not deployed] No n8n workflow, credential, webhook, connector, Telegram bridge, Chatwoot setting,
  message, Shopify record, analytics property, or advertising account was changed.
- [Current-live state unknown] The source does not establish whether Telegram currently works or
  whether Chatwoot has unanswered conversations. Production import, a separate health producer,
  dedicated credentials, activation, connector registration, and a live canary remain approval-gated.
- [Next safe action] Review the source boundary, then obtain explicit owner approval for a bounded
  inactive import and synthetic canary before any production activation.

## Chatwoot integration classification — 2026-09-14

- [Documented and previously live-verified] Chatwoot is connected for Calapres; it is not a missing
  integration. The canonical decisions record the existing Calapres account, Captain assistant,
  WhatsApp, Instagram, and TikTok inbox attachments, and assignment automation. The old all-purpose
  n8n responder remains unpublished.
- [Documented and previously live-verified] Captain is the customer-facing responder. Its isolated
  read-only Shopify order and product-link bridges were implemented separately. The automatic
  paid-order WhatsApp workflow was later implemented and one owner canary reached Chatwoot with
  `delivered` recorded; normal duplicate prevention stopped a repeat send.
- [Current-live state not refreshed] These platform facts are dated. A launcher that cannot access
  Chatwoot or n8n must report a monitoring-access gap, not `Chatwoot missing` or `disconnected`.
- [Remaining operational proof] The next fresh production payment event and new-contact branch have
  not been observed end to end. Physical external-channel delivery for every Captain channel and
  the current platform configuration must not be inferred from Playground or historical evidence.
- [Documentation-only] No Chatwoot, n8n, Shopify, Meta, credential, customer message, or production
  setting was changed by this clarification.

## Confirmed

- GitHub owns sanitized instructions, decisions, code and continuity. Shopify
  owns current store facts; iCloud `عمل/تجارة/Calapres/Ai-Work` owns private
  project documents and media.
- The legacy Drive logo folder was identified with 42 items whose IDs, names and
  sizes matched the prior inventory. Remote byte identity and complete version
  history were not proved; Drive deletion is not approved.
- On 2026-09-11, `https://calapres.com/mda` reached the store with the existing
  campaign parameters. That proves the redirect only, not purchase attribution.
- The owner reported the MDA partnership accepted. Live acceptance, publication
  and campaign measurement were not independently verified.
- The latest recorded live theme fixed duplicate cart tracking. Apple Pay
  succeeded on owner test order #1003, while GA4/Snapchat purchase telemetry
  remained unverified.
- Chatwoot was configured to reopen the same conversation and the optional
  resolution outcome was removed. Historical experimental conversations were
  not deleted.
- The owner requires manual shipping-label release after customized goods are
  ready. The latest recorded embedded OTO auto-create and discounted-checkout
  toggles were off; standalone OTO rules remain unchecked.

## Completed documentation and assets

- The MDA link guide, influencer operating guide, customer-message drafts and
  supporting evidence were saved under the verified iCloud project root. Local
  saves were checked; server sync or second-device restore was not established.
- The full prior root state is preserved byte-for-byte at
  [`STATE.full-through-2026-09-11.md`](STATE.full-through-2026-09-11.md).
  Its receipt records the pre-compaction hash and source commit.
- Detailed MDA continuation evidence remains in
  [the 2026-09-11 handoff](docs/handoffs/2026-09-11-mda-snapchat-continuation.md).

## Pending

- Refresh the live MDA partnership/publication state and purchase evidence
  across Shopify, GA4 and Snapchat.
- Observe the next fresh production payment event and new-contact branch before treating that
  transactional path as fully proven. Do not repeat the delivered owner canary or send a customer
  message merely to manufacture evidence.
- Inspect standalone OTO rules only after pickup/contact/package facts are
  available. Do not create a label, buy shipping or activate automation without
  the applicable authorization.
- Preserve Drive originals until remote byte identity, historical coverage and
  the required deletion approval are complete.
- Review any unpublished creative or theme change against the relevant decision
  and current live theme before publication.

## Blockers and approval gates

- Live commerce and campaign facts are stale until read again.
- Pickup address/contact, packaged weight/dimensions and preferred carrier remain
  owner-supplied facts.
- A payment, shipment purchase, customer message, campaign activation,
  production publication, deletion or permission change requires its applicable
  explicit authorization.
- iCloud upload and independent restore remain unverified where noted.

## Exact next safe action

Perform a read-only refresh of the MDA partnership/publication and existing
purchase-attribution evidence. Continue from verified live results without
repeating payments, sending messages or changing production. Update this file
and `HANDOFF.md` after the result.

## Engraving personalization research — 2026-09-22

- Research only: [Arabic decision report](docs/research/2026-09-22-engraving-personalization.md) compares seven Shopify apps with a custom three-template theme experience.
- Live read-only observation: Calapres is on Basic; the white burner page shows the existing text-only and uploaded-design paths. No three-design approval interface was observed.
- Recommended evaluation: deterministic approved templates, no runtime generative-image dependency; Customily first for documented manufacturing exports, Cloudlift with its paid Export extension as a conditional economical alternative. Arabic shaping, simultaneous previews, output fidelity, machine compatibility, and performance remain untested acceptance gates.
- Basic constraint: custom apps containing Shopify Functions require Plus; a theme-only required checkbox is not server-side checkout enforcement. Any new backend/storage boundary remains a proposal, not an approved architecture change.
- No app installation, theme/product/cart change, order, customer/vendor message, payment, or deployment occurred. No new recurring automation was created.
- Next safe action: obtain the three intended design examples and manufacturing area/file requirements; then scope a bounded unpublished pilot. Do not infer permission to install a paid app or publish a theme from this research request.


## Engraving app trials installed — 2026-09-22

Owner explicitly approved all four installations and GitHub-based unpublished theme experiments. Shopify Installed apps now verifies Customily, Cloudlift LPO, Zepto and Teeinblue. Customily trial ends Oct 1, Teeinblue Oct 6, Zepto Oct 7; Cloudlift is installed with setup pending and no subscription trial date verified. No theme was published or edited in this installation step. Live theme is 166066389248 despite its “test” name. App-created global resources require an audit before preview activation; do not equate an unpublished theme with isolated app installation. See [trial evidence and next action](docs/research/2026-09-22-engraving-app-trials.md). Earlier manual-install blocker is resolved. Daily deadline follow-up is recorded as automation-2. Next: identify GitHub binding, prepare an unpublished experiment target, configure and compare the apps, then retain the proven winner and cancel three losers before trial renewal.
