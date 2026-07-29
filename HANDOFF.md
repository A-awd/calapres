# Handoff

## Resume from

`main` at `0b7be574aed822d34f52dc40ab28239db12f07ef`. Live Agentic configuration
and storefront-policy work was completed on 2026-07-29, but product publication remains correctly
blocked by the owner-curated catalog gate.

## Done and verified live

1. Verified that the Shopify connector targets Calapres (`calapres.com`, SAR, Saudi Arabia).
2. Enabled Agentic catalog access; Shopify marks it `Completed`.
3. Published bilingual contact, shipping, refund, and terms content. Shopify marks policies
   `Completed`; all public policy URLs return 200.
4. Installed Shopify Knowledge Base and added verified FAQs for contact, Saudi shipping, and
   returns.
5. Kept `Allow Shopify to manage for me` enabled.
6. Verified ChatGPT, Microsoft Copilot, Other channels, and Shop remain inactive.
7. Verified Shopify Catalog contains 0 products.
8. Verified all four products are drafts with inventory 0; the three burner drafts have media and
   the customizable stand does not.
9. Verified `public.shopify_sync_queue` is empty and none of the four SKUs exists in canonical
   Supabase product variants.
10. Created four empty manual collections to repair the live `fragrance-families`, `niche`,
    `oriental`, and `luxury-brands` routes without adding or publishing products.
11. Saved live theme settings for `info@calapres.com` and the configured SAR 320 free-shipping
    threshold; verified both values in the live theme's `settings_data.json`.
12. Added the five policies to Shopify's footer navigation menu.

## Not done and why

1. No product was activated or published. The drafts bypassed the canonical Supabase -> n8n path,
   inventory is 0, and the stand has no media.
2. No US market was created. It is a commercial expansion decision required for ChatGPT/Copilot
   eligibility.
3. Shop was not activated. It requires Shopify Payments, which is not available for a Saudi
   business.
4. Legal identity fields were not invented. The legal entity name, commercial-register number,
   VAT number if applicable, verified phone, and complaint-response commitments are still needed.
5. The automated privacy policy was not represented as Saudi-PDPL complete.
6. Hardcoded footer policy links were not edited in the live theme because the live theme
   `calapres-live-e9e8381` is ahead of `main` and the deployment workflow still reads the
   non-canonical `shopify-theme` branch.
7. The public HTML still showed `hello@calapres.sa` and the old SAR 500 announcement immediately
   after the settings save. Recheck after Shopify's cache propagates; do not report the rendered
   text as fixed until the public page shows the saved values.

## Exact next actions

1. Recreate the four products in canonical Supabase intake, attach approved media, set owner-
   approved inventory and pricing, and approve them.
2. Build or resume the n8n consumer only after `public.shopify_sync_queue` returns approved rows.
3. Publish only through that queue, then verify Online Store and Shopify Catalog inclusion.
4. Obtain the missing legal identity and complaint details; localize the privacy policy for Saudi
   PDPL.
5. Record an owner decision on whether to activate a United States market.
6. Pull the live theme source, reconcile it into `main`, retire the competing deployment branch,
   then render the policy menu and remove any remaining hardcoded fallbacks.

## Do not do

Do not publish the existing Shopify drafts directly. Do not reactivate archived supplier
workflows. Do not write to the Supabase `archive` schema. Do not invent stock, legal identity,
telephone, tax, or market information. Do not use a foreign-entity workaround for Shopify
Payments. Do not deploy theme code from stale `main` or from an unreconciled competing branch.
