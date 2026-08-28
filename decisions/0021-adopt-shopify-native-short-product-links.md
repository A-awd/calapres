# 0021 — Adopt Shopify-native short product links for Captain

Date: 2026-08-28

Status: accepted, executed, and verified in Captain Playground; external-channel delivery unverified

## Context

Decision 0020 accepted the isolated five-node Captain product-link bridge and limited its
customer-visible output to the canonical Shopify product URL. The owner then approved a narrower
customer-experience change: keep Shopify as the only product and redirect authority, but return a
short first-party Calapres path for each of the three approved burner colors. No third-party link
shortener is permitted.

The current canonical product handles remain unchanged. The short paths are Shopify Online Store
URL redirects, so they can be removed independently without replacing product pages, changing
product records, or expanding the bridge into a general catalog or write service.

## Decision

1. Create exactly these three Shopify-native redirects:

   | Short path | Canonical Shopify target |
   | --- | --- |
   | `/p/white` | `/products/مبخرة-كالابريز-الفاخرة-الأبيض` |
   | `/p/beige` | `/products/مبخرة-كالابريز-الفاخرة-البيج` |
   | `/p/gray` | `/products/مبخرة-كالابريز-الفاخرة-الرمادي` |

2. Keep the existing Captain tool, endpoint, request validation, Shopify product read, workflow
   graph, credentials, and response envelope unchanged. In workflow
   `كالابريز | جسر روابط منتجات شوبيفاي للكابتن | الإصدار 1`
   (`8jtjLu261ZzcipGq`), change only `Shape Safe Product Link Result` so an exact safe canonical
   product URL is mapped to its exact approved short URL.
3. Use an exact allow-list. The bridge may return only:

   - `https://calapres.com/p/white`
   - `https://calapres.com/p/beige`
   - `https://calapres.com/p/gray`

   It must not derive a short path from customer text, accept an arbitrary path, host, query, or
   fragment, or return a short URL without first receiving the corresponding safe canonical URL
   from Shopify.
4. Preserve Shopify as the source of truth for each product and its canonical URL. The redirect is
   only a first-party presentation alias. This decision does not change product handles, titles,
   prices, inventory, availability, discounts, bundle contents, publication status, or any other
   Shopify record.
5. Preserve `Calapres Assistant` (`2187`) as the only automatic customer-facing responder, its
   WhatsApp `128058`, Instagram `128031`, and TikTok `128033` connections, Audience `Everyone`,
   Schedule `Anytime`, knowledge, two existing tools, concise-response guidelines, inactivity
   behavior, and conversation-created assignment automation. Preserve the Meta WhatsApp profile,
   display name, catalog, and phone settings. Keep responder `kAyF0D3ZZHxc0Hwp` unpublished.
6. Treat a Captain Playground result as accepted only when the live n8n host is available and a
   fresh prompt returns one approved short URL. Shopify redirect checks and local Code-node
   assertions establish the redirect and deterministic mapping layers, but do not by themselves
   prove Captain-to-n8n-to-Shopify-to-Captain completion or external-channel delivery.

This decision supersedes decision 0020 only where that decision required the customer-visible
product URL to remain canonical and prohibited every Shopify write. It authorizes the three exact
redirect records above as the complete Shopify write scope and the exact alias mapping as the
complete output delta. Every other decision 0020 boundary remains active.

## Executed record

[Verified Shopify] The three redirect records were created in Shopify. Each short Calapres URL
returned HTTP `301` to its exact canonical product target, and following the redirect reached an
HTTP `200` product page. No third-party redirect service was introduced.

[Verified workflow delta] Only `Shape Safe Product Link Result` changed. Seven local test cases
passed for the three exact canonical-to-short mappings and the rejected non-allow-listed cases.
The workflow retained its five linear nodes and was published with version name
`روابط شوبيفاي المختصرة الأصلية` and description
`إرجاع روابط شوبيفاي المختصرة الأصلية`.

[Transient availability evidence] The first fresh Captain Playground prompt,
`أبغى أطلب المبخرة البيضاء`, returned the safe technical-unavailable wording. At that time, the
n8n host and the production webhook independently returned HTTP `503`, while n8n Cloud displayed
the instance state `In progress`. Therefore the run is an infrastructure-availability observation,
not a failed deterministic mapping assertion and not evidence that the short-link bridge completed.

[Verified final Playground acceptance] The n8n host and webhook recovered to HTTP `200`. One retry
used the same prompt. Captain returned the exact public title
`مبخرة كالابريز الفاخرة — الأبيض` followed by exactly
`https://calapres.com/p/white`, with no price, availability, inventory, discount, previous-price,
or bundle-content claim. This accepts the bounded Playground path after recovery. It does not
prove physical WhatsApp-client visibility or delivery on WhatsApp, Instagram, or TikTok.

## Chatwoot reporting boundary

A read-only Chatwoot review found zero labels, zero custom attributes, and exactly one active
conversation-created assignment automation. That automation was not changed. No reporting label,
attribute, filter, segment, or automation is approved or executed by this decision.

The proposed later reporting model separates durable customer truth from each conversation's
operational outcome:

- a contact purchase-status attribute;
- a conversation-result attribute;
- a small label set for topic and work-queue visibility; and
- saved conversation filters and contact segments.

The phrase `شكراً لطلبك` is not order evidence. If a later owner-approved rule uses this phrase, it
may mark only `يحتاج تحقق`; only a uniquely matched Shopify order may establish `طلب موثق`.
A separately approved future bridge may be named
`كالابريز | تصنيف العملاء حسب طلبات شوبيفاي`, but it is proposed only and was neither approved nor
executed in this stage.

## Security boundary

Do not store Shopify or bridge credentials, customer or order data, raw conversations, or raw n8n
execution payloads in GitHub. This stage does not rotate the independent order-bridge
authorization and does not authorize an order write, customer send, catalog connection, price or
inventory lookup, shipping capability, or proactive message.

## Next stage

The native short-link stage is complete. Stop for owner review. A physical WhatsApp short-link
result remains unknown; do not infer it from Playground acceptance or send an external-channel
test without a separately bounded instruction. Do not combine any future channel proof with
Chatwoot classification changes, another bridge, another Shopify write, or the pending order-bridge
security stage.

## Rollback

1. Restore only the previous published code in `Shape Safe Product Link Result`, so the existing
   bridge again returns the safely validated canonical Shopify URL.
2. Delete only `/p/white`, `/p/beige`, and `/p/gray` from Shopify URL redirects.
3. Verify the three short paths no longer resolve and that all canonical product pages still
   return normally. Browser redirect caches may temporarily retain a prior `301`, so verify with a
   fresh request rather than relying on one previously visited browser tab.

Do not disable the product-link tool or workflow, alter another node, change Captain or its
connections, edit Chatwoot labels or automation, touch the order bridge, modify a product handle,
or change any Meta setting during this rollback.
