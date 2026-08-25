# Calapres Governed Responder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a source-only, owner-testable Calapres response gate that never answers pure
outside-store questions, renders static replies only from a pinned library, and keeps dynamic
commerce facts behind read-only Shopify.

**Architecture:** Add a small CommonJS decision module with a self-contained factory that can also
be compiled into one n8n Code node. Keep the approved knowledge manifest on v3, register v4 in a
separate offline-candidate manifest, and insert the compiled node after the existing Chatwoot anchor
verification inside the same protected responder export. The model branch remains in the rollback
graph but the governed decision function never emits its output index.

**Tech Stack:** Node.js built-in test runner, CommonJS, JSON fixtures, n8n workflow JSON, Python
`unittest`, Shopify Admin GraphQL read-only request shapes.

**Spec:** `docs/calapres-governed-responder-spec.md`

**Scope note:** This plan delivers the independently testable response-policy subsystem. The
specification's expired-`processing` lifecycle requirement is implemented under a separate
companion plan and must pass before any end-to-end source-readiness claim.

## Global Constraints

- Work on `agent/preserve-calapres-customer-service-checkpoint`; do not create a branch or worktree
  because the owner explicitly required continuation from this dedicated checkpoint branch.
- Do not access or modify live Chatwoot, n8n Cloud, Neon, Shopify, credentials, webhooks, inboxes,
  workflows, or customer messages.
- Do not create a workflow, webhook, company, inbox, Captain connection, or AgentBot connection.
- Keep `target_workflow_id` equal to the existing responder and keep publish/activation/credential
  permissions false in the candidate manifest.
- Use strict red-green-refactor: every production-source change starts with a failing targeted test
  whose failure is observed.
- Never store credentials, customer data, raw conversations, order payloads, or production logs.
- Static replies come only from exact response IDs in the v4 candidate; prices, stock, and orders
  are not library facts.
- The first governed release permits no model route and no general-purpose tool call.
- Do not push, publish, activate, deploy, or send as part of this plan.

---

### Task 1: Make the verification harness accept current Node test summaries

**Files:**
- Create: `n8n/tests/node_test_summary.py`
- Modify: `n8n/tests/test_chatwoot_observation_stages.py`
- Modify: `n8n/tests/test_chatwoot_production_runtime.py`
- Modify: `n8n/tests/test_calapres_customer_service_edge_v2.py`
- Modify: `n8n/tests/test_chatwoot_reconciliation_ingress_bridge.py`
- Modify: `n8n/tests/test_context_compiler_llm_boundary.py`
- Test: the five Python wrappers above

**Interfaces:**
- Consumes: stdout from `node --test` in either legacy TAP form `# pass 16` / `# fail 0` or current
  form `ℹ pass 16` / `ℹ fail 0`.
- Produces: `parse_node_test_summary(stdout: str) -> tuple[int, int]` in
  `n8n/tests/node_test_summary.py`.

- [ ] **Step 1: Reproduce the existing red baseline**

Run:

```bash
PATH=/Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:/usr/bin:/bin /Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest n8n.tests.test_chatwoot_observation_stages n8n.tests.test_chatwoot_production_runtime n8n.tests.test_calapres_customer_service_edge_v2 n8n.tests.test_chatwoot_reconciliation_ingress_bridge n8n.tests.test_context_compiler_llm_boundary
```

Expected: failures report that `# pass ...` or `# fail 0` is absent while stdout contains the
current `ℹ pass ...` / `ℹ fail 0` form.

- [ ] **Step 2: Write direct failing parser tests before the helper**

Add to `n8n/tests/node_test_summary.py` a `unittest.TestCase` that asserts both formats produce the
same result:

```python
class NodeTestSummaryParserTests(unittest.TestCase):
    def test_parses_legacy_and_current_node_summaries(self):
        for stdout in ("# pass 16\n# fail 0\n", "ℹ pass 16\nℹ fail 0\n"):
            self.assertEqual(parse_node_test_summary(stdout), (16, 0))
```

Run the file and observe `NameError: parse_node_test_summary is not defined`.

- [ ] **Step 3: Implement one strict parser**

