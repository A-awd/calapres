# Project State

## Real-inbound anchor fix — 2026-08-13

The first real inbound after the capability-URL ingress deploy passed ingress, produced a live
durable claim in Neon (first live proof of the restricted Postgres path), and both authenticated
Chatwoot rereads returned 200 — then every event failed `anchor_mismatch`. Root cause, proven by
live diagnostic executions 41267–41272: the conversation-messages API omits `account_id` from
message rows (unlike webhook payload rows), so the anchor's `account_id === 179973` comparison
failed on all genuine messages; the old pinned fixtures had assumed the wrong row shape. The
anchor now validates `account_id` only when the field is present (the API call itself is pinned
to account 179973 by URL), and `Prepare Raw Chatwoot Ingress` gained a non-production-only
base64 diagnostic input used for owner-initiated manual runs. A regression test exercises the
anchor against real API-shaped rows. New source SHA-256 is
`3a10cd938146c828ff43c44fe20cf2ce992d4d632836c0b90b9e6c47aa1e1f85`.

## Chatwoot HMAC defect and capability-URL ingress — 2026-08-13

The first real owner-phone WhatsApp inbound (Chatwoot message `792970340`, n8n execution `41243`)
was rejected `signature_mismatch` by the protected ingress gate. Root cause is upstream defect
chatwoot/chatwoot#13809: Chatwoot signs webhook deliveries with an internal `hmac_token` that is
exposed through neither the UI nor the REST API, while the signing format itself matches the
workflow implementation exactly. Because no obtainable secret can verify genuine deliveries,
decision `0013-adopt-capability-url-ingress-after-chatwoot-hmac-defect` removes delivery-signature
enforcement and rests ingress authenticity on the capability webhook path, the unchanged
structural checks (raw body, 1 MiB, JSON-only parse after the gate), pinned account/inbox, the
authenticated Chatwoot reread anchor, and the atomic claim/lease layer. The frozen source is now
82 nodes; the `Crypto account 3` credential is unbound but retained. New source SHA-256 is
`f24ee6f32a2768dae37f783d4bc7c7204f3c6397397ebc2698549eefbdaaaa9f`. Execution retention was
enabled temporarily for the diagnostic capture and must be returned to no-save with the fix
deployment. The owner-phone round trip remains the acceptance gate.

## Recovery cadence quota fix — 2026-08-13

The protected MVP recovery schedule was reduced from every 1 minute to every 15 minutes inside the
frozen source `n8n/deployments/calapres-cs-bot-protected-draft.json`. Rationale: the n8n Pro plan
allows 10,000 executions per month and August usage was already 2,086; a 1-minute cadence alone
consumes ~43,200 executions per 30 days and would exhaust the plan around 2026-08-19. Fifteen
minutes matches the 900-second maximum retry delay enforced by migration 0013's
`atomic_release_customer_reply_recovery` contract, keeps reconciliation SLA within one DB retry
ceiling, and costs ~2,880 executions per 30 days (~29% of plan), leaving headroom for both
Chatwoot-triggered workflows. The trigger node was renamed to
`Recover Ambiguous Sends Every 15 Minutes`; recovery still has no send path. The update manifest
now records `interval_minutes: 15` and 2,880 estimated monthly executions. New source SHA-256 is
`30b477d79c988c922fd5a3c7d04febbf4fe9255ed84fbe65e9a840f95a001818` and the regenerated release-lock
digest is `f55598279f17dd6b03857c9fbeb63815e5c0e0a8d6937bf3ca01049beeb22e93`. Python 92/92,
Node 249/249, and the release-lock check all passed after the change. The live workflow
`kAyF0D3ZZHxc0Hwp` is being updated to this exact source; the retained rollback version
`8c518aeb-22c2-4ab9-bcef-7418029386da` is unchanged. The owner-phone inbound proof remains the
final outstanding evidence.

## Clean-session checkpoint — 2026-08-13 14:56 +03

GitHub and `origin` were rechecked immediately before closing the long implementation session.
Branch `agent/preserve-calapres-customer-service-checkpoint`, Draft PR #4, and the local checkout
all pointed to `6889b74a5539b3dc4d1337fe76ff97074d9fade3`; all three GitHub checks were green.
The protected customer-reply source remains frozen at SHA-256
`6ae66e6bd80e7ef5d635cf0c7c75c468a6c3f7098b6161336dd15d248500a619`, and the release lock
digest remains `1203cedc5737711a371699a80a5249eb2367dc39d0dde133c80960250c904566`.

