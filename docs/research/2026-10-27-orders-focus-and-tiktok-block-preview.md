# Native Orders focus and TikTok block preview — 2026-10-27

Owner asked how to distinguish remaining orders at a glance, whether rows/order numbers can be
light grey, and why the previously added TikTok block appeared in one order but not others.
This was read-only verification in one reused Codex in-app browser tab. No app, extension,
permission, order, workflow, customer message, shipment or persistent layout setting was changed.
Baseline approved main was `60fb952c1531488169d053be1921a5ecb9d33abc`.

## Existing native working view

Selected the already-saved **الطلبات التي لم تُسلّم**, ID `1599521751296`, through the native
All view menu. Reopened filter chips confirmed:

- Delivery status is not Delivered.
- Order status is not Canceled.
- Tagged with is not تجريبي.

The saved query remains `-delivery_status:"delivered" -status:"cancelled" -tag:تجريبي`.
The loaded table showed the intended remaining-order subset; live order identities, customer
values and raw snapshots are intentionally excluded from this record. Save and Reset view were
disabled: the existing view was selected, not edited/recreated. Left this view open for the owner.

Saved-view membership follows the statuses and tags in Shopify. Physical receipt alone does not
update this view. OTO tracking/Delivered writeback remains unproved; do not imply that this check
established synchronization. Fulfilled/shipped is not Delivered, and filtering only Unfulfilled
would hide in-transit orders. No delivery status was written during this check.

The existing direct saved-view entry can be used for daily focus. The Orders sidebar still targets
All; selecting a saved view does not establish a new global default. Do not promise that this
navigation/default behavior has changed.

## Row or order-number colour

Current native controls and official documentation cover filtering, sorting, column visibility
and ordering. No native documented setting for assigning a light-grey colour to an individual
order row or order number was found. This is not a universal claim about every possible third-party
modification. No colouring extension, browser change, injected styling or app development was used.
The existing focused view solves the current visibility problem without requiring test-order deletion.

## TikTok: preview is not a pinned block

The initially open order showed **TikTok — Preview**, with **Remove from page** and
**Pin to page for all staff** controls. A different order showed the Blocks area without the TikTok
block. On navigating back to the first order, its preview was gone and only the Block add control
remained. No Add, Pin, Remove or Unpin action was performed.

This matches Shopify's documented lifecycle: choosing an app from Block adds a temporary preview;
leaving the page removes it. Pin is the step that makes the block permanent on the page for all
staff. Therefore the prior blanket wording that this was already a completed one-time setup was
incomplete: the observed item was an unpinned preview. No globally pinned TikTok layout is claimed.

Pinning governs the block's placement, not whether TikTok has order-specific content. Admin block
extensions receive the selected resource context. Appearance alone does not prove TikTok attribution,
TikTok Shop synchronization, or data availability for every order. No TikTok order ingestion test,
content/attribution acceptance or pinning change was made or authorized by this review.

## Next appropriate owner outcome

Use the existing undelivered view to focus daily work, retaining native history and the test tag.
If a permanent TikTok block is wanted later, make that an explicit separate layout choice; no pin
is needed merely to use the working order view. Preserve Captain's pause and current fields/Flows.
No fresh deletion attempts, real-payment refunds/cancellations, shipments or historical test replay.

## Primary references checked

- [Order display and saved views](https://help.shopify.com/en/manual/fulfillment/managing-orders/viewing-orders/searching-orders)
- [Order filters](https://help.shopify.com/en/manual/fulfillment/managing-orders/viewing-orders/filtering-orders)
- [Current saved-view interface](https://help.shopify.com/en/manual/shopify-admin/productivity-tools/searching-filtering-views)
- [Order status meanings](https://help.shopify.com/en/manual/fulfillment/managing-orders/order-status)
- [Admin app block preview and pin](https://help.shopify.com/en/manual/apps/install-setup-apps#add-blocks-to-your-shopify-admin)
- [Selected-resource block context](https://shopify.dev/docs/api/admin-extensions/latest/target-apis/core-apis/block-extension-api)
