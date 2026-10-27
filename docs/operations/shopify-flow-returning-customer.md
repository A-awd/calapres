# Native returning-customer classification and required-field verification

Applied and observed on 2026-10-27, Asia/Riyadh. The owner authorized checking the live engraving
and physical-card required fields, fixing them if necessary, omitting proposed Flow idea 1 if
the form already enforced them, and activating returning-customer idea 5. Approved source
baseline: `A-awd/calapres` main `7a59d3a21efe7a3e147a18d7ea02610858af9f52`;
global launcher/routing baseline: `A-awd/ai-operating-system` main `d152dde`.
Shopify remains the authority for current workflow and storefront state.

## Required-field result: no storefront change needed

On the published white-burner product page, the following ordinary Add to Cart attempts were
blocked:

| Selected path | Input | Observed validation |
| --- | --- | --- |
| Text engraving, acknowledgement checked | Empty text | `اكتب النص المطلوب حفره.` |
| Text engraving, acknowledgement checked | Whitespace-only text | `اكتب النص المطلوب حفره.` |
| Plain burner plus physical gift card | Empty card message | `اكتب رسالة الكرت.` |
| Plain burner plus physical gift card | Whitespace-only card message | `اكتب رسالة الكرت.` |

The owner's pre-existing cart count remained 1. No item, checkout or order was created by these
checks; no theme file, form or storefront setting was changed. Proposed missing-data Flow idea 1
was not created and is removed from the selected roadmap at the owner's direction. This records
the observed product-form behavior; it does not claim universal server-side validation.

Relevant approved source:

- `templates/product.json` selects `main-product-personalize`.
- `sections/main-product-personalize.liquid:91,102,133,141,165` require the selected upload,
  engraving text, phrase and acknowledgement. Text/initials share the engraving text field.
- `assets/calapres-personalize.js:71-88,112-118` disables inactive methods, clears inputs when
  returning to plain, and rejects text whose trimmed value is empty. Only active fields submit.
- `assets/calapres-gift-card.js:41-42,58-64` rejects an empty or whitespace-only message while
  the card is selected. `#gcMsg` does not have a native HTML `required` attribute; the live
  JavaScript custom-validity check enforces the rule. To and From remain optional.
- `assets/calabriz-cart.js:241-258` calls `reportValidity()` before the product request. The card
  is a separate product line constructed by `calapres-gift-card.js:69-77` with `رسالتك`, optional
  `إلى`/`من` and hidden `_لون الكرت`/`_مع المبخرة` properties.

The published collection showed three base-variant Add to Cart buttons and no gift-card product.
Source quick-add uses `selected_or_first_available_variant` without the product form's checks
(`snippets/product-card.liquid:37`; `assets/calabriz-cart.js:110-114,134-140`). A conditional
future bypass, if a personalization variant becomes the selected available variant or the card
is exposed for direct quick-add, was not reproduced. No additional change was made on that
hypothesis. Reassess that route only after a relevant catalogue/availability change or an actual
failure; do not represent this browser check as protection for arbitrary direct cart requests.

## Activated workflow

Saved name: `كالابريز — تمييز العميل العائد`.

Workflow ID: `01a17ccd-e467-77c0-86c1-30d8de633825`.

Saved version: `01M5YDR47RQXJ1QV73W3ASAYJW`.

Editor: https://admin.shopify.com/store/unywbe-ub/apps/flow/editor/01a17ccd-e467-77c0-86c1-30d8de633825/01M5YDR47RQXJ1QV73W3ASAYJW

The native activation confirmation and reopened editor's **Turn off workflow** control were
observed. These establish activation/configuration, not a completed production execution or
email delivery. The runtime is a linear native Shopify Flow; it has no AI or n8n step.

1. **Order paid** trigger.

2. **Eligibility condition**, all required: `order.test` is false; `order.cancelledAt` does not
   exist; `order.customer.id` is not empty; none of the order tags equals `تجريبي` or `عميل-عائد`.
   False branch performs no action.

3. **Get order data**, maximum 2 results, sorted by created-at descending, using the trigger
   customer's numeric legacy ID:

   ```text
   customer_id:{{ order.customer.legacyResourceId }} AND (financial_status:paid OR financial_status:partially_refunded) AND -status:cancelled AND tag_not:"تجريبي" AND test:false
   ```

