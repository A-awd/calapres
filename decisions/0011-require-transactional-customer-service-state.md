# 0011 — Require transactional customer-service state

Date: 2026-08-11

Status: Accepted architecture; provider creation and live binding remain separately gated

Implementation clarification (2026-08-12): the atomic boundary contains thirteen logical
operations—eleven used by the Calapres Edge and two available only to the owner-review path. No
single Edge credential receives all eleven. The signed-webhook role can execute eight fixed
functions, while the reconciliation role can execute six fixed functions; three logical operations
have source-specific wrappers or are shared, so the role totals intentionally overlap. The three
reconciliation operations lease a best-effort Chatwoot scan, read one conversation cursor only
under that live scan lease, and compare-and-advance it. They compensate for uncertain account-
webhook delivery; they do not turn Chatwoot's mutable conversation listing into a no-loss ledger.

## Context

Decision 0010 accepts Calapres-scoped n8n Data Tables for an observation release only because
customer egress is structurally absent. The completed runtime audit confirmed that Data Tables do
not expose a documented uniqueness, transaction, or compare-and-swap guarantee suitable for the
following races:

- two deliveries of the same signed request;
- one business event redelivered with a new timestamp and signature;
- two messages advancing the same conversation generation;
- a waiting draft racing a human/private/automation reply;
- two owner commands consuming the same nonce or incident revision;
- a timeout after a side effect where the caller cannot tell whether it committed.

A no-send fixture can preview rows safely without resolving these races. A durable internal
observation, owner decision, or customer send cannot claim exactly-once behavior without a store
whose concurrency semantics are explicit and testable.

## Decision

Adopt a provider-neutral atomic storage boundary for the Calapres customer-service edge. Its
production implementation will use a dedicated managed PostgreSQL database or dedicated
Calapres database boundary with standard unique constraints, transactions, conditional updates,
and tested backup/restore. No provider is selected or provisioned by this decision. Supabase
remains prohibited by decision 0006.

The private shared Core receives no database credential. Only the thin Calapres edge and the
private owner-review persistence path may receive a statically bound, least-privileged Calapres
credential after the provider, region, cost, retention, and access policy are approved.

### Required storage operations

The adapter contract exposes logical operations, not vendor queries:

1. `claim_request_replay` creates a short-lived `processing` lease for one verified signed
   request. The same lease token can reconcile an uncertain result; another live lease receives
   `retry_later`; one expired lease may be recovered. The request becomes a safe completed
   duplicate only after it is durably linked to a business event and conversation job.
2. `claim_business_event` creates or exclusively leases the stable brand-keyed event identity
   across fresh signatures and transport redeliveries. A prepared event with an expired lease may
   be recovered by exactly one worker.
3. `advance_conversation_generation` is the combined ingress commit. In one transaction it checks
   both leases, advances the exact conversation generation, creates the durable due job, stores
   only the identifiers/control bundle needed for post-delay recovery, links request and business
   claims to that job, and returns the database-computed `due_at`. Only this result makes HTTP 204
   acknowledgement safe.
4. `claim_due_conversation_retry` leases the next due Calapres job without trusting a caller-
   supplied conversation identifier. The current webhook execution and the schedule-recovery
   branch compete for the same lease, so only one proceeds.
5. `read_generation` returns the committed generation and current job; a worker continues only
   when it still owns the current value.
6. `schedule_conversation_retry` and `transition_conversation_job` persist the bounded attempt,
   safe error, database-computed next time, and state transition under exact generation/worker/
   lease compare-and-swap rules. A generic transition cannot enter a retry lease state.
7. `complete_business_event` requires the current generation and live worker lease, then commits
   the sanitized observation, optional incident, audit record, business completion, and job
   completion together.
8. `prepare_owner_review` compares the incident revision and creates a short-lived owner nonce plus
   exact digest-bound decision options without guessing which action the owner will choose.
9. `compare_and_commit_owner_decision` consumes that nonce and commits the selected approval,
   incident revision/state, and audit projection in one transaction only when the command,
   case-reply, optional knowledge proposal, and exact base/target/superseded versions still match.
