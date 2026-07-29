# Project State

## Current phase

Agentic and storefront readiness for an owner-curated catalog. The Nawadir Dior supplier
architecture remains retired.

## Approved architecture

Owner-selected products -> Supabase (canonical) -> n8n (orchestration) -> Shopify (sales channel
only).

Product publication remains gated by `ready_for_shopify = true`, and
`public.shopify_sync_queue` is the only authorized push source. Shopify Agentic, Knowledge Base,
and connector access do not bypass this gate.

## Verified live state — 2026-07-29

### GitHub

- Canonical branch: `main`.
- Verified local and remote revision:
  `0b7be574aed822d34f52dc40ab28239db12f07ef`.
- The live theme `calapres-live-e9e8381` contains newer files and settings than `main`. The
  `shopify-theme` deployment branch also remains present despite the single-canonical-branch
  decision. Theme code must be reconciled into `main` before the next code deployment.

### Supabase (`pbiiqlpgchrcgagemclt`) and n8n

- `public.shopify_sync_queue` returns 0 rows.
- None of the four current Shopify draft SKUs exists in `public.product_variants`.
- The owner-curated schema, approval gates, and reconnect guards remain binding.
- No retired supplier workflow may be reactivated.

### Shopify (`calapres.com`)

- Four products exist and all are `DRAFT`, unpublished, uncategorized, and have inventory 0:
  - `CAL-BKH-GRY` — مبخرة كالابريز الفاخرة — الرمادي — SAR 390.
  - `CAL-BKH-BGE` — مبخرة كالابريز الفاخرة — البيج — SAR 390.
  - `CAL-BKH-WHT` — مبخرة كالابريز الفاخرة — الأبيض — SAR 390.
  - `CAL-STD-IPAD` — ستاند عقد قران فاخر للآيباد — قابل للتخصيص — SAR 190.
- The three burner drafts have media and Arabic SEO content. The stand draft has no media.
- There are 0 active/public products and 0 products in Shopify Catalog.
- `العود والمباخر` contains the three burner drafts. Four empty manual collections were created
  to repair live storefront routes without publishing products:
  - `fragrance-families` — العائلات العطرية.
  - `niche` — عطور النيش.
  - `oriental` — العطور الشرقية.
  - `luxury-brands` — العلامات الفاخرة.
- The four collection routes now return HTTP 200.

### Agentic, Knowledge Base, and Shopify connector

- The connected Shopify tool was verified against the correct Calapres store, domain, currency,
  and Saudi location. No credential is stored in this repository.
- Agentic catalog access is enabled and marked `Completed`.
- Agentic policies are marked `Completed`.
- `Allow Shopify to manage for me` is enabled.
- ChatGPT, Microsoft Copilot, Other channels, and Shop are inactive.
- Shopify Catalog contains 0 products because no approved product is published.
- Shopify Knowledge Base is installed and reports that policies and FAQs are visible.
- Three verified custom FAQs were added: customer-service contact, Saudi shipping cost, and the
  seven-day return process.
- The public discovery endpoints `agents.md`, `.well-known/ucp`, and
  `sitemap_agentic_discovery.xml` respond successfully.

### Policies and storefront configuration

- Contact information, privacy, refund, shipping, and terms policies exist in Shopify.
- Refund and terms policies were published in Arabic and English using conservative Saudi
  e-commerce requirements. Shipping and contact policies are also bilingual.
- Public refund, shipping, privacy, and terms URLs return HTTP 200.
- The footer navigation menu now contains links to all five policies, although the current live
  theme hardcodes its footer and does not render that menu yet.
- Live theme settings now use `info@calapres.com`.
- The free-shipping announcement now matches the configured rate: free at SAR 320 or more, instead
  of the previous incorrect SAR 500 claim.
- Saudi Arabia is the only active market.

## Remaining blockers

1. Product publication is blocked: the four Shopify drafts are outside the canonical Supabase
   flow, inventory is 0, and the stand lacks approved media.
2. ChatGPT and Microsoft Copilot eligibility requires eligible products in Shopify Catalog and a
   United States selling setup. Activating a US market is a commercial decision and was not
   assumed.
3. Shop requires Shopify Payments; Saudi Arabia is not a supported Shopify Payments country.
   No unsupported-country workaround is allowed.
4. Saudi compliance still needs the owner's verified legal entity name, commercial-register
   number, VAT number if applicable, verified phone, and complaint-response commitments.
5. The automated English privacy policy needs a separate Saudi PDPL localization review.
6. The live theme must be reconciled into `main` before hardcoded footer-policy links and remaining
   source drift can be fixed safely.

## Next safe action

Owner approval of the four products' canonical Supabase intake, inventory, pricing, media, and
publication decision. In parallel, collect the missing legal identity details and decide whether
Calapres should open a United States market. Do not publish directly from the existing Shopify
drafts.

## Constraints

Never reconnect a Nawadir Dior source. Never publish a product whose `ready_for_shopify` is not
true. Never change an existing `calapres_sku`. Never invent legal identity, inventory, pricing, or
media. Never use an unsupported-country entity to obtain Shopify Payments. Never overwrite the
live theme until its newer source has been reconciled into `main`.
