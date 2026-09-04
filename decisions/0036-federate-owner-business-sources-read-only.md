# 0036 — Federate owner business sources through brand-isolated read-only tools

Date: 2026-09-04

Status: accepted and partially executed; Calapres Shopify orders/products and account-wide
Metricool analytics/planning reads are live, while OTO, Chatwoot, business mail, Drive, Notion,
ChatGPT-derived knowledge, and unreviewed brand systems remain separately scoped or unverified

## Context

The owner wants one private secretary that can answer across all businesses rather than a chatbot
that only understands instructions. Decision 0035 established the private cross-brand owner command
center and its Telegram voice bridge, but the Agent initially had no live business tools. A broad
question therefore returned an accurate coverage-gap response instead of current operational facts.

Central access must not become a shared credential vault. Each brand still needs isolated credentials,
sources, permissions, and eventually its own specialist. The parent secretary may aggregate verified
outputs, but it must not mix customers, secrets, or actions between businesses.

## Decision

1. Keep `سكرتيرة عبدالرحمن` as the single owner interface. Attach or delegate only explicitly
   identified business sources, and label every result with its brand or project.
2. Use authenticated live systems as the authority for operational facts. Use canonical GitHub
   repositories for durable decisions and project state. ChatGPT conversations, project memory, and
   summaries are context only unless their contents are independently verified or exported through
   an approved bounded connector.
3. Connect sources read-only first. Read operations may run without action-time approval after their
   source and scope are approved. Creating, updating, deleting, publishing, fulfilling, refunding,
   sending, paying, changing credentials, or changing permissions remains prohibited without exact
   written action-time approval.
4. A portfolio-wide question must query every connected relevant source, return one consolidated
   answer grouped by brand, and state missing coverage as `UNKNOWN` or `UNVERIFIED`. It must not
   infer that no activity exists merely because a source is not connected.
5. Give each tool a brand-specific name, description, credential, and fixed read-only operation.
   Never expose a raw multi-operation connector when it would allow writes.
6. OTO and Chatwoot require their own verified read credentials or approved bounded bridges before
   they can be treated as live sources. Shopify fulfillment fields are partial evidence and do not
   prove OTO shipment state.
7. Do not attach Gmail, Google Drive, or Notion generically when an account may mix personal data or
   multiple businesses. First identify the exact account, label, folder, or data source for business
   use. Supabase remains retired for Calapres under decision 0006 and is not reintroduced as an
   owner-information source.
8. Future brand specialists receive their own credential set, source allowlist, and budget before
   direct access. The private owner parent may use an account-wide portfolio connector only when
   its exposed tools are strictly read-only, every output is labeled by brand, and the connector's
   broader credential scope is stated explicitly rather than presented as single-brand isolation.

## Executed and verified — Calapres Shopify

- The published owner Agent now has exactly two Calapres Shopify node tools:
  `calapres_shopify_orders_readonly` and `calapres_shopify_products_readonly`.
- Both reuse the existing `Shopify-Calapres` OAuth credential and expose only `getAll` read
  operations. Order results are limited to operational fields and omit customer contact and address
  fields. Product results are limited to catalog, variant, price, and inventory fields.
- Draft validation passed. A live read returned zero Calapres orders created on 2026-09-04 Riyadh
  time. A second read returned three active products with three variants, recorded quantity zero,
  and inventory tracking disabled.
- The Agent was published as active version
  `465ba704-3580-4df4-b453-8093a6b59d7d`.
- A real Telegram question passed through `Owner Telegram Voice Bridge` and returned
  `0 — VERIFIED` from Shopify.
- No Shopify write, customer message, fulfillment, refund, OTO action, credential creation, payment,
  Gateway top-up, schedule, or proactive alert was executed.

## Executed and verified — Metricool portfolio reads

- The existing Metricool OAuth connection succeeded against the official MCP endpoint and exposed
  eight tools.
- The owner Agent allowlists only five original read operations: `getBrandSettings`,
  `getScheduledPosts`, `getAnalyticsAvailableMetrics`, `getAnalyticsDataByMetrics`, and
  `getBestTimeToPostByNetwork`.
- `createScheduledPost`, `updateScheduledPost`, and the review-submission operations are excluded.
  The Agent therefore cannot publish or alter Metricool content through this connection.
- The source identified `Calapres | كالابريز` as brand `6694961`. A bounded read returned zero
  scheduled unpublished posts with `VERIFIED` and performed no write.
- Validation passed and the owner Agent was published as active version
  `27de4fbd-f4bf-47e3-b492-00abbfe56044`.
- The Metricool credential is account-wide. It is suitable for the private owner's portfolio reads,
  but it is not credential-level brand isolation. Named-brand and portfolio separation are enforced
  by Agent instructions and explicit brand labels. Do not grant this shared credential directly to
  a future brand specialist.
- No post, review request, customer message, credential, payment, schedule, or proactive alert was
  created.

## Remaining work

Verify and add one source at a time. The next Calapres candidates are Chatwoot conversation reads and
OTO shipment reads, but neither has a clearly identified reusable n8n credential today. Business
mail, Drive, and Notion require explicit account or container scope before attachment. ChatGPT
conversation history is not a live operational system and must not replace canonical repositories
or authenticated business sources. Do not describe a source as connected until a live read canary
passes.

## Rollback

Remove the Metricool MCP server and/or the two Calapres Shopify tools from the owner Agent as needed,
validate, and republish the prior version. Do not delete either reused credential, alter Shopify or
Metricool data, reconnect retired Supabase architecture, or change the Telegram workflow as part of
rollback.
