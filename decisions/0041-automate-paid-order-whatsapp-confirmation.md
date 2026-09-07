# 0041 — Automatic paid-order WhatsApp confirmation

Date: 2026-09-08
Status: Owner-approved, implemented and active; activation verification recorded in STATE.md.

The owner explicitly prioritized completing automatic personalized WhatsApp order confirmation,
after being told the required payment-event-to-Chatwoot design. This authorizes this narrow
transactional sender and a single existing paid-owner-order canary. Snapchat and Instagram
attribution remain a later priority, not activated by this change.

Use one independent Arabic-named workflow, Calapres account 179973, WhatsApp Cloud inbox
128058, and approved Arabic UTILITY template order_confirmation. Captain remains the sole
conversational responder; no LLM, model fallback, marketing campaign, supplier automation,
email activation, credential creation, provider funding, or Telegram change is included.

Live inspection corrected the earlier personal-project-only search: existing Calapres
customer-service workflows and reusable Chatwoot credentials are in team project
0kVami0vGGBbT7Cy. The personal owner-secretary project remains AeQgtZlgJbiXCM2e.
Reuse existing Shopify-Calapres and Header Auth account 3 credentials in their team scope.

## Implementation

- Shopify native orders/paid trigger, using the existing OAuth credential and native HMAC check.
- Refetch the order from the exact Calapres shop. Exclude test, cancelled, unpaid and historical
  orders before the rollout cutoff. Saudi shipping/mobile scope only; preserve original phone.
- Read the name from the order, normalize the phone for transport, never translate/invent a name.
- Use Shopify order metafield calapres_operations.whatsapp_order_confirmation, type json,
  with compareDigest:null for an atomic first-send claim. Existing claims stop subsequent runs.
- This Shopify-native compare-and-set boundary is the narrow order-notification alternative to
  the historical PostgreSQL reply ledger. It does not revive that responder or use Data Tables.
- Search exact phone in Chatwoot; reject ambiguity/blocked contact; create a contact only if absent.
  Create the order conversation in the allowlisted inbox; verify recipient before sending.
- Send the exact approved template body with dynamic name and order number; no free-form second
  message is added. The existing approved wording contains receipt confirmation but no extra
  thank-you sentence; changing the Meta-approved template requires a separately accepted version.
- CAS-update the same metafield with accepted/failed/unknown state and Chatwoot message identifiers.
  Accepted is not delivered. No automatic retry of an uncertain or failed send.
- Execution payload saving is disabled for manual, success and error runs. Keep raw customer/order
  data and exact canary identifiers out of GitHub.

## Limits and recovery

The native n8n Shopify trigger acknowledges on receipt before downstream completion. This is
not a durable exactly-once delivery queue. A failed execution before a claim can require bounded
manual reconciliation; a claimed/unknown state requires Chatwoot verification before any retry.
There is no scheduled reconciliation or proactive failure alert in this release. Never reset a
claim merely because a customer did not see a message. No financial or shipment actions occur.

Rollback: unpublish only this workflow and verify removal of its orders/paid subscription.
Preserve all claim metafields and existing Captain/Telegram workflows.

## Validation

Per-node and graph checks passed. Synthetic guards rejected unpaid, cancelled, test and
already-claimed orders and normalized a national Saudi mobile. The paid-owner canary reached
Chatwoot and saved its result on Shopify after two pre-send expression errors were corrected.
The recovery was restricted to the exact failed claim after observing an empty conversation;
that temporary recovery and owner-order manual branch were removed from production.
Repeating the normal canary stopped before claim/send, with no second message.

References:
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet
- https://developers.chatwoot.com/api-reference/messages/create-new-message
- https://github.com/n8n-io/n8n/blob/master/packages/nodes-base/nodes/Shopify/ShopifyTrigger.node.ts

Live verification: native orders/paid subscription registered; Chatwoot reported delivered for the
single owner canary. Clean draft matches the 17-node published graph. The next fresh production
payment event and new-contact branch remain unobserved end-to-end. No claim of guaranteed delivery.
