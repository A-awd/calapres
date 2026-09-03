# 0033 — Adopt a bounded Calapres Operations Director draft

Date: 2026-09-03

Status: accepted and restored as an unpublished internal draft; instructions-only preview passed,
and external tool connectivity remains unverified

## Context

The owner approved a Calapres-only trial of the new n8n Agents feature. The trial is intended to
coordinate owner-facing operational review without creating another customer responder, another
source of truth, or an autonomous production control plane. Shopify remains the operational source
of truth, GitHub `main` remains the technical source of truth, and Chatwoot Captain remains the only
customer-facing responder on its connected inboxes.

## Decision

1. Keep one internal n8n Agent named `Calapres Operations Director`, agent ID
   `olVB3TzKClXjuOei`, in project `AeQgtZlgJbiXCM2e`, as an unpublished draft. Treat only the agent
   ID from the project Agents list as its durable operational identity. An `/assistant/<uuid>` URL is
   a transient assistant artifact and must not be used as the agent identity or resume target.
2. Use `GPT-5.6 Sol`. Keep the agent configuration and its skills in English, while returning
   owner-facing responses in Arabic.
3. Attach exactly these three English skills:
   - `Calapres Launch Readiness Audit`
   - `Daily Order Operations Triage`
   - `Operational Incident Command`
4. The only external tools eligible for a later, separately approved attachment are:
   - Shopify `Order / Get Many`, using a freshly verified Calapres-only credential and a maximum of
     20 records per call.
   - Firecrawl `Scrape`, restricted to public pages on `calapres.com` and its public descendants.
   Neither tool is currently attached after the 2026-09-03 restoration. Attachment and every
   invocation require fresh owner approval.
5. Any later Shopify attachment must be read-only. Firecrawl must not authenticate, access private
   or checkout surfaces, leave `calapres.com`, or collect customer, order, payment, or other
   protected data.
6. Do not attach a channel, schedule, sub-agent, episodic memory, MCP server, or any additional
   tool. Keep `availableInMCP=false` and do not publish the agent.
7. The draft may inspect, compare, prioritize, and recommend owner actions. It may not send a
   customer message, publish or modify Shopify, alter an order or fulfillment, refund or cancel,
   create a shipment, change Chatwoot or Captain, access payment data, or perform a destructive
   action.

## 2026-09-03 recovery amendment

The saved draft was later observed as a blank `New Agent` while retaining the same agent ID. The
approved name, `Chart Network` icon, `GPT-5.6 Sol` model, English instructions, three skills, and
safety settings were restored. The cause is not proven; stale or concurrent preview/editor state,
autosave, and an interrupted connection are the material observed risks. Future edits must use one
browser session, enter through the project Agents list, verify the stable ID before editing, and
reread every field after autosave.

The restoration deliberately did not reattach Shopify or Firecrawl because credential attachment
requires fresh action-time approval. Custom routing and episodic memory are off, session memory is
at its default, and there are still no channels, schedules, sub-agents, or MCP access. The agent
remains unpublished.

## Verification boundary

A post-restoration instructions-only preview passed: it answered the owner in Arabic, followed the
required source hierarchy, respected prohibited actions, prioritized work as P0/P1/P2, and labeled
tool-dependent facts `UNVERIFIED`. This proves the saved instruction behavior only. It does not
prove model-provider durability, either external credential, either tool's connectivity or approval
behavior, any live commerce fact, customer-channel delivery, or production safety.

Before publication or expanded access, reread the exact live configuration from the stable agent
listing. After the separately approved model-provider stage in decision 0034, run a bounded model
canary. Then run one separately owner-approved read-only canary per eligible tool, one tool at a
time, verifying the Shopify 20-record limit, credential ownership, Firecrawl domain restriction,
Arabic owner response, and absence of prohibited capabilities.

## Rollback

Because the agent is unpublished and has no channel, schedule, or production dependency, rollback
is to remove the draft or detach its tools only after confirming that no run is active. Do not alter
the existing Calapres workflows, Captain configuration, Shopify store, or customer channels as part
of rollback.
