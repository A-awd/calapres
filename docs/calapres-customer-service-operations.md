# Calapres customer-service operations and failure runbook

Date: 2026-08-11

Status: Source-only preparation; no live ingress, persistence, model call, private note, or customer
egress is authorized by this document.

Authority: decisions 0008, 0010, and 0011

## Purpose

This runbook defines how the Calapres customer-service runtime must start, stop, fail, recover, and
be costed. It covers the four approved Chatwoot inboxes: Instagram, TikTok, WhatsApp, and email.
It does not authorize another brand, the website inbox, Captain, AgentBot, Shopify writes, or an
automatic customer reply.

## Operating modes

| Mode | Customer events | Internal draft | Durable operational write | Customer reply |
|---|---:|---:|---:|---:|
| `disabled` | rejected | no | no | no |
| `synthetic_test` | synthetic fixtures only | yes | no | no |
| `observation_no_write` | verified live event | transient only | no | no |
| `observation_internal` | verified live event | yes | approved operational store only | no |
| `assisted` | verified live event | yes | yes | owner sends or explicitly approves | separately gated |
| `automatic` | verified live event | yes | yes | allowlisted A1 replies only | separately gated |

The repository and inactive n8n workflows are currently limited to `synthetic_test`. Moving one
row down this table requires every gate for that row; no mode is inferred from the presence of a
workflow, table, credential, or successful historical execution.

## Non-negotiable invariants

1. Resolve the exact Calapres account and inbox before reading knowledge, identity state, Shopify,
   or a model.
2. Verify Chatwoot's signed raw request and short-lived replay claim before parsing message
   content. The unsigned delivery header is never the business-event key.
3. Lease the signed request and stable business event, then bind both to the exact conversation
   generation and a durable due job in one database transaction before acknowledging the webhook.
4. Keep raw message text, attachments, phone, email, address, payment data, and Shopify payloads
   out of operational tables and durable audit.
5. Keep customer text and model output out of the delay carrier. After the delay, re-read the
   conversation and current source facts.
6. Any newer non-activity message, changed route, changed status/owner, stale generation, disabled
   brand, exhausted retry, schema mismatch, or ambiguous identity ends in `no_action` or an
   internal incident.
7. Shopify is the live commerce authority. Chatwoot is the conversation/contact authority. GitHub
   `main` is the versioned policy, knowledge, contract, and decision authority. n8n coordinates;
   it does not replace those sources.
8. Captain remains disconnected, AgentBot remains absent, and the observation release has no
   customer-send node. A model never receives a channel credential or tool authority.

## Event journey

1. **Ingress:** accept raw bytes only on the Calapres edge; enforce the size and timestamp window,
   verify the signature, and claim the request-replay fingerprint with a short TTL.
2. **Business identity:** parse only after transport verification; canonicalize the allowlisted
   account, inbox, event, conversation, and message IDs; derive a brand-keyed event fingerprint.
3. **Recoverable ingress leases:** the request starts as `processing`, and the stable business
   event starts as `prepared`. The same lease tokens reconcile a timeout; another live lease
   receives `503`; one expired lease can be recovered.
4. **Baseline:** read the exact Chatwoot conversation and calculate opaque status/assignee and
   route/message fingerprints before acknowledgement. Raw customer content is not persisted.
5. **Combined durable commit:** one PostgreSQL transaction advances
   `calapres + conversation_id`, creates the due job with the identifiers-only control bundle,
   and links request and business claims. Only a committed job—or an exact duplicate already
   linked to that job—permits HTTP 204.
6. **Work lease:** the continuing webhook execution and a schedule trigger inside the same Edge
   compete for the next due job. One database lease wins; a crash after acknowledgement is
   recoverable without relying on n8n execution history.
7. **Missed-webhook reconciliation:** the same disabled schedule branch may lease one scan for each
   of the four allowlisted inboxes, compare two bounded conversation-list snapshots, and inspect
   each known conversation from its committed message cursor. This is a compensating best-effort
   scan, not a complete event ledger. A candidate message must enter the same durable event/job
   path as webhook ingress before its conversation cursor can move. A deterministic exclusion is
   proven only from safe time/type/private/sender fields. A raw 100-message result is unsafe because
   Chatwoot filters by ID but orders the limited result by creation time; it stops with no cursor
   movement, incident required, and manual resolution.
