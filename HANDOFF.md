# Handoff

## Migration 0014 syntax/NULL-bypass fix, Shopify credential swap (prepared) — 2026-08-13 (session 4)

**Migration 0014**: fixed a semicolon-inside-`--`-comment defect that broke Neon's migration
splitter (`syntax error at or near "no"`), and a NULL-comparison validation-bypass bug the fix
process exposed (empty/malformed jsonb commands could reach a raw `INSERT` instead of a clean
rejection). Verified both fixes by replaying all 14 migrations against a disposable local
Postgres 16 (not Neon) — clean apply, schema version 14, and the three new functions now reject
`{}`::jsonb correctly. Live Neon is still version 13; still needs a session with Neon MCP access
(or the owner via the Neon console) to run the fixed file.

**Shopify credential**: switched `GET Shopify Orders Read Only` to
`predefinedCredentialType`/`shopifyOAuth2Api` pointed at the existing `Shopify-Calapres`
credential (`QLsvwO73GFsQfy0w`) in the frozen source — committed, tested, config-validated. Live
apply failed with `credential 'QLsvwO73GFsQfy0w' is not usable in this workflow's project`
because that credential sits in the owner's personal n8n project while the workflow sits in the
"Calapres Customer Service" team project. This needs exactly one n8n UI action — **Credentials →
Shopify-Calapres → Sharing → share with project "Calapres Customer Service"** — not a Shopify
OAuth screen, no secret exposed. No tool in this session's n8n MCP surface can do this
programmatically. Once shared, the prepared `update_workflow` call is ready to apply and publish
immediately, followed by a read-only Shopify probe before declaring it resolved. Live workflow
itself is untouched (atomic update rolled back cleanly), still on the old expired credential.

## Remove intentional pre-send delay — 2026-08-13 (session 3)

Owner requirement: no deliberate human-like pause before the customer reply; only unavoidable
API/DB/model processing time between verification and send. Implemented as a minimal rename +
parameter change on the existing `n8n-nodes-base.wait` node: `Human Delay` (`amount: 5`) ->
`Pre-Send Continuation` (`amount: 0`), propagated to its two downstream references. Frozen source
SHA-256 `23e459dc36277e848318a5ba50c2c6596b78ab4dcf68868289e97ce078bff21b`, 99 nodes (unchanged
count — rename/parameter only). No security or durability gate touched; see STATE.md for the full
list of re-verified invariants and the graph-parity diff (empty on nodes, params, credentials, and
connections).

Live workflow `kAyF0D3ZZHxc0Hwp` published as active version `73e3e3f2-c507-426a-bf7b-e1300fdd0c4e`.
Same update restored `saveManualExecutions/saveDataErrorExecution/saveDataSuccessExecution` to
`false/none/none` (previously left at diagnostic `true/all/all` settings from earlier work this
session — an identified and now-fixed carry-over bug, not a new issue). Rollback points preserved
and restorable: `8c518aeb-22c2-4ab9-bcef-7418029386da` (original baseline),
`7cca9e9b-6092-444b-8cb8-7735c39a9b5f` (pre-zero-delay 99-node SLA/escalation graph).

