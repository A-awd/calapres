# 0020 — Adopt the Captain product-link bridge and concise-reply policy

Date: 2026-08-27

Status: accepted; bridge invocation is live, the matcher correction is published, and the final
product-link reply remains unverified pending authorization rotation and one Playground retest

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
name recorded above and contains exactly five linear nodes. Its dedicated inbound authorization was
rotated before testing because the initial value appeared during local authenticated UI inspection.
Both values remain outside GitHub. No separate runtime test proved rejection of the retired value,
so that rejection is not claimed.

[Verified live in authenticated Chatwoot] Captain has exactly two tools: the unchanged
`Calapres Shopify Order Lookup` and the new Arabic-named product-link tool. The two guidelines are
separate entries, inactivity is set to `Wait for the customer`, and the burner-store description
required no edit. The protected channels, audience, schedule, assignment automation, and knowledge
were not changed. No Meta setting was edited.

[Verified in one Playground scenario] The only prompt was
`أبي أطلب المبخرة البيضاء، عطيني الرابط.` Captain replied
`أكيد، تقصد طقم مبخرة كالابريز بالأبيض؟` The length and one-question limits passed, but the required
direct answer and link outcome failed. n8n execution `44652` completed successfully in 2.177 seconds
through five nodes with one item. Its final safe envelope was `not_found`, with empty `title` and
`url`, and clarification `ما لقيت رابطًا مؤكدًا لهذا اللون، تبغين لونًا ثانيًا؟` Captain did not
reuse that clarification and introduced `طقم`, which was absent from the safe result. End-to-end
product-link acceptance therefore failed at product resolution and safe-result adherence. This
evidence does not prove a matched product or external-channel delivery.

[Verified diagnosis] The execution resolved the request to `white` and Shopify returned the active
title `مبخرة كالابريز الفاخرة — الأبيض` with its canonical URL. The failing boundary was the
safe-URL helper, which called `new URL(...)` inside `try/catch`. The affected n8n Code node runtime
does not provide that constructor, so the caught error returned `false` silently for each URL. This
is the same failure mode recorded in
[n8n issue 19434](https://github.com/n8n-io/n8n/issues/19434).

[Executed, not accepted yet] Only the safe-URL helper in `Shape Safe Product Link Result` was
replaced with an anchored validator for exact HTTPS product URLs on the Calapres domain. Offline
red-green checks reproduced the old rejection, passed eight allowed/rejected URL cases, and matched
the observed white title to one exact Shopify URL. The five-node workflow was published under
version name `تصحيح فحص رابط المنتج في بيئة عقدة الكود`. No second Playground message or workflow
execution was produced, so the correction is not end-to-end accepted.

## Security boundary

Never store either bridge authorization, Shopify credentials, customer data, raw conversations, or
raw execution payloads in GitHub. The separately planned authorization rotation for the existing
order bridge remains pending; the product-link bridge's pre-test rotation does not complete or
replace that security stage. The later matcher inspection rendered the current product-link
authorization in local diagnostic output. It is not in GitHub, but it must be retired in both n8n
and Chatwoot before another test.

## Next stage

Stop at the credential handoff. The next action is to rotate only the product-link authorization in
n8n and Chatwoot together, prove the retired value fails, then run exactly one newly approved
Playground prompt for the explicit white product. If the execution returns a matched URL but Captain
still omits it, composition requires a separate stage. Do not combine that work with the existing
order-bridge authorization rotation or another bridge.

## Rollback

Remove or disable only Captain tool `كالابريز | البحث عن رابط منتج شوبيفاي`, deactivate workflow
`8jtjLu261ZzcipGq`, retire its dedicated authorization from the two platform settings, remove only
the two exact guidelines recorded above, and restore the prior one-hour Captain-review inactivity
choice if a complete response-quality rollback is required. Do not change the order tool or
workflow, assistant identity, inboxes, Audience, Schedule, assignment automation, knowledge, Meta
profile, Shopify records, or unpublished responder.
