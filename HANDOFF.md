# Handoff

## Resume from

Continue from `main` revision `ac5224b`. Decision 0006 is binding for the Shopify-native
architecture, and decision 0007 is binding for the isolated Calapres ownership-proof site.

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

## Exact next actions

1. Wait for the GitHub Pages custom-domain TLS certificate, enable HTTPS enforcement, and validate
   `https://awd-businesses.com/` before any Meta display-name action.
2. After the ownership-site validation, reopen the exact Calapres Meta assets and decide the next
   display-name action from their live status; do not submit from stale identifiers.
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
- Direct HTTP routing to GitHub returns the expected page with status `200`. Public HTTPS is not yet
  final because GitHub's custom-domain certificate is still pending and some DNS caches still serve
  Squarespace.
- No WhatsApp name was submitted or number registered. No file, setting, DNS record, or content for
  `calapres.com` or the live Shopify store was changed.

### Resume action

1. Recheck public DNS for the apex and `www`.
2. Recheck the GitHub Pages certificate state.
3. When the certificate is valid, enable HTTPS enforcement.
4. Verify the public HTTPS page returns status `200`, the exact ownership statement, canonical URL,
   and `index,follow` without redirecting to another domain.
5. Do not submit a Meta display name until that public HTTPS validation is complete.
