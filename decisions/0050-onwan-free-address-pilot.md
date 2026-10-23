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