10. `claim_chatwoot_reconciliation_scan` gives one Edge worker a database-timed lease for one exact
    Calapres inbox. The same scan identity can reconcile its lease, another live worker stops, and
    one worker may recover an expired lease. The four-inbox allowlist, activation floor, and policy
    version are exact contract fields.
11. `compare_and_advance_chatwoot_message_cursor` advances one exact conversation cursor only when
    the current scan lease and old cursor still match and every one of 1–99 message rows has an
    ordered, PII-free proof. Event candidates must resolve inside the transaction through the
    stable event alias to a business claim and durable job. Deterministic exclusions carry only
    message time/type/private/sender evidence, and PostgreSQL recomputes the allowed reason. A
    100-row Chatwoot result is truncated/unsafe and never advances the cursor.
12. `read_chatwoot_reconciliation_cursor` returns the current per-conversation cursor only while
    the caller owns the exact live scan lease for the same account, inbox, channel, activation
    floor, and policy version. An absent cursor is represented as zero only after that authority is
    proven; stale, cross-inbox, or expired leases receive no cursor.

Item 6 describes two related callable operations; the other eleven items each describe one, so the
logical operation total is thirteen.

Every result is explicit: `committed`, `duplicate_or_conflict`, or `unknown`. Network timeout,
driver error, schema drift, or unavailable prior key version returns `unknown` and fails closed.
No caller treats a false duplicate flag as proof of uniqueness.

### Transactional shape

- Request replay and durable business-event identity use separate keys and retention periods.
- PostgreSQL obtains one authoritative `clock_timestamp()` per operation. Callers provide bounded
  durations and version identifiers, never `now`, `expires_at`, `due_at`, lease timestamps, nonce
  timestamps, or completion timestamps. PostgreSQL creates every lifecycle time.
- A database-owned Calapres key registry validates active and retained HMAC versions through the
  database-computed retention window; a workflow cannot assert key coverage with its own clock.
- Business claims and conversation generations have unique brand-scoped keys.
- Generation advance, request completion, business binding, and durable job insertion are one
  transaction; a read followed by an unconditional write or an acknowledgement before that commit
  is forbidden.
- A durable job stores only account/inbox/channel and anchor identifiers, opaque event/
  conversation/message/baseline fingerprints, key and policy versions, correlation reference,
  generation, and database timestamps. It stores no message content or raw identity.
- Reconciliation cursor commits store the exact route, cursor transition, safe per-message proof,
  page/outcome digests, and database timestamps. They store no message body, attachment, contact,
  prompt, or Shopify payload. A historical exact commit remains available so an uncertain retry
  cannot be mistaken for a new cursor transition after later pages have advanced.
- Owner nonce consumption, incident revision comparison, approval insert, incident transition,
  and audit insert commit together or not at all; nonce consumption is not a separate prerequisite
  transaction.
- A future send first commits a prepared outbox action under a unique idempotency key. After the
  last live Chatwoot re-read, one worker owns delivery. An uncertain transport result is reconciled
  against Chatwoot before any resend.
- Key rotation retains the prior HMAC key identifiers and claim lookup coverage through the
  longest relevant TTL. Raw secrets never enter the database.

### Data boundary

The atomic store contains only Calapres operational state and opaque/keyed references:

- replay and event fingerprints;
- conversation generation and safe lifecycle flags;
- keyed channel/customer/order references and verification metadata;
- sanitized incidents, owner decisions, outbox state, and audit reason codes;
- schema/release/key versions and timestamps.

It must not contain raw phone numbers, email addresses, postal addresses, message bodies,
attachments, full transcripts, Shopify payloads, payment data, prompts, model drafts, or secrets.
Shopify, Chatwoot, and GitHub retain the source-of-truth roles defined by decision 0010.

### Isolation and operations

The Calapres database boundary requires:

- separate least-privileged credentials: the signed-webhook runtime role may execute only its
  eight fixed webhook/worker functions; the reconciliation runtime role may execute only its six
  fixed source-specific/shared reconciliation functions; and the owner runtime role may execute
  only the two owner functions. The old generic Edge role has no callable functions. No runtime
  role has direct table/sequence access, and no credential is available to the shared Core or
  another brand. Source-specific wrappers reject a mismatched `request_source`; the signed wrapper
  also rejects every non-null reconciliation field instead of rewriting caller input;