The current live n8n truth is that the existing MVP workflow `kAyF0D3ZZHxc0Hwp` is active on the
protected 83-node version `941205ae-dab2-4684-b897-dee3655a2af7`. Version
`8c518aeb-22c2-4ab9-bcef-7418029386da` is the retained rollback. Edge v2
`e442GlRmKP4IO8pm` was preserved and was not replaced or duplicated. No new workflow or Chatwoot
webhook was created during the protected activation.

The frozen verification result remains Node 249/249, Python 92/92, plus green JSON, syntax, graph,
release-lock, secret, and PII checks. Neon main remains on migrations 0001–0013 with restricted
runtime roles, direct table access denied, and the database budget control enabled with kill switch
off, a USD 45 monthly ceiling, a USD 0.05 reservation, and 20 requests per conversation per day.
No Shopify write, private note, or model request occurred in the final synthetic test batch.

One technical manual message was sent only to the owner's Chatwoot conversation #3. The final
owner-phone inbound proof is still not recorded: a fresh inbound WhatsApp message must produce
exactly one protected reply, durable event/send completion must be verified in Neon, and replay
must not create a second reply. Until that evidence exists, do not call the system fully proven
end to end for real inbound traffic.

Claude Code has been given the implementation/audit continuation prompt, but no future claim or
change from that run is authoritative until it is compared with GitHub, the exact live n8n version,
Neon, and Chatwoot. The next clean session should audit Claude Code's output against this checkpoint,
preserve the working protected version, and avoid redesign, duplicate workflows, another webhook,
or a premature merge to `main`.

## Calapres protected customer-reply candidate — 2026-08-13

The existing live MVP workflow `kAyF0D3ZZHxc0Hwp` is active on protected version
`941205ae-dab2-4684-b897-dee3655a2af7`; rollback version
`8c518aeb-22c2-4ab9-bcef-7418029386da` remains available. No duplicate workflow was created and
Edge v2 `e442GlRmKP4IO8pm` was not changed. The frozen protected source SHA-256 is
`6ae66e6bd80e7ef5d635cf0c7c75c468a6c3f7098b6161336dd15d248500a619`.

The protected draft verifies Chatwoot HMAC over the raw body, acknowledges eligible events only
after a durable Neon claim, rereads Chatwoot before decision and send, uses deterministic
greetings/FAQ/scope replies, reserves the model budget before a restricted model call, reads
Shopify through GraphQL queries only, and requires an exact PostgreSQL send lease before the sole
customer-egress node. Sensitive or uncertain cases receive the `human` label and no customer
reply. Recovery verifies both the Chatwoot marker and reply SHA-256; transient read failures are
rescheduled and recovery has no path to customer send.

Neon main now has migrations 0001–0013. Migration 0013 was first proven on isolated branch
`br-misty-glade-awba7bxf` and then applied to main. Runtime execute grants remain function-specific,
direct table reads remain denied, and the live recovery queue had zero due rows. Targeted n8n
executions `41145`–`41160` covered signature mismatch/staleness, wrong inbox, durable duplicate,
PostgreSQL uncertainty, later human/private/AgentBot activity, an exactly-100-row page, malformed
anchor, scope suppression, kill switch, model failure, and a fully pinned successful delivery.
No real customer message, private note, model request, or Shopify write was made by these tests.
Execution payload retention is restored to disabled.

After the GitHub source guard and Shopify CI both passed on commit `8c4d969`, the exact frozen
draft was published to the same workflow. Live n8n now reports active version
`941205ae-dab2-4684-b897-dee3655a2af7`, 83 nodes, two triggers, and success/error/manual/progress
retention disabled. The prior active version `8c518aeb-22c2-4ab9-bcef-7418029386da` remains the
rollback. Chatwoot has two pre-existing `message_created` webhooks: Edge observation and the MVP;
no third webhook was created. A locally signed, non-customer outgoing fixture using the existing
MVP Chatwoot secret returned HTTP 204 from the published endpoint, proving the live HMAC binding
without entering PostgreSQL or customer send. A wrong-HMAC request returned 401.

