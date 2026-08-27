
# 0020 — Adopt the Captain product-link bridge and concise-reply policy

Date: 2026-08-27

Status: accepted and verified in Captain Playground; awaiting owner review

## Context

Decision 0019 established one accepted Captain assistant with one small, independently removable
n8n bridge for each separately approved external capability. The owner then approved a second
bridge for canonical Shopify product links and asked that newly created bridges have clear Arabic
display names. The owner also reported that some Captain replies were long, indirect, or exposed
the automated nature of the service, and that an inactivity message appeared after the customer
stopped replying.

Frequently changing product facts remain under Shopify authority. A product-link bridge must not
turn its limited title-and-link read into unsupported claims about availability, price, discount,
or bundle contents. Response form and product-fact grounding are separate concerns, so they are
recorded as two separate Captain guidelines rather than one broad rule.

## Decision

1. Keep `Calapres Assistant` (`2187`) as the only automatic customer-facing responder. Preserve
   its WhatsApp `128058`, Instagram `128031`, and TikTok `128033` connections, Audience
   `Everyone`, Schedule `Anytime`, assignment automation, knowledge, and the unpublished responder
   `kAyF0D3ZZHxc0Hwp`.
2. Adopt the Captain tool `كالابريز | البحث عن رابط منتج شوبيفاي` and the independently removable
   workflow `كالابريز | جسر روابط منتجات شوبيفاي للكابتن | الإصدار 1`
   (`8jtjLu261ZzcipGq`) as the second implementation of decision 0019. The production endpoint path
   is `/webhook/calapres/captain/shopify-product-link/v1`.
3. Keep the workflow deterministic and data-only. Its five linear nodes receive and validate the
   Captain request, resolve the bounded product query, perform a read-only Shopify GraphQL query,
   shape a safe result, and return it to Captain. It has no conversational AI, conversational
   memory, Chatwoot send path, or Shopify mutation. The tool uses `GET` with one required
   `product_query` string; the bridge validates its dedicated authorization, Chatwoot account
   `179973`, assistant `2187`, and an at-most-80-character query. Captain alone composes the
   customer reply.
4. Limit this bridge to a product title, canonical Calapres Shopify URL, or one safe clarification.
   It does not authorize a price, availability, discount, compare-at price, bundle-content,
   engraving, shipping, order, customer, or inventory claim. It must not construct a product URL
   when Shopify has not returned one safely.
5. Keep the following as two separate Captain guidelines with one purpose per guideline.

   Concise reply format:

   `اجعل كل رد رسالة واحدة من جملة قصيرة أو جملتين قصيرتين كحد أقصى. ابدأ بالجواب المباشر، ثم أضف سؤالًا واحدًا فقط أو رابطًا واحدًا فقط عند الحاجة، ولا تجمع بينهما. لا تكرر التحية أو الوداع داخل المحادثة، ولا تعرض قائمة أو شرحًا مطولًا.`

   Live product-fact boundary:

   `في أسئلة المنتجات، لا تؤكد التوفر أو عدمه، ولا تذكر خصمًا أو سعرًا سابقًا أو محتويات الطقم إلا إذا أعاد مصدر شوبيفاي الحي هذه المعلومة في الطلب نفسه. أداة رابط المنتج تعيد الاسم والرابط فقط؛ لا تستنتج منها سعرًا أو مخزونًا أو خصمًا أو محتويات، ولا تخترع رابطًا.`
6. Change Captain's inactivity choice to `Wait for the customer`. The earlier closing text was tied
   to the configured resolution message under Captain's one-hour review route. No daily campaign
   was identified, so this route is the likely source. Waiting does not change the existing
   conversation-created assignment automation.
7. Preserve the assistant's internal description because it already identifies Calapres as a
   luxury burner store. Do not edit the Meta WhatsApp public profile, display name, catalog, phone,
   or any setting that could trigger Meta review.
8. Use Arabic display names for newly created Calapres bridges and tools when the platforms allow
   it. Stable machine fields and endpoint paths may remain technical. Each separately owner-approved
   capability may use this modular pattern. Naming or specifying a capability does not approve
   implementation; each approved bridge still needs a defined purpose, bounded authority, evidence,
   and independent rollback.
