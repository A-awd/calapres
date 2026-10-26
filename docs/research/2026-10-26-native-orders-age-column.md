# Order age within the native Orders list — research only

2026-10-26. The owner explicitly requested checking apps or methods that show order age inside
Shopify's original Orders page without a second order screen. No store setting, app, extension,
permission, browser switch or code deployment was changed.

## Verified capability boundary

Current official Admin extension targets do not offer a native Orders grid column. Index
extensions expose actions/selection/printing; an order-details block is not an index column.
The earlier live Display options check showed no age column. A metafield/filter is not a new
visible table column. This applies to Shopify's supported extension surface, not all possible
local modifications to the browser-rendered page.

No ready-made app or browser extension implementing this specific age column was verified:

- Orderline's own vendor guide explicitly states its custom columns are in a SEPARATE order
  management screen. It does not satisfy the owner's same-page requirement.
- Better Admin for Shopify's current Chrome listing describes local Admin enhancements, order
  information popups/counts and navigation. It does not document an order-age column.
- Shopify Admin Power-Up's current listing describes local filters, shortcuts, rows and visual
  improvements, not an order-age column. Do not recommend it as an age-column solution.

## Possible development route, not implemented or tested

A custom browser extension/content script can modify the same page's visible table locally.
Chrome's official content-script documentation establishes DOM read/write capability. Applying
that to an age column is an engineering proposal, not proof of a tested Shopify implementation.

A bounded design could read a reliable full order-creation timestamp, calculate elapsed age on
screen and render a local column without changing Shopify order data or a recurring Flow.
Before promising operation, verify the actual timestamp source (datetime/title/accessible date
or an explicitly approved read API), timezone/day rounding, current native grid structure,
sorting, SPA navigation, pagination, reload and extension compatibility. Do not infer a complete
timestamp from ambiguous weekday text alone. No actual admin-page injection/test was performed.

The existing IAB tab binding was stale during this research and its previously selected browser
inventory returned no tabs. No new tab or external browser was opened to bypass this limitation.
Public-source research continued. Installing Chrome extensions into the Codex in-app browser
has NOT been established; do not promise that compatibility.

A local browser extension is not a shared Shopify account setting. Each relevant browser/device
would need an approved installation; Shopify's mobile app would not inherit the column.
Site access/installation and any external-browser use require their own applicable authority.
Owner has authorized research only, not extension installation or broader access.

## Sources

- https://shopify.dev/docs/api/admin-extensions/latest/targets/orders
- https://shopify.dev/docs/api/admin-extensions/latest/targets
- https://help.shopify.com/en/manual/fulfillment/managing-orders/viewing-orders/searching-orders
- https://orderlinehq.com/blog/how-to-add-custom-columns-to-shopify-admin-orders
- https://chromewebstore.google.com/detail/better-admin-for-shopify/kdeaeodkhafnbfdhfdbedpappgboeikn?hl=en
- https://chromewebstore.google.com/detail/shopify-admin-power-up/ochejbnipnhhbchpfdbenedibcgpdopm
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

Conclusion: no ready-made same-page age-column product was verified. A custom local browser
extension is a possible route subject to timestamp/compatibility testing; a second page is not
technically the only conceivable approach, although official Shopify grid-column support is absent.