Neon remained at migration 13 with zero customer-reply events and zero unresolved sends after
publication. The budget control is enabled with kill switch off, a 45 USD monthly ceiling,
0.05 USD per reservation, and 20 model requests per conversation per day. The isolated validation
branch was reset from main successfully; migration 13 and restricted execute permissions remained
present after restore, while direct runtime table reads remained denied.

## Current phase

Shopify-native storefront and catalog readiness, plus verified Calapres customer channels in
Chatwoot. The Nawadir Dior supplier architecture and all Supabase-based Calapres architecture are
retired. Decision 0010 closes the customer-service pre-implementation gate and authorizes a
Calapres-only observation runtime. No production customer-service bot or automatic customer send
is deployed.

## PostgreSQL provider gate — 2026-08-12

Neon is the selected PostgreSQL provider for the inactive Calapres observation runtime. Project
`shiny-hill-38628371` / database `neondb` has migrations 0001–0010 applied, including a deny-first
model-budget guard with a hard `$45` monthly reservation ceiling, a 20-request daily conversation
cap, and a default-on kill switch. It has 25 Calapres tables,
40 routines, SSL-required n8n credentials for the restricted Webhook and Reconciliation login
roles, and verified callable-boundary ACLs. No customer traffic, customer send, or Shopify write has
occurred. The existing Edge workflow `e442GlRmKP4IO8pm` remains the only target and is now published
and active for observation. The v2 source is imported into that same target;
its 15 PostgreSQL nodes use the project-scoped Webhook and Reconciliation credentials, and the
read-only Shopify branch is present with the project OAuth2 read credential bound (149 nodes total).
Node tests are 175/175 and Python tests are 92/92. A real two-session Neon check verified the
database clock, Webhook execute permission, Reconciliation denial, transaction rollback, and
single-winner session locking. A temporary Neon branch matched the primary schema with no diff and
was removed after verification. Provider backup-restore service recovery and live Chatwoot
observation remain unproven.

Current recheck: Neon reports PostgreSQL 18.4, all ten migration records, four restricted runtime
roles, and the expected deny-first budget defaults (`enabled=false`, `kill_switch=true`, daily limit 20,
monthly limit 45 USD). The existing n8n target passed synthetic valid-signature, modified-body, and
invalid-signature webhook runs (executions 40786, 40787, and 40785); these were internal tests only and
no customer message was sent. Targeted Node coverage passed 83/83. The workflow is now active with
published version `8d4d3e38-1ecd-47ee-beeb-fd2189e60f26`.

## Preserved customer-service source release — 2026-08-12

The Calapres Edge v2, transactional-state, reconciliation, context/LLM boundary, schemas, fixtures,
and tests are preserved on branch `agent/preserve-calapres-customer-service-checkpoint` as a
frozen candidate, now imported into the existing inactive target. Edge v2 contains the bounded four-inbox Chatwoot reconciliation
scan/cursor graph inside the existing Edge, with the schedule disabled and all live authority closed.
The current source hash is `c3f2e3f00c6cfeeeba42966639303056fd178e7b67ed512a6d39c6da6e22d991`; the deployment
manifest matches it, and
[`docs/calapres-customer-service-checkpoint-2026-08-12.md`](docs/calapres-customer-service-checkpoint-2026-08-12.md)
records the source-only boundary.
`support/brands/calapres/customer-service-release-lock.json` verifies the frozen source set. GitHub
`main` remains the approved runtime baseline until this candidate is reviewed and merged.

The release lock was refreshed in commit `86d59eb` after the read-only Shopify customer branch was
bound to the strict Core input envelope;
the lock check and targeted PostgreSQL tests pass. The final Edge URL is verified as
`https://kunads90.app.n8n.cloud/webhook/calapres/customer-service/chatwoot/v2`. Chatwoot now has
exactly one saved observation webhook, subscribed only to `message_created`; its signing secret is
stored in the project-scoped n8n Crypto credential. The Edge workflow is published and active for
observation; no customer message has been sent. Shopify read access is available through the
connected read-only MCP and the active Edge target has the read-only Shopify branch bound to
the project OAuth2 credential. The model credential is present, but the model call remains
structurally closed and the budget guard remains deny-first.

