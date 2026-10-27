# 0053 — Native returning-customer classification

Date: 2026-10-27. Status: accepted and activated; positive production execution and email receipt
remain unverified.

## Decision

The owner authorized applying returning-customer idea 5 from the published Flow research.
Use one native Shopify Flow triggered by Order paid, with no AI or n8n runtime. Require a known
customer, non-test/non-cancelled trigger order and absence of the experimental/already-classified
order tags. Count at most two qualifying orders for the same customer: paid or partially
refunded, not cancelled, not a native test and not tagged `تجريبي`.

When the count reaches two, add the internal `عميل-عائد` customer tag, then the same order tag,
then send one internal service notice to `info@calapres.com` with the order name and Admin link.
Keep all existing tags and staff-entered operations fields. Do not add a customer message,
discount, reward, financial action, shipment or historical replay.

Workflow `كالابريز — تمييز العميل العائد` (`01a17ccd-e467-77c0-86c1-30d8de633825`), version
`01M5YDR47RQXJ1QV73W3ASAYJW`, was activated and its native Turn off workflow control was read
back. Native simulations verified a genuine first purchase remains below threshold and an
experimental fixture is excluded. No positive repeat-purchase action or actual email receipt
was verified. Shopify's official Sidekick assisted editing the same inactive draft; it is not a
runtime dependency. The saved sanitized contract is documentation, not a native export.
The reopened list showed exactly six workflows: this new one Active, the four existing active
flows unchanged, and the unused draft Inactive. No duplicate workflow was created.

## Required-field check and supersession

The owner also requested checking engraving text/initials and the physical gift-card message,
making them mandatory only if missing. The published product form blocked empty and
whitespace-only text/message inputs; the existing cart was unchanged. No theme fix was needed.
Missing-data idea 1 was not created and is removed from the selected roadmap. This supersedes
the earlier research recommendation for that idea only; it does not assert server-side
enforcement for every possible cart path or turn the remaining research ideas into approvals.

## Limits and recovery

Tags are historical internal service cues, not an authoritative lifetime retained-purchase
count, identity match or entitlement. Later refunds/cancellations do not automatically remove
them. The order marker precedes email: an email failure requires manual execution review, not
an assumption that replay will resend or that exactly-once delivery is guaranteed.

Rollback is turning off only this new workflow; existing tags and sent mail remain. Preserve
Captain's pause, OTO, the four pre-existing active flows, unused inactive draft, private data
and current operational fields. Observe the first natural qualifying repeat order for positive
execution and separate mailbox-delivery evidence without generating another purchase.

See [exact configuration, live form evidence and acceptance limits](../docs/operations/shopify-flow-returning-customer.md).
