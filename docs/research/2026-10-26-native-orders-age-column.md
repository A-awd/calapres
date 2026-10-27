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

## Bounded Codex in-app feasibility check — 2026-10-27

Owner authorized read-only feasibility and creation-time inspection only; no development or
installation. Latest approved main before inspection was `31e7f32b95eb72aeccd73f56e6ffc90d55dc7a8a`.
One Codex in-app browser tab opened the authenticated Calapres Admin, the native Orders table and
one order-details page, then returned to the same Orders table. No external browser, new app,
extension, injected display, Shopify setting, order write or customer communication was used.
No historical acceptance test or broad app search was repeated.

### Browser capability result

Live backend capability discovery advertised browser `visibility`/`viewport` and tab
`pageAssets`/`webmcp`. Its installed Browser API explicitly constrains page and locator evaluation
to read-only inspection and exposes no method to load/install an extension or persist a custom
page script. The current order-details document advertised no WebMCP tools.

Official OpenAI documentation distinguishes the built-in profile from regular browsers and
presents the browser extension as the connection to an existing external browser. It does not
establish installing arbitrary Chrome extensions into this in-app browser.

Result: **no supported, verified route for a persistent local age column has been established in
the current Codex in-app browser**. This is a bounded capability result, not proof that all possible
underlying browser modification is universally impossible. No extension or DOM-write test was run.
Installing an external-browser bridge or changing browsers is outside this authorization.

### Actual timestamp-read result

Read-only DOM inspection of the loaded native table found localized date text in its date cells,
including relative weekdays. The date cells carried no `time`/`datetime`, full-date `title`, or
`data-date`/`data-timestamp` value. No exact creation instant can safely be recovered from that
relative label alone; the year, seconds and zone must not be invented.

The inspected order-details heading exposed a full calendar date, hour and minute as plain text.
The creation-related timeline entries likewise exposed minute-level text without a full timestamp
attribute. Other `time[datetime]` elements elsewhere on the page belonged to unrelated history;
they were deliberately not treated as this order's creation timestamp. No hidden framework state,
browser credential/profile data, or undocumented authenticated request was inspected.

Official Shopify semantics add a separate constraint: `Order.createdAt` is the immutable creation
time, while `processedAt` can differ. The order-create input documents `processedAt` as the date
appearing on orders and in reports; imports can backdate it. That reference does not explicitly
identify this current `ORDER_DATE` DOM column, so equality between the displayed date and
`createdAt` is **not proved**. `DateTime` is ISO 8601; preserve the actual value and its zone rather
than supplying missing seconds or assuming a display timezone.

Result: full displayed date and minute were readable from order details; **the canonical exact
`createdAt` value and its zone were not verified from the current UI or an authenticated API**.
Do not claim exact automatic creation-age calculation from the Orders table. Documentation of an
API field is not evidence of this session's API access or any particular live value.

### Continuation boundary

The two feasibility gates remain open: a supported same-page rendering mechanism in the required
in-app browser, and an actually readable canonical creation timestamp. No implementation choice
or installation is approved. A later separately selected task can evaluate existing authorized
read-only Shopify access for `createdAt`; do not create credentials, expand scopes, inspect hidden
session data or switch browsers to satisfy it. Exact timestamp access alone would not solve the
in-app rendering gate. Preserve Captain's pause, saved fields/Flows/view, and all existing live state.

### Primary references checked

- [OpenAI Browser](https://learn.chatgpt.com/docs/browser)
- [OpenAI browser extension](https://learn.chatgpt.com/docs/chrome-extension)
- [Shopify Order fields](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order)
- [Shopify order-create input](https://shopify.dev/docs/api/admin-graphql/latest/input-objects/OrderCreateOrderInput)
- [Shopify DateTime](https://shopify.dev/docs/api/admin-graphql/latest/scalars/DateTime)

Private customer/order values and raw page snapshots are intentionally excluded from this record.

