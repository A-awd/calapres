# Calapres customer-service observation pilot

Status: implementation source and isolated operational tables created; no live customer egress

Date: 2026-08-11

Authority: decisions 0008 and 0010

## What is being built

Calapres gets one customer-service edge, one private rules component, one inactive private Shopify
index component, and one inactive private owner-review component:

```text
four allowlisted Calapres inboxes
  -> Calapres Customer Service Edge v1
       -> identifiers-only Wait inside the same edge
       -> fresh Chatwoot re-read or fail closed
  -> private Optix Customer Service Core v1
  -> internal observation, incident, or no action

verified Shopify order ingress/reconciliation (future)
  -> Calapres Shopify Order Index v1
  -> HMAC fingerprints + opaque Shopify references only

trusted private owner command (future)
  -> Calapres Owner Review Desk v1
  -> validated prepared preview only; no write, publish, or customer send

customer send path: absent
Shopify write path: absent
```

The edge is the only component that knows Calapres account/inbox identifiers, operational tables,
future channel credentials, and future Shopify reads. The Core is a private, versioned set of
validation and authority rules. It has no public webhook, credential, memory, store tool, or send
node. It is not a second bot.

The delay phase is intentionally merged into the edge rather than deployed as another workflow.
A future webhook can return `204` and continue the same execution; after the edge strips the input
to the strict Wait contract, a separate workflow adds no credential isolation or safety. Shopify
indexing remains separate because Shopify events/reconciliation have a different root trigger,
signature boundary, retry lifecycle, and data contract.

The current workflow source starts from sanitized manual fixtures. The live Chatwoot webhook is not
connected. This keeps the first build useful for validation without granting persistent access or
risking a customer reply. The compiled delay policy is 30–75 seconds for Instagram, TikTok, and
WhatsApp and 120–300 seconds for Email; the one-second delay is available only to the sanitized
fixture. A live-shaped input keeps the kill switch on.

The four live n8n workflow shells now exist inside the isolated Calapres project. Core
`uCBXuRjlv8NyeikO` and Edge `e442GlRmKP4IO8pm` are both inactive and unpublished, have no public
webhook, and have no customer-egress node. Shopify index `cLHCuJ21r4RAuDTE` is also inactive,
unpublished, credential-free, and write-free. Owner Review Desk `hU7sAMAQSg9Obgky` is inactive,
unpublished, credential-free, has caller policy `none`, and has no webhook, Data Table node,
knowledge publication, or customer-egress path. Sanitized manual evidence was recorded for Core
executions `40576` and `40600`–`40603`; Edge happy/channel executions `40577`, `40579`, `40581`,
`40583`, post-correction run `40605`, final v3 deterministic-rendering run `40625`, and the
source-sync/event-identity/synthetic-Wait-integrity/exact-projection run `40651`; the four-channel delay ranges are proven
by the checked-in local runtime tests, not by that single WhatsApp fixture. Edge fail-closed executions
`40585`–`40592`; the post-fix order-index run `40619`; and the owner-review no-write run `40631`.
Execution IDs are evidence pointers,
not a durable knowledge or incident store.
Success, error, manual, and progress execution payload saving is disabled on all four workflows before
any live customer event is allowed to enter n8n.

The merged delay extension is imported into the existing inactive Edge. The Shopify index is also
imported inactive. Neither is published; neither has a credential, public webhook, Data Table
write, Shopify write, or customer-send node.

The signed-ingress, live-re-read, and post-delay-decision contracts are checked in but are not yet
bound to live nodes. They enforce a 1 MiB pre-parse limit, raw-byte HMAC, replay identity independent
of the unsigned Delivery header, exact timing/reference comparisons, and transient-only evidence.
Full evidence is forbidden from Wait, Data Tables, and audit. The Edge's exact dedup/jobs/incidents/
audit rows remain synthetic previews only: no row is persistable or ready for live storage.
The Wait carrier binds its exact ordered identifier/control fields with canonical SHA-256 and
carries only a pinned baseline-HMAC key version plus opaque status/assignee fingerprints. Live
baseline capture is not bound yet, so live-shaped input stops before Wait.

The empty approvals, incidents, and audit tables are now column-aligned to the exact no-write
owner-review projections at 34, 18, and 17 columns. No row was inserted. The Desk requires exact
account/inbox/channel, conversation, incident revision, owner, private-message fingerprint, nonce,
and digest bindings, then emits a `prepared` preview with `committed_at=null`. It does not mark the
incident resolved or turn a decision into knowledge.

## Exact channel boundary

The edge accepts only account `179973` and these exact inbox/channel pairs:

| Channel | Inbox | Pilot state | Identity continuity |
|---|---:|---|---|
| Instagram | `128031` | allowed | exact platform sender within the inbox |
| TikTok | `128033` | allowed | conversation-scoped until a stronger live mapping is verified |
| WhatsApp | `128058` | allowed | exact channel sender |
| Email | `128326` | allowed | exact sender address within the inbox |
| Website | `128028` | disabled | not validated for this pilot |