8. **Re-read:** perform two bounded independent Chatwoot reads from the bound incoming/public
   anchor. A 100-row response, changed result set, invalid row, missing anchor, or newer
   non-activity message cancels the run.
9. **Retrieve:** load the exact approved knowledge release. For order questions, resolve identity
   safely and read current Shopify facts; never infer an order from a name or social handle.
10. **Classify/draft:** send only the minimized allowlisted model input. Treat the structured result
   as untrusted. The Core validates intent, risk, citations, and authority, then renders only from
   approved knowledge text or a verified live-fact response fragment.
11. **Observe:** record a sanitized outcome or prepare an internal owner-review item only after an
   atomic persistence boundary is available. The current source stops before this live write.
12. **Egress:** absent. A future egress gate must repeat the live conversation check and atomically
    consume a send idempotency key immediately before the single Chatwoot send.

Chatwoot's account webhook is a wake-up signal, not the event ledger. Its public documentation
does not promise a retry count or schedule for ordinary account webhooks. The runtime must
therefore reconcile against Chatwoot's API after a missed/uncertain delivery rather than assume a
failed webhook will be delivered again.

## Failure policy

| Failure | Required behavior | Automatic retry |
|---|---|---|
| Invalid/missing signature, stale timestamp, oversized body | reject before parsing; sanitized security count only | no |
| Request replay with a completed durable job | acknowledge duplicate; do not create another job, model call, incident, or reply | no |
| Request/business lease held or result uncertain | return `503`/stop; the same token reconciles and one expired lease can recover | bounded recovery only |
| Unknown account/inbox/channel or brand mismatch | fail closed and raise configuration incident without message text | no |
| Atomic store unavailable or claim result uncertain | stop; never assume unique | bounded health retry only, not the event side effect |
| Chatwoot `401/403` | disable live observation path; alert credential owner | no until repaired |
| Chatwoot rate limit, timeout, or `5xx` | keep generation pending; retry with bounded exponential backoff and jitter | yes, while within channel/review deadline |
| Conversation discovery changes between bounded scans or exceeds its cap | record incomplete best-effort coverage; do not infer that all conversations were seen | next scheduled scan only |
| Messages-after result is exactly 100 rows | do not paginate or move the cursor; record `scan_truncated` and require manual resolution | no blind retry |
| Reconciliation proof is missing, reordered, mismatched, or lacks a durable job | roll back the cursor compare-and-swap; preserve the old cursor | retry only after proof/state reconciliation |
| Re-read response reaches 100 rows or changes between reads | cancel as incomplete/unstable; internal incident | no automatic reply |
| Human/private/bot/automation activity after anchor | mark human-owned or cancelled | no until explicit resume/new lifecycle |
| Knowledge release missing, stale, or digest mismatch | keep last verified release only for diagnostics; no new draft | no; configuration repair |
| Model timeout, rate limit, invalid schema, or unsafe citation | no model fallback and no draft presented as grounded | at most one bounded retry before deadline |
| Shopify auth/scope failure | disable commerce lookup; never guess | no until scope/credential repaired |
| Shopify zero match | ask only the safe next identity question in a later approved mode | no blind retry |
| Shopify multiple/mismatched match | reveal nothing; request step-up verification or owner review | no |
| Operational write partially succeeds | use the same idempotency key and compare-and-swap state; never create a new logical action | bounded recovery |
| Owner nonce/revision/digest mismatch | reject command and preserve incident as awaiting owner | no |
| Customer-send result uncertain | do not resend until Chatwoot is re-read and the send key/result is reconciled | reconciliation only |

Retries must be persisted as state, not depend only on a sleeping execution. The initial natural
delay may use n8n Wait after the durable commit, but the same Edge also has a schedule-recovery
branch that claims the next due job. A retry retains only the strict control bundle, attempt count,
database-computed next time, last safe error code, and the same idempotency key. It never retains
the raw customer payload.

## Atomic state requirements

