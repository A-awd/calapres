# Google services, native tags and legacy Tag Manager — read-only audit

Observed 2026-10-27, Asia/Riyadh. The owner requested reading the Google & YouTube channel,
its warning, Product Studio and suggestions, identifying the connected accounts, and checking
whether the existing Google Tag Manager setup was connected. This was an inspection, not an
instruction to install, migrate, publish, delete tags or change tracking/marketing permissions.

Source baseline: `A-awd/calapres` main `359c431d771ffea2087cedb6b849d4ae5e91a55d`;
global launcher/routing main `d152dde8204a9c5666afe696066882decac3f75f`.
Shopify and Google's visible live pages are operational evidence. Repository code establishes
approved source only; neither connected status nor a script element alone proves event delivery.

## Live account and connection readback

| Service or setting | Observed state | Meaning and boundary |
| --- | --- | --- |
| Shopify Google account | `info@calapres.com` | Same business identity was visible in Tag Manager; no sign-in or access change was made. |
| Merchant Center | `582442539`, Active | Six submitted offers, all six Approved; zero Limited, Not Approved or Under Review. Offers/variants are not six distinct base products. |
| Google Ads | `3301213892` (`Calapres`), Active | Saved channel connection; no campaign or spending change, and no Ads conversion receipt was established. |
| Google Analytics | Measurement `G-3YZFD1XGVL`, property `350424085`, account `217876191`, Active | Matches the historical Calapres source identifiers. Live GA4 showed recent nonzero traffic/event activity; no exact private metrics are published here and purchase acceptance was not tested. |
| Conversion measurement | On | Configuration, not proof of a purchase reaching Google. |
| Enhanced conversions | On | Existing state read-only; no new customer-data permission or sharing setting was enabled. |
| Customer Match | Off | Preserved. |
| Product, shipping and country/language sync | On | Configuration readback; not an independent audit of every received feed attribute or policy. |
| SEO title/description sync | Off | This does not mean products lack titles or descriptions; it is the channel's sync-source setting. |
| Checkout link | On | Existing configuration preserved. |
| Google Business Profile | Connect available; not linked | No connection performed. |
| YouTube store / local inventory | Inactive | Optional opportunities, not a diagnosis of storefront or native Google tag failure. |

Direct Merchant Center overview independently matched account `582442539` under the same
business email and six approved offers, with no account-blocking warning observed. Its displayed
quality/shipping assessments were Great/Excellent; these account-level labels are not proof of
OTO tracking writeback, every physical delivery, or carrier acceptance.

Direct Google Ads opened under the same business email. Its current banner said ads were not
being served because campaigns/ad groups were paused or removed. Thus an Active Shopify account
connection does not mean live advertising is running. The overview date selector was an old
29 July–2 August range; no claim about current spend is derived from it. A conversion-status card
showed inactive/unverified/no-recent states and no recording state at inspection. An ad-blocker
dialog also appeared; no protection was disabled and no end-to-end conversion test was performed.

Seven checkout/customer events were mapped to Google Shopping App conversion actions, including
purchase. The native Google app displayed these installed Google tags:

- `AW-10837488053`.
- `G-3YZFD1XGVL`.
- `GT-P3NC2SXW`, displayed with `MC-QEZTVYYNZQ`.

The Google Ads customer account ID and an `AW-` conversion/tag ID are different identifier types;
their different numeric values alone do not establish a wrong-account connection.

Shopify Customer events showed six app rows. Google & YouTube was configured for **Server + Web**
with data access **Always on**. No custom GTM row was observed. This is the exposed list at the
time of inspection, not proof that no other injection location or frame could exist.

## Public homepage script observation

The inspected public homepage DOM contained 60 script elements. The three Google identifiers
above were present. Five `gtag/js` script nodes were visible: two for the `AW-` ID, two for the
`G-` ID and one for the `GT-` ID. The inspected top-level DOM did not contain `GTM-PX2N44V`.

These are DOM observations, not a network/event-count measurement. Repeated loaders do not by
themselves prove duplicate page views, duplicate purchases or double billing. Absence from the
inspected top-level DOM does not prove absence from every app frame, worker or possible page.
No custom script, diagnostic purchase or event replay was injected to extend this check.