Latency: no new real inbound message has occurred since publish (deliberately not synthesized —
see STATE.md for why). Computed from real production execution `41342` (real owner WhatsApp
message on conversation #3): old total inbound-to-reply-sent was 9.75s, of which exactly 5.000s
was the now-removed fixed wait; projected new latency is ≈4.75s, bounded by Chatwoot
anchor-reread + Postgres claim/lease + final Chatwoot send API time. Directly observing the new
number requires one real inbound message — the same unavoidable step needed for the final Outcome
3 acceptance test.

Still open, both owner-only unavoidable actions (not fixable by any tool available to this
session): (1) Shopify credential `QKgLBMWQtO6G4zvM` returns Shopify's own `401 Invalid API key or
access token` — needs a browser OAuth reauthorization by the account owner; (2) migration `0014`
(24h SLA tables/functions) is written and statically tested but not yet applied to the live Neon
database — this session has no Neon MCP tool access.

## Self-service-first escalation with durable 24h SLA (decision 0014) — 2026-08-13 (session 2)

The owner rejected the prior interpretation that cancellation/refund/complaint language or any
Shopify/model failure should immediately add the `human` label. Corrected and implemented in the
same workflow: `Build Human Escalation` now has exactly one inbound edge (explicit
`customer_requested_human`, verified by a graph test). Every other previously-escalating case
self-serves with a bounded, non-invented reply (order-status disclaimer for
cancellation/refund/complaint, minimum-identifier clarification for Shopify failures/missing
data/ambiguity, a fixed fallback sentence for model budget denial or untrusted output). A durable
24-hour unresolved-case SLA (migration `0014_calapres_cs_customer_reply_sla_escalation.sql`,
schema version 14) now backstops all of this: one open case per conversation
(`calapres_cs.customer_reply_sla_cases`), `atomic_upsert_customer_reply_sla_case` (touch/resolve,
never resets the clock on a repeated message), `atomic_claim_due_customer_reply_sla_escalation`
(23h-48h claim window, `FOR UPDATE SKIP LOCKED` lease, same pattern as send-recovery),
`atomic_finalize_customer_reply_sla_escalation` (escalated / resolved-as-ineligible / released for
retry). The existing `Recover Ambiguous Sends Every 15 Minutes` trigger gained one isolated
fan-out branch for this — no new trigger, workflow, webhook, or credential. Graph tests prove
neither this branch nor the trigger can reach `Send Reply`. Frozen source SHA-256 is
`5092f7311b033f362e03cb3f4953fca32f068596a820cd0958c38d7b9830e76e` (82 -> 99 nodes). Full
Python (92) and Node (269+) suites pass.

**Not yet Neon-verified**: this session has no Neon MCP access. Migration 0014 is written, its
static contract tests pass, but it has not been applied to the live database. Until it is applied
(by a session with Neon MCP access, or by the owner via the Neon console), the new
`Postgres Customer Reply 14 Update SLA Case` and the SLA-escalation sub-branch's Postgres calls
will error on every execution once published live — this is fail-loud, not fail-silent, and does
not block or delay `Send Reply` (they are parallel, not sequential, confirmed by graph reachability
tests), but the 24-hour escalation feature itself is not functionally live until the migration runs.

**Separately, still unresolved**: the Shopify credential `QKgLBMWQtO6G4zvM` ("Unnamed credential",
generic `oAuth2Api` type) returns Shopify's own `HTTP 401 "Invalid API key or access token"` when
called through the exact live node/credential — this is an invalid/expired access token, not a
scope-denial error (which would be a `200` with a GraphQL `ACCESS_DENIED` error instead). Fixing
this requires an OAuth reauthorization only the account owner can complete in a browser; no scope
change, credential replacement, or workaround can substitute for that.

## Owner-directed escalation policy correction — 2026-08-13

The owner corrected a design defect: the bot was treating any Shopify/credential/data-gap
failure as an immediate silent human handoff (adding the `human` label and going quiet),
including on conversation #3 after the n8n Shopify credential failed an order lookup. The
corrected, binding policy: escalate to the owner only when the customer explicitly asks for a
human/agent, or a case stays unresolved 24 hours; every other Shopify failure or missing-data
case must attempt self-service or ask for the single missing identifier, never add the
`human` label or go silent. Fixed inside the same workflow only, same credential, no new
resources: `Prepare Shopify Order Read` and `Build Verified Shopify Order Reply` now turn
missing-phone, missing-product-topic, Shopify API/credential failure, order/customer ambiguity,
identity mismatch (never revealing the order belongs to a different phone), product-not-found,
and uncertain/partial fulfillment status into a direct clarification reply instead of
`Build Human Escalation`; the `Shopify Order Read Ready?` false branch now points to
`Human Delay` (the send path) instead of escalation. Cancelled/refunded orders still escalate
(a resolved, sensitive money state matching the original mandatory refund/cancellation rule),
as does an explicit customer request for a human agent (new router detection,
`error_code: customer_requested_human`) and existing model/budget/kill-switch uncertainty
paths. A 24-hour unresolved-case escalation was not implemented in this pass — it requires new
durable SLA-tracking state and is out of scope for this fix; flagged as a follow-up.

Conversation #3's `human` label, added under the prior incorrect policy, was removed live via
a temporary, isolated, sentinel-gated branch reusing the existing `Header Auth account 3`
credential and the existing `POST Chatwoot Human Label` node's endpoint pattern (dead-end,
zero interaction with production Postgres/send logic, fanned out from an existing connection
without removing it). Chatwoot's own activity log recorded `خدمة عملاء كالابريز أزال human`
at 13:43:45Z; a control probe afterward failed only `anchor_missing_or_duplicate` (expected
for a synthetic message id), not `human_label_present`, confirming `Should Reply?` /
the anchor's live label check no longer blocks the conversation. The scaffold nodes were fully
removed immediately after; live graph was re-verified to match the frozen source exactly
(82 nodes, single `Send Reply` inbound edge, recovery isolated, no-save settings restored).
New source SHA-256 is `f77279c1c844da3c62f1cc09ef8038f11a71ff510ae059c01c3327dfc551f02a`.

## Owner feedback fixes: classification, live Shopify reference, delivery audit — 2026-08-13

Owner-reported functional failures were diagnosed from live evidence (no-send diagnostic
executions 41316-41317). Findings: (1) all three outgoing replies carry Meta-confirmed
`delivered` status with real WhatsApp wamid source_ids addressed to the owner's number, so
transport works; the phone-side report needs the owner to check the business-number chat.
(2) The bot itself escalated conversation #3 at 13:26:23Z (activity message: human label added)
after `بلغي الطلب` hit the order path and the n8n Shopify credential failed the customers query
— the same query succeeds with valid scopes, so the n8n Shopify OAuth credential is missing
read_customers/read_orders (and needs read_products for the new product path); until fixed the
order and product paths escalate fail-closed by design. The human label also explains the bot's
silence on later messages. (3) Store location/identity questions (وين مقركم، انتم في مصر؟) were
misrouted out-of-scope and then suppressed; the router now answers them deterministically as
Saudi-store FAQs, personal questions stay out-of-scope. (4) Product price/color questions now
route to a live Shopify products query and reply only from returned data (title + SAR price),
escalating when nothing is found; the memorized 390/190 price facts were removed from both the
router and the model prompt, and the model is instructed to escalate price/stock questions.
New source SHA-256 is `2aec6eacb67cb8b343397f2318a0e6112bdd2a2eee959a448b30e6de480a8fb3`.

## First live customer round trip — 2026-08-13 13:22 UTC

After the anchor fix was published as live version `50dc7cd0-71ab-4e19-b57a-e6682a998380`
(commit `991a517`), the owner's real WhatsApp inbound completed the full protected path in
production for the first time. Independently audited evidence (Codex, live Neon + Chatwoot):
greeting inbound `793040533` reached state `sent` with `send_attempt_count=1`, outgoing Chatwoot
message `793040908`, `sent_at` 13:22:07Z; a following out-of-scope inbound `793041254` reached
state `sent` with one attempt, outgoing `793041537`, 13:22:24Z. Conversation #3 shows both
replies with WhatsApp delivery ticks. Exactly one reply per inbound; no private note; no Shopify
write; deterministic routes only (no model call). Execution retention remained disabled during
these production sends. Diagnostic manual executions `41267`–`41272` earlier the same hour ran on
the pre-fix anchor and terminated fail-closed without any send.

Still outstanding before declaring full operational readiness: live out-of-scope suppression
(second notice inside 24h must be silent), live sensitive-message escalation (`human` label, no
customer send), a live model-route reply with budget reservation, and an optional safe order
lookup; ambiguous-send recovery remains proven synthetically only.

## Real-inbound anchor fix — 2026-08-13

The first real inbound after the capability-URL ingress deploy passed ingress, produced a live
durable claim in Neon (first live proof of the restricted Postgres path), and both authenticated
Chatwoot rereads returned 200 — then every event failed `anchor_mismatch`. Root cause, proven by
live diagnostic executions 41267–41272: the conversation-messages API omits `account_id` from
message rows (unlike webhook payload rows), so the anchor's `account_id === 179973` comparison
failed on all genuine messages; the old pinned fixtures had assumed the wrong row shape. The
anchor now validates `account_id` only when the field is present (the API call itself is pinned
to account 179973 by URL), and `Prepare Raw Chatwoot Ingress` gained a non-production-only
base64 diagnostic input used for owner-initiated manual runs. A regression test exercises the
anchor against real API-shaped rows. New source SHA-256 is
`3a10cd938146c828ff43c44fe20cf2ce992d4d632836c0b90b9e6c47aa1e1f85`.

## Chatwoot HMAC defect and capability-URL ingress — 2026-08-13

Real Chatwoot deliveries cannot be signature-verified (upstream chatwoot/chatwoot#13809: the
signing `hmac_token` is not exposed anywhere). Decision 0013 replaces signature enforcement with
capability-URL ingress plus the authenticated reread anchor; do not reintroduce a signature
requirement until Chatwoot exposes the real signing key. The frozen source is 82 nodes, SHA-256
`f24ee6f32a2768dae37f783d4bc7c7204f3c6397397ebc2698549eefbdaaaa9f`; ingress nodes are
`Prepare Raw Chatwoot Ingress` → `Webhook Ingress Ready?` → `Finalize Chatwoot Ingress Gate` →
`Chatwoot Ingress Accepted?`, with `Respond Chatwoot Ingress Rejected` fail-closed. `Send Reply`
still has exactly one authorized inbound edge and recovery still cannot reach it.

## Recovery cadence quota fix — 2026-08-13

The MVP recovery schedule now fires every 15 minutes (was every 1 minute). Frozen source SHA-256 is
`30b477d79c988c922fd5a3c7d04febbf4fe9255ed84fbe65e9a840f95a001818`; release-lock digest is
`f55598279f17dd6b03857c9fbeb63815e5c0e0a8d6937bf3ca01049beeb22e93`. The schedule trigger is named
`Recover Ambiguous Sends Every 15 Minutes` and still cannot reach `Send Reply`. Expected monthly
schedule cost is ~2,880 executions against the 10,000-execution n8n Pro plan. Do not restore the
1-minute cadence without recomputing plan headroom. The live workflow `kAyF0D3ZZHxc0Hwp` must match
this source exactly; rollback `8c518aeb-22c2-4ab9-bcef-7418029386da` is retained.

## New-conversation handoff — 2026-08-13 14:56 +03

Start by fetching GitHub and checking out
`agent/preserve-calapres-customer-service-checkpoint`. At session close, local HEAD, `origin`, and
Draft PR #4 all pointed to `6889b74a5539b3dc4d1337fe76ff97074d9fade3`, and the customer-service
guard plus both Shopify checks were green. Read the first sections of `STATE.md` and this file
before older historical sections; some lower sections intentionally preserve superseded evidence.

Do not rebuild anything. The protected source is
`n8n/deployments/calapres-cs-bot-protected-draft.json`, SHA-256
`6ae66e6bd80e7ef5d635cf0c7c75c468a6c3f7098b6161336dd15d248500a619`. Its release lock contains
95 files and digest `1203cedc5737711a371699a80a5249eb2367dc39d0dde133c80960250c904566`.
The final frozen checks were Node 249/249 and Python 92/92, with JSON, syntax, graph, secret/PII,
and release-lock checks green.

Live n8n state at handoff:

- existing workflow `kAyF0D3ZZHxc0Hwp` is active on protected version
  `941205ae-dab2-4684-b897-dee3655a2af7`, with 83 nodes and two triggers;
- `8c518aeb-22c2-4ab9-bcef-7418029386da` is the rollback version;
- Edge v2 `e442GlRmKP4IO8pm` remains preserved and unchanged;
- execution payload retention is disabled;
- Chatwoot has the two pre-existing `message_created` webhooks only: Edge observation and MVP;
- do not create a third webhook, duplicate workflow, or parallel responder.

Live Neon state at handoff:

- project `shiny-hill-38628371`, database `neondb`, main branch
  `br-broad-brook-awxulst4`;
- migrations 0001–0013 are applied;
- isolated validation branch `br-misty-glade-awba7bxf` passed reset-from-main restore validation;
- its prior state is preserved at `calapres-cs-pre-restore-validation-2026-08-13`;
- runtime execute grants are function-specific and direct table reads are denied;
- budget control is enabled, kill switch is off, monthly ceiling is USD 45, reservation is
  USD 0.05, and the daily conversation request limit is 20;
- one old synthetic USD 0.05 reservation remains as audit evidence; do not mistake it for real
  customer spend.

The synthetic execution matrix is recorded as `41145`–`41160`. Execution `41160` proved the full
pinned path through send authorization and durable completion without an external synthetic send.
Live HMAC binding was separately proved with a signed outgoing fixture returning 204; a wrong HMAC
returned 401. Exactly one manual technical message was sent to the owner's conversation #3. No
Shopify write or private note occurred.

The only material real-world proof still missing is an owner-only fresh inbound WhatsApp cycle:
observe exactly one protected reply, verify the corresponding durable Neon event and send
completion, then replay the same event and prove no duplicate reply. Do not use another contact,
do not expose secrets, and do not merge PR #4 to `main` before review.

Claude Code is now the implementation engineer and Codex is the independent auditor. Claude Code
was instructed to inspect first, preserve the active working version, and report exact evidence.
Its result is pending and must not be trusted merely because an n8n execution succeeds. Compare
its commit, source hash, live workflow/version/node count, Neon writes, Chatwoot behavior, replay,
and outbound effects against this handoff. If it changes the architecture, creates a duplicate,
weakens HMAC/idempotency/budget/reread protections, or cannot prove the final inbound cycle, treat
that as a blocker and preserve the current rollback.

## Resume checkpoint — 2026-08-13

Continue on branch `agent/preserve-calapres-customer-service-checkpoint`. The protected update of
the existing MVP `kAyF0D3ZZHxc0Hwp` is draft version
`941205ae-dab2-4684-b897-dee3655a2af7` with 83 nodes and source SHA-256
`6ae66e6bd80e7ef5d635cf0c7c75c468a6c3f7098b6161336dd15d248500a619`. The still-active rollback is
`8c518aeb-22c2-4ab9-bcef-7418029386da`. Do not create another workflow and do not modify Edge v2
`e442GlRmKP4IO8pm`.

Neon main and the isolated validation branch have migrations 0001–0013. The new recovery contract
retries transient Chatwoot reads without resetting delivery state or increasing send attempts.
Recovery verifies the stored reply digest and cannot reach `Send Reply`. The only incoming edge
to `Send Reply` is output 0 of `Customer Egress Authorized?`. Shopify remains query-only, model
spend is behind the database budget/kill-switch guard, and uncertain cases label for owner review.

Synthetic executions `41145`–`41160` are the final graph evidence. Execution `41160` completed
the pinned signed-ingress -> durable claim -> Chatwoot reread -> deterministic reply -> final
reread -> send claim -> pinned Chatwoot send -> durable completion path. No external send occurred
in that execution. Manual, success, error, and progress execution retention are disabled. After
the repository and CI freeze pass, the remaining live gate is publishing this exact
existing-workflow draft and proving one owner-only inbound/reply/recovery cycle; retain the old
active version as the rollback and do not merge PR #4 to `main` before review.

Publication is now complete on the existing workflow: active version
`941205ae-dab2-4684-b897-dee3655a2af7`. The old `8c518aeb-22c2-4ab9-bcef-7418029386da` remains
available for rollback. GitHub Actions passed both customer-service and Shopify checks for
`8c4d969`. Live HMAC was proven with a signed outgoing fixture that returned 204 and stopped
before PostgreSQL; invalid HMAC returned 401. Chatwoot already contains the Edge observation
webhook and the MVP webhook, both subscribed only to `message_created`; no webhook was added.
Neon restore was tested by resetting the isolated branch from main while preserving its previous
state under `calapres-cs-pre-restore-validation-2026-08-13`.

The only proof still requiring the owner's phone is a fresh inbound WhatsApp message followed by
the protected reply path. WhatsApp Web was not linked, so no OTP, QR, or credential was requested
or bypassed. Do not simulate that customer action through another contact. Until that one
owner-only live cycle is observed, distinguish the pinned full delivery proof from a real inbound
customer delivery proof.

## Resume from

Continue from the latest verified `main` revision. Decision 0006 is binding for the Shopify-native
architecture, decision 0007 is binding for the isolated Calapres ownership-proof site, and decision
0008 is binding for the Optix customer-service design and its Calapres-only pilot boundary.
Decision 0009 makes the ownership-evidence page a future multi-brand standard without authorizing
another brand implementation. Decision 0010 is binding for the inactive Calapres observation
runtime, its no-send boundary, and its persistent-access gates.

Decision 0012 selects Neon for the PostgreSQL gate. The isolated Neon database has migrations
0001–0010 applied; migration 0008 adds the deny-first model budget guard, migration 0009 fixes
the namespace-scoped key-bundle join that blocked durable writes. The restricted n8n
Webhook/Reconciliation credentials have passed SSL
connection tests. The checked-in Edge v2 is imported into the existing target `e442GlRmKP4IO8pm`
with those two project-scoped credentials; the read-only Shopify branch is also present and bound
to the project OAuth2 read credential. Do not create a workflow, activate it, publish it, or
connect live Chatwoot traffic.

The final local freeze passed Node 175/175 and Python 92/92. Real Neon two-session checks covered
database clock, role separation, rollback, and one-winner locking; a temporary branch schema
comparison produced no diff and the branch was removed. This is not a provider backup-restore
drill, and no live Chatwoot, model, or Shopify observation has occurred.

The current Neon recheck reports PostgreSQL 18.4, migrations 0001–0010, four restricted runtime roles,
and deny-first budget defaults (`enabled=false`, `kill_switch=true`, daily limit 20, monthly limit 45 USD).
The inactive n8n target passed internal synthetic valid-signature, modified-body, and invalid-signature
webhook runs; targeted Node coverage passed 83/83. These tests did not send a customer message.

For the frozen post-`bfb191c` customer-service source release, resume from branch
`agent/preserve-calapres-customer-service-checkpoint` and read
[`docs/calapres-customer-service-checkpoint-2026-08-12.md`](docs/calapres-customer-service-checkpoint-2026-08-12.md)
before changing any Edge v2, PostgreSQL, reconciliation, context/LLM, schema, fixture, or test file.
The current Edge v2 source hash is
`c3f2e3f00c6cfeeeba42966639303056fd178e7b67ed512a6d39c6da6e22d991`, and
`support/brands/calapres/customer-service-release-lock.json` verifies the release set. Do not
rebuild these artifacts or claim production readiness from this checkpoint. The target is now
published and active for observation only; `main` remains authoritative until the preserved branch
is reviewed and merged.

Latest checkpoint: commit `86d59eb` binds the read-only Shopify customer lookup result to the strict
Core input envelope. The preceding `8ebf82a` checkpoint adds the read-only Shopify client-credentials renewal contract
and targeted tests. The preceding `b0d4ba8` checkpoint refreshes and verifies the customer-service release lock after
migrations 0004, 0007, and 0008 changed. The verified Edge production URL is
`https://kunads90.app.n8n.cloud/webhook/calapres/customer-service/chatwoot/v2`. Chatwoot now has
exactly one saved observation webhook, subscribed only to `message_created`; its signing secret is
stored in the project-scoped n8n Crypto credential. Edge v2
source and target have a Shopify read-only HTTP node and no model node; the target is published and
active for observation only. The new Shopify read-only app is installed and its Client Credentials token was tested
directly: Shopify returned a 24-hour token with only read scopes, and read-only Admin GraphQL
queries for shop/products and customer ID returned successfully without logging customer fields.
The pre-existing credential-free Core dependency is published solely to satisfy n8n's sub-workflow
dependency; it has no public trigger, customer data source, or customer egress.
The first live synthetic raw-body POST exposed a mismatch between the existing n8n HMAC credential
and the secret shown by the existing Chatwoot webhook edit form. The existing credential was corrected
in place and the same signed POST then returned `200`; Chatwoot shows exactly one enabled webhook.
The first permitted synthetic event for test conversation `3` returned HTTP 200 but created no
durable rows. Root cause was confirmed in PostgreSQL: `_edge_key_bundle_valid` compared the
request namespace against unrelated registry namespaces. Migration 0009 is applied and the
atomic function now returns `committed / processing_claimed` in direct Neon verification. The n8n
target was updated and published at version `55ff93fc-8400-4a55-8338-3cc5301f7f71`; it remains
observation/no-send. The
n8n end-to-end durable replay proof remains the final observation check; do not weaken HMAC or
use customer data to manufacture it.
The generic OAuth2 credential is saved in n8n with the expanded read-only scope set. The source
Edge v2 now contains the read-only customer lookup branch and its source hash is recorded in the
deployment manifest; the imported target contains the same branch. No Shopify write occurred.

## Completed in the Supabase retirement

1. Verified the canonical repository, branch, remote synchronization, and baseline revision.
2. Read all root operating documents and relevant decisions.
3. Audited the complete tree and found two obsolete Supabase implementations: a legacy React
   application and a later product-sync layer.
4. Confirmed the Shopify theme directories and theme deployment workflow have no Supabase
   dependency.
5. Removed the legacy React and Vite application, its Supabase client, authentication, storage,
   functions, generated types, packages, and lock files.
6. Removed the Supabase migrations and edge functions.
7. Removed the retired supplier and Supabase synchronization source and its CI workflow.
8. Replaced active architecture instructions with a direct Shopify draft, review, approval, and
   publication workflow.
9. Added decision 0006 and marked the conflicting parts of decisions 0002, 0003, and 0005 as
   superseded.
10. Added Shopify-only CI with a guard against runtime Supabase reintroduction.

## Live systems

- No product was published, deleted, or edited during this repository cleanup.
- No customer, order, payment, or inventory data was touched.
- No external Supabase project or historical data was deleted.
- Live n8n was audited read-only. All eight workflows using the saved Calapres Supabase credential
  are archived and inactive.
- The dormant credential remains saved because credential deletion requires confirmation at the
  time of deletion.
- Existing Agentic, policies, Knowledge Base, FAQs, collections, and storefront configuration are
  unaffected.
- The selected Calapres WhatsApp asset is operational on Meta Cloud API. The approved display name
  is `Calapres | كالابريز`; WABA ID is `1835160094133742`; phone-number ID is
  `1202498582954919`; the phone is `CONNECTED`, verified, and protected by two-step verification.
- Chatwoot Cloud account `179973` and its existing WhatsApp inbox `128058` use those same IDs. The
  webhook is configured and a real inbound, outbound, and owner-acknowledgement test passed.
- The native Calapres Instagram `128031`, TikTok `128033`, WhatsApp `128058`, and Email `128326`
  inboxes are the exact customer-service pilot allowlist. Website inbox `128028` remains disabled
  for this pilot.
- n8n project `Calapres Customer Service` (`0kVami0vGGBbT7Cy`) contains eight empty isolated
  operational tables. Core `uCBXuRjlv8NyeikO` and Edge `e442GlRmKP4IO8pm` are inactive and
  unpublished. Shopify Order Index `cLHCuJ21r4RAuDTE` and Owner Review Desk
  `hU7sAMAQSg9Obgky` are likewise inactive and unpublished. All four have no credentials or public
  webhook, have no customer-send or Shopify-write node, and do
  not retain success, error, manual, or progress execution payloads under current settings.
- The approvals, incidents, and audit table schemas are aligned to the exact lossless owner-review
  projections at 34, 18, and 17 columns. The tables remain empty. Owner Review Desk caller policy
  is `none`, it contains no Data Table node, and its four decision actions remain previews with all
  writes and knowledge publication disabled.
- The Edge now includes the identifiers-only Wait and post-delay recheck; there is no separate
  delayed worker. The compiled delay is 30–75 seconds for the three chat channels and 120–300
  seconds for Email; one second is reserved for the sanitized fixture. The carrier binds its exact
  identifier/control fields with SHA-256 and carries only a pinned baseline-HMAC key version plus
  opaque status/assignee fingerprints. Live-shaped input keeps the kill switch on and fails closed
  before Wait until the trusted baseline capture and no-credential re-read are replaced. The index maps only HMAC
  fingerprints and opaque Shopify references to the exact 12-column empty order-index table and
  still performs no write.
- Source-only Chatwoot contracts now specify raw-byte HMAC verification, a 1 MiB pre-parse limit,
  request replay protection independent of the unsigned Delivery header, a separate stable
  business-event HMAC for idempotency across redeliveries, transient post-delay re-read evidence,
  and two independent non-paginated reads from the anchor-minus-one cursor. Each read must contain
  1–99 valid rows, include the exact incoming/public anchor, and yield the same canonical set;
  any newer non-activity message or route/state mismatch cancels.
  Full evidence is forbidden from Wait, Data Tables, and audit. No webhook or credential is live.
- The Edge previews the exact dedup/jobs/incidents/audit table shapes but marks every projection
  non-persistable and no-write. Static fixture fingerprints can never make a live event ready; a
  verified request replay claim, stable business-event HMAC with key-version dual-read, and
  identity-HMAC binding remain future live preconditions.
- Repository contracts, synthetic fixtures, and seventy-two local tests cover the shared Core, strict
  knowledge/live-fact grounding, transport-claim rejection, the stricter Calapres edge, embedded
  n8n Code syntax, channel delay, signed-ingress/re-read contracts, exact table-row projections,
  the index mapper, and the owner-decision trust boundary. Sanitized n8n runs `40625`, `40651`,
  `40619`, and Owner Review Desk run `40631` passed after the final fixes with
  customer egress, Data Table writes, knowledge publication, and Shopify writes all false.
  No n8n customer-service agent or automatic customer-facing reply is active.
- The model's free-text draft has no authority and is not forwarded. A grounded observation draft
  is rendered deterministically from versioned `customer_response_ar` or a verified live-source
  response fragment selected by an exact cited fact ID.

## Exact next actions

1. Continue with decision 0010 and `docs/calapres-customer-service-pilot.md`; do not recreate the
   already-built project, tables, Core, Edge, Order Index, Owner Review Desk, registry, knowledge
   releases, contracts, or fixtures.
2. Keep the Neon database and restricted credentials as the inactive PostgreSQL test foundation;
   complete real transaction/concurrency/recovery and backup/restore evidence before any live
   binding. The model budget guard is disabled by default and must remain so until the model phase.
3. The project-scoped Chatwoot read credential is now bound only to the existing Edge v2 GET nodes;
   verify it with a private synthetic read before creating any webhook. Obtain action-time owner
   confirmation before binding the dedicated Calapres OpenAI credential (project allowlist currently
   only `gpt-5.4-nano-2026-03-17`) to any model node or enabling a model call, then creating/sharing webhook-HMAC, identity-HMAC, or expanded Shopify
   access required for live observation.
   Two internal project-scoped Crypto credentials are bound to the existing identity/route and
   baseline/reread HMAC nodes. Keep the webhook HMAC secret separate until webhook creation.
4. Implement the checked-in signed-ingress contract in the existing Edge, emit trusted transport
   evidence from raw-body HMAC verification, capture status/assignee baselines with a pinned
   identity-HMAC key version before Wait, and replace the no-credential re-read slot with a live
   Chatwoot re-read after the merged identifiers-only delay using that same key version. Never connect a webhook directly to
   normalization. Prove a real signed fixture because Chatwoot issue `#13809` may affect the
   displayed HMAC secret; never bypass a failed signature check or use the unsigned Delivery header
   as replay identity.
5. Prove real brand routing, private observation drafts, deduplication, delay cancellation, owner
   intervention, and verified Shopify retrieval. This does not authorize customer-facing replies.
5. Review the four draft products directly in Shopify.
6. Add or approve missing media, inventory, price, collections, SEO, and sales channels.
7. Record owner publication approval, publish in Shopify, and verify storefront and Catalog
   inclusion.
8. Collect the missing commercial-register number, VAT number if applicable, verified phone, and
   complaint-response commitments.
9. Reconcile the live theme source into `main` before further theme-code deployment.
10. Delete the dormant Calapres Supabase credential from n8n only after explicit confirmation.

## Do not do

Do not restore the retired React application, Supabase files, database queue, supplier pipeline, or
old n8n sync code from Git history. Do not treat an external database record as a publication gate.
Do not permanently delete retired external data without a separate instruction naming the exact
project and acknowledging irreversibility.

## Theme delivery — 2026-07-31

- `shopify-theme` @ `65a5388` carries the Calabriz Liquid theme converted from the approved static build; all schema JSON is valid and `shopify theme check` passes with zero errors.
- Next: publish the four draft products (and add the iPad-stand photos) so the storefront renders live data, preview the staging theme, then publish it manually when approved.

## WhatsApp display-name ownership proof — 2026-08-11

- The ownership page is committed and pushed on `main` at
  `daf25f564c063a6f9066a56bf02293a68242bebc` and is deployed from `owner-site/` by GitHub Pages.
- The exact public statement is:
  `كالابريز (Calapres) علامة تجارية مملوكة ومدارة بواسطة مؤسسة عبق الخيل للتجارة.`
- It also includes the literal candidate relationship
  `Calapres by مؤسسة عبق الخيل للتجارة`, the same relationship in English, a link to the official
  Calapres store and email, and Organization/Brand/WebPage structured data.
- Pages deployment run `31469442562` succeeded. GitHub verified ownership of
  `awd-businesses.com`, and the repository Pages configuration uses that custom domain.
- The apex A records and `www` CNAME now point to GitHub Pages. Google Workspace MX, SPF, DKIM,
  Facebook verification, Domain Connect, and GitHub verification records remain intact.
- GitHub completed its DNS check, issued the custom-domain certificate, and HTTPS enforcement is
  enabled. The apex returns the exact published page over HTTPS with status `200`; `www` redirects
  to the apex, and the live response hash matches `owner-site/index.html`.
- Public resolvers point to GitHub. Some local DNS caches may temporarily continue serving the old
  Squarespace page until their previous record expires.
- Meta approved the live display name `Calapres | كالابريز` for the selected Calapres asset. Live
  Graph verification showed WABA `1835160094133742`, phone-number ID `1202498582954919`,
  `CONNECTED`, `CLOUD_API`, `VERIFIED`, and `STANDARD` throughput. Two-step verification is enabled.
- The two-step PIN is stored only in the local macOS Keychain under
  `Meta WhatsApp 2FA PIN - Phone ID 1202498582954919`; never copy it into GitHub or a workflow.
- Chatwoot Cloud account `179973`, existing inbox `128058`, reports the same identifiers, approved
  name, connected phone, and successful webhook configuration.
- A real bidirectional test passed from the owner's phone through Meta and Chatwoot and back to the
  phone; the owner's acknowledgement then arrived in the same Chatwoot conversation.
- Chatwoot template synchronization was initiated successfully. No duplicate account, WABA, phone,
  app, or inbox was created.
- No n8n customer-service bot is active. No file, setting, DNS record, or content for `calapres.com`
  or the live Shopify store was changed.

### Resume action

1. Continue with decisions 0008–0010 and the already-built inactive runtime; do not recreate the
   project, tables, Core, Edge, index, registry, knowledge, style, policy, contracts, or fixtures.
2. The dedicated Chatwoot read credential is bound to existing GET nodes only. Obtain action-time
   owner confirmation for the LLM/HMAC/Shopify read access; until the signed fixture and database
   gates pass, do not create a live webhook.
3. After confirmation, test real Instagram `128031`, TikTok `128033`, WhatsApp `128058`, and Email
   `128326` events as private observation only; Website `128028` remains outside the allowlist.
4. Keep every automatic customer send disabled until owner review and all end-to-end gates pass.

## Paused catalog investigation

- The official Shopify-synchronized catalog is associated with an old or inaccessible WABA rather
  than the current operational Calapres WABA.
- The owner explicitly paused this topic. Do not delete the official catalog, change its native
  Shopify synchronization, or create a replacement catalog as a shortcut.
