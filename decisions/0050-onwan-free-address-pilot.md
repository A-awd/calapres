# 0050 — Bounded Onwan Free address investigation

Date: 2026-10-23

Status: owner-approved Free installation executed; production adoption and end-to-end acceptance not approved or established

## Authorization and purpose

The owner explicitly approved installing Onwan on Calapres's existing Shopify Basic store on the Free plan, after reviewing its customer/order/checkout access. The purpose is to test genuine Saudi short-address verification, complete native shipping-address fill, and transfer of the address and original code to the existing OTO shipping bridge.

## Boundaries

1. Installation and synthetic investigation only. No paid subscription or auto-renewing paid trial was authorized.
2. Keep capture emails, WhatsApp consent/reminders, past-order import and automatic shipping-address processing off during inspection. Do not send customer messages or rewrite existing customer/order addresses to manufacture a test.
3. No live theme embed, checkout block, publication, payment, fulfillment, shipment purchase or carrier label is authorized by this installation approval.
4. Preserve guest/current customer accounts, personalization properties, required contact fields, free Saudi customer shipping and decision0030 manual shipment release after physical readiness.
5. No new custom backend or address API architecture is adopted here.

## Observed execution

Onwan is installed and opens. Its dashboard shows Free Plan and0/25 monthly KSA usage. Onboarding retained only pre-checkout as a path to inspect, not an active storefront feature. The app reports all capture/account/checkout/reminder features Not active. Reloaded Settings verifies capture emails off and WhatsApp consent/reminders off. The pre-checkout enable control is disabled and explicitly requires the app's Growth plan. Static preview is not a validation or OTO test.

No synthetic order or real address rewrite occurred. Neither an installed app nor a successful provider lookup is acceptance of the complete workflow.

## Acceptance and next gate

A future trial must prove an existing real code resolves correctly, invalid code is rejected, full address goes into original Shopify shipping fields, all personalization survives, accelerated checkout is handled, and both address and code appear correctly in OTO before manual shipment release. Carrier payload/label proof remains behind its separate shipment authorization.

Do not upgrade Shopify or pay for Onwan from this decision. Review the exact trial/recurring/usage terms and obtain the necessary commercial authorization if that gate is chosen. See [the trial evidence](../docs/research/2026-10-23-onwan-free-address-pilot.md).

## Reversibility

The app is inactive and can be removed through Shopify if the owner rejects it after checking no capture process is in use. Do not delete customer/order history or claim uninstallation removes data already held by the provider.

## Amendment — owner-approved bounded Growth trial, 2026-10-23

This amendment records a later, explicit authorization. The preceding Free-only authorization and observations remain historical evidence and are not retroactively rewritten. The original prohibition on accepting a paid trial was superseded only for the bounded trial below; production adoption remains unapproved.

The owner instructed: activate the Growth trial, test genuine short-code verification, full address fill, and transfer to OTO on the existing Shopify plan; send no messages and create no shipments; return to Free after the investigation and before the trial ends.

### Permitted scope

1. Accept the existing app's seven-day Growth trial on the Shopify Basic store. The operator verified the trial ends on 2026-10-30 and the following recurring price is approximately SAR109 per30days (source USD29), before tax and conversion fees.
2. The approval screen included a maximum usage-charge permission of SAR1875 (source USD500), confined to the app's WhatsApp/OTP usage terms. This is a billing authorization ceiling, not a prepaid payment, spend budget or authorization to send a message. Do not incur usage charges; keep OTP, WhatsApp and all automatic/manual capture messaging unused.
3. Inspect and test short-address-only pre-checkout validation in an unpublished copy of the current theme. The operator reported copying source theme166625181952 to unpublished test theme167831535872. Do not publish it or change the live theme as part of this investigation.
4. Test with synthetic identity and publisher-provided public example address data only. Do not modify or transmit an existing customer's data to manufacture success. Do not purchase/pay for a test order, activate a payment gateway test mode, send order notifications, create fulfillment or buy a carrier label.
5. Preserve personalization, guest/current account behavior, required contact fields, free Saudi customer shipping, and decision0030 manual shipment release after physical readiness. Keep OTO automatic shipment creation off.
6. After testing, turn temporary app capture/pre-checkout activation off as needed, return Onwan to Free, and verify Shopify's subscription/billing status. A displayed Free badge alone is insufficient proof that the recurring paid subscription has ended. Record any scheduled cancellation, usage balance or upcoming charge honestly.

### Observations at amendment preparation

The operator verified Growth is active, saved short-address-only pre-checkout settings, and kept messaging/capture processes off. The unpublished theme copy exists for isolated testing. Genuine lookup, native address fill, transfer to OTO and cancellation back to Free remain pending; none is implied by this amendment.

Evidence and final rollback outcome belong in `docs/research/2026-10-23-onwan-growth-address-pilot.md` after execution. Local draft: `work/onwan-growth-address-pilot-2026-10-23.md`.

## Later owner steering and integration-test checkpoint — 2026-10-23

After the original-authorized Free downgrade, the owner instructed not to cancel renewal and made correct OTO address transfer the decisive criterion. Restoration was approved with the same seven-day trial untilOct30 and USD29 dueOct30; final restored/native status needs live readback. The original return-to-Free requirement is superseded by this later instruction, not an ongoing scheduled task.

Public invalid/valid sample tests and actual native addressprefill passed for basic components on Basic in unpublishedtheme167831535872. Originalcode/additionalnumber persistence remains unaccepted. A no-contact unpaid syntheticorder1008 was created from nativeDraftD1, tagged in its note as no-execute/no-ship/no-send. Onwan marked the publiccode Verified and wrote national_address_short. OTOimported it as40693127; fulladdressfields are not exposed in the embeddedapp. StandaloneOTO is historicalOleel, so correctCalapresmerchantlogin is required before the decisive fieldreadback. This is partial evidence, not end-to-endacceptance.

Keep messages, shipments and livepublicationoff. Afterinspection cancel/restock only the syntheticorder with notifications off. Do not silently cancelGrowthagain or adopt a production solution before fullmapping is proven. See the detailed executedpilotreport.
