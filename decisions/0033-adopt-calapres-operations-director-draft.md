# 0033 — Adopt a bounded Calapres Operations Director draft

Date: 2026-09-03

Status: accepted and configured as an unpublished internal draft; tool execution and output
accuracy remain unverified

## Context

The owner approved a Calapres-only trial of the new n8n Agents feature. The trial is intended to
coordinate owner-facing operational review without creating another customer responder, another
source of truth, or an autonomous production control plane. Shopify remains the operational source
of truth, GitHub `main` remains the technical source of truth, and Chatwoot Captain remains the only
customer-facing responder on its connected inboxes.

## Decision

1. Keep one internal n8n Agent named `Calapres Operations Director`, agent ID
   `olVB3TzKClXjuOei`, in project `AeQgtZlgJbiXCM2e`, as an unpublished draft. The separate
   assistant-page URL identifier is `52257909-c5b9-4244-a471-4f808b31facd`; it is not the agent ID.
2. Use `GPT-5.6 Sol`. Keep the agent configuration and its skills in English, while returning
   owner-facing responses in Arabic.
3. Attach exactly these three English skills:
   - `Calapres Launch Readiness Audit`
   - `Daily Order Operations Triage`
   - `Operational Incident Command`
4. Permit only these two tools, with approval required before every invocation:
   - Shopify `Order / Get Many`, using `Shopify-Calapres`, with a maximum of 20 records per call.
   - Firecrawl `Scrape`, restricted to public pages on `calapres.com` and its public descendants.
5. Shopify access in this draft is read-only. Firecrawl must not authenticate, access private or
   checkout surfaces, leave `calapres.com`, or collect customer, order, payment, or other protected
   data.
6. Do not attach a channel, schedule, sub-agent, episodic memory, MCP server, or any additional
   tool. Keep `availableInMCP=false` and do not publish the agent.
7. The draft may inspect, compare, prioritize, and recommend owner actions. It may not send a
   customer message, publish or modify Shopify, alter an order or fulfillment, refund or cancel,
   create a shipment, change Chatwoot or Captain, access payment data, or perform a destructive
   action.

## Verification boundary

The n8n agent listing verified `published=false`, `availableInMCP=false`, and
`updatedAt=2026-09-03T14:30:57.883Z`. Direct MCP agent validation is intentionally unavailable
because MCP access remains off and must not be enabled for this check. The saved configuration
proves only that the draft exists with the recorded settings. Neither tool has been executed as
part of this stage, and the tools' connectivity, approval behavior, returned data, and the agent's
factual accuracy remain unverified. Do not treat an n8n preview, a saved tool, or a generated answer
as operational proof.

Before any publication or expanded access, reread the exact live configuration and run one
owner-approved read-only canary per tool. Verify the Shopify 20-record limit, credential binding,
Firecrawl domain restriction, Arabic owner response, and absence of prohibited capabilities.

## Rollback

Because the agent is unpublished and has no channel, schedule, or production dependency, rollback
is to remove the draft or detach its tools only after confirming that no run is active. Do not alter
the existing Calapres workflows, Captain configuration, Shopify store, or customer channels as part
of rollback.
