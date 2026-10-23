# Saudi prepaid shipping bridge: national-address acceptance audit

Date: 2026-10-23
Status: read-only research; no production change or carrier-label acceptance

## Owner requirements

The owner prioritizes prepaid wallet billing, a Saudi contracting entity with Saudi invoices, a ready Shopify integration, broad carrier choice, and the Saudi short address appearing on the actual carrier label. The owner explicitly clarified that wholly Saudi share ownership is not required; a Saudi contracting and invoicing entity is sufficient. A public integration count is not evidence that all those carriers can be purchased from a Saudi wallet.

Decision0030 remains the adopted shipping bridge. Its September9 amendment remains binding: release a carrier label only after customized goods are physically ready. Do not equate installed order synchronization with permission to create a label at payment. The historical free-shipping decision and prepaid-only customer payment remain unchanged.

## Live inspection

The installed OTO Shopify app opens. Automatic shipment creation and OTO checkout carrier-rate display remain off. No switch, account connection, wallet, location, customer, order, theme text or shipping rate was changed. No application, subscription, carrier booking, shipment, label or payment was created.

The saved checkout Address1 label reads:

> ( أدخل عنوانك الوطني المختصر لتسهيل عملية البحث عن عنوانك )

This was verified in the active theme's Shopify language editor without editing or saving. It is the label of the first address line, not independent proof of an eight-character short-address validator. A bounded inspection of one existing order found no four-Latin-letter/four-digit short code in either shipping address line; the second line was empty. This observation cannot establish the state of every order or exclude every other customization. No customer identifiers, raw addresses or payment data are included here.

The existing approved decision0022 also distinguishes address guidance and Shopify autocompletion from a direct Saudi National Address provider integration. Treat the owner requirement, current guidance, validation, stored order data and printed carrier label as separate acceptance gates.

## Platform findings

- OTO has a published Saudi contracting entity and VAT identifier, an official Shopify application with Built for Shopify status, a prepaid wallet, and a downloadable wallet-top-up invoice workflow. A previously inspected historical owner wallet invoice was issued by OTO's Saudi company. That is evidence for wallet-credit invoicing, not a claim that the historical private Fastlo contract's transport was paid through that wallet. The current Calapres invoice identity has not been verified through a newly issued invoice.
- OTO currently advertises460+ domestic/international carrier integrations, including merchants' own contracts; its ready OTO-rate page separately advertises20+ carriers in Saudi Arabia. The larger number must not be presented as460 ready wallet-funded Saudi couriers. Availability of a carrier for a particular route, weight and pickup method still comes from the quote.
- Torod publishes a Saudi company/developer address, a public Shopify app, wallet deductions and tax invoicing in its terms, plus national-address fields and label support. A current actual invoice and the Shopify-to-carrier short-code mapping were not inspected. Its broad240+/260+ network claims are not separated into comparable Saudi wallet-funded services.
- ShipTag documents a Saudi entity, wallet deductions and short-address verification/printing. Its exact Shopify installation and field-mapping path remain less substantiated than OTO's. No current owner transport invoice was inspected.
- iCARRY has a regional parent incorporated in ADGM and a public Shopify application. Saudi operations alone do not establish the issuer of the owner's Saudi VAT invoice; a Saudi contracting/invoicing entity for this use case remains unverified.

OTO is the leading candidate under the clarified requirements and the already adopted bridge, with national-address round-trip acceptance still open. This is not a new commercial purchase decision or a declaration that all alternatives fail.

## Required acceptance before claiming readiness

1. Capture and validate the buyer's real Saudi short code in an agreed Shopify order field without losing the street address.
2. Verify automatic transfer into OTO's designated short-address field, including any delayed update or accelerated-checkout path used by the store.
3. After physical manufacturing readiness and the required exact shipment authority, create one intended carrier/service label and inspect the carrier PDF itself for the code. Repeat for a second principal carrier only when its mapping needs validation.
4. Reconcile the intended wallet deduction and verify tracking writeback to the Shopify order.

No paid label test was performed in this audit. Actual pickup/contact and packaged weight/dimensions still require current verification under decision0030. Do not fund a wallet, install another app or activate auto-label creation from this research alone.

## Public references

- https://apps.shopify.com/oto
- https://www.tryoto.com/contact
- https://www.tryoto.com/shipping-management/multi-carrier-integrations
- https://www.tryoto.com/shipping-management/ship-with-discounted-rates
- https://help.tryoto.com/en/support/solutions/articles/150000208349-shipping-transactions-extra-fees-charges-faqs
- https://help.tryoto.com/en/support/solutions/articles/150000213920-what-is-the-national-address-how-to-register-for-your-national-address-short-address-
- https://apps.shopify.com/torod
- https://www.torod.co/ar/terms-and-conditions
- https://blog.torod.co/national-address-shipping-labels-saudi-2026/
- https://blog.shiptag.com/shiptag-wallet-guide/
- https://blog.shiptag.com/national-address-saudi-arabia-shipping/
- https://apps.shopify.com/icarry-connector
- https://icarry.com/ar/terms-conditions

Private source observations and billing evidence remain local, with no customer, order, invoice-access token or credential committed.

## Validation record

The documentation checkpoint fffba31941cc40a8b87c534224abe3dd600453c5 passed Shopify-native architecture guard and Shopify theme check. The separate customer-service release-lock job failed on two unlocked operations-health files and a release digest mismatch. The same customer-service check was already failing on the unchanged parent d4f8e100e50e7b56a59fb0aef42c4afb08829643. This shipping audit changed documentation only and did not modify those source or release-lock files. Preserve this as an existing customer-service validation issue; do not regenerate its immutable release lock or expand this shipping task into that system.