- encrypted transport and provider-managed encryption at rest;
- an approved region and data-processing boundary;
- point-in-time or equivalent managed recovery plus encrypted backups;
- a restore test into an isolated namespace before live internal observation;
- per-record retention/TTL, capacity alerts, connection limits, and migration rollback;
- schema migrations and a release lock stored in GitHub without customer data.

A future brand must receive its own credential and isolated data namespace/database boundary. It
does not share Calapres rows, HMAC keys, connection strings, or migrations in a way that lets its
edge select another brand dynamically.

## Observation boundary

The repository contains the provider-neutral contract, an in-memory concurrency reference, a
PostgreSQL adapter candidate, and migrations `0001` through `0007`. The in-memory adapter is test
evidence only. The SQL remains
`implementation_candidate_pending_live_postgres_validation`: lexical/static tests do not prove
that migrations compile, grants isolate roles, or concurrent sessions have one winner on a real
PostgreSQL engine.

n8n Data Tables may remain empty schema/projection previews or best-effort diagnostics in a
strict no-send mode. They are not authoritative for request replay, business-event uniqueness,
generation, owner nonce consumption, owner-decision commit, or future customer-send idempotency.
Chatwoot history and n8n execution history also remain non-authoritative.

No database, account, project, credential, network connection, migration, or live row is created
by this decision. Live persistence requires a separate owner-approved provider/cost/region action
and a successful credentialed adapter validation.

## Alternatives considered

### n8n Data Tables as the only store

Rejected for transactional authority. They remain useful for small project-scoped previews and
operational inspection, but their documented surface does not prove atomic uniqueness or
multi-row compare-and-swap.

### Redis as the only store

Rejected as the sole source for incidents, approvals, and durable audit. Conditional keys can
help short-lived replay/locks, but a second durable transactional record would still be required,
adding dual-write recovery. A future implementation may add a cache only if PostgreSQL remains the
authoritative commit boundary.

### Chatwoot or n8n execution history

Rejected. They are conversation and diagnostic surfaces, not a versioned atomic approval,
idempotency, or customer-identity database.

### Supabase

Rejected and prohibited by decision 0006. This decision does not reintroduce it under another
role.

### Provider-specific database selection now

Deferred. Provider, Saudi/Gulf data region, monthly cost, backup tier, connection method, and
owner/account custody are external commitments and must be reviewed together. The standard
PostgreSQL contract keeps the workflow and tests portable until that approval.

## Activation gates

Before `observation_internal`:

1. owner approves the exact managed PostgreSQL provider, region, account, monthly ceiling, and
   backup/retention tier;
2. the dedicated Calapres role and credential are created without sharing another brand;
3. migrations pass in an isolated test database and are checked against the release lock;
4. live PostgreSQL concurrency tests prove one winner for replay recovery, event leasing, combined
   ingress commit, next-due worker claim, generation, nonce, and owner-decision races;
5. timeout/crash tests prove `unknown` fails closed and reconciliation is deterministic;
6. two-session tests prove one scan lease and one conversation-cursor compare-and-swap winner,
   including durable candidate proof, deterministic exclusion proof, historical retry, stale
   cursor, and a 100-row no-advance result;
7. backup and restore tests pass with no raw PII or secret leakage;
8. n8n execution retention remains disabled and customer egress remains absent.

Before any customer egress, decision 0010's full activation gates still apply in addition to an
atomic outbox/send claim and a final live Chatwoot re-read.

## Consequences

- After a production adapter passes the activation gates, the runtime will gain a truthful
  exactly-one-winner boundary instead of relying on timing or a non-atomic lookup/write pair. The
  current in-memory harness and SQL inspection prove only the intended contract, not a deployed
  database.
- Internal observation can be made durable later without changing the shared Core or brand
  knowledge contract.
- The same Edge may run bounded Chatwoot reconciliation as a compensating control, but account-wide
  conversation discovery remains page-based and mutable. Even two converged bounded scans are
  recorded as `best_effort`; automatic customer egress must not depend on a claim of complete
  discovery.
- A managed database adds cost, credential custody, migrations, backup, monitoring, and regional
  review; these costs remain visible and separately approved.
- The current inactive workflows remain safe and no-send. This decision does not claim that the
  production adapter, provider, or live persistence already exists.
