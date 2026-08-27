# Calapres Captain product-link and response-quality handoff

Date: 2026-08-27

## Purpose

This handoff records the second independent Captain bridge, the exact response-quality changes, the
single failed end-to-end Playground acceptance, and the next bounded review point. It does not
replace the protected `v1.0` baseline, the additive `v1.1` engraving delta, or the existing order
bridge.

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

The product bridge uses its own authorization. Its initial value appeared in local authenticated UI
inspection, so it was rotated in both product-bridge settings before testing. No value is present in
GitHub. There was no separate runtime test showing that the initial value is rejected; do not claim
that negative security proof.

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

## One Playground test and failed acceptance

Exactly one synthetic prompt was tested:

`أبي أطلب المبخرة البيضاء، عطيني الرابط.`

Captain replied:

`أكيد، تقصد طقم مبخرة كالابريز بالأبيض؟`

[Verified] The reply passed only the length and one-question limits and made no availability,
price, discount, or bundle-content assertion. It failed the direct-answer requirement. n8n
execution `44652` succeeded in 2.177 seconds through all five nodes with one item, proving that
Captain invoked the independent bridge and it completed.

[Failed] The final safe envelope was `not_found`, with empty `title` and `url`, and clarification
`ما لقيت رابطًا مؤكدًا لهذا اللون، تبغين لونًا ثانيًا؟` No link was resolved or returned. Captain
did not reuse that clarification and introduced `طقم`, which was absent from the safe result. Do
not claim a matched Shopify product. No raw execution payload was stored in GitHub and no second
Playground test was run.

[Not verified] This stage provides no WhatsApp, Instagram, or TikTok delivery evidence and did not
change any real customer conversation or Shopify record.

## Future bridge boundary

Each separately owner-approved capability may use the modular pattern and should have Arabic bridge
and tool display names when supported. Naming or specifying a capability does not approve
implementation. Every approved bridge still needs a defined input, output, authority, acceptance
test, and rollback.

## Exact next proposed stage

Stop for owner review. If approved, inspect the bounded active-title and URL read plus the current
color matcher, correct only why the explicit white-product request returned `not_found`, then run
one newly approved Playground test. If that run returns a matched URL but Captain still omits it,
handle composition in a later separate stage. Do not combine that test with a product-price or
inventory read, WhatsApp catalog work, shipping, order-number lookup, outbound messaging, another
knowledge group, or another bridge.

The existing order-bridge authorization rotation remains a separate pending security stage. The
product-link bridge's pre-test rotation did not perform it and must not be documented as completing
it.

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
