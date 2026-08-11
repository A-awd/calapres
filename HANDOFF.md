# Handoff

## Resume from

Continue from the latest verified `main` revision. Decision 0006 is binding for the Shopify-native
architecture, decision 0007 is binding for the isolated Calapres ownership-proof site, and decision
0008 is binding for the Optix customer-service design and its Calapres-only pilot boundary.
Decision 0009 makes the ownership-evidence page a future multi-brand standard without authorizing
another brand implementation. Decision 0010 is binding for the inactive Calapres observation
runtime, its no-send boundary, and its persistent-access gates.

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
  delayed worker. The index maps only HMAC fingerprints and opaque Shopify references to the exact
  12-column empty order-index table and still performs no write.
- Repository contracts, synthetic fixtures, and thirty-four local tests cover the shared Core, strict
  knowledge/live-fact grounding, transport-claim rejection, the stricter Calapres edge, embedded
  n8n Code syntax, the index table-row mapper, and the owner-decision trust boundary. Sanitized n8n
  runs `40625`, `40619`, and Owner Review Desk run `40631` passed after the final fixes with
  customer egress, Data Table writes, knowledge publication, and Shopify writes all false.
  No n8n customer-service agent or automatic customer-facing reply is active.
- The model's free-text draft has no authority and is not forwarded. A grounded observation draft
  is rendered deterministically from versioned `customer_response_ar` or a verified live-source
  response fragment selected by an exact cited fact ID.

## Exact next actions

1. Continue with decision 0010 and `docs/calapres-customer-service-pilot.md`; do not recreate the
   already-built project, tables, Core, Edge, Order Index, Owner Review Desk, registry, knowledge
   releases, contracts, or fixtures.
2. Obtain action-time owner confirmation before creating/sharing the persistent Chatwoot, dedicated
   Calapres LLM, webhook-HMAC, identity-HMAC, or expanded Shopify access required for live
   observation.
3. Add signed Chatwoot ingress to the existing Edge, emit trusted transport evidence from raw-body
   HMAC verification, and replace the no-credential re-read slot with a live Chatwoot re-read after
   the merged identifiers-only delay. Never connect a webhook directly to normalization. Prove a
   real signed fixture because Chatwoot issue `#13809` may affect the displayed HMAC secret; never
   bypass a failed signature check.
4. Prove real brand routing, private observation drafts, deduplication, delay cancellation, owner
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
2. Obtain action-time owner confirmation for the dedicated Calapres Chatwoot/LLM/HMAC/Shopify read
   access. Until then, do not create a live webhook or bind a credential.
3. After confirmation, test real Instagram `128031`, TikTok `128033`, WhatsApp `128058`, and Email
   `128326` events as private observation only; Website `128028` remains outside the allowlist.
4. Keep every automatic customer send disabled until owner review and all end-to-end gates pass.

## Paused catalog investigation

- The official Shopify-synchronized catalog is associated with an old or inaccessible WABA rather
  than the current operational Calapres WABA.
- The owner explicitly paused this topic. Do not delete the official catalog, change its native
  Shopify synchronization, or create a replacement catalog as a shortcut.