Before `observation_internal`, the selected store must prove all of the following through the
provider-neutral adapter and concurrency tests:

- recoverable request-replay `processing` lease with a database-computed TTL;
- recoverable prepared business-event lease across fresh signatures/redeliveries;
- one combined transaction that links both claims, advances generation, inserts the due job,
  persists the identifiers-only baseline/control bundle, and makes acknowledgement safe;
- next-due work leasing without a caller-supplied conversation ID, plus generation-bound retry
  scheduling, attempt ceiling, and conditional job transition;
- one database-timed reconciliation scan lease per exact Calapres inbox and one durable
  per-conversation message cursor;
- cursor compare-and-swap that verifies every 1–99-row proof in the same transaction: candidates
  through stable event alias, business claim, and durable job; exclusions by recomputing the fixed
  safe classifier. A historical exact commit ledger makes uncertain retries deterministic even
  after later pages advance;
- database-authoritative lifecycle time: callers provide bounded durations and policy/key versions,
  never absolute claim, due, lease, nonce, or completion timestamps;
- a database-owned Calapres HMAC-version registry whose coverage outlives every retained alias;
- single-use owner nonce consumed inside the same transaction that compare-and-commits the owner
  decision against the incident revision and content/version digests;
- deterministic result after timeout/retry, including a way to distinguish `unique`, `duplicate`,
  and `unknown`;
- brand-scoped keys, encryption in transit/at rest, access isolation, backup/restore, retention,
  and an audit trail for privileged writes.

n8n Data Tables have no documented transaction/uniqueness contract and therefore remain
shape-preview or best-effort observation storage only. They cannot be the proof that a customer
send is safe. They are documented for light-to-moderate data with a default 200 MiB total limit
per n8n instance; inserts/updates fail once that limit is reached. Their manual per-table CSV
download is not a documented automated backup/restore or RPO/RTO guarantee. Supabase remains
prohibited. Decision 0011 selects the portable transactional contract and managed PostgreSQL
implementation class, while the exact provider/account/region/cost and creation remain owner-
approved external actions. The checked-in PostgreSQL migrations `0001`–`0007` and adapter remain an
implementation candidate until they compile and pass role, crash, and concurrent-session tests on
an isolated real PostgreSQL database. The dated provider/cost recommendation is recorded in
[`calapres-atomic-store-provider-evaluation.md`](calapres-atomic-store-provider-evaluation.md); it
does not authorize creation.

## Identity and Shopify recovery behavior

- WhatsApp may look up an exact keyed buyer-phone fingerprint. A recipient/shipping phone alone is
  not enough to reveal order details.
- Email may look up an exact keyed checkout email. Do not normalize away plus-tags or provider-
  specific dots.
- Instagram and TikTok handles are not Shopify identity. Reuse only a verified, unexpired link;
  otherwise ask for the checkout email/phone or order number and complete verification.
- A supplied order number is a lookup hint, not proof of ownership.
- A guest order may have no Shopify customer record; an order-scoped verified link is allowed,
  while a fabricated customer record is not.
- Zero, multiple, mismatch, stale index, or missing scope returns a non-disclosing result. Every
  positive result is fetched live from Shopify before use.

## Data retention and backups

| Data class | Durable authority | Backup/recovery rule |
|---|---|---|
| Registry, approved knowledge, response style, schemas, workflow source, decisions | GitHub `main` | immutable history plus release lock and tested checkout |
| Conversation and channel contact | Chatwoot | use Chatwoot's supported export/retention; do not mirror full transcripts into n8n |
| Customer, order, fulfillment, tracking, product, inventory | Shopify | re-read live; rebuild derived indexes from signed events and bounded reconciliation |
| Request replay, event claims, identifiers-only job controls, verified links, incidents, approvals, audit | approved operational store | encrypted backup, restore test, TTL/retention by record class, brand isolation |
| n8n execution payload | not authoritative | saving disabled/minimized; never used as knowledge, approval, or incident history |

No backup is considered valid until a restore into an isolated test namespace passes row counts,
schema version, digest checks, expiration rules, and the same no-PII scan. A lost derived index must
cause re-verification or rebuild, never broader disclosure.