Approved current theme source also contains no explicit GTM/gtag/Google tracking ID in the 67
readable files scanned under `assets`, `config`, `layout`, `sections`, `snippets` and `templates`.
`layout/theme.liquid:53` retains `{{ content_for_header }}` for Shopify-managed output. Google
font links at lines 49–51 are typography, not tracking. Source absence cannot substitute for live
Shopify app/custom-pixel or rendered-page evidence, and main is not automatically the live theme.

## Existing Tag Manager container

The owner's Tag Manager page showed the `Calapres` account under `info@calapres.com`, container
`www.calapres.com`, public container ID `GTM-PX2N44V`.

- Workspace 4 had zero pending changes.
- Version 3 was Live, published 8 August 2026, with 11 tags, eight triggers and seven custom variables.
- Most tag definitions were legacy 2023 entries; the Meta entry had an August 2026 update. Snapchat
  and TikTok tags were paused. This is container content/publication, not proof those tags execute.
- The published GA4 tag used the same `G-3YZFD1XGVL` measurement ID and `send_page_view: true`.
- The Ads conversion definition used `10837488053`, matching the native `AW-10837488053` ID.
- The legacy purchase trigger combined a custom purchase event with a thank-you-page URL path
  using OR behavior. An old custom event name was spelled `begin_checout`; no blind spelling or
  trigger correction was applied without verifying the event contract and execution evidence.
- Container diagnostics displayed **No Recent Data** and **Your tag has never been detected**.
  This is the product's current diagnostic, not independent forensic proof of its full history.
- Three template updates were available; none was installed.

The existing container was therefore set up and published, while its current installation/event
receipt was not established. The install-code entry point alone was not treated as evidence of
a missing installation. The live diagnostic and inspected public DOM give separate reasons to
review this legacy container's actual role before considering any changes.

The native Google app and the legacy GTM container reference matching Google destinations.
If both were made active for the same events, overlapping measurement would be a risk to check;
this audit did not prove duplicate receipt or authorize enabling/installing the legacy container.

## Migration warning: observation and decision boundary

The channel overview displayed **Migrate your Google tags to prevent data loss**, explaining
migration to Google & YouTube and removal of duplicate tags after migration. It is a migration
warning, not proof that the currently active native Google account connections are absent.

The same warning had already been recorded in the September source history. At that time, the
inspected prompt concerned an existing Ads add-to-cart action and no migration was performed;
that dated finding is not substituted for the current migration candidate list. Historical
purchase-telemetry uncertainty also remains distinct from a proven cause or a completed fix.

