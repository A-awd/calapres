
# Calapres Captain v1.2 — Product links and concise replies

Date: 2026-08-27

Status: executed and verified in Captain Playground; awaiting owner review

## Scope

This is one bounded, reversible delta layered on the protected Captain `v1.0` baseline and `v1.1`
engraving knowledge. It adds one independent read-only product-link bridge, two separate response
guidelines, and an inactivity-setting change. It does not add a second responder, change Shopify
records, connect a Meta catalog, edit the WhatsApp profile, or authorize any other external
capability.

## Protected settings and unchanged scope

[Verified live readback]

- Assistant: `Calapres Assistant` (`2187`), still the only automatic customer-facing responder.
- Connected inboxes: WhatsApp `128058`, Instagram `128031`, and TikTok `128033` only.
- Audience: `Everyone`.
- Schedule: `Anytime`.
- Knowledge: 74 approved FAQs and 22 documents, unchanged.
- Existing tool: `Calapres Shopify Order Lookup`, unchanged.
- Internal description: already described Calapres as a luxury burner store, so it was not edited.

[Unchanged by this execution]

- Assignment: the existing conversation-created automation remains unchanged.
- Existing order workflow: `lLJpvjtcxTaoQeGj`, unchanged.
- Old responder: `kAyF0D3ZZHxc0Hwp`, still unpublished under the protected state.
- Meta WhatsApp public profile, display name, catalog, and phone settings: untouched.

## Exact live delta

Captain now has exactly two tools. The added tool is
`كالابريز | البحث عن رابط منتج شوبيفاي`. It calls the published workflow
`كالابريز | جسر روابط منتجات شوبيفاي للكابتن | الإصدار 1`
(`8jtjLu261ZzcipGq`) at endpoint path
`/webhook/calapres/captain/shopify-product-link/v1`.

The Captain tool uses `GET` and one required string parameter, `product_query`, URL-encoded into
the bounded `q` input. Authentication stays in a dedicated `Authorization` header. The bridge pins
Chatwoot account `179973` and assistant `2187`, limits the normalized query to 80 characters, and
reads at most 20 active Shopify products using only `title`, `status`, and `onlineStoreUrl`.

The workflow has exactly five linear nodes:

1. Receive the Captain product-link request.
2. Validate the dedicated authorization and bounded request, then resolve the requested product
   color or clarification state.
3. Perform a bounded, read-only Shopify GraphQL product query.
4. Shape a safe product-link result.
5. Return the structured result to Captain.

The bridge contains no conversational AI, conversational memory, Chatwoot send path, or Shopify
mutation. It is limited to a product title, canonical URL, status, and safe clarification. It does
not provide price, availability, discount, compare-at price, inventory, or bundle-content facts.

The dedicated authorization exposed during local diagnosis was replaced in both product-link
bridge settings through owner credential handoff. Neither value is recorded in GitHub. n8n
executions `44662` and `44664` stopped with `Unauthorized request`, proving the retired value is
rejected; execution `44663` reached a matched safe result with the replacement value.

## Guideline 1 — concise reply format

This is a separate Captain guideline whose only purpose is reply shape:

`اجعل كل رد رسالة واحدة من جملة قصيرة أو جملتين قصيرتين كحد أقصى. ابدأ بالجواب المباشر، ثم أضف سؤالًا واحدًا فقط أو رابطًا واحدًا فقط عند الحاجة، ولا تجمع بينهما. لا تكرر التحية أو الوداع داخل المحادثة، ولا تعرض قائمة أو شرحًا مطولًا.`

## Guideline 2 — live product-fact boundary

This is a separate Captain guideline whose only purpose is product grounding:

`في أسئلة المنتجات، لا تؤكد التوفر أو عدمه، ولا تذكر خصمًا أو سعرًا سابقًا أو محتويات الطقم إلا إذا أعاد مصدر شوبيفاي الحي هذه المعلومة في الطلب نفسه. أداة رابط المنتج تعيد الاسم والرابط فقط؛ لا تستنتج منها سعرًا أو مخزونًا أو خصمًا أو محتويات، ولا تخترع رابطًا.`

No claim in this baseline treats a previously mentioned price, discount, or bundle statement as
proven false. The defect being controlled is that a changing fact must not be presented without an
approved live source in the same request.

## Inactivity behavior

Captain is now set to `Wait for the customer`. The earlier message beginning with
`سعدنا بخدمتك` is the configured resolution text under Captain's prior one-hour review route. No
daily campaign was identified, so that route is the likely source. The new choice waits instead of
taking the one-hour review/closing route. The assignment automation was not changed.

## Diagnostic record and final Playground acceptance

