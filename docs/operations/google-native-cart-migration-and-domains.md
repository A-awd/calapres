# Native Google add-to-cart migration and Calapres domains

## Later Ads-side read-only evidence — 2026-10-27

[Follow-up inspection](../research/2026-10-27-google-ads-cart-receipt-check.md) observed a recent
Ads signal at14:10 but could not distinguish the14:10:25 page view from the14:10:46 cart add.
It also exposed an independent broad Page load/URL-prefix rule on the same action. This does
not invalidate the native one-event/one-destination test below, but it prevents interpreting
that bounded test as complete Ads-side deduplication. Specific-test Ads receipt/count-once
remain unverified; no Ads source/counting setting was changed in the follow-up.


Applied and independently read back on 2026-10-27, Asia/Riyadh. The authorized native mapping,
domain configuration and bounded add-to-cart acceptance check passed. Reopened Overview no
longer showed the migration warning. No 3/3 wizard receipt or actual Ads conversion receipt is
claimed; those are distinct from the verified saved configuration and native event evidence.

Date: 2026-10-27, Asia/Riyadh. Source baseline: A-awd/calapres main
`4db3ab5ab8ddbe75802cf7b4a54c04ca58812ef0`; global launcher/routing main
`d152dde8204a9c5666afe696066882decac3f75f`.

The owner explicitly authorized resolving the remaining add-to-cart migration warning, configuring
`calapres.com` and `unywbe-ub.myshopify.com`, and preventing overlapping tracking. Preserve the
existing Google & YouTube connection and do not reinstall or activate legacy GTM-PX2N44V.
This is the bounded follow-up to the [read-only audit](../research/2026-10-27-google-services-and-gtm-audit.md),
not a new Google account, tag-manager rollout, campaign or purchase-tracking redesign.

## Protected connection and source boundary

The approved baseline connects `info@calapres.com` to Merchant 582442539, Ads 3301213892 and
GA4 G-3YZFD1XGVL/property 350424085/account 217876191. Installed Google tags are AW-10837488053,
G-3YZFD1XGVL and GT-P3NC2SXW. Existing conversion measurement/enhanced conversions, other event
mappings and customer-data permissions must be preserved.

The current AW Google tag object is account 6276252564/container 210282495. It differs from legacy
GTM-PX2N44V in account 6009248341/container 68698194. Do not merge these identities because the
Google interfaces use similar container terminology.

## Native migration and the overlap discovered during this change

The one old candidate was the existing Ads add-to-cart action for `https://calapres.com`,
AW-10837488053 conversion label `f2qDCMONiscDELXj268o`, suggested Shopify event Added to cart.
The executing agent selected this candidate and used native **Migrate selected tags**. The
wizard then displayed **2 of 3 tasks complete** and **No tags to migrate**. After the mapping
correction and fresh reopening of Overview, the migration warning and its Get started migration
button were absent; the page showed three Active connected services and six approved offers.
The executing agent did not press OK or Complete migration and did not observe a 3/3 wizard
receipt. Therefore the established outcome is disappearance of the reported migration warning
after the native saved correction, while the last explicitly observed wizard progress was 2/3.
Do not replace this distinction with a fabricated manual completion or 3/3 assertion.

Migration initially left Added to cart with two destinations: the existing **Google Shopping App
Add To Cart** plus a custom AW/legacy conversion-label destination. That overlap was found and
corrected in this same change rather than being treated as an acceptable final configuration.

Native correction reported by the executing agent:

1. Edit only the Added to cart row.
2. Use **Select from linked account** and select the existing action named
   `إضافة إلى سلة التسوّق (https://calapres.com)`.
3. Uncheck **Add custom conversion ID/label** so a second custom destination is not appended.
4. Save the row, then save the conversion-settings dialog.

After the edit, the table showed one Arabic action destination for Added to cart; the other six
rows retained their prior destinations. The dialog closed after saving. After reopening Overview
and navigating afresh to Settings, the conversion dialog independently showed only the existing
Arabic linked action for Added to cart: no Google Shopping App Add To Cart destination and no
additional Custom destination. The other six event mappings were unchanged. The subsequent
public native pixel-manager configuration independently rendered the legacy AW/label as the sole
Ads add-to-cart destination, as detailed below; its identity is not inferred solely from the
Arabic display name.

Final freshly reopened event mapping:

