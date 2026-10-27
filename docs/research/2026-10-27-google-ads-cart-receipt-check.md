# Google Ads cart-test receipt and counting — read-only follow-up

Observed 2026-10-27, Asia/Riyadh. The owner requested checking inside Google Ads whether the
already completed cart-add test arrived and was counted once, without activating advertising,
creating an order, making a test purchase or repeating the cart test. This inspection made no
configuration or counter change. The initial source baseline was Calapres main
`7efd13c1c0e21e7c738f7815eaba759df029adfc`; global launcher/routing main remained
`d152dde8204a9c5666afe696066882decac3f75f` at the source review.

## Exact existing action and test

| Item | Verified reference |
| --- | --- |
| Google Ads customer | `3301213892` (`330-121-3892`) |
| Migrated action | `إضافة إلى سلة التسوّق (https://calapres.com)` |
| Conversion action ID | `954369731`, created in 2022 |
| Google tag / conversion label | `AW-10837488053/f2qDCMONiscDELXj268o` |
| Existing cart-add test | 27 October 2026, **14:10:46 Riyadh** / **11:10:46 UTC** |
| Earlier product-page view in the same test session | **14:10:25 Riyadh** |

The preceding [native implementation and acceptance record](../operations/google-native-cart-migration-and-domains.md)
and [decision0054](../../decisions/0054-native-google-cart-migration-and-domains.md) establish
one native product_added_to_cart for one plain-product add, one Ads add-to-cart label in the
published native pixel configuration, and restoration of the pre-existing owner cart. They
explicitly did not establish actual Google Ads receipt or provider-side duplicate counting.
This follow-up does not promote the native Pixel Helper result into that missing evidence.

## What Google Ads showed

The selected date range was **Today, 27 October 2026**. Both cart actions showed **0 All
conversions** in that reporting view. The target Arabic action and the earlier Google Shopping
App Add To Cart action were Secondary, excluded from the account-default goal, and configured
to Count Every. No action, goal, attribution or counting setting was changed.

| Action | Last event signal shown | Today's All conversions |
| --- | --- | --- |
| Migrated Arabic cart action, ID954369731 | 27 October, **14:10** | 0 |
| Google Shopping App Add To Cart | 23 October, **17:56** | 0 |

The action's details displayed Google-paid last-click attribution and a 90-day click window.
The prior test record contains no documented qualifying advertising interaction. These settings,
the selected reporting results and raw tag activity are distinct evidence types; a zero counted
conversion total alone does not establish a missing raw signal or an exact raw-hit count.

The current action's details displayed **Event: Page load — calapres.com**. Its source-event
section described a user visiting a page whose URL begins with calapres.com. A read-only
inspection of the event-settings panel showed:

- Event type: **Page load**.
- URL matching: **begins with**.
- Fixed URL prefix: **calapres.com/**.
- URL suffix textbox: empty.

The panel was inspected without editing a field or selecting Save. Cancel was used and the
collapsed settings region was confirmed in the native accessibility state. The action is enabled,
but this inspection did not establish a runtime trace proving that this URL rule fired alongside
the actual native cart-add trigger.

The Diagnostics tab exposed an experimental heading but no per-hit log for the test. The Webpages
tab exposed no data entries for the selected Today view. No event-specific receipt or duplicate
ledger was obtained from those surfaces. An enhanced-conversion issue referred to management
through Tag Manager; that wording is not evidence that the separate legacy GTM-PX2N44V container
is installed, executing or authorized for reactivation.

## Receipt and duplication conclusion

**Recent target-action/tag signal activity is observed. The particular cart-add test's Google
Ads receipt and exact one-time Ads counting remain unverified.**

The target's 14:10 signal is only minute-level evidence. Both the page view at14:10:25 and the
cart add at14:10:46 fall within that minute. The signal therefore cannot be uniquely attributed
to the cart add. Even a matching product-page URL would not distinguish these events because
both occurred on that page. The visible zero All conversions values do not mean zero raw hits,
prove loss of the add signal or establish one-time provider counting.

The saved native mapping is singular, but that finding covers the native Shopify event-to-Ads
destination path. It does not exclude an independent Google-tag URL/page-load trigger for the
same existing conversion identity. The broad URL rule represented in the current enabled action
is a concrete configuration concern for review; runtime overlap or a double-counted conversion
was not proved by the available diagnostics. Do not describe it as a confirmed duplicate event,
and do not describe one native label as a universal deduplication guarantee.

| Evidence question | Result |
| --- | --- |
| Recent signal activity for the target action/tag | Observed at minute precision |
| This exact14:10:46 add uniquely received by Google Ads | Not established |
| This exact test counted once inside Google Ads | Not established |
| Native source-event and native configured-destination singularity | Preserved from the completed bounded acceptance |
| Independent URL/page-load rule represented in the Ads action | Observed in saved UI |
| That rule actually firing alongside the cart add | Not established by a runtime trace |
| Double-counted Ads conversion proved | No |

In the decision0054 contract, `actualAdsConversionReceiptVerified` and
`providerDuplicateEventCountVerified` must remain **false** for this test. The new last-signal
observation does not justify changing either flag. The original saved domains, native mapping,
Shopify warning disappearance and bounded one-add evidence remain valid dated observations;
this follow-up extends the Ads-side configuration coverage rather than erasing that history.

## Next bounded review

If the owner selects a further tracking correction, review the exact broad page-load rule for
action954369731 and prepare its precise recovery before changing it. The intended cart signal
should continue through the existing native Added to cart mapping, while preserving the existing
conversion identity/history, Google & YouTube connection and other six event mappings.

Do not merely change Count Every to One, toggle Primary/Secondary, alter account-default goals,
install legacy GTM or remove native app tags to obtain a reassuring total. Those changes would
not establish the underlying event path. Do not repeat the completed add, click/buy an ad,
manufacture an attribution identifier, replay a conversion, create an order or make a purchase
to fill the remaining evidence gap. Provider activity, attributable conversions and exact-event
deduplication must remain separately described.

This follow-up does not introduce a new implementation/policy decision. No decision0055 is
needed for the read-only evidence record.

## Preserved scope and private evidence

No advertising was activated, no new cart-add test/order/checkout/purchase was created, no manual
conversion was uploaded, and no counter, rule, source, goal, campaign, budget, tag, account link,
permission or privacy setting was changed. Legacy GTM, the native Google & YouTube connection,
Captain pause, existing operational Flows, OTO and private customer/order/media data were preserved.
Use the existing private evidence for the original test and retain any new detailed account UI
captures privately; do not publish raw session URLs, authentication data or customer records.

## Source preservation and official explanation

Before publication, latest main was `1489289e80bdb41512ef95128ef08d6025c82ed2`. Its intervening
OTO-reply coverage correction did not change tracking/theme code or this Ads configuration.
The current state/handoff additions preserve that newer record rather than replacing it.

The executing agent read these official pages in the same Codex in-app working tab:

- [Google Ads conversion measurement](https://support.google.com/google-ads/answer/1722022?hl=ar)
  explains website conversion attribution after advertising interaction. A tag-activity timestamp
  and a reported attributed-conversion total therefore answer different questions.
- [Conversion page definition](https://support.google.com/google-ads/answer/61132?hl=ar)
  explains that a conversion page should be reached only after the intended action and that
  page loading sends the measurement signal. A site-wide page-prefix rule needs specific review
  before interpreting its activity as a cart-add signal. This is interpretation of the configured
  UI, not a newly observed duplicate firing.

Private rule screenshot, source notes and structured evidence are retained under the verified
Ai-Work/التسليم/2026-10-27-google-ads-receipt-check path. No raw session URL is published.
