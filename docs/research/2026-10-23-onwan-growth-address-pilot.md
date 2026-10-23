# Onwan Growth address pilot — 2026-10-23

> Historical pre-checkout and administrative1008/1009 record. Genuine app-origin postorder1010 was tested later; do not treat the compatibility fixtures as completed storefront checkout. Read the [consolidated experiment register](2026-10-23-national-address-experiment-register.md) first for the current verdict and no-repeat rule.

Status: partial live verification. Correct Calapres OTO access now confirms dedicated short-code import, but the second compatibility fixture exposed an incorrect building-number mapping. No production adoption or complete automatic acceptance is claimed.

## Authorization and commercial chronology

The owner first approved a seven-day Growth trial on existing Shopify Basic, without messages or shipments, and requested return to Free after testing. The trial was activated. Native Shopify approval showed trial end2026-10-30, then approximately SAR109 per30days (source USD29), before tax/FX. A mandatory SAR1875 ceiling (sourceUSD500) covered WhatsApp overage/OTP usage only; neither channel was invoked.

After the initial storefront test, the operator disabled pre-checkout and selected Free as originally instructed. Onwan showed Free0/25; Shopify native app details showed the former Growth plan expiresOct30; the current upcoming bill listed unrelated transaction fees only, with no Onwan charge observed.

The owner then explicitly instructed not to cancel renewal and clarified that the service is useful only if OTO receives the correct address. The operator approved restoration using a fresh screen still showing the seven-day trial untilOct30 and USD29 dueOct30. Restored OnwanBilling now verifies Growth as Currentplan; Shopify native appdetails also shows Free trial with USD29/month+usage aftertrial (the former expiry/cancellationlabel is gone); do not report the former Free state as the current final decision or cancel again under the superseded instruction.

## Isolation

Live source theme166625181952 was copied to unpublished theme167831535872. Only the copy received the Onwan Pre-checkout embed. The live theme was not edited/published. Short-address-only mode was saved; capture emails, WhatsApp consent/reminders, OTP and past-order import remained off/unused. Pre-checkout was later disabled again and the copied embed was switched off and saved. The current live theme remains unchanged.

OTO embedded Settings matched Calapres; auto-create shipments and discounted checkout carrier rates remain off. Wallet0. No label, carrier selection, pickup, payment or fulfillment was created.

## Observed storefront test

1. The actual Arabic popup intercepted the existing personalized cart checkout link on the unpublished preview, without demo query mode.
2. Syntactically valid ZZZZ0000 was rejected with a response that the location does not identify a building.
3. Public sample RCTB4359 resolved to building4359, Abi Al Karam, Al Dhubbat, Riyadh12627, with its original code displayed. This is a real provider lookup for one public sample, not a proof of every Saudi address.
4. Confirming the result populated native Shopify fields automatically: address1=building+street+district, city=Riyadh, postalCode=12627, countrySA. The original code and additional number were not visible in the rendered native address fields. Their later attribute/metafield transfer was not established by that screen.
5. Both original cart lines and their engraving/design properties remained in the native checkout summary. No item was added or removed from that existing cart. Contact fields stayed blank, no payment details were entered, and checkout stopped before payment.

The owner briefly used the same page manually; a changed non-sample code was not used as evidence or copied to the sanitized report. After clarification, the operator repeated the public sample test without that interference.

## Bounded unpaid integration test

To examine real OTO ingress without payment/customer communication, the operator created one obvious synthetic customer with no email/phone and public sample code in its shipping address. One real catalog variant was used, rather than a custom item unsupported by some shipping integrations.

Native DraftD1 was completed using Payment due later and an explicit confirmation that the order is created without payment. Synthetic order1008 (Shopify7263773098240), from draft1265502912768, has paymentpending, paidSAR0, unfulfilled, and a clear no-execute/no-ship/no-send note. Its temporary inventory reservation was released: order1008 was cancelled and archived with Restockinventory checked and Sendnotification unchecked. Native timeline confirms cancellation and oneitemrestocked at onelocation. The record remains for addressinspection. This is a normal unpaid administrative testorder, not an API test:true order.

