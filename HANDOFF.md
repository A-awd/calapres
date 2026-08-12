# Handoff

## Resume from

Continue from the latest verified `main` revision. Decision 0006 is binding for the Shopify-native
architecture, decision 0007 is binding for the isolated Calapres ownership-proof site, and decision
0008 is binding for the Optix customer-service design and its Calapres-only pilot boundary.
Decision 0009 makes the ownership-evidence page a future multi-brand standard without authorizing
another brand implementation. Decision 0010 is binding for the inactive Calapres observation
runtime, its no-send boundary, and its persistent-access gates.

Decision 0012 selects Neon for the PostgreSQL gate. The isolated Neon database has migrations
0001–0008 applied; migration 0008 adds the deny-first model budget guard. The restricted n8n
Webhook/Reconciliation credentials have passed SSL
connection tests. The checked-in Edge v2 is imported into the existing target `e442GlRmKP4IO8pm`
with those two project-scoped credentials. Do not create a workflow, activate it, publish it, or
connect live Chatwoot traffic.

The final local freeze passed Node 175/175 and Python 92/92. Real Neon two-session checks covered
database clock, role separation, rollback, and one-winner locking; a temporary branch schema
comparison produced no diff and the branch was removed. This is not a provider backup-restore
drill, and no live Chatwoot, model, or Shopify observation has occurred.

For the frozen post-`bfb191c` customer-service source release, resume from branch
`agent/preserve-calapres-customer-service-checkpoint` and read
[`docs/calapres-customer-service-checkpoint-2026-08-12.md`](docs/calapres-customer-service-checkpoint-2026-08-12.md)
before changing any Edge v2, PostgreSQL, reconciliation, context/LLM, schema, fixture, or test file.
The current Edge v2 source hash is
`875a6471e511a1dcd6c8c9bcaa4b5f9b25761630db005f36d4930e1303410301`, and
`support/brands/calapres/customer-service-release-lock.json` verifies the release set. Do not
rebuild these artifacts or claim production readiness from this checkpoint. The imported target
remains inactive and unpublished; `main` remains authoritative until the preserved branch is
reviewed and merged.

Latest checkpoint: commit `86d59eb` binds the read-only Shopify customer lookup result to the strict
Core input envelope. The preceding `8ebf82a` checkpoint adds the read-only Shopify client-credentials renewal contract
and targeted tests. The preceding `b0d4ba8` checkpoint refreshes and verifies the customer-service release lock after
migrations 0004, 0007, and 0008 changed. The verified Edge production URL is
`https://kunads90.app.n8n.cloud/webhook/calapres/customer-service/chatwoot/v2`. Chatwoot currently
has no saved webhook and n8n has no live Chatwoot secret; the temporary webhook and credential
were removed after a signed synthetic POST returned HTTP 404 while Edge was inactive. Edge v2
source has a Shopify read-only HTTP node and no model node; the imported target remains on the
earlier source and inactive. The new Shopify read-only app is installed and its Client Credentials token was tested
directly: Shopify returned a 24-hour token with only read scopes, and read-only Admin GraphQL
queries for shop/products and customer ID returned successfully without logging customer fields.
The generic OAuth2 credential is saved in n8n with the expanded read-only scope set. The source
Edge v2 now contains the read-only customer lookup branch and its source hash is recorded in the
deployment manifest; the imported target has not been updated. No Shopify write occurred.

## Completed in the Supabase retirement

1. Verified the canonical repository, branch, remote synchronization, and baseline revision.
2. Read all root operating documents and relevant decisions.
3. Audited the complete tree and found two obsolete Supabase implementations: a legacy React
   application and a later product-sync layer.
4. Confirmed the Shopify theme directories and theme deployment workflow have no Supabase
   dependency.
5. Removed the legacy React and Vite application, its Supabase client, authentication, storage,
   functions, generated types, packages, and lock files.
6. Removed the Supabase migrations and edge functions.
7. Removed the retired supplier and Supabase synchronization source and its CI workflow.
8. Replaced active architecture instructions with a direct Shopify draft, review, approval, and
   publication workflow.
9. Added decision 0006 and marked the conflicting parts of decisions 0002, 0003, and 0005 as
   superseded.
10. Added Shopify-only CI with a guard against runtime Supabase reintroduction.

## Live systems

- No product was published, deleted, or edited during this repository cleanup.
- No customer, order, payment, or inventory data was touched.
- No external Supabase project or historical data was deleted.
- Live n8n was audited read-only. All eight workflows using the saved Calapres Supabase credential
  are archived and inactive.
- The dormant credential remains saved because credential deletion requires confirmation at the
  time of deletion.
- Existing Agentic, policies, Knowledge Base, FAQs, collections, and storefront configuration are
  unaffected.
- The selected Calapres WhatsApp asset is operational on Meta Cloud API. The approved display name
  is `Calapres | كالابريز`; WABA ID is `1835160094133742`; phone-number ID is
  `1202498582954919`; the phone is `CONNECTED`, verified, and protected by two-step verification.
