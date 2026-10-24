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

Final commercial/cleanupreadback: OnwanBilling verifies restoredGrowthCurrentplan; nativeShopifyappdetails shows Freetrial andUSD29/month+usage aftertrial. Synthetic1008 cancelled/archivedand1itemrestocked,customernotificationunchecked. KeepGrowthperlatestinstruction whilecorrectCalapresOTOaccess is pending.


## Correct Calapres OTO field readback — 2026-10-23

Owner opened the correct existing merchant. Dedicated short-code RCTB4359 is confirmed in OTO1008.
That fixture had code-only native input, so no full-address failure can be inferred from it.
A second administrative unpaid fixture1009 manually supplied the actual native prefill address
and postcode plus a deliberate code-in-address2 probe. OTO retained complete composite text and
dedicated code, but building-number incorrectly became the code and structured postcode stayed
blank. Existing channel/Advanced settings exposed no address-mapping control; inspection cancelled
without saving. Full automatic storefront-to-OTO acceptance remains unproved. The owner authorized the
in-app OTO AI conversation and rejected email/ticket handling. The synthetic field example was
sent there. The AI could not document the mapping or correction and linked the general Shopify
integration article only (150000202278). No email/ticket was submitted. No real customer data was shared.
Both synthetic1008 and1009 are cancelled/archived, each item restocked, notifications unchecked,
paid0, no shipping/fulfillment or live theme publication. Keep Growth under the owner's later
instruction; do not cancel automatically. Require supported correct mapping before adoption.


## Actual app write and native-only boundary — 2026-10-23

The owner requested a real Onwan→Shopify→OTO test without manual address insertion,
customer messages or shipments. Actual postorder1010 capture succeeded from the app's public
short-code lookup in unpublished checkout profile8221688064. Native Shopify fields and timeline
prove the app wrote the complete address and original code. This is stronger evidence than the
earlier administrative1009 fixture, but does not complete the original pre-checkout cart.

OTO40695499 partially updated and misassigned native address2 as building number, retaining an
old detailed address and leaving dedicated short-code/postcode fields empty. A bounded native
sync attempt did not repair the later readback. Native bulk edit and connected-channel advanced
settings did not expose an address refresh/mapping fix. commentKeys remains undocumented. The
in-app AI could not document a supported correction; no email/ticket/human escalation requested.

The owner expressly rejected n8n and all external middleware for this address integration.
Only the official Shopify–OTO connector is in scope. No new channel, API key, persistent access,
credential or workflow was created. The offline adapter is an abandoned proposal, not adopted
code or a permission to deploy. This does not retire separately approved existing support work.
No Shopify/OTO upgrade is justified by the evidence; a paid feature is not a proven repair.

Order1010 is cancelled/archived with one item restocked and notifications unchecked; paid0,
no fulfillment/label/shipment or customer messages. Preserve the audit trail. Keep Growth as
later instructed; do not downgrade automatically. Draft checkout profile remains unpublished,
pre-checkout activation and messages off, and OTO shipment creation manual. Acceptance requires
one genuine app-origin update to produce correct original code and full address in OTO.
See [actual-order evidence](../docs/research/2026-10-23-onwan-actual-order-pilot.md).


## Owner-required experiment preservation and quality review — 2026-10-23

The owner requires saving every recorded address experiment to prevent repeated work. The
[consolidated experiment register](../docs/research/2026-10-23-national-address-experiment-register.md)
is now the first read. It preserves provenance for demos, pre-checkout tests, manually constructed
fixtures, genuine postorder1010 writes, native settings/Sync checks, AI-documentation limits,
rejected middleware and verified synthetic cleanup. Historical reports are retained with clear
supersession notices; the stale1010 cleanup-pending opening is corrected.

The bounded conclusion is accepted as an evidence review, not a production solution or an
exhaustive best-app verdict. Do not infer no official OTO solution, a paid-tier requirement or
carrier failure. Initial import versus later update, missing synthetic contacts, one positive
sample, accelerated checkout and absent carrier payload/label remain explicit limits.

No store tests or changes were repeated for this review. Resume only on a concrete supported
native correction, then run one targeted test of that change. Preserve Growth and existing
no-customer-message/no-shipment/no-live-publication constraints. External middleware remains
rejected for addresses. Do not revive the old API proposal from historical research.


## Official vendor conversations and unavailable specialist — 2026-10-23

The owner separately and explicitly approved sending the technical question through Onwan's
in-app vendor chat, and subsequently approved requesting a human OTO integration specialist
through the existing OTO chat. These approvals persist for the same bounded public-synthetic
technical clarification. They do not authorize emails/tickets/other channels, customer data,
new credentials/access, upgrades, paid custom work or a general production deployment.

Onwan's vendor clarified its existing ready integration is with Shopify only. It can modify
output if OTO specifies a needed format, but that requires an app-side change. Whether this is
included Growth support or additional paid development, and the exact field contract, remain
unanswered. No modification or ready OTO connector is confirmed.

OTO's assistant confirmed no human specialist was available outside current Saudi working hours,
and could not guarantee a pending chat queue. The human-transfer request was sent, but no handoff
or accepted case is claimed. No unauthorized channel fallback or repeated synthetic test occurred.

Preserve the [official follow-up](../docs/research/2026-10-23-native-address-official-followup.md).
Next gate is a supported OTO source-field/update contract plus a scoped vendor change, followed
by one targeted real app-origin acceptance test. Keep Growth and native-only/manual-shipment
boundaries. Do not guess source-field names or revive n8n/custom middleware from old drafts.


## Vendor cost confirmation read in email — 2026-10-24

The owner asked to read Mwwared's replies. The direct vendor email and matching chat transcript
confirm no additional amount for the specific requested address-compatibility modification
(SAR0 additional). Growth subscription terms remain distinct. This supersedes only the former
cost-pending observation; it is not acceptance of broader custom work, a deployment or a passed
end-to-end test.

The vendor requires OTO's method/data format before preparing it, and clarified OTO pulls data
from Shopify. Obtain the supported field/update specification through the already approved chat,
then convey the bounded public specification to Mwwared through its approved chat. Receiving an
email or its reply footer does not authorize sending an email. No email response, configuration,
access change, new order, customer message or shipment occurred during this read-only review.

See [the sanitized mail confirmation](../docs/research/2026-10-24-mwwared-email-confirmation.md).