Implement:

```python
SUMMARY_LINE = re.compile(r"^(?:#|ℹ)\s+(pass|fail)\s+([0-9]+)$", re.MULTILINE)

def parse_node_test_summary(stdout: str) -> tuple[int, int]:
    counts = {name: int(value) for name, value in SUMMARY_LINE.findall(stdout)}
    if set(counts) != {"pass", "fail"}:
        raise ValueError("Node test summary is incomplete")
    return counts["pass"], counts["fail"]
```

Replace the five literal/regex summary checks with this helper while retaining every existing
minimum-pass assertion and `returncode == 0` assertion.

- [ ] **Step 4: Verify the five wrappers are green**

Run the Step 1 command again. Expected: all selected Python tests pass.

- [ ] **Step 5: Commit the harness repair**

```bash
git add n8n/tests/node_test_summary.py n8n/tests/test_chatwoot_observation_stages.py n8n/tests/test_chatwoot_production_runtime.py n8n/tests/test_calapres_customer_service_edge_v2.py n8n/tests/test_chatwoot_reconciliation_ingress_bridge.py n8n/tests/test_context_compiler_llm_boundary.py
git commit -m "test: accept current Node test summaries"
```

---

### Task 2: Build the v4 candidate library and governed decision kernel

**Files:**
- Create: `support/brands/calapres/knowledge/2026-08-25-v4-candidate.json`
- Create: `support/brands/calapres/knowledge/candidate-manifest.json`
- Create: `n8n/modules/governed-responder.js`
- Create: `n8n/tests/fixtures/governed-responder-evaluation-matrix.json`
- Create: `n8n/tests/node/governed-responder.test.js`
- Create: `n8n/scripts/test-governed-responder.js`

**Interfaces:**
- Consumes: a v4 candidate release object resolved only through `candidate-manifest.json` and
  `{ message: string, content_kind?: string, scope_notice_sent?: boolean }`.
- Produces: `createGovernedResponder(release)` with
  `decide(input) -> GovernedDecision`, `render(decision) -> string | null`, and a self-contained
  `factorySource` suitable for embedding in an n8n Code node.
- `GovernedDecision.route` is one of `fixed_reply`, `dynamic_read`, `handoff`, `out_of_scope`,
  `uncertain`.
- `GovernedDecision.decision_kind` is one of `greeting`, `faq`, `order`, `out_of_scope`,
  `clarification`.

- [ ] **Step 1: Write failing release-validation and exact-render tests**

Create tests that load the candidate path and require:

```javascript
assert.equal(approvedManifest.current_version, '2026-08-11-v3');
assert.equal(candidateManifest.current_version, '2026-08-25-v4-candidate');
assert.equal(release.version, '2026-08-25-v4-candidate');
assert.equal(release.status, 'candidate_offline');
assert.equal(responder.render(responder.decide({ message: 'وش كالابريز؟' })),
  'كالابريز علامة تجارية سعودية للمباخر الفاخرة، ومتجرنا إلكتروني فقط.');
assert.throws(() => createGovernedResponder({ ...release, entries: [] }), /response_id/);
```

Run:

```bash
/Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test n8n/tests/node/governed-responder.test.js
```

Expected: fail because the release and module do not exist.

- [ ] **Step 2: Add the candidate release without changing the approved manifest**

Do not modify `support/brands/calapres/knowledge/manifest.json`; its trust anchor requires every
listed version to be approved. Create `candidate-manifest.json` with one current candidate row,
`status: candidate_offline`, the v4 path, `supersedes_approved: 2026-08-11-v3`, and
`approval_basis: docs/calapres-governed-responder-spec.md`.

The v4 entries must include these exact response IDs and exact customer texts:

```json
{
  "response_id": "scope.store-redirect",
  "knowledge_id": "scope.store-redirect",
  "customer_response_ar": "أقدر أساعدك فقط في كالابريز: المباخر، الطلبات، الدفع، والشحن. وش تحب تعرف عن المتجر؟",
  "fact_mode": "boundary",
  "authority": "approved_reply"
}
```

