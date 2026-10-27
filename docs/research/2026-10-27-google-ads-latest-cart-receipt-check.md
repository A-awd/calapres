# Latest native cart add — Google Ads receipt recheck

Observed2026-10-27, Asia/Riyadh. The owner requested a current Ads-only check of the latest
cart addition without repeating the test or activating advertising. Source baseline:
Calapres main `ca721fdf1da5d999528bee8b15c754563094ed7b`; global main
`d152dde8204a9c5666afe696066882decac3f75f`. The executing parent supplied the live readbacks below;
this page records a read-only check, not a configuration change.

## Exact test and action

The existing bounded native test recorded one product_added_to_cart at16:30:42 Riyadh on
27October2026, following page/product events at16:30:21. The original cart quantity was restored
at16:33:43. This check did not replay that test or visit Shopify/the storefront.

The correct action is **Google Shopping App Add To Cart**, `7713642682`, with the manually
configured event source retained by [decision0055](../../decisions/0055-event-only-google-cart-conversion.md).
The old broad Page-load action `954369731` remains Removed.

## Current Ads readback

The action details were refreshed and still displayed **Waiting for conversions**. The reporting
range was explicitly changed to **Today,27October2026**, because the initial last-30-days range
excluded today. The native All-status list used30 rows and showed:

| Observation | Current readback |
| --- | --- |
| Correct action status | Enabled |
| Optimization / count | Secondary / Every, unchanged |
| Account-default goal inclusion | Excluded, unchanged |
| Today All conversions | 0.00 |
| Today All-conversion value | SAR 0 (source display: 0.00) |
| Exact correct action's status popover: last event signal | 23October2026,5:56PM |
| Old broad Page-load action | Removed |

The action-specific last event signal had **not** refreshed to the latest27October16:30 add.
The Ads display timezone was not independently read in this check. The23October date still
predates the27October test regardless of a plausible timezone offset; do not imply an exact
minute-to-minute timezone comparison was verified. A native screenshot captured the Today
view and the correct action's status popover.

Diagnostics exposed introductory content and a back control, not an individual-event ledger.
No new Webpages exploration repeated the earlier unhelpful inspection.

## Conclusion and evidence limits

Inside Ads, the current exposed evidence does **not yet establish receipt of the latest add or
its being counted exactly once**. Both exact-receipt and exact-count-once claims remain unproven.
The old last-signal date is an absence of fresh visible confirmation, not proof the new add was
lost. Likewise, Waiting status and zero attributed All conversions are not a raw event-delivery
ledger and do not establish loss or duplication. Secondary actions can be examined through All
conversions, but that metric remains attributed-conversion reporting, not an unconditional count
of every storefront add. Do not change Count to One or activate ads to force a reporting result.

The verified one-event native test and sole configured Ads destination from0055 remain dated,
distinct evidence. This recheck neither upgrades them into provider receipt/count-once proof nor
invalidates the saved event-only correction. No receipt or deduplication flag is changed to true.

## Preserved scope and next action

Only reporting date, pagination, refresh and read-only navigation/popover views changed. No Ads
configuration was saved; no Shopify/storefront visit, cart add, order, checkout, purchase,
ad activation/click, permission change or synthetic tracking event occurred. Google & YouTube,
legacy GTM, old-action archival, Captain pause and Easy Life's stopped state remain preserved.
One working Codex in-app tab was reused; the owner's other tab was untouched.

Do not repeat the add merely to recheck continuity. Ordinary genuine activity and later Ads
reporting may supply new evidence; any later observation must distinguish tag activity from
receipt of this exact event and an attributed count of one. Do not promise that waiting alone
will produce a per-event ledger or attributed conversion for this test.