- Chatwoot Cloud account `179973` and its existing WhatsApp inbox `128058` use those same IDs. The
  webhook is configured and a real inbound, outbound, and owner-acknowledgement test passed.
- The native Calapres Instagram `128031`, TikTok `128033`, WhatsApp `128058`, and Email `128326`
  inboxes are the exact customer-service pilot allowlist. Website inbox `128028` remains disabled
  for this pilot.
- n8n project `Calapres Customer Service` (`0kVami0vGGBbT7Cy`) contains eight empty isolated
  operational tables. Core `uCBXuRjlv8NyeikO` and Edge `e442GlRmKP4IO8pm` are inactive and
  unpublished. Shopify Order Index `cLHCuJ21r4RAuDTE` and Owner Review Desk
  `hU7sAMAQSg9Obgky` are likewise inactive and unpublished. All four have no credentials or public
  webhook, have no customer-send or Shopify-write node, and do
  not retain success, error, manual, or progress execution payloads under current settings.
- The approvals, incidents, and audit table schemas are aligned to the exact lossless owner-review
  projections at 34, 18, and 17 columns. The tables remain empty. Owner Review Desk caller policy
  is `none`, it contains no Data Table node, and its four decision actions remain previews with all
  writes and knowledge publication disabled.
- The Edge now includes the identifiers-only Wait and post-delay recheck; there is no separate
  delayed worker. The compiled delay is 30–75 seconds for the three chat channels and 120–300
  seconds for Email; one second is reserved for the sanitized fixture. The carrier binds its exact
  identifier/control fields with SHA-256 and carries only a pinned baseline-HMAC key version plus
  opaque status/assignee fingerprints. Live-shaped input keeps the kill switch on and fails closed
  before Wait until the trusted baseline capture and no-credential re-read are replaced. The index maps only HMAC
  fingerprints and opaque Shopify references to the exact 12-column empty order-index table and
  still performs no write.
- Source-only Chatwoot contracts now specify raw-byte HMAC verification, a 1 MiB pre-parse limit,
  request replay protection independent of the unsigned Delivery header, a separate stable
  business-event HMAC for idempotency across redeliveries, transient post-delay re-read evidence,
  and two independent non-paginated reads from the anchor-minus-one cursor. Each read must contain
  1–99 valid rows, include the exact incoming/public anchor, and yield the same canonical set;
  any newer non-activity message or route/state mismatch cancels.
  Full evidence is forbidden from Wait, Data Tables, and audit. No webhook or credential is live.
- The Edge previews the exact dedup/jobs/incidents/audit table shapes but marks every projection
  non-persistable and no-write. Static fixture fingerprints can never make a live event ready; a
  verified request replay claim, stable business-event HMAC with key-version dual-read, and
  identity-HMAC binding remain future live preconditions.
- Repository contracts, synthetic fixtures, and seventy-two local tests cover the shared Core, strict
  knowledge/live-fact grounding, transport-claim rejection, the stricter Calapres edge, embedded
  n8n Code syntax, channel delay, signed-ingress/re-read contracts, exact table-row projections,
  the index mapper, and the owner-decision trust boundary. Sanitized n8n runs `40625`, `40651`,
  `40619`, and Owner Review Desk run `40631` passed after the final fixes with
  customer egress, Data Table writes, knowledge publication, and Shopify writes all false.
  No n8n customer-service agent or automatic customer-facing reply is active.
- The model's free-text draft has no authority and is not forwarded. A grounded observation draft
  is rendered deterministically from versioned `customer_response_ar` or a verified live-source
  response fragment selected by an exact cited fact ID.

## Exact next actions

1. Continue with decision 0010 and `docs/calapres-customer-service-pilot.md`; do not recreate the
   already-built project, tables, Core, Edge, Order Index, Owner Review Desk, registry, knowledge
   releases, contracts, or fixtures.
2. Keep the Neon database and restricted credentials as the inactive PostgreSQL test foundation;
   complete real transaction/concurrency/recovery and backup/restore evidence before any live
   binding. The model budget guard is disabled by default and must remain so until the model phase.
3. The project-scoped Chatwoot read credential is now bound only to the existing Edge v2 GET nodes;
   verify it with a private synthetic read before creating any webhook. Obtain action-time owner
   confirmation before binding the dedicated Calapres OpenAI credential (project allowlist currently
   only `gpt-5.4-nano-2026-03-17`) to any model node or enabling a model call, then creating/sharing webhook-HMAC, identity-HMAC, or expanded Shopify
   access required for live observation.
   Two internal project-scoped Crypto credentials are bound to the existing identity/route and
   baseline/reread HMAC nodes. Keep the webhook HMAC secret separate until webhook creation.