| Shopify event | Saved destination |
| --- | --- |
| Checkout completed | Google Shopping App Purchase |
| Checkout started | Google Shopping App Begin Checkout |
| Added to cart | إضافة إلى سلة التسوّق (https://calapres.com) |
| Page viewed | Google Shopping App Page View |
| Product viewed | Google Shopping App View Item |
| Search submitted | Google Shopping App Search |
| Payment info submitted | Google Shopping App Add Payment Info |

No Google Ads conversion action was deleted or newly created by this correction. No campaign,
primary/secondary goal, account-default-goal inclusion or spending setting was changed. The
narrow correction is the native Shopify event-to-destination mapping; do not claim it also audited
all historic Ads action-counting policies.

## Cross-domain configuration

The executing agent accepted exactly the two existing suggestions in the current AW Google tag:

| Domain | Native proposed matching rule |
| --- | --- |
| `calapres.com` | Exactly matches |
| `unywbe-ub.myshopify.com` | Exactly matches |

Save was submitted, then a fresh reload/reopen independently showed both Exactly matches rules
persisted. Save was disabled in that unchanged reopened view. Exact matching is not a wildcard
claim for arbitrary subdomains. This change does not alter DNS, domain ownership, Shopify's
primary domain, redirects, account access or page content.

## Duplication evidence and limits

There are separate questions:

- One genuine source add should not produce two copies of the same native/business event.
- One native Added to cart event should not be mapped twice to overlapping Ads destinations.
- A legitimate GA4 destination and Ads destination are distinct products, and a native Server+Web
  transport pair or repeated loader element is not itself proof of a duplicate business conversion.

The native mapping overlap introduced by migration was observed and corrected to one destination.
After that save, public homepage DOM exposed the native Shopify pixel-manager add_to_cart
configuration with exactly two product destinations: GA4 `G-3YZFD1XGVL` and one Ads action,
`AW-10837488053/f2qDCMONiscDELXj268o`. The GA4 destination is not a second Ads label. The inspected
DOM contained no manual Google conversion event call, legacy GTM ID or corresponding iframe.
Five Google loader nodes remained, without treating that count as duplicate events.

Shopify Customer events still showed the same six app rows, Google Server+Web / Always on, and
no custom GTM row. Modern active checkout settings were inspected read-only; no additional-scripts
control was exposed. That visibility limit does not establish every possible hidden script source.
The source's historical cart fix remains intact: `assets/calabriz-cart.js:152-159` uses a capture
submit listener and successful AJAX as the event source, with no manual gtag/pixel call. No theme
code change or manual event injection was made for this migration.

The prior rendered homepage had five gtag/js script nodes, but approved source did not attribute
each loader or identify a removable duplicate snippet. `content_for_header` is Shopify-managed.
Neither that count nor GTM's earlier No Recent Data diagnostic proves universal deduplication.
Do not remove all Google loader nodes, content_for_header or native Google app scripts on that
basis. The in-app browser's exposed capabilities do not provide a network collector; do not claim
a network/conversion trace from DOM-only evidence.

A new acceptance test for this configuration used the native Google app's exposed Test link and
Pixel Helper in the same working browser tab. It did not install an extension or use GTM Preview.
The baseline showed two native events, page_viewed and product_viewed. One native Add to cart
press on one plain product, without a selected physical card, increased cart quantity from one
to two and the helper event count from two to three. The new event was exactly one
product_added_to_cart, observed at 14:10:46 Riyadh. A targeted decrease of one unit restored the
owner's pre-existing quantity to one. The helper then showed four events: the two page/product
events, one add and one native cart-removal event. Private proof was retained. No checkout,
order, payment, synthetic purchase or historical event replay was performed.

This new bounded test verifies the native event count for the changed add-to-cart path, alongside
one configured Ads conversion label. It does not prove actual Ads receipt, cross-transport provider
deduplication, every storefront path or purchase attribution. The physical card intentionally
causes a second product-add request and was excluded from the one-product fixture. Provider
receipt, native event counts and saved configuration remain separate evidence.

## Acceptance readback and practical limits

- Freshly reopened native event settings verified one Added to cart destination, no additional
  custom destination and the other six rows unchanged after the dialog Save.
- Saved domain acceptance is complete: fresh reopen showed exactly the two intended matching
  rules, with the unchanged Save control disabled.
- Migration warning acceptance is observed after reopening Overview: its warning and migration
  button were absent, services remained Active and six offers Approved. The last explicit wizard
  progress remains 2/3 / No tags to migrate; no OK/Complete submit or 3/3 receipt is claimed.
- Freshly loaded account settings matched info@calapres.com, Merchant 582442539, Ads 3301213892
  and GA4 G-3YZFD1XGVL, with three connected services. Conversion measurement and enhanced
  conversions remained On; Customer Match remained Off. Legacy GTM-PX2N44V was not installed,
  activated or changed. The Google tag platform-upgrade notice does not alter that boundary.
- Runtime acceptance now includes one native product_added_to_cart for one plain-product add,
  one configured Ads action label, and restoration of the pre-existing owner cart. Actual
  destination-level receipt/network counts remain unavailable; do not claim universal zero
  duplication or completed purchase attribution.

## Targeted recovery

If rollback is required, change only the Added to cart mapping to the recorded pre-change native
**Google Shopping App Add To Cart** destination and ensure no additional custom AW destination
remains in that row. Keep the existing Ads action and its historical data. The exact native UI's
supported rollback must be checked before promising a one-click migration undo or warning reset.
Do not disconnect Google & YouTube, remove native tags or install legacy GTM for rollback.

For domains, remove only the two exact newly saved rules or restore the exact recorded earlier
rules, preserving unrelated/concurrent domain configuration. Do not edit DNS or domain ownership.
Do not restore a whole old theme or GTM version for this bounded recovery.

Captain remains paused. Operational fields/Flows, OTO, product/price/inventory/media, customer
records, privacy/consent and permissions are outside this change. No customer message, shipment,
financial action, new add-on, campaign activation or Easy Life run is authorized by this record.
The adjacent JSON is a sanitized declarative contract, not a Shopify/Google native export or an
importable restoration file.