Onwan immediately wrote orderdetail national_address_short. Its own Orders screen showed1008 Verified with RCTB4359. Later readback confirmed native Additionaldetails national_address_short=RCTB4359 and tag onwan-address-verified. Native shipping address remained short-code-only in this deliberately different postorder fixture; no operator manually inserted a full address into the order to manufacture an automated result.

OTO's connected Shopify app imported the same order1008 automatically, OTOID40693127, cityRiyadh/countrySA, paymentPending, no carrier/tracking/transportfee. Its MissingData status is not evidence of an address failure because contact details were intentionally absent. Total/pending count increased7→8 and shipment count stayed0.

The embedded OTO app exposes bulk fulfillment/shipment controls but did not expose full shipping-address fields. Standalone app.tryoto.com was authenticated as historical Oleel Store, a different merchant. The operator did not use that tenant's records as proof for Calapres and requested that the owner open the correct existing Calapres OTO account. No new shipping account or broader credential was created.

## Correct-merchant OTO readback and full-address compatibility fixture

The owner subsequently opened the correct existing Calapres OTO merchant. Read-only recipient inspection of synthetic order1008/OTO40693127 found RCTB4359 in the dedicated Short Address field. Its detailed-address/street text remained the same short code; building number was blank and region/postal code were not populated. This matches the deliberately short-code-only native input. It proves dedicated short-code ingress for this fixture, not full-address extraction or the original storefront checkout's automatic completion.

To isolate native-address compatibility without a payment or customer message, a second normal administrative unpaid fixture was created through native DraftD2 (1265510711552), using the same no-contact synthetic customer and Payment due later / Due on receipt. Native order1009 (Shopify7263822938368) was created with paidSAR0 and unfulfilled status. It is not an API test:true order. The operator manually supplied the exact full-address values previously observed in Onwan's real native checkout prefill: address1=4359, أبي الكرم, حي الضباط; address2=RCTB4359; city=الرياض; postalCode=12627. The address2 addition is a compatibility probe; it was not observed as an automatic Onwan pre-checkout write. The native timeline records an Onwan order edit, but that alone does not establish which fields the app changed.

Actual recipient readback in the correct OTO merchant for order1009 found:

| OTO field | Observed value | Assessment |
|---|---|---|
| Dedicated Short Address | RCTB4359 | Correct short-code import |
| Detailed address | 4359, أبي الكرم, حي الضباط RCTB4359 12627 | Full address text and postal code survive in the composite text |
| Street | 4359, أبي الكرم, حي الضباط | Source address1 survives as street text |
| Building number | RCTB4359 | Incorrect: the short code is not building4359 |
| Additional number | Not populated | Not established |
| City | الرياض | Correct city text |
| Region / postal code | Not populated | Structured mapping did not populate these fields, despite native postalCode12627 |

This is a manually constructed compatibility fixture and must not be described as an automatically completed Onwan storefront→native order→OTO checkout. It establishes that the importer retains the full address in text and recognizes the original short code, while revealing a structured-field defect when the short code is put in native address2. Neither a carrier payload nor a label was generated, so the practical carrier outcome remains untested. Do not infer from the composite address text that the carrier's required structured fields are correct.

Cleanup completed: synthetic1009 was cancelled and archived with Restock inventory checked and Send a notification unchecked. Native timeline confirms cancellation and one item restocked at one location; paid amount remains SAR0. Its audit record is retained. Read-only inspection of the existing Shopify channel edit panel, including Advanced settings, exposed order/status/tag/tracking controls but no configurable address-field mapping. The panel was cancelled without saving. Preserve the restored Growth plan under the owner's later direction.

## Verdict and remaining checks