Also include `greeting.welcome`, `brand.introduction`, `brand.assistant-identity`,
`product.scope-burners`, `product.engraving`, `order.how-to-order`, `clarification.store-topic`,
`handoff.human-request`, `handoff.attachment`, `dynamic.product-catalog`, and
`dynamic.order-status`. Shipping-region facts must not have `approved_reply` authority; record the
owner/storefront conflict as `owner_required` with no customer response.

- [ ] **Step 3: Implement the self-contained fail-closed factory**

`createGovernedResponder` must define all normalization, validation, order-number extraction, and
routing helpers inside its own function body so `createGovernedResponder.toString()` has no hidden
module dependency. Normalize Arabic diacritics, `أإآ` to `ا`, `ة` to `ه`, and digits
`٠١٢٣٤٥٦٧٨٩` / `۰۱۲۳۴۵۶۷۸۹` to ASCII.

The returned decision always includes:

```javascript
{
  schema_version: '1.0',
  brand_id: 'calapres',
  route,
  decision_kind,
  response_id,
  dynamic_read,
  order_number,
  model_allowed: false,
  tool_allowed: dynamic_read !== null,
  reason_code,
  knowledge_version: release.version,
}
```

Evaluate explicit human request, attachment/non-text, greetings, order number/status, product
catalog/price/engraving, how-to-order, brand identity/scope, and shipping/store topics before the
fail-closed default. Pure external or prompt-injection messages select
`scope.store-redirect`; recognizable but unclear store messages select
`clarification.store-topic`. Mixed messages use only the matched store route.

- [ ] **Step 4: Add at least 200 evaluated cases**

The fixture contains arrays named `external_messages`, `mixed_cases`, `store_cases`,
`order_number_cases`, and `content_kind_cases`. Include weather, politics, health, religion,
finance, legal advice, programming, writing, homework, travel, sports, jokes, personal memory,
role-change, secret disclosure, and tool-use attacks in Arabic, Saudi dialect, and English.

The test generates punctuation/case variants and asserts at least 200 total evaluated inputs. For
every pure external input assert:

```javascript
assert.equal(decision.route, 'out_of_scope');
assert.equal(decision.response_id, 'scope.store-redirect');
assert.equal(decision.model_allowed, false);
assert.equal(decision.tool_allowed, false);
```

For every decision assert its `decision_kind` belongs to the five-value outbox set and every
static response is byte-for-byte equal to its library entry.

- [ ] **Step 5: Add the owner test command**

`n8n/scripts/test-governed-responder.js` accepts exactly one message argument, loads the v4
candidate, and prints JSON containing `mode: offline_source_only`, the decision, and the rendered
reply. It exits non-zero for missing/extra arguments or invalid release data and performs no
network call.

Run:

```bash
/Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node n8n/scripts/test-governed-responder.js "ما هو طقس لندن اليوم؟"
```

Expected: `out_of_scope`, `scope.store-redirect`, the pinned Arabic redirect, and both model/tool
permissions false.

- [ ] **Step 6: Run the full task tests and commit**

```bash
/Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test n8n/tests/node/governed-responder.test.js
git add support/brands/calapres/knowledge/2026-08-25-v4-candidate.json support/brands/calapres/knowledge/candidate-manifest.json n8n/modules/governed-responder.js n8n/tests/fixtures/governed-responder-evaluation-matrix.json n8n/tests/node/governed-responder.test.js n8n/scripts/test-governed-responder.js
git commit -m "feat: add governed Calapres response kernel"
```

---

### Task 3: Integrate the governed kernel into the existing protected responder candidate

**Files:**
- Create: `n8n/scripts/apply-governed-responder-candidate.js`
- Modify mechanically: `n8n/deployments/calapres-cs-bot-protected-draft.json`
- Modify: `n8n/deployments/calapres-cs-bot-protected-draft.update-manifest.json`
- Modify: `n8n/tests/node/calapres-cs-protected-draft.test.js`

**Interfaces:**
- Consumes: `createGovernedResponder.toString()` and the v4 candidate release from Task 2.
- Produces: one `Governed Customer Scope Router` Code node inside the same 100-node candidate,
  connected `Verify Chatwoot Anchor and Route -> Governed Customer Scope Router -> Route Customer
  Service Decision`.
