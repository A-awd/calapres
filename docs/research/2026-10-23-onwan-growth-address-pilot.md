# Onwan Growth address pilot — 2026-10-23

Status: partial live verification; exact OTO address mapping awaits the correct standalone merchant login. No production adoption is claimed.

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

## Verdict and remaining checks

| Requirement | Evidence | Verdict |
|---|---|---|
| Genuine code verification | Bad sample rejected; public real sample resolved outside demo | Passed for tested samples |
| Native Shopify address fill on Basic | Actual original address/city/postal fields populated; personalization retained | Passed for basic address components; original code/additionalnumber persistence still needs inspection |
| Full address and original code correctly reach OTO | Synthetic order itself imported; full recipient fields not yet visible | Not established; correct standalone merchant access is the current blocker |

No full end-to-end storefront→persistedorder→OTO acceptance is claimed. The unpaid test exercises a separate postorder fixture and must not be represented as the original checkout completion.

Required next actions: open the existing Calapres OTO merchant, inspect recipientaddress and dedicated shortcode for OTOID40693127; inspect how Onwan's precheckout payload preserves its shortcode if necessary; retain the alreadyverified restored Growth trial/native aftertrial renewal; keep the cancelled/archived synthetic1008 audit trail. Do not cancel the restored subscription again unless the owner asks or a later conditional decision explicitly authorizes it. No paid shipping-label test is authorized.

## Private visual evidence

Local screenshots record the real rejected code, public sample lookup, native checkout prefill, Growth activation and the historical cancellation-expiry state. Do not publish private screenshots or session URLs. Source amounts are preserved above; owner-facing SAR displays round upward.

## Primary references

- https://apps.shopify.com/national-address
- https://onwanapp.com/
- https://help.shopify.com/en/manual/apps/managing-apps
- https://help.shopify.com/en/manual/your-account/manage-billing/your-invoice/apps/
- https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders/create-draft

Final cleanup readback: native timeline explicitly says Youcanceledthisorder, archived, and1itemrestockedat1location. No nativeconfirmationsent line observed; email/phone were absent throughout. Donot permanentlydelete syntheticcustomer/order auditrecords as cleanup.

Final settings readback after restoring Growth: Auto-send capture email unchecked, Enable pre-checkout validation unchecked, WhatsApp consent unchecked, WhatsApp reminders unchecked/disabled. No test OTP invoked. Correct standalone merchant login remains the only current access blocker to full OTO field readback.
