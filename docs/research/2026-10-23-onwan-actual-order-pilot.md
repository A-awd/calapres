# Actual Onwan order-address pilot — 2026-10-23

Status: real postorder Onwan→Shopify address write passed; the same OTO order still has a partial, incorrectly mapped address after a selected-order synchronization attempt. No explicit synchronization success was captured. Synthetic cancellation/archive and one-item restock are verified; customer notification was unchecked. The owner requires a native Shopify–OTO solution and rejected external middleware. No production adoption or completed original pre-checkout chain is claimed.

## Scope and isolation

The owner requested an actual automatic address test and mapping investigation without customer messages or shipments. A fresh native administrative unpaid fixture, order1010, was created from DraftD3 (1265515266304); Shopify order ID7263852691712. It uses the existing synthetic customer with no email or phone. It is a normal unpaid order, not an API test:true order. Payment is due on receipt, paidSAR0, unfulfilled. The original shipping address contained only the obvious technical-test placeholder `اختبارتقنيدونعنوان`, cityRiyadh and countrySA; it had no full address, short code, address2 or postal code.

Onwan initially showed1010 Pending. Its only Send action was disabled because the synthetic customer has no email. No capture email, WhatsApp message or OTP was sent, and no payment or shipment was made.

## Real app capture without a message or live publication

The active checkout configuration was duplicated to unpublished draft8221688064, named Onwan isolated pilot2026-10-23. An Onwan Order Status block was saved only in that draft. The original active configuration and active storefront theme remained unchanged.

The native merchant View order status link opened the actual order1010 without an OTP. The operator reused only the already-observed native preview parameter names and values to select the merchant's own unpublished draft on that actual order page. The page showed order1010, DraftD3, its unpaid amount and original placeholder, plus the Onwan block and the exact draft footer. This was the actual order context outside the simulated checkout editor. Preview tokens, capability URLs and signed order URLs are transient and are not saved in this report or intended for GitHub.

The operator entered only the publisher's public sample codeRCTB4359 into the app's Verify Address flow, reviewed the resolved full address and clicked Confirm & Save. No full address was manually inserted into Shopify or OTO to manufacture this result.

## Observed native Shopify result

Onwan actually changed order1010's shipping address:

| Native field | Observed value |
|---|---|
| Address1 | 4359 Abi Al Karam |
| Address2 | RCTB4359, Al Dhubbat Dist. |
| City | RIYADH |
| Postal code | 12627 |
| Country | Saudi Arabia |
| Additional details | national_address_short=RCTB4359 |
| Tag | onwan-address-verified |

The native timeline records that Onwan updated the shipping address. This is real Onwan-origin full-address persistence on the existing Basic store. It proves the postorder capture path, not completion of the original pre-checkout cart.

## Same-order OTO readback

After several minutes, recipient inspection of the same order1010 in the correct Calapres OTO merchant showed mixed old and updated fields:

| OTO field | Observed value | Assessment |
|---|---|---|
| Detailed address | Original placeholder اختبارتقنيدونعنوان | Stale composite address |
| Dedicated short code | Not populated | Original code did not populate this field in this update path |
| Building number | RCTB4359, Al Dhubbat Dist. | Incorrect structured mapping from native address2 |
| Street | 4359 Abi Al Karam | Updated from native address1 |
| City | Riyadh | City present |
| Postal code | Not populated | Native12627 is not reflected in the structured field |
| Region | Not populated | Not established |

The OTO edit view was cancelled without saving. These observations show a partial update, rather than a wholly stale record: street and building fields changed while detailed address and dedicated code did not. They do not establish the integration's implementation or root cause. The same address2→building behavior appeared in the earlier manually supplied1009 fixture;1010 now demonstrates it with address2 genuinely written by Onwan.

No carrier payload, label, shipment purchase, tracking number, pickup or fulfillment was created. Correct display of the complete original code and full address in a carrier label remains outside the tested scope.

## Verdict and current next actions