- Maps `fixed_reply/out_of_scope/uncertain` to route outputs `1/4/1`, product/order
  `dynamic_read` to output `2`, explicit human to output `5`, and never emits output `3`.

- [ ] **Step 1: Write failing graph and behavior tests**

Add assertions before generating the node:

```javascript
assert.ok(nodesByName.has('Governed Customer Scope Router'));
assert.deepEqual(directTargets('Verify Chatwoot Anchor and Route'),
  ['Governed Customer Scope Router']);
assert.deepEqual(directTargets('Governed Customer Scope Router'),
  ['Route Customer Service Decision']);
```

Execute the embedded node with a minimal verified input for `ما هو طقس لندن اليوم؟` and assert
`route_index === 4`, `decision_kind === 'out_of_scope'`, `model_allowed === false`, and the pinned
reply text. Test `وش سعر المبخرة وهل طقس لندن؟` reaches output 2 with `decision_kind === 'faq'`.
Test every representative route against the SQL decision allowlist.

Run the targeted Node file. Expected: fail because the governed node does not exist.

- [ ] **Step 2: Build a deterministic idempotent workflow transformer**

The script loads the workflow and v4 release, verifies the exact existing workflow ID and the
presence of anchor/switch/send nodes, removes any prior governed node, and inserts one Code node.
Its `jsCode` embeds the release JSON and self-contained factory source, consumes
`$input.first().json.context.customer_text`, and writes `route_index`, `decision_kind`,
`reply_text`, `response_id`, `knowledge_version`, `dynamic_read`, `order_number`,
`model_allowed`, `tool_allowed`, and `reason_code` while preserving the verified context and
labels. Running the transformer twice must produce byte-identical JSON.

The script must refuse to run if the old graph is not exactly
`Verify Chatwoot Anchor and Route -> Route Customer Service Decision` or if `Send Reply` does not
have its current single inbound authorization edge.

- [ ] **Step 3: Normalize dynamic reads to the existing durable decision contract**

Update the embedded `Prepare Shopify Order Read` code to branch on
`dynamic_read === 'product_catalog'` / `product_info` instead of
`decision_kind === 'product'`. Product routes retain `decision_kind: 'faq'`; sensitive/order
routes retain `decision_kind: 'order'` and carry a separate `request_kind` when needed.

Update the product renderer so its prefix is:

```javascript
'لقيت في المتجر الآن: ' + items.join('، ') + '.'
```

It must not contain `المتوفر حاليًا` and must not infer availability from `status: ACTIVE` or
`totalInventory` alone.

Map every former `model_fallback` to `clarification`. Tighten the dormant model system prompt so it
forbids answering external information. Assert the embedded governed function never returns
`route_index: 3` across the complete matrix; do not claim static graph unreachability because the
rollback-compatible switch output and dormant model nodes remain present.

- [ ] **Step 4: Preserve scope suppression and all safety edges**

The out-of-scope route must retain `reply_text` and `response_id` through
`Prepare Out of Scope Notice Claim` and `Interpret Out of Scope Notice Claim`; output true reaches
the existing send path once and output false reaches terminal finalization. Keep the one-inbound
edge to `Send Reply`, final Chatwoot reread, send lease, no-save settings, recovery no-send
reachability, inbox allowlist, and Shopify read-only checks unchanged.

- [ ] **Step 5: Mark the manifest as a source-only candidate**

Recalculate `source_sha256` from the generated workflow. Keep
`deployment_mode: update_existing_only`, the same target workflow ID, and `create_allowed: false`.
Set `activation_allowed`, `publish_allowed`, `credential_binding_allowed`, and
`live_sync_executed` to false; set `source_only` to true.

- [ ] **Step 6: Verify idempotence, targeted tests, and commit**

Run the transformer twice and compare the workflow SHA-256 after each run. Run:

```bash
/Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test n8n/tests/node/governed-responder.test.js n8n/tests/node/calapres-cs-protected-draft.test.js
```