Live signature recheck found that the existing n8n Chatwoot HMAC credential did not match the secret
shown by the existing Chatwoot webhook edit form. The existing credential was corrected in place
without creating a new credential; the same synthetic raw-body POST then returned `200`, and Chatwoot
shows exactly one enabled webhook. A permitted synthetic event for test conversation `3` returned
HTTP 200 but exposed a PostgreSQL defect: `_edge_key_bundle_valid` joined all namespaces in its
FULL OUTER JOIN, so unrelated key rows caused `key_coverage_incomplete` and prevented durable
writes. Migration 0009 corrected the join and migration 0010 grants the exact callable surface to the n8n LOGIN roles; Neon now returns `committed / processing_claimed` for
the atomic function. The existing Edge target was updated and published at version
`55ff93fc-8400-4a55-8338-3cc5301f7f71`; it remains observation/no-send. No customer message,
private note, model call, or Shopify write occurred.

## Approved architecture

    owner approval -> Shopify draft -> product review -> Shopify publication

Shopify is the operational source of truth. GitHub `main` is the technical source of truth for the
theme, decisions, and sanitized handoffs. There is no external product database, authentication
service, storage service, catalog queue, or mandatory orchestration layer.

## Verified repository state — 2026-07-29

### GitHub

- Canonical repository: `A-awd/calapres`.
- Canonical branch: `main`.
- Verified clean baseline before the retirement change:
  `b225b9643f8dc9a765ec99a305d969d7a558cf6d`.
- The legacy React and Vite application was not part of the Shopify theme deployment path and has
  been removed from the current tree.
- Supabase configuration, migrations, functions, generated types, client SDK dependency, and lock
  files have been removed.
- The retired supplier, n8n, and Supabase synchronization source and its CI workflow have been
  removed.
- A Shopify-only CI workflow checks the theme and blocks runtime Supabase reintroduction.
- Historical code remains recoverable from Git and must not be restored into the active tree.

### Shopify theme

- The active repository surface is the Shopify theme under `assets`, `config`, `layout`, `locales`,
  `sections`, `snippets`, and `templates`.
- The isolated `owner-site/` surface and its GitHub Pages workflow publish only the Calapres
  legal-ownership evidence page; they are not part of the Shopify theme or its deployment path.
- Those theme directories contain no Supabase dependency.
- The existing deployment workflow does not depend on Supabase.
- The live theme is still ahead of `main`; theme-source reconciliation remains a separate task.

### Live Shopify

- Four products were last verified as drafts with inventory 0.
- The three burner drafts have media; the customizable stand draft does not.
- No product was published as part of the Supabase retirement work.
- Agentic catalog access, policies, Knowledge Base, FAQs, collections, and storefront settings are
  unaffected by this repository cleanup.
- Shopify product drafts may now proceed through direct Shopify review. No external database record
  or queue is required.

### Retired external systems

- Supabase is not an approved Calapres dependency and must not be queried during normal work.
- No external Supabase project or historical data was deleted. Permanent data deletion is a
  separate irreversible action requiring exact owner authorization.
- Live n8n was audited read-only. The saved Calapres Supabase credential has eight dependent
  workflows, and all eight are archived and inactive.
- No active workflow uses the Calapres Supabase credential. The credential itself remains saved;
  deleting it is a separate irreversible credential action requiring confirmation at deletion
  time.
- The repository no longer carries a Supabase or supplier n8n implementation.

## Remaining blockers

1. The four Shopify drafts still need owner-approved inventory, final product data, and publication
   decisions; the stand also needs approved media.
2. The Calapres ownership page now identifies `مؤسسة عبق الخيل للتجارة` as the legal owner. Saudi
   compliance still needs the commercial-register number, VAT number if applicable, verified
   phone, and complaint-response commitments.
3. The live theme must be reconciled into `main` before theme-code changes are deployed safely.
4. The public free-shipping announcement still needs a fresh render check for the saved SAR 320
   threshold.
5. Opening a new market remains a commercial decision.
6. The dormant Calapres Supabase credential in n8n may be deleted after explicit confirmation;
   all workflows that reference it are already archived.
7. The approved observation runtime now exists but remains inactive, unpublished, and disconnected
   from live customer events until the persistent-access gate is approved.
8. A project-scoped Chatwoot Header Auth read credential now exists in n8n and is bound only to
   the existing Edge v2 Chatwoot GET nodes. Exactly one observation webhook exists and is subscribed
   only to `message_created`; the workflow is now published and active for observation.
   The recorded Shopify credential scopes still do not include `read_customers`; that access change
   remains a deliberate implementation gate.