Official Google guidance, read in the in-app browser, explicitly distinguishes Google Tag
Manager from tags configured through the Google & YouTube app. It recommends moving Google
measurement out of a legacy GTM setup into the app and does not support the custom-pixel route
for that setup. The migration warning concerns legacy checkout/additional-script paths. This
supports preserving the existing native app and inspecting the exact remaining migration
candidate; it does not justify blindly reinstalling the old GTM container.
[Google's Shopify tag migration guidance](https://support.google.com/tagmanager/answer/15642481).

### Current migration wizard: exact remaining candidate

The current wizard showed **1 of 3 tasks complete**. Google account connection was complete;
Google tag `AW-10837488053`, named `Calapress`, required review/migration. Only one conversion
action was offered as a candidate:

- Action: `إضافة إلى سلة التسوق (https://calapres.com)`.
- Conversion label: `f2qDCMONiscDELXj268o`.
- Detected location: **Various pages**.
- Suggested event selection: **Added to cart**.

The Migrate checkbox was unchecked. **Migrate selected tags** was disabled. Remove duplicates
was incomplete and **Complete migration** was disabled. No checkbox was selected and no OK,
Migrate or Complete action was submitted. The suggested event mapping is therefore not a saved
migration, and the candidate is add-to-cart rather than a newly established purchase fix.

The Review link opened a Google tag configuration under account `6276252564`, container
`210282495`. This is a different object/path from legacy GTM account `6009248341`, container
`GTM-PX2N44V`; do not merge their identities because both interfaces mention containers.
The Google tag UI showed the same `AW-10837488053` with the Calapres Google Ads destination.

Google tag quality was **Needs attention**, with one issue: additional domains detected for
configuration. Suggested domains were `calapres.com` and `unywbe-ub.myshopify.com`. No configured
conditions were visible in the inspected view, and Save was disabled. No Accept, Remove or Save
action was performed. This is a configuration issue reported by Google, not proof that those
suggested domains should automatically be accepted or that a campaign/purchase is broken.

A Google tag UI banner described automatic upgrading to Tag Manager containers and said existing
behavior would be preserved without required changes. This interface/platform notice must not be
interpreted as an instruction to install the separate legacy `GTM-PX2N44V` container. No new
container, domain rule, installation, migration, duplicate removal or publication was made.

The exact candidate is now reviewable. The recommendation is to retain the connected native
Google & YouTube account path and review that one legacy add-to-cart migration separately from
any duplicate-removal decision. This is a recommendation only; no migration approval is inferred
from the read-only audit. Current purchase acceptance remains unverified.

## Product Studio and the suggestions

Product Studio was presented as a free/experimental product-image tool. The inspected Shopify
surface exposed **Generate Scene**. Official Merchant Center guidance describes broader tools,
including scene generation, background removal, resolution enhancement and video; their availability
can differ by surface/account and this does not establish that all of them are exposed in Shopify.
No Terms were accepted and no Get started action, generation, image upload, edit or publication was
performed. Current Calapres AGENTS.md restricts image generation/editing to Magnific; merely seeing
Product Studio does not change that owner rule or select a new tool.
[Official Product Studio guidance](https://support.google.com/merchants/answer/13708167?hl=en).

The overview displayed four curated suggestions:

1. Add accurate descriptive attributes, such as applicable product condition/age group.
2. Add GTINs where the products actually have assigned GTINs.
3. Show the complete product clearly in its images.
4. Prepare promotions/major launches at least 24 hours in advance.

These were general recommendations, not product disapprovals or a completed audit proving missing
attributes. Merchant Center currently approved all six offers, including variants; they are not
six base products. Google's official GTIN guidance says to use only the correct assigned identifier,
never guess or invent one; products without an assigned GTIN do not need one. Do not invent
attribute values, event dates, delivery promises or promotion capacity for a generic suggestion.
Product/catalog changes require an actual verified need.
[Official GTIN guidance](https://support.google.com/merchants/answer/6324461?hl=en).

## Evidence separation and preserved scope

Established in this inspection: account identifiers and saved active configurations; installed-tag
labels; published GTM container contents; current GTM diagnostic; top-level homepage script DOM;
and recent nonzero GA4 activity. Not established: complete cross-frame installation coverage,
correctness of all event parameters, deduplication, Google Ads conversion receipt, or an accepted
GA4 purchase/attributed purchase for an existing real order.

No install, tag migration/deletion, GTM Submit/Preview, campaign change, customer message, order,
payment, shipment, new pixel permission, customer-data sharing change or synthetic purchase was
performed. Existing native app settings, legacy paused tags, Captain pause, operational Flows,
OTO, original media and private customer/order data were preserved.

Next action, only if the owner selects a tracking change: prepare the exact single add-to-cart
migration and its acceptance/rollback plan, then evaluate actual duplicate paths before any removal.
Keep the native app authoritative meanwhile. No new install or repeated paid purchase is required
to explain the present findings. Do not reinstall Tag Manager merely because its install-code menu
is available, publish template updates blindly, accept suggested domains without review, or equate
Google tag quality warnings with a proven purchase-event root cause.

## Official references read in the Codex in-app browser

- [Google's Shopify tag migration guidance](https://support.google.com/tagmanager/answer/15642481):
  direct current read; separates native Google & YouTube tags from a GTM setup/custom-pixel route.
- [Product Studio tools and availability](https://support.google.com/merchants/answer/13708167?hl=en):
  direct current read; tool scope is broader than the single inspected Shopify Generate Scene surface.
- [GTIN attribute requirements](https://support.google.com/merchants/answer/6324461?hl=en):
  direct current read; use assigned accurate identifiers, do not make them up; products with no
  assigned GTIN do not need one.

This record is sanitized: no raw publisher/personal email, customer/order record, session URL,
authentication data or exact private analytics metrics is included.
