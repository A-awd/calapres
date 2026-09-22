# Engraving app trials — 2026-09-22

## Authorization and current status

Owner reconfirmed full installation authorization and explicitly required GitHub-based trial themes with no publication. All FOUR apps are now verified in Shopify Installed apps. The earlier browser blocker below is resolved; do not ask the owner to repeat a manual install step.

| App | Verified current status | Actual subscription trial end | Post-trial subscription, excluding taxes and usage |
|---|---|---|---|
| Customily | Installed; Free trial in Shopify | 2026-10-01 | Estimated SAR 184 per 30 days (source USD 49) |
| Zepto | Installed; Starter Free trial in Shopify | 2026-10-07 | Estimated SAR 38 per 30 days (source USD 9.99) |
| Teeinblue | Installed; Blue Free trial in Shopify | 2026-10-06 | Estimated SAR 184 per 30 days (source USD 49) |
| Cloudlift LPO | Installed; setup pending; no Billing card in Shopify app details | Not verified | No recurring subscription approved yet |

SAR display uses the SAMA 3.75 SAR/USD rate verified in the companion research and rounds upward. Shopify trial dates were read on the actual approval pages and three Free trial badges were subsequently verified in Installed apps. Cloudlift's setup requires choosing a theme and enabling its embed; no embed was enabled by this task.

Customily approval disclosed a USD 10,000 usage cap and USD 0.1–1 per customized ordered item. Teeinblue disclosed a USD 9,999 cap, with no transaction fee for the first 100 monthly orders and USD 0.1–0.4 thereafter. These caps are NOT amounts charged. No orders were placed in this task. Attempting to lower Customily's cap to zero was rejected by Shopify with “Please enter an amount above $10,000.00 USD”; no cap change was saved. Do not claim spending caps were reduced or that trial usage is unconditionally free.

Shopify showed Customily Extensions: 0 active, Cloudlift Extensions: 0 active and Functions: 1 active. Customily also recorded one Online Store edit by the app. Installing apps can create global resources independently of theme publication; no claim is made that installation has zero storefront effect. Audit these app-created resources before preview activation or checkout testing.

Live theme remains `166066389248`, named `Calapres — single cart event test 2026-09-09`, last saved Sep 9 at 04:09 per Shopify. Several draft themes exist; no draft was selected or modified and no Publish action occurred. Do not mistake the word “test” in the active theme's name for an unpublished theme. Before implementation, inspect GitHub binding and select/create a separate unpublished test target.

A daily thread heartbeat, `automation-2`, now checks approaching trial deadlines, remains quiet without meaningful changes, and flags an unresolved trial within 48 hours of expiry. It can cancel the three losing apps once a winner is actually established under the owner's authorization; no winner or cancellation is yet recorded.

## Earlier installation attempt (superseded)

Owner authorized installing and comparing four app trials: Customily, Cloudlift Live Product Options, Zepto Product Personalizer, and Teeinblue; retain the winner and uninstall the other three. This supersedes research-only scope for trial installation. Production theme publication and unexpected paid charges are not authorized.

No installation confirmation or billing approval screen has been reached. No app installation or trial start is verified. Customily Install did not navigate or open a tab through either supported locator click or physical click. Refreshed the App Store session through Shopify Admin's observed authentication link and retried once; same result. Do not infer exact root cause.

The existing work tab is left at https://apps.shopify.com/customily-product-personalizer . Asked the owner to click Install once in Codex and reply with a dot; verify resulting screen independently. Do not use an external browser or change page DOM to bypass this behavior.

## Trial comparison

| App | Advertised trial | Primary focus | Trial-specific open issue |
|---|---|---|---|
| Customily | 9 days | Personalization and production exports | Arabic shaping and three simultaneous designs |
| Cloudlift LPO | 14 days | Product options and live preview | Whether Export add-on is included in trial; output limitations |
| Zepto | 15 days | Product personalization | Custom drawer and multiple add-to-cart buttons; actual vector export |
| Teeinblue | 14 days | Personalized artwork and printing | Production-compatible vector output for engraving |

This table records advertised trial periods. Actual activated subscription dates are recorded above; Cloudlift's remains unverified. See companion research report for sources and exact pricing references.

## Controlled test protocol

1. Review app installation permissions and actual trial billing terms.
2. Create an unpublished copy of the current live theme; record its ID. Scope app activation to test products/theme where supported. Inspect any global scripts before enabling.
3. Activate one app at a time, using the same synthetic Arabic names: عبد الرحمن، عبدالرحمن، محمد، نورة، أنا عبد الرحمن, plus a long name, diacritics and unsupported characters.
4. Check name entry once, three selectable design previews, mandatory explicit approval, and invalidation of approval after name/design changes.
5. Verify the exact approved preview and persistent design ID survive custom cart drawer, sticky add-to-cart, quantity changes and two differently personalized units of the same product.
6. Complete an authorized non-charge test-order flow when available; never infer success from preview alone. Verify saved artwork and production file against the approved preview. Do not charge a real payment for testing without authorization.
7. Compare mobile performance with baseline, failure isolation, and behavior when app service is unavailable.
8. Select winner only after end-to-end evidence; uninstall losers and verify subscription cancellation and remaining theme artifacts before each trial expires.

Manufacturing format, engraving dimensions, and fixed fonts versus interwoven calligraphy remain open. These do not block preliminary app trials but do block claiming manufacturing readiness.

## Next action

Installation is complete. Prepare GitHub-backed unpublished theme experiments, inspect app-created global resources, then configure Cloudlift and the other apps one at a time. Preserve the live theme. Run the controlled test protocol before selecting a winner; do not publish until the owner accepts the result.