9. Two project-scoped internal Crypto credentials are now bound to the existing Edge HMAC nodes:
   event/route fingerprints and baseline/reread fingerprints. The Chatwoot webhook HMAC credential
   is now populated from the single observation webhook; the workflow is active for observation and
   no customer message has been sent.

## Next safe action

Next, verify the existing Chatwoot read binding with a synthetic/private read fixture. A project-scoped
OpenAI credential now exists and passed n8n's connection test; the OpenAI project allowlist contains
only `gpt-5.4-nano-2026-03-17`, selected for the lowest-cost Arabic draft phase. It is not bound to
any model node and no model call is enabled. Create the remaining dedicated Calapres-scoped HMAC
and read-only Shopify bindings. Add the signed
ingress only after those checks and prove real four-channel observation. Keep the customer-egress
branch absent.

## Constraints

Never restore Supabase, the retired React application, a supplier crawler, or the retired
synchronization code. Never invent legal identity, inventory, pricing, media, or commercial terms.
Never overwrite the live theme until its newer source is reconciled into `main`.

## Theme delivery — 2026-07-31

- The Kimi-approved Calabriz static design (7 pages) is fully ported to a Shopify Liquid theme on `shopify-theme` (merge `65a5388`): dynamic products/variants, AJAX cart, engraving line item property «نص الحفر», and an editor-managed hero video.
- CI deploys `shopify-theme` only to the unpublished staging theme; the live theme stays untouched until the owner reviews the staging preview and publishes manually from Shopify Admin.

## WhatsApp display-name ownership proof — 2026-08-11

- Verified the canonical `main` branch at
  `2ab93ac3a7886c38d39b09d8353c56577a843f5e` before preparing this work.
- Published an isolated ownership page under `owner-site/` in commit
  `daf25f564c063a6f9066a56bf02293a68242bebc`. It states in Arabic and English that Calapres is
  owned and operated by `مؤسسة عبق الخيل للتجارة`, includes the literal relationship
  `Calapres by مؤسسة عبق الخيل للتجارة`, links to `https://calapres.com/`, and exposes crawlable
  Organization, Brand, and WebPage structured data.
- The page is intentionally separate from the Shopify theme and contains no other brand, Meta
  asset ID, phone number, secret, commercial-register number, or tax number.
- GitHub Pages deployment run `31469442562` completed successfully from `main`; the workflow
  publishes only `owner-site/` and cannot publish the Shopify theme.
- GitHub verified ownership of `awd-businesses.com`, and the repository Pages configuration now
  uses that custom domain.
- The authoritative and public DNS records now point the apex to GitHub Pages and `www` to
  `a-awd.github.io`. Google Workspace MX, SPF, DKIM, Facebook verification, Domain Connect, and the
  GitHub ownership-verification record were preserved.
- GitHub completed the DNS check, issued the custom-domain certificate, and HTTPS enforcement is
  enabled. `https://awd-businesses.com/` returns the ownership page from GitHub with status `200`;
  `https://www.awd-businesses.com/` redirects to the apex.
- The live HTTPS response has the expected title, statement, canonical URL, and `index,follow`
  directive. Its SHA-256 matches `owner-site/index.html` exactly.
- Public DNS resolvers point to GitHub. Some local resolvers may temporarily continue serving the
  former Squarespace page until their old cache expires.
- Live Meta verification on 2026-08-11 confirmed the selected Calapres WABA
  `1835160094133742` under Optix portfolio `3498131087080400`, phone-number ID
  `1202498582954919`, and display name `Calapres | كالابريز`.
- Meta approved that display name. The number is registered on Cloud API with status `CONNECTED`,
  platform type `CLOUD_API`, code verification `VERIFIED`, throughput `STANDARD`, and two-step
  verification enabled. The actual phone number remains intentionally masked in project records.
- The current two-step PIN is stored only in the local macOS Keychain under
  `Meta WhatsApp 2FA PIN - Phone ID 1202498582954919`; it is not stored in GitHub, documentation,
  workflow data, or chat.
- Chatwoot Cloud account `179973`, existing WhatsApp inbox `128058`, uses the same WABA and phone
  identifiers. Account Health reports the display name approved, phone connected, the 2K customer
  messaging tier, and the webhook configured successfully.
