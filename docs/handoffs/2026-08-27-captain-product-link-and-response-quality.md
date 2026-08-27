
# Calapres Captain product-link and response-quality handoff

Date: 2026-08-27

## Purpose

This handoff records the second independent Captain bridge, the exact response-quality changes, the
initial failed acceptance, both deterministic corrections, the completed product-link credential
rotation, and the final successful Playground acceptance. It does not replace the protected `v1.0`
baseline, the additive `v1.1` engraving delta, or the existing order bridge.

Canonical decision:
[0020 — Adopt the Captain product-link bridge and concise-reply policy](../../decisions/0020-adopt-captain-product-link-bridge-and-concise-replies.md).
Exact delta and test record:
[Calapres Captain v1.2 — Product links and concise replies](../baselines/2026-08-27-calapres-captain-v1.2-product-links-and-concise-replies.md).

## Protected state

- `Calapres Assistant` (`2187`) remains the only automatic customer-facing responder.
- It remains connected only to WhatsApp `128058`, Instagram `128031`, and TikTok `128033`.
- Audience remains `Everyone`; Schedule remains `Anytime`.
- The existing conversation-created assignment automation is unchanged.
- Knowledge remains 74 approved FAQs and 22 documents.
- `Calapres Shopify Order Lookup` and order workflow `lLJpvjtcxTaoQeGj` are unchanged.
- Responder workflow `kAyF0D3ZZHxc0Hwp` remains unpublished and must never run while Captain is
  connected.
- The assistant's internal description already identifies Calapres as a luxury burner store, so
  no description edit was needed.
- The Meta WhatsApp public profile, display name, catalog, and phone settings were not touched.

## New independent product-link bridge

[Verified live] Captain now has exactly two tools. The new tool is
`كالابريز | البحث عن رابط منتج شوبيفاي`. It calls the published workflow
`كالابريز | جسر روابط منتجات شوبيفاي للكابتن | الإصدار 1`
(`8jtjLu261ZzcipGq`) through endpoint path
`/webhook/calapres/captain/shopify-product-link/v1`.

Its Captain contract is `GET` with one required `product_query` string encoded into `q` and one
dedicated `Authorization` header. The bridge pins Chatwoot account `179973`, assistant `2187`, and
an at-most-80-character normalized query. Its Shopify read is capped at 20 active products and
selects only `title`, `status`, and `onlineStoreUrl` before safe result shaping.

The workflow contains exactly five linear nodes for validated ingress, bounded product resolution,
read-only Shopify GraphQL retrieval, safe result shaping, and return to Captain. It has no
conversational AI or memory, customer-send path, or Shopify mutation. Captain remains the only
component that composes a customer reply.

The bridge may provide only a safe status, product title, canonical Calapres URL, and clarification.
It does not provide or authorize claims about price, availability, discount, compare-at price,
inventory, bundle contents, engraving, shipping, or orders.

The product bridge uses its own authorization. Values remain outside GitHub. The value exposed
during the later matcher diagnosis was replaced in both product-bridge settings through owner
credential handoff. Executions `44662` and `44664` stopped with `Unauthorized request`, proving
the most recently retired value is rejected. This does not retroactively prove rejection of an
earlier pre-first-test generation that was not used in those probes.

## Two separate response guidelines

The rules were intentionally stored as two guidelines, one purpose each. This avoids one broad
mixed rule while also avoiding many tiny, overlapping entries.

Concise reply format:

`اجعل كل رد رسالة واحدة من جملة قصيرة أو جملتين قصيرتين كحد أقصى. ابدأ بالجواب المباشر، ثم أضف سؤالًا واحدًا فقط أو رابطًا واحدًا فقط عند الحاجة، ولا تجمع بينهما. لا تكرر التحية أو الوداع داخل المحادثة، ولا تعرض قائمة أو شرحًا مطولًا.`

Live product-fact boundary:

`في أسئلة المنتجات، لا تؤكد التوفر أو عدمه، ولا تذكر خصمًا أو سعرًا سابقًا أو محتويات الطقم إلا إذا أعاد مصدر شوبيفاي الحي هذه المعلومة في الطلب نفسه. أداة رابط المنتج تعيد الاسم والرابط فقط؛ لا تستنتج منها سعرًا أو مخزونًا أو خصمًا أو محتويات، ولا تخترع رابطًا.`

## Why the closing message appeared

