# Handoff

## Resume from

Continue from the latest verified `main` revision. Decision 0006 is binding for the Shopify-native
architecture, decision 0007 is binding for the isolated Calapres ownership-proof site, and decision
0008 is binding for the Optix customer-service design and its Calapres-only pilot boundary.

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
- No n8n customer-service agent or automatic customer-facing reply is active yet.

## Exact next actions

1. Implement decision 0008 as a Calapres-only observation/test workflow against Chatwoot inbox
   `128058`; do not connect another brand or reuse stale identifiers.
2. Prove brand routing, grounded draft generation, deduplication, delay cancellation, and owner
   review before enabling an automatic customer-facing reply.
3. Review the four draft products directly in Shopify.
4. Add or approve missing media, inventory, price, collections, SEO, and sales channels.
5. Record owner publication approval, publish in Shopify, and verify storefront and Catalog
   inclusion.
6. Collect the missing commercial-register number, VAT number if applicable, verified phone, and
   complaint-response commitments.
7. Reconcile the live theme source into `main` before further theme-code deployment.
8. Delete the dormant Calapres Supabase credential from n8n only after explicit confirmation.

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
- Chatwoot Cloud account `179973`, existing inbox `128058`, reports the same identifiers, approved
  name, connected phone, and successful webhook configuration.
- A real bidirectional test passed from the owner's phone through Meta and Chatwoot and back to the
  phone; the owner's acknowledgement then arrived in the same Chatwoot conversation.
- Chatwoot template synchronization was initiated successfully. No duplicate account, WABA, phone,
  app, or inbox was created.
- No n8n customer-service bot is active. No file, setting, DNS record, or content for `calapres.com`
  or the live Shopify store was changed.

### Resume action

1. Continue with decision 0008 using Calapres only and Chatwoot inbox `128058`.
2. Build observation mode first and verify exact brand routing and grounded drafts.
3. Keep all automatic customer sends disabled until the owner-review and end-to-end gates pass.