- A real bidirectional test passed: multiple messages sent from the owner's phone arrived in the
  Chatwoot conversation, a reply sent from Chatwoot reached the phone, and the owner's delivery
  acknowledgement returned to Chatwoot.
- Chatwoot accepted a manual WhatsApp-template synchronization request after the connection test.
- No duplicate WABA, phone number, Meta app, Chatwoot account, or Chatwoot inbox was created.
- No n8n customer-service workflow or automatic customer reply is active yet. Neither
  `calapres.com` nor the live Shopify store was changed.

## Calapres customer-service observation runtime — 2026-08-11

- The live Chatwoot audit covers account `179973` and the native Instagram `128031`, TikTok
  `128033`, WhatsApp `128058`, and Email `128326` inboxes. Website inbox `128028` is outside the
  pilot allowlist.
- Captain is not connected to an inbox, AgentBot is not connected, automation rules are empty, and
  no independent responder is active. The only Chatwoot agent is `خدمة عملاء كالابريز`; the four
  pilot inboxes use automatic assignment and have business availability disabled.
- The isolated n8n team project `Calapres Customer Service` (`0kVami0vGGBbT7Cy`) now contains eight
  empty operational Data Tables for deduplication, conversation jobs, verified identity links,
  the rebuildable order index, verification challenges, incidents, owner decisions, and audit.
  The paused catalog table was not reused or changed.
- Private Core workflow `uCBXuRjlv8NyeikO`, Calapres Edge workflow `e442GlRmKP4IO8pm`, Shopify
  Order Index workflow `cLHCuJ21r4RAuDTE`, and private Owner Review Desk
  `hU7sAMAQSg9Obgky` exist in that project. All four are inactive and
  unpublished, have no assigned credential or public webhook, contain no customer-egress or
  Shopify-write node, and have execution-payload retention disabled.
- The empty approvals, incidents, and audit tables now match the lossless owner-review contracts
  exactly: 34, 18, and 17 columns respectively. No row was inserted. The Owner Review Desk has no
  Data Table node, no public trigger, and caller policy `none`; it validates `reply_only`,
  `approve`, `approve_until`, and `correct` as no-write previews only. Sanitized execution `40631`
  passed with persistence, knowledge publication, and customer egress all false.
- The delay and post-delay cancellation stage is merged into the existing Edge. Its Wait carries
  identifiers, a canonical SHA-256 carrier fingerprint, the pinned baseline-HMAC key version, and
  opaque baseline status/assignee fingerprints only; it carries no raw status, assignee, message,
  or customer data. A fresh Chatwoot re-read must use the same pinned key version. The
  compiled channel policy is 30–75 seconds for Instagram, TikTok, and WhatsApp and 120–300 seconds
  for Email; the one-second path is synthetic-test-only. Live-shaped input keeps the brand kill
  switch on, and the current no-credential path fails closed before Wait because a trusted live
  baseline cannot yet be captured; the re-read slot also fails closed outside the synthetic fixture.
- Strict source-only contracts now define the future signed Chatwoot ingress, transient live
  re-read evidence, and post-delay cancellation decision. They cap the raw body at 1 MiB before
  parsing/HMAC, bind request replay identity to the signed request rather than the unsigned Delivery
  header, and separately derive stable business-event identity from an HMAC over the allowlisted
  account/inbox/event/conversation/message tuple. Their post-delay rule performs two independent,
  non-paginated reads from `anchor_message_id-1`; each raw response must contain 1–99 valid rows,
  include the exact incoming/public anchor, and yield the same canonical set. Any newer
  non-activity message—including another bot's output—cancels. They also compare
  generation/status/assignee and forbid
  the full evidence objects from Wait, Data Tables, or audit persistence. No live webhook or
  Chatwoot credential was created.
- The Edge now previews exact 10-column dedup, 10-column job, 18-column incident, and 17-column
  audit rows. These projections are explicitly synthetic and non-persistable:
  `write_executed=false`, `atomicity_guaranteed=false`, `persistence_ready=false`, and
  `persistable=false`. A future live dedup `event_key` must use the stable business-event HMAC,
  while the request replay fingerprint remains a separate short-lived transport check. Prior HMAC
  key versions must be dual-read through the dedup TTL; the unsigned Delivery header never defines
  event identity.