| Requirement | Evidence | Verdict |
|---|---|---|
| Genuine code verification | Bad sample rejected; public real sample resolved outside demo | Passed for tested samples |
| Native Shopify address fill on Basic | Actual original address/city/postal fields populated; personalization retained | Passed for basic address components; original code/additionalnumber persistence through an automatically completed order still needs inspection |
| Dedicated original code reaches OTO | Correct Calapres recipient views for synthetic1008 and1009 show RCTB4359 in Short Address | Passed for the two administrative fixtures |
| Full native address is retained in OTO text | Manually constructed unpaid1009 retains address1 and12627 in detailed-address text | Compatibility fixture passed for text retention; not automatic checkout acceptance |
| Structured OTO address mapping | In1009, building number=RCTB4359 and structured postal code is empty | Failed for this address2 compatibility pattern; mapping correction/verification needed |
| Entire original storefront→native order→OTO chain | Pre-checkout stopped before payment;1008/1009 are separate administrative fixtures | Not established |

No full end-to-end storefront→persistedorder→OTO acceptance is claimed. Both unpaid tests exercise separate administrative fixtures and must not be represented as the original checkout completion. Native Payment due later is an administrative draft mechanism; no existing manual storefront payment option was established. Do not enable COD, a public manual payment method or gateway test mode merely to manufacture a complete checkout under the no-payment/no-message boundary.

Required next actions: obtain a supported correction/clarification for Shopify→OTO structured address mapping and verify Onwan pre-checkout code persistence, especially the address2→building-number behavior. The owner explicitly directed the in-app OTO AI chat rather than email/human support tickets. The exact synthetic field-mapping question was sent in a new conversation, with no real customer data and an explicit no-modification/no-shipment instruction. The AI replied that its available official documentation does not explain address-field mapping or prove whether it reads national_address_short versus address text. It could not verify the reason for the wrong building field or give a reliable format/correction; it linked only the general Shopify integration article https://help.tryoto.com/ar/support/solutions/articles/150000202278. This records the AI response and its limitation, not proof that no internal mapping exists. No email/ticket was sent and no support-driven data change was made. Verify the correct mapping before production adoption. Retain the alreadyverified restored Growth trial/native aftertrial renewal and the cancelled/archived synthetic1008 audit trail. Do not cancel the restored subscription again unless the owner asks or a later conditional decision explicitly authorizes it. No paid shipping-label test is authorized.

## Private visual evidence

Local screenshots record the real rejected code, public sample lookup, native checkout prefill, Growth activation and the historical cancellation-expiry state. Do not publish private screenshots or session URLs. Source amounts are preserved above; owner-facing SAR displays round upward.

## Primary references

- https://apps.shopify.com/national-address
- https://onwanapp.com/
- https://help.shopify.com/en/manual/apps/managing-apps
- https://help.shopify.com/en/manual/your-account/manage-billing/your-invoice/apps/
- https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders/create-draft

Synthetic1008 cleanup readback: native timeline explicitly says Youcanceledthisorder, archived, and1itemrestockedat1location. No nativeconfirmationsent line observed; email/phone were absent throughout. The same cancellation/restock/no-notification readback subsequently passed for1009. Donot permanentlydelete syntheticcustomer/order auditrecords as cleanup.

Settings readback after restoring Growth: Auto-send capture email unchecked, Enable pre-checkout validation unchecked, WhatsApp consent unchecked, WhatsApp reminders unchecked/disabled. No test OTP invoked. The historical standalone-merchant access blocker is resolved; the current blockers are structured OTO mapping, proof of original automatic checkout completion, with cleanup of both synthetic orders complete.


Final result: dedicated short-code ingress is observed and complete address text is retained, but correct structured mapping and the original fully automatic checkout path are not accepted. Keep Growth per owner instruction without publishing/activating the unaccepted storefront path. The pending work is a supported mapping solution and one controlled acceptance check, not another subscription upgrade. Local screenshots include the synthetic OTO mapping defect,1009 cancellation and the in-app AI reply; none are committed.