The original synthetic prompt was:

`أبي أطلب المبخرة البيضاء، عطيني الرابط.`

Captain replied `أكيد، تقصد طقم مبخرة كالابريز بالأبيض؟` and returned no link. Execution `44652`
completed all five nodes in 2.177 seconds. Its bounded Shopify output already contained the active
title `مبخرة كالابريز الفاخرة — الأبيض` and a canonical URL, but the final safe envelope was
`not_found`.

### Correction 1 — URL validation in the n8n sandbox

The safe-URL helper called `new URL(...)` inside `try/catch`. The constructor was unavailable in the
affected n8n Code-node runtime, so the caught error silently returned `false` for every otherwise
valid URL. This failure mode is recorded in
[n8n issue 19434](https://github.com/n8n-io/n8n/issues/19434).

Only that helper in `Shape Safe Product Link Result` was replaced with an anchored string
validator. It accepts only HTTPS product URLs on `calapres.com` or `www.calapres.com`, requires a
non-empty safe or percent-encoded handle, and rejects another protocol, host, path, query, fragment,
or malformed percent escape. Offline red-green checks reproduced the old rejection and passed eight
URL boundary cases. The workflow was published as
`تصحيح فحص رابط المنتج في بيئة عقدة الكود`; all five nodes, fields, permissions, and tool inputs
remained unchanged.

### Credential rotation

The product-link authorization exposed during diagnosis was replaced in Chatwoot and n8n through
owner handoff. Values remain outside GitHub. Executions `44662` and `44664` stopped in
`Validate Request and Resolve Color` with `Unauthorized request`, proving the retired value is
rejected. Execution `44663` returned a matched safe result with the replacement value.

### Correction 2 — Captain tool selection and response parsing

Two diagnostic Playground replies isolated the remaining Captain-side defects. First, Captain
introduced `طقم` instead of following the product-link result. The tool description now mandates
use for explicit new-purchase, buy, view, or product-link requests including `أبغى أطلب`, preserves
the explicit product and color terms, and forbids adding `طقم` or an unrequested color.
Existing-order status and tracking remain assigned to the order tool.

Second, Captain said the link was unavailable even though execution `44667` returned `matched` with
the exact canonical URL. The response template had referenced `status`, `title`, `url`, and
`clarification` directly. Chatwoot custom tools require parsed JSON fields through the `response`
object, so the template was corrected to `response.status`, `response.title`, `response.url`, and
`response.clarification`. See the
[Chatwoot custom-tools guide](https://www.chatwoot.com/hc/user-guide/articles/1775045339-v2-_-how-to-set-up-custom-tools-for-captain).

### Accepted final result

A fresh final Playground prompt was sent:

`أبغى أطلب المبخرة البيضاء`

Captain returned exactly two short lines: `مبخرة كالابريز الفاخرة — الأبيض` followed by the
[canonical product URL](https://calapres.com/products/مبخرة-كالابريز-الفاخرة-الأبيض).
Execution `44668` succeeded in 2.182 seconds
through all five nodes and returned `matched` with the same URL.

Acceptance passed for directness, two-line length, one live link, exact live title, bridge
invocation, safe URL validation, and response-template adherence. The reply did not claim price,
availability, discount, inventory, or bundle contents.

## Evidence limits and stop condition

This is Captain Playground evidence only. It does not prove identical behavior on another prompt,
a real customer conversation, or delivery on WhatsApp, Instagram, or TikTok. No raw execution
payload, credential value, or customer data was stored in GitHub; no Shopify record, Meta setting,
or customer conversation was changed.

The product-link stage is complete and stopped for owner review. The planned order-bridge
authorization rotation and its retired-value rejection test remain a separate pending security
stage. Do not add price, inventory, catalog, shipping, order-number, outbound-message, or another
bridge capability without a separately bounded owner approval. Each future approved capability may
reuse the modular pattern and Arabic display-name convention.

## Rollback

To remove the complete `v1.2` delta:

1. Remove or disable Captain tool `كالابريز | البحث عن رابط منتج شوبيفاي`.
2. Deactivate workflow `8jtjLu261ZzcipGq` and retire its dedicated authorization from Chatwoot and
   n8n without recording either value.
3. Remove only the two exact guidelines recorded in this baseline.
4. Restore the prior one-hour Captain-review inactivity choice only if the inactivity change is
   also being rolled back.

Do not touch `Calapres Shopify Order Lookup`, workflow `lLJpvjtcxTaoQeGj`, Captain's identity or
connections, Audience, Schedule, assignment automation, 74 FAQs, 22 documents, Meta settings,
Shopify records, or the unpublished old responder.
