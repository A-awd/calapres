# Calapres current state

## Verified deployed batch repair — 2026-09-23 01:24 UTC

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