| Requirement | Verdict |
|---|---|
| Real app verification of the public short code | Passed forRCTB4359 |
| Onwan writes the full native Shopify shipping address on Basic | Passed in actual postorder1010 |
| Shopify persists the original code and verified status | Passed |
| OTO receives and correctly maps the entire updated address and code | Not passed: mixed stale and incorrectly mapped fields |
| Original pre-checkout cart completes automatically through to OTO | Not tested; do not equate this postorder test with that path |

The operator attempted the native selected-order Synchronize action for order1010 with the exact connected store selected. No explicit success confirmation was captured. A later fresh recipient-details readback showed the same mixed fields: the detailed address retained the original placeholder, address1 appeared as street, address2 appeared as building number, and the dedicated short-code and postal-code fields remained empty. The attempt did not establish a complete native address repair. Do not report synchronization success, a paid-tier requirement or a native mapping fix from the action alone.

The operator also inspected Bulk Update Orders with only1010 selected. The available form exposed a brand selector and reference2, not an address reimport action. It was cancelled without saving. This inspection did not alter the test address or establish a bulk address-refresh capability.

Existing installed Shopify Flow was inspected read-only. No create/edit action was visible in the inspected interface. That observation does not prove that no OTO connector or native Flow route exists; it establishes only the limits of that read-only inspection. No flow, channel, API credential, API key or external workflow was created.

## Native connection inspection and official AI limit

The existing Shopify channel has Accept Pull Orders and Accept Webhook Orders enabled. Automatic shipment creation, carrier rates and shipment synchronization are off. No address-mapping setting was visible in the native advanced form. The Arabic label translated as filter by marker corresponds to input name `commentKeys`, which is empty. Its function is undocumented in the examined primary material; do not assume it is an order-tag filter or set it to `national_address_short` by guess. The form was cancelled without saving.

Under the prior owner authorization to use the in-app AI conversation, the operator asked a precise technical question containing only field names and the synthetic observed behavior, explicitly requesting no email, ticket or human transfer. The official AI replied that its available documentation does not explain post-import address refresh, zip/national-address field mapping, or commentKeys. This is a limit of the assistant's published knowledge, not proof that OTO has no internal remedy. No email, support ticket or human escalation was requested. No customer message was sent.

The current self-service blocker is lack of a verified native field-mapping/refresh control. Correcting it must remain inside the official Shopify–OTO connector. A paid plan, Shopify upgrade or manual OTO rewrite is not established as a fix. Keep the complete workflow unaccepted until an actual Onwan-origin address update reads correctly in OTO.

## Later owner constraint — native integration only

The owner explicitly rejected n8n and external middleware for this address path. Continue only with the existing native Shopify–OTO integration; do not deploy the earlier adapter proposal or ask for its credentials as the next step. The local `work/onwan-oto-adapter-draft/` files are retained solely as an abandoned, owner-rejected proposal. They were not adopted, imported, credentialed or deployed, and their offline tests do not demonstrate a working transport.

The unresolved dependency is correct native mapping of the full address and original short code into the same OTO order. An observed order import, successful Onwan verification or a native Sync click does not satisfy it. No new backend, Shopify Flow automation or integration is adopted by this report.

Native1010 is now cancelled and archived. The native timeline confirms one item restocked at one location; paid remains SAR0. Cancellation reason Other and customer notification explicitly unchecked before submission. The audit record is preserved; no permanent deletion occurred.

Growth remains selected under the owner's later instruction. Pre-checkout validation remains off; the active theme and active checkout configuration remain unchanged. Keep capture emails, WhatsApp consent/reminders and OTP off, and keep OTO automatic shipment creation off.

## Primary references for the isolated mechanism

- https://help.shopify.com/en/manual/checkout-settings/customize-checkout-configurations/active-and-draft-checkouts
- https://help.shopify.com/en/manual/checkout-settings/customize-checkout-configurations/checkout-editor
- https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders/create-draft
- https://onwanapp.com/
- https://help.tryoto.com/en/support/solutions/articles/150000200661-how-to-create-an-order


A final read-only Onwan Settings inspection exposed branding, form content, messaging and pre-checkout controls, but no address output-format or OTO field-mapping setting. All capture messaging and pre-checkout controls remained off; no settings were saved. The app dashboard still showed Growth Plan and Trial active.