4. Implement the checked-in signed-ingress contract in the existing Edge, emit trusted transport
   evidence from raw-body HMAC verification, capture status/assignee baselines with a pinned
   identity-HMAC key version before Wait, and replace the no-credential re-read slot with a live
   Chatwoot re-read after the merged identifiers-only delay using that same key version. Never connect a webhook directly to
   normalization. Prove a real signed fixture because Chatwoot issue `#13809` may affect the
   displayed HMAC secret; never bypass a failed signature check or use the unsigned Delivery header
   as replay identity.
5. Prove real brand routing, private observation drafts, deduplication, delay cancellation, owner
   intervention, and verified Shopify retrieval. This does not authorize customer-facing replies.
5. Review the four draft products directly in Shopify.
6. Add or approve missing media, inventory, price, collections, SEO, and sales channels.
7. Record owner publication approval, publish in Shopify, and verify storefront and Catalog
   inclusion.
8. Collect the missing commercial-register number, VAT number if applicable, verified phone, and
   complaint-response commitments.
9. Reconcile the live theme source into `main` before further theme-code deployment.
10. Delete the dormant Calapres Supabase credential from n8n only after explicit confirmation.

## Do not do

Do not restore the retired React application, Supabase files, database queue, supplier pipeline, or
old n8n sync code from Git history. Do not treat an external database record as a publication gate.
Do not permanently delete retired external data without a separate instruction naming the exact
project and acknowledging irreversibility.

## Theme delivery — 2026-07-31

- `shopify-theme` @ `65a5388` carries the Calabriz Liquid theme converted from the approved static build; all schema JSON is valid and `shopify theme check` passes with zero errors.
- Next: publish the four draft products (and add the iPad-stand photos) so the storefront renders live data, preview the staging theme, then publish it manually when approved.

## WhatsApp display-name ownership proof — 2026-08-11

- The ownership page is committed and pushed on `main` at
  `daf25f564c063a6f9066a56bf02293a68242bebc` and is deployed from `owner-site/` by GitHub Pages.
- The exact public statement is:
  `كالابريز (Calapres) علامة تجارية مملوكة ومدارة بواسطة مؤسسة عبق الخيل للتجارة.`
- It also includes the literal candidate relationship
  `Calapres by مؤسسة عبق الخيل للتجارة`, the same relationship in English, a link to the official
  Calapres store and email, and Organization/Brand/WebPage structured data.
- Pages deployment run `31469442562` succeeded. GitHub verified ownership of
  `awd-businesses.com`, and the repository Pages configuration uses that custom domain.
- The apex A records and `www` CNAME now point to GitHub Pages. Google Workspace MX, SPF, DKIM,
  Facebook verification, Domain Connect, and GitHub verification records remain intact.
- GitHub completed its DNS check, issued the custom-domain certificate, and HTTPS enforcement is
  enabled. The apex returns the exact published page over HTTPS with status `200`; `www` redirects
  to the apex, and the live response hash matches `owner-site/index.html`.
- Public resolvers point to GitHub. Some local DNS caches may temporarily continue serving the old
  Squarespace page until their previous record expires.
- Meta approved the live display name `Calapres | كالابريز` for the selected Calapres asset. Live
  Graph verification showed WABA `1835160094133742`, phone-number ID `1202498582954919`,
  `CONNECTED`, `CLOUD_API`, `VERIFIED`, and `STANDARD` throughput. Two-step verification is enabled.
- The two-step PIN is stored only in the local macOS Keychain under
  `Meta WhatsApp 2FA PIN - Phone ID 1202498582954919`; never copy it into GitHub or a workflow.
- Chatwoot Cloud account `179973`, existing inbox `128058`, reports the same identifiers, approved
  name, connected phone, and successful webhook configuration.
- A real bidirectional test passed from the owner's phone through Meta and Chatwoot and back to the
  phone; the owner's acknowledgement then arrived in the same Chatwoot conversation.
- Chatwoot template synchronization was initiated successfully. No duplicate account, WABA, phone,
  app, or inbox was created.
- No n8n customer-service bot is active. No file, setting, DNS record, or content for `calapres.com`
  or the live Shopify store was changed.

### Resume action

1. Continue with decisions 0008–0010 and the already-built inactive runtime; do not recreate the
   project, tables, Core, Edge, index, registry, knowledge, style, policy, contracts, or fixtures.
2. The dedicated Chatwoot read credential is bound to existing GET nodes only. Obtain action-time
   owner confirmation for the LLM/HMAC/Shopify read access; until the signed fixture and database
   gates pass, do not create a live webhook.
3. After confirmation, test real Instagram `128031`, TikTok `128033`, WhatsApp `128058`, and Email
   `128326` events as private observation only; Website `128028` remains outside the allowlist.
4. Keep every automatic customer send disabled until owner review and all end-to-end gates pass.

## Paused catalog investigation

- The official Shopify-synchronized catalog is associated with an old or inaccessible WABA rather
  than the current operational Calapres WABA.
- The owner explicitly paused this topic. Do not delete the official catalog, change its native
  Shopify synchronization, or create a replacement catalog as a shortcut.
