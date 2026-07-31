# Handoff

## Resume from

Continue from the latest verified `main` revision. Decision 0006 is binding: Calapres is
Shopify-native and Supabase is retired.

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

1. Review the four draft products directly in Shopify.
2. Add or approve missing media, inventory, price, collections, SEO, and sales channels.
3. Record owner publication approval, publish in Shopify, and verify storefront and Catalog
   inclusion.
4. Collect the missing Saudi legal identity and complaint details.
5. Reconcile the live theme source into `main` before further theme-code deployment.
6. Delete the dormant Calapres Supabase credential from n8n only after explicit confirmation.

## Do not do

Do not restore the retired React application, Supabase files, database queue, supplier pipeline, or
old n8n sync code from Git history. Do not treat an external database record as a publication gate.
Do not permanently delete retired external data without a separate instruction naming the exact
project and acknowledging irreversibility.

## Theme delivery — 2026-07-31

- `shopify-theme` @ `65a5388` carries the Calabriz Liquid theme converted from the approved static build; all schema JSON is valid and `shopify theme check` passes with zero errors.
- Next: publish the four draft products (and add the iPad-stand photos) so the storefront renders live data, preview the staging theme, then publish it manually when approved.