Expected: all targeted tests pass; workflow JSON parses; the protected graph still has one send
node and one authorized inbound send edge.

```bash
git add n8n/scripts/apply-governed-responder-candidate.js n8n/deployments/calapres-cs-bot-protected-draft.json n8n/deployments/calapres-cs-bot-protected-draft.update-manifest.json n8n/tests/node/calapres-cs-protected-draft.test.js
git commit -m "feat: govern the protected Calapres responder"
```

---

### Task 4: Record the source-only decision and freeze verified artifacts

**Files:**
- Create: `decisions/0015-adopt-governed-calapres-responder.md`
- Modify: `DECISIONS.md`
- Modify: `STATE.md`
- Modify: `HANDOFF.md`
- Modify: `n8n/scripts/release_lock.py`
- Modify: `n8n/tests/test_context_compiler_llm_boundary.py`
- Modify: `support/brands/calapres/customer-service-release-lock.json`

**Interfaces:**
- Consumes: committed Task 1–3 artifacts and their exact test evidence.
- Produces: a source-only architectural decision, current top-of-file state/handoff sections, and
  a release lock covering the candidate module, candidate manifest/release, workflow, and
  deployment manifest. Tests remain verified evidence rather than locked runtime artifacts.

- [ ] **Step 1: Write the decision with explicit live/non-live boundaries**

Record that the owner approved source-only build/testing on 2026-08-25, the five closed routes,
v4 candidate-library authority, no model-reachable route, existing-workflow-only integration,
Shopify live-read requirement, and Captain/AgentBot disconnected state. State explicitly that no
live workflow, webhook, credential, database, Shopify record, or customer message changed and that
publication/testing on real channels requires separate approval.

- [ ] **Step 2: Update the index and prepend current evidence**

Add decision 0015 to `DECISIONS.md`. Prepend concise dated sections to `STATE.md` and `HANDOFF.md`
with the branch commit, source hash, candidate version, test counts, no-live boundary, exact owner
test command, unresolved processing-recovery follow-up, and next approval gate. Do not rewrite or
delete historical sections.

- [ ] **Step 3: Teach the release lock about offline candidate knowledge, then regenerate it**

First add `support/brands/calapres/knowledge/candidate-manifest.json` to the manifest loop in
`release_lock.py`; reuse `manifest_release_paths` so the candidate release is resolved and locked.
Add a Python assertion that `--emit` covers both candidate paths while the compiled approved
context still resolves v3 and its existing trust anchor unchanged.

Then run:

Run:

```bash
/Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 n8n/scripts/release_lock.py --emit
```

Apply the emitted canonical JSON to
`support/brands/calapres/customer-service-release-lock.json` with the normal patch workflow, then
run `--check` and expect `Calapres customer-service release lock verified`.

- [ ] **Step 4: Run fresh full verification**

Run exactly:

```bash
/Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test n8n/tests/node/*.test.js
PATH=/Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:/usr/bin:/bin /Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest discover -s n8n/tests -p 'test_*.py'
/Users/awd/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 n8n/scripts/release_lock.py --check
git diff --check
```

Also parse every JSON file changed in this plan and run the repository's existing secret/PII
guards. Do not claim green from prior runs.

- [ ] **Step 5: Demonstrate the exact owner examples**

Run the offline tester for:

```text
ما هو طقس لندن اليوم؟
وش سعر المبخرة وهل طقس لندن؟
كيف أطلب المبخرة؟
وش حالة طلبي رقم ١٢٣٤؟
أبغى موظف
```

Record only the safe decision/reply results in `HANDOFF.md`; do not record customer identifiers.

- [ ] **Step 6: Commit the freeze, without push or deployment**

```bash
git add decisions/0015-adopt-governed-calapres-responder.md DECISIONS.md STATE.md HANDOFF.md n8n/scripts/release_lock.py n8n/tests/test_context_compiler_llm_boundary.py support/brands/calapres/customer-service-release-lock.json
git commit -m "docs: freeze governed responder candidate"
```

Verify `git status --short` is empty and record the local branch tip. Do not push, merge, publish,
activate, or connect live traffic in this task.