## Monitoring and alerts

Track counters and latency without message text or raw identity:

- accepted/rejected signed requests by safe reason code and inbox;
- replay, duplicate-event, and stale-generation stops;
- processing-lease recovery, combined-ingress commit, due-job claim, and 503-before-commit counts;
- best-effort discovery convergence/incomplete counts, scan-lease contention, 100-row truncation,
  cursor compare-and-swap conflicts, and oldest conversation cursor age;
- wait age and cancelled-after-human-intervention count;
- re-read incomplete/unstable/rate-limited count;
- identity result class: zero, one, multiple, mismatch, or step-up-required;
- Shopify/Chatwoot/model availability and bounded retry exhaustion;
- drafts by decision: `observe_draft`, `escalate`, `mandatory_stop`, `no_action`;
- incidents awaiting owner, oldest age, and revision conflicts;
- atomic-store claim latency, unknown outcomes, backup age, restore-test age, and capacity;
- customer egress count, which must remain exactly zero in observation modes.

Immediate stop alerts: any customer egress in observation, another brand/inbox accepted, raw PII in
an operational row/log, two successful claims for the same key, Captain/AgentBot connection, or a
kill-switch mismatch.

## Capacity and cost model

Use measured counts rather than a fixed marketing estimate:

- `E_message`: one top-level edge execution per accepted delivery plus rejected transport attempts;
- `E_recovery`: each same-Edge schedule firing, even when no due job exists. The source candidate
  uses a 30-minute crash-recovery and best-effort Chatwoot reconciliation cadence (about 1,440
  starts in a 30-day month) and is not live; normal replies continue in the webhook execution at
  the channel delay. Each firing may add two bounded conversation scans plus per-conversation
  message reads for each of four inboxes, so API-call volume and Chatwoot throttling must be load-
  tested separately. A faster recovery SLA requires an explicit plan/cost decision before
  assisted or automatic mode;
- `E_shopify`: signed order-index events and bounded reconciliation runs;
- `E_owner`: owner-review actions;
- `C_model = calls * (input_tokens * input_rate + output_tokens * output_rate)`;
- `C_n8n`: selected plan execution allowance plus overage, if any;
- `C_state`: chosen atomic store, backups, network, and monitoring;
- `C_channels`: Chatwoot plan and channel-provider conversation/template charges where applicable.

Current public price snapshot on 2026-08-11, to be rechecked before purchase:

- n8n Cloud Starter: EUR 20/month billed annually, 2,500 executions, 5 concurrent production
  executions, and one shared project;
- n8n Cloud Pro: EUR 50/month billed annually, 10,000 executions, 20 concurrent production
  executions, and three shared projects;
- one parent production workflow start counts as an execution regardless of its node count;
  Execute Sub-workflow calls do not add another monthly execution, while each webhook redelivery
  starts another parent execution before business deduplication;
- Anthropic Haiku 4.5: USD 1 per million input tokens and USD 5 per million output tokens;
- Anthropic Sonnet 5: USD 2 per million input tokens and USD 10 per million output tokens;
- Anthropic Sonnet 4.6: USD 3 per million input tokens and USD 15 per million output tokens.

For a real-time model request, with uncached input `Iu`, five-minute cache writes `W5`, one-hour
cache writes `W1`, cache reads `R`, output `O`, and model rates `p_in/p_out` per million tokens:

`C_model = g / 1,000,000 * [p_in * (Iu + 1.25*W5 + 2*W1 + 0.1*R) + p_out*O]`

`g=1` for global inference and, where the selected model supports it, `g=1.1` for US-only
inference. Batch processing is excluded from live replies because it is asynchronous and not
eligible for zero-data-retention treatment. Standard commercial API input/output retention is up
to 30 days subject to the provider's documented exceptions; zero-data-retention requires a
separately enabled organizational arrangement.

Sub-workflow count, retry count, webhook redelivery, and rejected traffic must be measured in a
synthetic load test before live observation. The budget alert thresholds are 50%, 80%, and 100% of
the owner-approved monthly ceiling; no ceiling is invented by this runbook.

## Recovery sequence