- The order-index preview maps a validated Calapres contract to the table's exact 12 columns. A
  live n8n run caught an embedded Shopify-GID regex error before activation; it was fixed, a
  permanent embedded-Code syntax test was added, and sanitized post-fix execution `40619` passed
  with both Data Table and Shopify writes false.
- Sanitized manual executions proved the Core/Edge happy path, all four allowlisted channel
  mappings, and fail-closed behavior for unknown account/inbox, outgoing/private/bot events,
  invalid signature evidence, duplicate delivery, stale generation, returns, uncertain intent,
  and non-low risk. Post-sync execution `40651` proved that the source-synchronized synthetic
  WhatsApp path used the configured Wait expression and exact no-write projections; the four-channel
  delay ranges are covered by local runtime tests. It also proved the stable event-identity key,
  exact Wait fingerprint, baseline key-version carry-through, null-reserved 10-column dedup
  preview, and post-Wait integrity check. Every tested result kept
  customer egress and persistence false. The Edge
  remains inactive and unpublished; the imported graph is source-identical to the frozen Edge v2
  source and carries only the two project-scoped PostgreSQL runtime credentials.
- GitHub now contains the brand registry, three append-only dated knowledge releases sourced from the live
  Calapres policy/FAQ pages, the approved response-style release, a proposed inactive model policy,
  generic Core contracts, stricter Calapres edge contracts, synthetic fixtures, and
  standard-library contract/runtime guard tests. Seventy-two local tests pass, including hostile
  request replay vs. event-idempotency, key rotation, body-binding, bounded re-read, same-second,
  PII-poisoning, static-fingerprint, and cancellation-matrix cases.
- Core grounding now verifies every cited knowledge ID and its authority against the selected
  context and verifies live-fact IDs exactly. It ignores the model's free-text draft and renders an
  `observe_draft` result only from versioned `customer_response_ar` or a verified live-source
  response fragment. The Edge rejects or strips malformed/extra Core output. Event-payload
  transport claims are ignored; only a topology-created trusted wrapper can reach normalization.
- The live observation connection is intentionally not granted yet. A project-scoped Chatwoot read
  credential is bound to the existing Edge GET nodes, and one observation webhook exists, but no
  live fixture has been processed because Edge remains inactive.
  Model-node binding and identity-HMAC material remain deliberate persistent-access gates. A new
  Shopify Dev Dashboard app `Calapres Customer Service Read` is installed on `calapres.com` with
  only `read_customers`, `read_orders`, `read_products`, `read_inventory`, and `read_locations`. The n8n Shopify
  OAuth2 credential was rejected and removed because the built-in type requested write scopes;
  the generic n8n OAuth2 credential is saved with Client Credentials and the same read-only scopes.
  Direct live evidence proved token issuance (`200`, `expires_in=86399`, read-only scope set) and
  a read-only Admin GraphQL query (`200`, no errors, shop name returned). It is bound only to the
  inactive Edge target. The Edge v2 source and target contain a read-only Shopify customer lookup
  branch using generic OAuth2, fail-closed exact-phone matching, and a strict Core-envelope adapter;
  no Shopify write has occurred. After the owner-approved scope update, a direct
  customer-ID-only GraphQL read returned `200` without errors; no customer fields were logged.
- The model budget guard was applied to real Neon and tested with a temporary `$0.05` ceiling: the
  first reservation committed, the next reservation was rejected as `monthly_budget_exhausted`,
  and the control was restored to `enabled=false`, `kill_switch=true`, `$45` ceiling. Test rows were
  removed. No model request was made.

### Next safe action

After an action-time owner confirmation for those persistent-access gates, implement the already
specified signed Chatwoot ingress and live re-read inside the existing Edge, bind only
Calapres-scoped credentials, capture the pre-Wait baseline with the pinned identity-HMAC key,
replace synthetic fingerprints with keyed live values, and test real
events as private internal observations. Keep automatic customer-facing replies structurally
absent until the separate activation decision and every safety gate pass.

## Multi-brand ownership-evidence standard — 2026-08-11

- Meta approved `Calapres | كالابريز` shortly after the permanent ownership page became available.
- The owner has accepted that result as the operating basis for reusing the evidence-page pattern
  for future brands.
- Decision 0009 requires a neutral ownership registry with a separate permanent page for every
  future verified brand. It does not authorize connecting or modifying another brand now.
