# Calapres Captain v1.3 — Shopify-native short product links

Date: 2026-08-28

Status: executed and accepted in Captain Playground; external-channel delivery unverified

## Scope

This is one bounded, reversible delta layered on the protected Captain `v1.0` baseline, the
additive `v1.1` engraving knowledge, and the accepted `v1.2` product-link and concise-response
stage. It replaces the customer-visible canonical product URL with one of three first-party short
Calapres URLs. It does not add a tool, workflow, responder, external shortener, data source, Meta
catalog, product capability, or customer send path.

Canonical decision:
[0021 — Adopt Shopify-native short product links for Captain](../../decisions/0021-adopt-shopify-native-short-product-links.md).

## Canonical base and protected state

The work began in a clean worktree from GitHub `origin/main` commit
`e1188212d6361c852778c88e1eff54dbf37d3226`. The owner's dirty, diverged checkout and unrelated
untracked files were not modified or staged.

The following state remains protected and unchanged:

- `Calapres Assistant` (`2187`) is the only automatic customer-facing responder.
- It is connected only to WhatsApp `128058`, Instagram `128031`, and TikTok `128033`.
- Audience is `Everyone`; Schedule is `Anytime`.
- The existing conversation-created assignment automation is unchanged.
- Captain knowledge, two response guidelines, and `Wait for the customer` are unchanged.
- The order-lookup and product-link tools remain the only two Captain tools.
- Order workflow `lLJpvjtcxTaoQeGj` is unchanged.
- Product-link workflow `8jtjLu261ZzcipGq` retains its five linear nodes and read-only product
  query.
- Meta WhatsApp profile, display name, catalog, phone settings, and customer conversations were
  not touched.
- Responder workflow `kAyF0D3ZZHxc0Hwp` remains unpublished.

## Exact Shopify delta

Exactly three Shopify Online Store URL redirects were created:

| Public short URL | Canonical Shopify target |
| --- | --- |
| `https://calapres.com/p/white` | `/products/مبخرة-كالابريز-الفاخرة-الأبيض` |
| `https://calapres.com/p/beige` | `/products/مبخرة-كالابريز-الفاخرة-البيج` |
| `https://calapres.com/p/gray` | `/products/مبخرة-كالابريز-الفاخرة-الرمادي` |

Each short URL returned HTTP `301` to its exact canonical target. Following each redirect reached
an HTTP `200` product page. These are first-party Shopify redirects; no external shortener is
involved. Product handles, titles, prices, inventory, availability, discounts, bundle contents,
publication state, and all customer and order records remain unchanged.

## Exact product-link bridge delta

Only `Shape Safe Product Link Result` changed in workflow
`كالابريز | جسر روابط منتجات شوبيفاي للكابتن | الإصدار 1`
(`8jtjLu261ZzcipGq`). Its existing safe canonical-URL check now feeds an exact mapping to this
allow-list only:

- `https://calapres.com/p/white`
- `https://calapres.com/p/beige`
- `https://calapres.com/p/gray`

The node does not create a path from customer input. It returns a short URL only after Shopify has
returned the corresponding exact safe canonical product URL. Seven local test cases passed for
the three mappings and rejected non-allow-listed cases.

The workflow was published with version name `روابط شوبيفاي المختصرة الأصلية` and description
`إرجاع روابط شوبيفاي المختصرة الأصلية`. Its other four nodes, graph, endpoint, request and
authorization validation, Shopify fields, credentials, safe envelope, and Captain response
template were not changed.

## Transient availability incident and accepted retry

The first fresh Captain Playground prompt was:

`أبغى أطلب المبخرة البيضاء`

Captain returned its safe technical-unavailable wording. At the same time, the n8n host and the
production webhook independently returned HTTP `503`, and n8n Cloud showed the instance state
`In progress`. This records a transient infrastructure-availability interruption; it is not an
accepted product-link result.

The n8n host and webhook later recovered to HTTP `200`. One controlled Playground retry used the
same prompt. Captain returned the exact public title
`مبخرة كالابريز الفاخرة — الأبيض` followed by exactly:

`https://calapres.com/p/white`

The reply contained no price, availability, inventory, discount, previous-price, or bundle-content
claim. This accepts the bounded Captain Playground path for the white short URL after recovery.

## Evidence boundary

The accepted result is synthetic Captain Playground evidence. It does not prove that the short
link appeared in the owner's physical WhatsApp client or that the same result is delivered on
WhatsApp, Instagram, or TikTok. No real customer conversation or outbound channel message was used
for this acceptance.

No secret, customer or order data, raw conversation, or raw execution payload is stored in this
repository.

## Read-only Chatwoot reporting findings

The reporting review did not change Chatwoot. The live account had:

- zero labels;
- zero custom attributes; and
- exactly one active conversation-created assignment automation, unchanged.

A future reporting stage may use four separate layers:

1. A contact purchase-status attribute for durable customer truth.
2. A conversation-result attribute for the result of one support interaction.
3. A small label set for topics and operational work queues.
4. Saved conversation filters and contact segments for repeatable views and reports.

This is proposed only. `شكراً لطلبك` is not evidence of an order and may set only
`يحتاج تحقق`; only a uniquely matched Shopify order may establish `طلب موثق`. A possible future
independent bridge name is `كالابريز | تصنيف العملاء حسب طلبات شوبيفاي`. That bridge and every
label, attribute, filter, segment, or automation remain unapproved and unexecuted.

## Stop condition

The native short-link stage is complete and stopped for owner review. Do not treat Playground
acceptance as external-channel delivery. Do not combine a future physical WhatsApp proof with the
Chatwoot reporting proposal, another bridge, another Shopify write, the pending order-bridge
authorization rotation, or any Meta change.

## Rollback

1. Restore only the previous published code in `Shape Safe Product Link Result`, so the product
   bridge returns the safely validated canonical Shopify URL again.
2. Delete only `/p/white`, `/p/beige`, and `/p/gray` from Shopify URL redirects.
3. Verify the short paths no longer resolve and that the three canonical product pages still do.

HTTP `301` redirects may remain in a browser cache after removal, so verify rollback with a fresh
request. Do not disable either Captain tool, change another workflow node, alter Captain or its
connections, touch the order bridge, edit Chatwoot reporting objects, change product handles, or
modify Meta settings.