1. Turn the Calapres registry kill switch on and verify customer egress is absent.
2. Disable the public ingress or disconnect the Chatwoot account webhook if the fault is security-
   or routing-related. Do not disconnect the four customer inboxes themselves.
3. Preserve only sanitized correlation IDs, safe error codes, workflow release digests, and store
   transaction references.
4. Reconcile atomic claims and source systems before retrying any side effect. Never replay an
   entire execution history blindly.
5. Restore a pinned repository release and the matching adapter/schema versions.
6. Run synthetic duplicate, stale-generation, human-intervention, ambiguous-identity, and source-
   outage tests.
7. Resume observation for one Calapres inbox at a time. Customer egress stays disabled.
8. Record the incident, root cause, affected correlation range, recovery proof, and preventive
   change in the durable audit/decision record without customer content.

## Promotion gates

### To `observation_no_write`

- approved Chatwoot credential and webhook secret;
- exact live signed fixture for each of the four inboxes;
- verified request replay and stable event identity; no HTTP 204 before the combined durable job
  commit when persistence is enabled;
- credential-backed pre-Wait baseline and bounded live re-read;
- execution retention confirmed off and customer egress structurally absent.

### To `observation_internal`

- atomic store selected by a recorded decision; migrations compile on a real PostgreSQL engine;
  split Edge/owner grants, restore, clock, lease, crash, and concurrent-session tests all pass;
- scan/cursor migration tests prove one inbox lease, one cursor winner, exact historical retry,
  safe exclusion recomputation, durable candidate linkage, and no advance for 100 rows;
- live schemas, backup, restore, retention, capacity, and sanitized audit proven;
- approved fixed model credential/privacy boundary and Shopify read scopes where needed;
- internal output destination approved; no customer send.

### To `assisted` or `automatic`

- all decision 0010 activation gates;
- live owner-review compare-and-commit and incident lifecycle;
- last-moment conversation re-read plus one-time send claim;
- channel response-window/capability adapter tests;
- explicit owner approval for the exact mode and inboxes.

## Official implementation references

- [n8n Data Tables](https://docs.n8n.io/build/work-with-data/data-tables/) — project-scoped,
  light-to-moderate storage, size limits, CSV import/export, and visibility boundaries.
- [n8n Data Table row operations](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.datatable/rows/)
  — the documented insert/get/update/delete/upsert surface; it does not document row uniqueness,
  transactions, or compare-and-swap.
- [n8n Cloud concurrency](https://github.com/n8n-io/n8n-docs/blob/main/docs/deploy/use-n8n-cloud/understand-concurrency.md)
  — production execution concurrency and queue behavior.
- [n8n sub-workflows](https://docs.n8n.io/build/flow-logic/break-workflows-into-smaller-parts/)
  — execution and nested workflow
  behavior used by the private Core boundary.
- [n8n pricing](https://n8n.io/pricing/) — current plan, execution, concurrency, project, and
  execution-log-retention limits; prices are time-sensitive.
- [PostgreSQL `INSERT ... ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html) —
  standard unique-conflict behavior required by the future production adapter.
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
  — concurrency, row locking, and serializable transaction behavior.
- [Chatwoot webhook verification](https://www.chatwoot.com/hc/user-guide/articles/1677693021-how-to-use-webhooks)
  — raw-body signature/timestamp verification.
- [Chatwoot message retrieval](https://developers.chatwoot.com/api-reference/messages/get-messages)
  and [Chatwoot's MessageFinder implementation](https://github.com/chatwoot/chatwoot/blob/develop/app/finders/message_finder.rb)
  — the bounded post-delay re-read contract and 100-row fail-closed boundary.
- [Chatwoot conversations list](https://developers.chatwoot.com/api-reference/conversations/conversations-list)
  and [Chatwoot's ConversationFinder implementation](https://github.com/chatwoot/chatwoot/blob/develop/app/finders/conversation_finder.rb)
  — page-based conversation discovery used only as a bounded best-effort compensation path.
- [Anthropic model pricing](https://platform.claude.com/docs/en/about-claude/pricing),
  [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), and
  [API data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention)
  — the dated model-cost formula, cache multipliers, and retention gate.
