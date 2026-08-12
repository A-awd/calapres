# Project State

## Current phase

Shopify-native storefront and catalog readiness, plus verified Calapres customer channels in
Chatwoot. The Nawadir Dior supplier architecture and all Supabase-based Calapres architecture are
retired. Decision 0010 closes the customer-service pre-implementation gate and authorizes a
Calapres-only observation runtime. No production customer-service bot or automatic customer send
is deployed.

## Preserved customer-service WIP checkpoint — 2026-08-12

The unfinished Calapres Edge v2, transactional-state, reconciliation, context/LLM boundary, schemas,
fixtures, and tests are preserved on branch `agent/preserve-calapres-customer-service-checkpoint`.
They are source-only and must not be treated as a live or production release. The exact stop point,
known manifest-hash failure, live no-send boundary, and resumption sequence are recorded in
[`docs/calapres-customer-service-checkpoint-2026-08-12.md`](docs/calapres-customer-service-checkpoint-2026-08-12.md).
GitHub `main` remains the approved runtime baseline until this checkpoint is reviewed and merged.

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
8. n8n has no dedicated Calapres Chatwoot credential, and the recorded Shopify credential scopes
   do not include `read_customers`; those access changes require deliberate implementation gates.

## Next safe action

After action-time owner confirmation, create the dedicated Calapres-scoped Chatwoot, LLM, identity
HMAC, and read-only Shopify bindings; then add the signed ingress and prove real four-channel
observation. Keep the customer-egress branch absent.

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
  remains inactive, unpublished, credential-free, and source-identical to its live draft.
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
- The live observation connection is intentionally not granted yet. Chatwoot webhook/credential,
  a dedicated Calapres LLM credential, identity-HMAC material, and any Shopify read-scope expansion
  remain deliberate persistent-access gates. The current Shopify credential lacks `read_customers`;
  live order/customer lookup remains disabled rather than guessed.

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