The message beginning with `سعدنا بخدمتك` is the configured resolution text under Captain's prior
one-hour review route. No daily proactive campaign was identified, so that route is the likely
source. The inactivity choice is now `Wait for the customer`, so Captain waits instead of following
that one-hour review/closing path. This did not alter assignment automation or send a new customer
message during this stage.

## Diagnostic chronology and accepted result

### Initial failed acceptance

The first synthetic prompt was `أبي أطلب المبخرة البيضاء، عطيني الرابط.` Captain replied
`أكيد، تقصد طقم مبخرة كالابريز بالأبيض؟` and returned no link. Execution `44652` completed all five
nodes in 2.177 seconds. It resolved `white`, and Shopify returned the active title
`مبخرة كالابريز الفاخرة — الأبيض` with a canonical URL, but the bridge's final envelope was
`not_found`.

### URL-sandbox correction

`Shape Safe Product Link Result` used `new URL(...)` inside `try/catch`. The affected n8n Code-node
runtime does not expose that constructor, so the caught error silently marked every URL unsafe.
This matches [n8n issue 19434](https://github.com/n8n-io/n8n/issues/19434).

Only that helper was replaced with an anchored validator for exact HTTPS Calapres product URLs.
Offline red-green checks reproduced the old rejection and passed eight allowed/rejected URL cases.
The workflow was published as `تصحيح فحص رابط المنتج في بيئة عقدة الكود`; its five nodes, bounded
Shopify fields, request contract, and safe envelope remained unchanged.

### Authorization rotation proof

The authorization exposed during diagnosis was replaced in both Chatwoot and n8n through owner
handoff. Executions `44662` and `44664` failed in `Validate Request and Resolve Color` with
`Unauthorized request`, proving the most recently retired value is rejected. Execution `44663`
returned `matched` with the replacement value. No credential value or raw execution payload was
written to GitHub.

### Captain selection and response-template corrections

The next diagnostic prompt showed Captain still introduced a product clarification instead of
following the live result. The tool description was strengthened to require invocation for explicit
new-purchase, buy, view, or product-link intent including `أبغى أطلب`, to pass the customer's
explicit product and color terms, and to forbid adding `طقم` or another color. Existing-order status
and tracking remain assigned to the order tool.

A later diagnostic reply said the link was unavailable even though execution `44667` returned
`matched` with the canonical URL. The response template had addressed the four JSON fields directly.
Chatwoot requires custom-tool response fields through the parsed `response` object. The template
was corrected to `response.status`, `response.title`, `response.url`, and
`response.clarification`, following the
[Chatwoot custom-tools guide](https://www.chatwoot.com/hc/user-guide/articles/1775045339-v2-_-how-to-set-up-custom-tools-for-captain).

### Final accepted Playground evidence

A fresh final prompt, `أبغى أطلب المبخرة البيضاء`, returned exactly two short lines: the live title
`مبخرة كالابريز الفاخرة — الأبيض` followed by the
[canonical product URL](https://calapres.com/products/مبخرة-كالابريز-الفاخرة-الأبيض).
Execution `44668` succeeded in 2.182 seconds through all
five nodes and returned `matched` with the same URL.

This verifies only the bounded Captain Playground path. It does not prove product availability,
price, discount, inventory, bundle contents, a real customer conversation, or delivery on
WhatsApp, Instagram, or TikTok. No Shopify record, Meta setting, or customer conversation changed.

## Future bridge boundary

Each separately owner-approved capability may use the modular pattern and should have Arabic bridge
and tool display names when supported. Naming or specifying a capability does not approve
implementation. Every approved bridge still needs a defined input, output, authority, acceptance
test, and rollback.

## Exact next proposed stage

The product-link stage is complete. Stop for owner review. The existing order-bridge authorization
rotation remains a separate pending security stage and was not completed by this work. Do not
combine the next stage with a product-price or inventory read, WhatsApp catalog work, shipping,
order-number lookup, outbound messaging, another knowledge group, or another bridge.

## Rollback

- Remove or disable only Captain tool `كالابريز | البحث عن رابط منتج شوبيفاي`.
- Deactivate workflow `8jtjLu261ZzcipGq` and retire its dedicated product authorization from both
  platform settings without exporting it.
- Remove only the two exact guidelines recorded above.
- Restore the prior one-hour Captain-review inactivity choice only if rolling back the waiting
  behavior too.
- Do not alter the order tool or workflow, assistant, inboxes, Audience, Schedule, assignment
  automation, knowledge, Meta profile, Shopify records, protected rollback branch, or unpublished
  responder.