The normalized envelope can never contain the website inbox. Account, inbox, and channel mismatch,
outgoing messages, private notes, bot echoes, or missing conversation/message/sender references
stop before retrieval or reasoning.

## Signed ingress gate

The future Chatwoot branch must verify `X-Chatwoot-Signature` over the exact bytes
`timestamp + "." + raw_body`, using `X-Chatwoot-Timestamp`, before parsing or using message
content. It rejects malformed signatures, payloads over 1 MiB, timestamps older than 300 seconds,
timestamps more than 60 seconds in the future, and replayed signed requests independently of
`X-Chatwoot-Delivery`. A
reformatted JSON body is not equivalent to the signed body.
That request-replay fingerprint is not the durable event key. After signature verification and
allowlisted parsing, the edge derives a separate stable HMAC from account, inbox, event,
conversation, and message IDs. A platform redelivery with a fresh signature keeps the same event
identity; retained prior key versions are dual-read through the dedup TTL.

Chatwoot issue [#13809](https://github.com/chatwoot/chatwoot/issues/13809) reports a possible
difference between the displayed webhook secret and the internal HMAC token. Therefore the live
branch must pass a real signed fixture from account `179973`; if it does not, observation remains
disconnected. Bypassing signature verification is not an allowed fallback.

## Message journey in observation mode

1. A future signed ingress must verify the raw-byte transport signature, timestamp window, body
   size, and replay protection before the payload reaches normalization. Its replay key is derived
   from the signed request, not `X-Chatwoot-Delivery`. The current manual fixture uses a
   topology-created trusted test wrapper; transport claims placed inside an event payload are
   ignored and fail closed.
2. It resolves `brand_id=calapres` from the fixed account/inbox allowlist. A payload-supplied brand
   is never trusted.
3. It converts the event to a strict envelope containing identifiers and content metadata only.
   The envelope does not persist the customer's text or attachment data.
4. It derives the stable business-event HMAC from the allowlisted event tuple, claims that event
   identity atomically, and advances the exact conversation generation. A redelivery, duplicate,
   or older generation stops even when the request signature/timestamp changed.
5. It drops the original event, content metadata, sender reference, and model candidate, then gives
   the Wait node only account/inbox/channel IDs, conversation/message IDs, fingerprint fields,
   generation, time, knowledge version, and `customer_egress_allowed=false`. The carrier includes
   a canonical SHA-256 integrity fingerprint, a pinned baseline-HMAC key version, and opaque
   status/assignee fingerprints—never the raw status or assignee.
6. After the channel-appropriate delay it must re-read Chatwoot. It binds the exact incoming/public
   anchor fingerprint, then performs two independent, non-paginated reads with
   `after=anchor_message_id-1`. Each raw response must contain 1–99 valid rows, include the exact
   anchor, and yield the same canonical message set. Numeric message IDs catch same-second events.
   A 100-row response, changed set, invalid route/row, missing anchor, or any newer non-activity
   message cancels; so do a stale generation, changed assignee/status, or the brand kill switch.
   This bounded v1 rule deliberately makes no complete-history or stable-head claim.
7. If a live commerce fact is needed, the edge must read it from Shopify. Until required scopes and
   live paths are proven, customer and order lookup remain disabled.
8. A fixed Calapres-scoped model call may later return a provider-neutral structured candidate.
   The contract includes intent, risk, requested action, draft, confidence, knowledge/live fact
   IDs, live-lookup need, and an escalation reason. It is untrusted until the Core matches every
   ID to the selected approved knowledge/live-fact set, rejects owner-only facts, and validates
   authority, confidence, and the exact output shape. The model's free-text draft is never
   forwarded as the grounded result: the Core renders that result only from versioned
   `customer_response_ar` text or a verified live-source response fragment supplied by the brand
   adapter.
9. The Core returns only `no_action`, `observe_draft`, or `escalate`, and always returns
   `customer_egress_allowed=false`.
10. The current edge creates only sanitized, non-persistable row previews. Actual durable writes
    remain blocked until verified request-replay, business-event-HMAC, and identity-HMAC values and
    safe atomic idempotency behavior exist.
    There is no customer-send node.

## What lives where

| Information | Authoritative location |
|---|---|
| Current order, payment, fulfillment, inventory, and tracking facts | Shopify, read live |
| Channel contact and conversation history | Chatwoot |
| Brand registry, contracts, approved knowledge versions, workflow source | GitHub `main` |
| Approved response style | `support/brands/calapres/response-style/manifest.json` |
| Proposed model policy, inactive until approval | `support/brands/calapres/model-policy/manifest.json` |
| Deduplication, generation jobs, verified identity references, incidents, approvals, audit | isolated Calapres n8n Data Tables |
| Secrets and HMAC keys | credential vault only |

n8n is orchestration, not a customer/order/knowledge source of truth. Chatwoot history and n8n
execution history are not the durable incident or knowledge database. Supabase remains prohibited.

## Identity and returning customers

Each channel identity is stored as a keyed HMAC fingerprint and an opaque Chatwoot reference. Raw
phone numbers and email addresses are not placed in operational tables. An exact existing channel
identity can be reused. Cross-channel identities are linked only after a recorded verification;
names and social handles are never enough.

If the lookup index is missing, stale, ambiguous, or unavailable, the runtime re-verifies or
escalates. It never reveals another customer's information. Identity links are always scoped to
`brand_id=calapres`; they cannot become a portfolio-wide customer profile.

## Knowledge releases

The first knowledge release fixes the approved Calapres identity, Arabic-first Saudi tone, and
authority boundaries. The second release adds only facts verified from the live Calapres policy
and FAQ pages on 2026-08-11:

- shipping inside Saudi Arabia, 25 SAR below 320 SAR, and free shipping at 320 SAR or more;
- the published change-of-mind, customization, defect/damage, electronic-order-error, and delayed
  delivery policy references;
- the three-piece set, white/beige/gray colors, engraving, and cart ordering FAQ facts;
- privacy and terms links as escalation/operational references, not automated legal advice.

The third release supersedes the second without rewriting it. It keeps the same verified facts and
adds approved `customer_response_ar` render text only to safe `draft_only` entries. The Core uses
those exact fragments for observation drafts and never forwards the model's free-text wording.

Return, defect, damage, delayed-delivery, privacy, and terms cases remain owner-reviewed even when
the public policy is known. The policy describes the boundary; it does not grant the workflow
refund, cancellation, compensation, legal, or privacy authority.

Knowledge is append-only and dated. An owner answer is `reply_only` unless the owner explicitly
chooses `approve`, `approve_until`, or `correct`. Only the latter choices create or supersede a
GitHub knowledge version.

In the current inactive release those four choices are validation previews only. Before any future
row write or knowledge publication, the runtime must freshly re-read Chatwoot, verify the owner
actor and private message, re-check the nonce and content digests, compare the incident revision,
guarantee idempotency atomically, and re-verify the live table schema.

## Data minimization

The operational contracts reject raw customer fields and arbitrary extra properties. Data Tables
must not contain:

- message bodies, full transcripts, or attachment content;
- raw phone numbers, raw email addresses, or postal addresses;
- Shopify order payloads or payment information;
- model candidates, drafts, sender references, or message content in a waiting execution;
- credentials, tokens, HMAC keys, or model prompts containing secrets.

Incident summaries are sanitized and reference opaque IDs. Audit rows contain reason codes and
workflow/knowledge references rather than customer text.

## Failure behavior

The following always end in no action or an internal incident:

- invalid signature or missing replay protection;
- unknown account/inbox/channel or the disabled website inbox;
- duplicate event or stale conversation generation;
- human intervention or active kill switch;
- ambiguous identity or live facts;
- disabled Shopify read capability;
- rate limit, connector failure, schema failure, invalid model output, or low confidence;
- sensitive action or high-risk intent.

There is no fallback that asks the model to guess, selects another brand's credential, uses the
paused catalog state, or silently turns an owner answer into policy.

## Evidence required before live observation

- repository schemas and fixtures pass locally;
- Core, Edge, Shopify index, and Owner Review Desk sources compile and are imported inactive
  without credentials;
- the private Core has no public trigger or external credential;
- the edge has no Chatwoot customer-send or Shopify mutation node;
- the merged Wait carrier rejects message content and the no-credential live-re-read slot stops;
- the order index accepts only HMAC fingerprints and opaque Shopify references, maps exactly the
  12 live Data Table columns, strips contract-only fields, and performs no write;
- an adversarial model draft cannot override the approved response text referenced by its fact ID;
- all eight Calapres operational tables exist and remain separate from catalog work;
- owner-review table projections match the exact 34/18/17-column approvals/incidents/audit schemas,
  while all owner-review writes and knowledge publication remain disabled;
- signature and replay checks use trusted transport evidence, not fields supplied by a webhook;
- persistent Chatwoot access is explicitly approved and tested;
- logs and execution saving expose no customer body or secret.

## Additional gates before any automatic reply

Observation success does not authorize sending. Customer egress remains blocked until decision
0010's complete gate list passes, including concurrency/idempotency proof, batching cancellation,
human-intervention cancellation, verified Shopify retrieval, incident persistence, clean logs,
kill-switch rollback, and a separate owner approval for customer-facing activation.

Future brands are not part of this pilot. They receive separate edges, projects/tables,
credentials, registries, knowledge, and tests only after their own onboarding decision.