9. Treat Playground as synthetic behavioral evidence only. It may invoke the enabled bridge, but
   it does not prove customer-channel delivery or identical behavior on WhatsApp, Instagram, or
   TikTok.

This decision authorizes only the product-link capability and the response-quality settings above.
It does not authorize product-price lookup, inventory lookup, a WhatsApp catalog integration,
Shopify writes, shipping, order-number lookup, outbound messages, another knowledge group, or an
all-purpose bridge. It preserves decision 0019 and every protected Captain boundary that this
decision does not explicitly change.

## Live record

[Verified live in authenticated n8n] Workflow `8jtjLu261ZzcipGq` is published under the Arabic
name recorded above and contains exactly five linear nodes. Its safe-URL helper was corrected for
the Code-node sandbox without changing its graph or bounded Shopify fields. The dedicated inbound
authorization exposed during diagnosis was replaced in both platform settings through owner
handoff. Values remain outside GitHub. Executions `44662` and `44664` stopped with `Unauthorized
request`, proving the retired value is rejected; execution `44663` returned a matched safe result
with the replacement value.

[Verified live in authenticated Chatwoot] Captain has exactly two tools: the unchanged
`Calapres Shopify Order Lookup` and the new Arabic-named product-link tool. The two guidelines are
separate entries, inactivity is set to `Wait for the customer`, and the burner-store description
required no edit. The protected channels, audience, schedule, assignment automation, and knowledge
were not changed. No Meta setting was edited.

[Verified final Playground acceptance] The original failed scenario and two bounded diagnostic
retries isolated separate bridge and composition defects. After correction, a fresh final prompt
`أبغى أطلب المبخرة البيضاء` returned exactly two short lines: the live title
`مبخرة كالابريز الفاخرة — الأبيض` and the
[canonical product URL](https://calapres.com/products/مبخرة-كالابريز-الفاخرة-الأبيض). n8n
execution `44668` completed all five nodes in 2.182 seconds and returned `matched` with the same URL.
This is Playground evidence only and does not prove availability, price, inventory, bundle
contents, a real customer reply, or external-channel delivery.

[Verified diagnosis] The execution resolved the request to `white` and Shopify returned the active
title `مبخرة كالابريز الفاخرة — الأبيض` with its canonical URL. The failing boundary was the
safe-URL helper, which called `new URL(...)` inside `try/catch`. The affected n8n Code node runtime
does not provide that constructor, so the caught error returned `false` silently for each URL. This
is the same failure mode recorded in
[n8n issue 19434](https://github.com/n8n-io/n8n/issues/19434).

[Executed and accepted] Only the safe-URL helper in `Shape Safe Product Link Result` was replaced
with an anchored validator for exact HTTPS product URLs on the Calapres domain. Offline red-green
checks reproduced the old rejection and passed eight allowed/rejected URL cases. The five-node
workflow was published under version name `تصحيح فحص رابط المنتج في بيئة عقدة الكود`.

Captain still required two tool-only corrections: its description now mandates tool use for
explicit Arabic purchase/link requests and forbids inventing `طقم` or another color, and its
response template now accesses parsed JSON through `response.status`, `response.title`,
`response.url`, and `response.clarification`. These changes do not broaden the bridge's authority.

## Security boundary

Never store either bridge authorization, Shopify credentials, customer data, raw conversations, or
raw execution payloads in GitHub. The separately planned authorization rotation for the existing
order bridge remains pending; the completed product-link rotation does not complete or replace that
security stage.

## Next stage

The product-link stage is complete. Stop for owner review. The next possible security stage is the
separately approved order-bridge authorization rotation under decision 0019; do not treat this
product-link result as completing it or combine it with another capability.

## Rollback

Remove or disable only Captain tool `كالابريز | البحث عن رابط منتج شوبيفاي`, deactivate workflow
`8jtjLu261ZzcipGq`, retire its dedicated authorization from the two platform settings, remove only
the two exact guidelines recorded above, and restore the prior one-hour Captain-review inactivity
choice if a complete response-quality rollback is required. Do not change the order tool or
workflow, assistant identity, inboxes, Audience, Schedule, assignment automation, knowledge, Meta
profile, Shopify records, or unpublished responder.
