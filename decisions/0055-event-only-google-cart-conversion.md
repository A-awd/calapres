# 0055 — Event-only Google Ads cart conversion through the native app

Date: 2026-10-27. Status: accepted, applied and independently reopened; saved configuration and
one bounded post-change native add check verified. Exact Ads per-hit receipt/counting and
universal provider deduplication remain unverified.

## Decision

The owner authorized measuring real cart additions only, excluding general page-load conversions,
while preserving Google & YouTube and avoiding ad activation, orders and test purchases. Keep
the native Shopify event as the source; do not add manual gtag/custom pixels or reinstall GTM.

Use the pre-existing **Google Shopping App Add To Cart** action `7713642682`, inspected as a
manually configured event from Calapress, as the sole native Added to cart destination. Retain
its existing Secondary, Count Every and account-default-goal-excluded settings. Archive only
the incorrect broad Page-load action `954369731` through supported recoverable Removed status,
with its identity/history retained. Preserve the six other event mappings and native Google
connections, tags and domains.

This supersedes only0054's cart action/source selection. The domain rules, native account links,
previous migration-warning result and historical native cart acceptance remain dated evidence.
Do not use Count One, Primary/Secondary toggles or goal changes to conceal an incorrect source.

## Applied evidence

Fresh Ads reload showed the old action Removed/tracking Removed and the manual replacement
Enabled. The historical old row remained in All-status view. Fresh Shopify settings and reopened
conversion edit showed one correct linked destination, custom ID/label unchecked and unchanged
Save disabled. The other six mappings, three connected services and Google tag IDs were preserved.

Published native pixel configuration independently exposed exactly one Ads cart label,
`AW-10837488053/KORbCLqxk94cELXj268o`, plus separate GA4 `G-3YZFD1XGVL`. The old f2qDCMONiscDELXj268o
label and legacy GTM were absent from the inspected published page. This does not assert every
page/frame/worker or exact provider-hit coverage.

One native Google Pixel Helper check on a plain product with no card showed page/product events
at16:30:21, one product_added_to_cart for one Add press at16:30:42, and one targeted removal at
16:33:43. Cart quantity went1 ->2 ->1, preserving the owner's original cart. No checkout, order,
payment, purchase, ad activation/click, synthetic event or historical replay was performed.

The manual Ads action still displayed Waiting for conversions on fresh inspection. No provider
per-hit/count ledger established exact Ads receipt or count-once. The old14:10 signal remains
ambiguous between page view and cart add; the correction does not rewrite that history as proof.
Saved configuration, bounded native singularity and provider attribution must remain distinct.

## Recovery

Only a genuine bounded rollback may re-enable954369731 through the verified All -> Enabled path
and reselect its old sole native mapping. That also restores its known broad URL-rule risk;
do not perform it automatically. Preserve both histories and unrelated settings. No whole theme
or GTM restore, native app disconnection, campaign activation or Count One masking step.

See [exact configuration, acceptance evidence and recovery](../docs/operations/google-cart-event-only-correction.md).