4. **Count** the returned order list.

5. **Condition:** count is greater than or equal to 2 (native UI displayed `2.0`). False branch
   performs no action.

6. **Add customer tags:** add `عميل-عائد` to the trigger order's customer, preserving other tags.

7. **Add order tags:** add `عميل-عائد` to the trigger order, preserving other tags.

8. **Send internal email** to the fixed store mailbox `info@calapres.com`:

   Subject: `كالابريز | عميل عائد — {{ order.name }}`

   Body (logical text; exact whitespace not verified):

   ```text
   تم تسجيل عملية شراء متكررة حقيقية للطلب {{ order.name }}.

   عرض الطلب: https://admin.shopify.com/store/unywbe-ub/orders/{{ order.legacyResourceId }}
   ```

The tag targets were independently read back as the trigger order/customer IDs. Recipient,
subject and body were read back in the native editor. The email contains only the order name
and direct Admin link; no customer identity, contact details or address is stored in this record.

## Counting and operational meaning

The count requires at least two orders for the same existing Shopify customer that currently
match the query, including the current order when it matches. It includes paid and partially
refunded orders, excludes fully refunded or cancelled orders, native tests and the `تجريبي` tag.
The two-result cap is sufficient for this threshold; this is not a lifetime purchase count or a
customer-identity deduplication system. Purchases under different customer records are separate.
An owner test not marked by either native test status or the agreed tag cannot be identified
from these filters alone.

`عميل-عائد` is an internal service cue based on the event/query state. A later cancellation or
refund does not automatically remove historical tags. It does not grant a reward, discount,
gift, approval, shipping readiness or permission for customer marketing.

The order tag is written before email and prevents the eligibility guard from knowingly
reprocessing an already tagged order. It is not an atomic exactly-once guarantee. If email
fails after tagging, the marker remains and automatic re-entry is blocked: review that execution
and any required internal notice manually; do not replay a historical order to force a resend.
An earlier partial failure or concurrent execution also requires review rather than assuming
all three downstream actions completed. Existing native workflow-error alerting is preserved.

## Acceptance evidence and limits

Native **Test your workflow** simulations used existing-order snapshots:

| Case | Observed result |
| --- | --- |
| Genuine first-purchase snapshot | Eligibility true; rendered customer ID was numeric; Get order data returned 1 order; Count 1; `>= 2` false |
| Existing owner fixture tagged `تجريبي` | Eligibility false; excluded before classification/actions |

These were simulations: no action, customer/order tag or email was executed by the tests.
No genuine qualifying second-purchase positive case was available. Therefore the first real
returning-customer execution, actual tag writes and actual mailbox receipt remain unverified.
Observe the first naturally occurring eligible purchase; do not create a test order or replay
historical orders merely to obtain that evidence.

An initial template was installed as one inactive draft. Shopify's official Sidekick assistant
rewrote that same workflow ID to the reviewed linear configuration; changes were applied and
independently read back/tested before activation. No additional draft was created. Sidekick was
an editor aid, not part of the saved runtime. A native Export download timed out; no native
export file or restorable export is claimed. The adjacent JSON contract is a sanitized
declarative record only, not an importable Shopify workflow.

The reopened native workflow list showed exactly six entries: this new workflow **Active**, the
four pre-existing active flows still **Active**, and the unused draft still **Inactive**. The new
workflow displayed **Not recently run**, consistent with the absence of a verified production
execution. Its `sidekick` list tag is authoring metadata, not a runtime AI step. No extra or
duplicate workflow was created. Captain's pause, OTO configuration and existing operations fields
were preserved. No other workflow, marketing sequence, original line-item data or staff-entered
field was overwritten. No customer-facing message, discount, financial action, shipment or new
external workflow was added.

## Rollback and next evidence

Turn off only workflow `01a17ccd-e467-77c0-86c1-30d8de633825` in native Shopify Flow. Do not
disable other review, error-alert, welcome or recovery workflows, and do not delete the unused
draft. Turning off this workflow does not remove tags already written or retract an email.
Any later tag cleanup or resend needs an exact-target review; do not bulk-remove customer data.

Next evidence is the first naturally occurring qualifying repeat purchase: inspect the native
execution and both tag targets, then separately confirm internal mailbox receipt. Configuration
and simulation success must remain distinct from that delivery evidence.
