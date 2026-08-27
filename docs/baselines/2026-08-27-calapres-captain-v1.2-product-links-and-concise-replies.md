# Calapres Captain v1.2 — Product links and concise replies

Date: 2026-08-27

Status: executed; bridge invocation verified in one Playground scenario, but end-to-end product-link
acceptance failed and owner review is required

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

The initial dedicated authorization appeared during local authenticated UI inspection and was
rotated in both product-link bridge settings before the only test. Neither value is recorded in
GitHub. No separate runtime retired-secret rejection test was performed, so rejection of the
initial value is unknown.

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

## Single Playground verification

Exactly one synthetic Playground prompt was sent:

`أبي أطلب المبخرة البيضاء، عطيني الرابط.`

The observed Captain reply was:

`أكيد، تقصد طقم مبخرة كالابريز بالأبيض؟`

n8n execution `44652` completed successfully in 2.177 seconds and traversed all five workflow
nodes with one item.

### Acceptance result

- Passed: one short message, at most one question, no long explanation, and no availability, price,
  discount, or bundle-content assertion.
- Passed: Captain invoked the new independent bridge and the five-node workflow completed.
- Failed: the bridge's final safe envelope was `not_found`, with empty `title` and `url`; the
  requested product link was not resolved or returned.
- Failed: the safe clarification was
  `ما لقيت رابطًا مؤكدًا لهذا اللون، تبغين لونًا ثانيًا؟`, but Captain did not reuse it, failed the
  direct-answer requirement, and introduced `طقم`, which was absent from the safe result.

The end-to-end product-link acceptance is therefore **failed**, not partially passed. No additional
Playground retry was run.

## Evidence limits

This test proves only the observed Playground reply, bridge invocation, workflow completion, and
the four-field safe final envelope recorded above. It does not prove a matched Shopify product, a
canonical link returned to Captain, identical behavior on another prompt, or delivery on WhatsApp,
Instagram, or TikTok. No raw execution payload was stored in GitHub; no real customer conversation
or Shopify record was changed.

The product-link authorization rotation described here is separate from the existing order bridge.
The planned order-bridge authorization rotation and its retired-value rejection test remain
pending.

## Next proposed stage and stop condition

Stop for owner review. If the owner approves another bounded test, first tighten only the product
resolution for the explicit white-product request after inspecting the bounded active-title and URL
read plus the deterministic color matcher, then run exactly one newly approved Playground scenario.
If that execution returns a matched URL but Captain still omits it, treat composition as a separate
later stage. Do not add price, inventory, catalog, shipping, order-number, outbound-message, or
another bridge capability during that work.

Each separately owner-approved capability may use the modular pattern and Arabic display-name
convention. Naming or specifying a capability does not approve implementation.

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
