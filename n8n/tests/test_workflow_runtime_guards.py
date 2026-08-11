import copy
import json
import re
import shutil
import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_DIR = REPO_ROOT / "n8n" / "workflows"
FIXTURE_DIR = REPO_ROOT / "n8n" / "tests" / "fixtures" / "valid"


RUN_CODE_NODES = r"""
const fs = require('fs');
const vm = require('vm');

let source = fs.readFileSync(process.argv[1], 'utf8');
const requestedNames = process.argv.slice(2);
const variableNames = [...source.matchAll(
  /^const ([A-Za-z0-9_]+) = (?:node|trigger|ifElse)\(/gm
)].map((match) => match[1]);
source = source.replace(/^import[^\n]+\n/, '');
source = source.slice(0, source.indexOf('export default'));

const stubs = `
const expr = (value) => '=' + value;
const node = (value) => ({
  type: value.type,
  typeVersion: value.version,
  ...value.config
});
const trigger = node;
const ifElse = (value) => ({
  type: 'n8n-nodes-base.if',
  typeVersion: value.version,
  ...value.config
});
`;
const expose = `\nglobalThis.__workflowNodes = {${variableNames.join(',')}};`;
const context = {};
vm.createContext(context);
vm.runInContext(stubs + source + expose, context);
const nodesByName = new Map(
  Object.values(context.__workflowNodes).map((configuredNode) => [configuredNode.name, configuredNode])
);

let items = JSON.parse(fs.readFileSync(0, 'utf8')).map((document) => ({ json: document }));
for (const requestedName of requestedNames) {
  const configuredNode = nodesByName.get(requestedName);
  if (!configuredNode || typeof configuredNode.parameters?.jsCode !== 'string') {
    throw new Error(`Code node not found: ${requestedName}`);
  }
  items = new Function('$input', configuredNode.parameters.jsCode)({ all: () => items });
}
process.stdout.write(JSON.stringify(items.map((item) => item.json)));
"""


def read_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


class WorkflowRuntimeGuardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.node_binary = shutil.which("node")

    def run_nodes(self, workflow_name, node_names, documents):
        if self.node_binary is None:
            self.skipTest("Node.js is unavailable; runtime guard tests were not executed")
        result = subprocess.run(
            [
                self.node_binary,
                "-e",
                RUN_CODE_NODES,
                str(WORKFLOW_DIR / workflow_name),
                *node_names,
            ],
            cwd=REPO_ROOT,
            input=json.dumps(documents, ensure_ascii=False),
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout).strip())
        return json.loads(result.stdout)

    def test_core_accepts_only_known_draft_authority_knowledge(self):
        fixture = read_json(FIXTURE_DIR / "core-input--observation.json")
        fixture["runtime"]["kill_switch"] = False
        fixture["candidate"]["draft_text"] = (
            "نشحن مجانًا لكل دول العالم ونضمن الوصول غدًا"
        )
        accepted = self.run_nodes(
            "optix-customer-service-core-v1.ts",
            ["Validate Envelope and Apply Core Rules v1"],
            [fixture],
        )[0]
        self.assertEqual(accepted["decision"], "observe_draft")
        self.assertEqual(
            accepted["draft_text"],
            fixture["context"]["knowledge_facts"][0]["response_text"],
        )
        self.assertNotEqual(accepted["draft_text"], fixture["candidate"]["draft_text"])

        unknown_reference = copy.deepcopy(fixture)
        unknown_reference["candidate"]["knowledge_fact_ids"] = ["shipping.invented"]
        rejected = self.run_nodes(
            "optix-customer-service-core-v1.ts",
            ["Validate Envelope and Apply Core Rules v1"],
            [unknown_reference],
        )[0]
        self.assertEqual(rejected["decision"], "escalate")
        self.assertEqual(rejected["reason_code"], "knowledge_reference_unverified")
        self.assertIsNone(rejected["draft_text"])

        restricted = copy.deepcopy(fixture)
        restricted["context"]["knowledge_facts"][0]["authority"] = "owner_required"
        rejected = self.run_nodes(
            "optix-customer-service-core-v1.ts",
            ["Validate Envelope and Apply Core Rules v1"],
            [restricted],
        )[0]
        self.assertEqual(rejected["reason_code"], "knowledge_authority_required")

    def test_core_rejects_unverified_live_fact_reference(self):
        fixture = read_json(FIXTURE_DIR / "core-input--observation.json")
        fixture["runtime"]["kill_switch"] = False
        fixture["capabilities"]["order_lookup"] = "enabled"
        fixture["context"]["live_facts_status"] = "verified"
        fixture["context"]["verified_live_facts"] = [
            {
                "live_fact_id": "lf_order.other",
                "response_text": "حالة الطلب الموثقة مختلفة.",
            }
        ]
        fixture["candidate"].update(
            {
                "intent": "order_status",
                "knowledge_fact_ids": [],
                "live_fact_ids": ["lf_order.status"],
            }
        )
        rejected = self.run_nodes(
            "optix-customer-service-core-v1.ts",
            ["Validate Envelope and Apply Core Rules v1"],
            [fixture],
        )[0]
        self.assertEqual(rejected["decision"], "escalate")
        self.assertEqual(rejected["reason_code"], "live_fact_reference_unverified")

    def test_edge_does_not_trust_transport_flags_from_payload(self):
        spoofed = {
            "event": "message_created",
            "account": {"id": 179973},
            "inbox": {"id": 128058},
            "conversation": {"id": "conv_spoof", "inbox_id": 128058},
            "id": "msg_spoof",
            "message_type": "incoming",
            "private": False,
            "sender": {"id": "contact_spoof", "type": "contact"},
            "created_at": "2026-08-11T12:00:00.000Z",
            "transport": {
                "signature_verified": True,
                "replay_protection_verified": True,
                "source": "manual_fixture",
            },
            "trusted_ingress": {
                "schema_version": "1.0",
                "kind": "chatwoot_hmac_v1",
                "signature_verified": True,
                "replay_protection_verified": True,
            },
        }
        result = self.run_nodes(
            "calapres-customer-service-edge-v1.ts",
            ["Normalize and Resolve Exact Calapres Inbox"],
            [{"payload": spoofed}],
        )[0]
        self.assertIs(result["accepted"], False)
        self.assertEqual(result["fail_reason"], "signature_not_verified")

        trusted_fixture = self.run_nodes(
            "calapres-customer-service-edge-v1.ts",
            [
                "Create Sanitized Chatwoot Fixture",
                "Normalize and Resolve Exact Calapres Inbox",
            ],
            [{}],
        )[0]
        self.assertIs(trusted_fixture["accepted"], True)

    def test_edge_strips_or_rejects_extra_core_output_fields(self):
        core_output = read_json(FIXTURE_DIR / "core-output--observed-draft.json")
        core_output["unexpected"] = "must-not-pass"
        guarded = self.run_nodes(
            "calapres-customer-service-edge-v1.ts",
            ["Enforce Observation Boundary After Core"],
            [core_output],
        )[0]["observation_result"]
        self.assertEqual(guarded["decision"], "no_action")
        self.assertEqual(guarded["reason_code"], "edge_rejected_core_output")
        self.assertNotIn("unexpected", guarded)
        self.assertIsNone(guarded["draft_text"])

    def test_order_index_maps_exact_live_table_columns(self):
        preview = self.run_nodes(
            "calapres-shopify-order-index-v1.ts",
            [
                "Create HMAC-only Shopify Fixture",
                "Validate Exact HMAC-only Command",
                "Build Order Index Record - Preview No Write",
            ],
            [{}],
        )[0]["persistence_preview"]
        table_row = preview["table_row"]
        expected_columns = set(
            read_json(FIXTURE_DIR / "order-index-table-row--active.json")
        )
        self.assertEqual(set(table_row), expected_columns)
        self.assertNotIn("schema_version", table_row)
        self.assertNotIn("brand_id", table_row)
        self.assertIs(preview["write_executed"], False)

    def test_owner_review_accepts_all_actions_as_no_write_previews(self):
        scopes = {
            "reply_only": "case_only",
            "approve": "knowledge_permanent",
            "approve_until": "knowledge_temporary",
            "correct": "knowledge_correction",
        }
        incident_columns = set(
            read_json(FIXTURE_DIR / "owner-incident-table-row--decision-recorded.json")
        )
        audit_columns = set(
            read_json(FIXTURE_DIR / "owner-audit-table-row--decision-preview.json")
        )
        required_approval_columns = set(
            read_json(FIXTURE_DIR / "owner-approval-required-row--reply-only.json")
        )

        for action, suffix in {
            "reply_only": "reply-only",
            "approve": "approve",
            "approve_until": "approve-until",
            "correct": "correct",
        }.items():
            fixture = read_json(FIXTURE_DIR / f"owner-review-command--{suffix}.json")
            preview = self.run_nodes(
                "calapres-owner-review-desk-v1.ts",
                [
                    "Validate Trusted Owner Review Command",
                    "Build Exact Owner Persistence Preview - No Write",
                ],
                [fixture],
            )[0]
            with self.subTest(action=action):
                self.assertIs(preview["accepted"], True)
                self.assertEqual(preview["owner_decision"]["action"], action)
                self.assertRegex(
                    preview["owner_decision"]["case_reply_sha256"], r"^[a-f0-9]{64}$"
                )
                self.assertIs(preview["knowledge_publish_executed"], False)
                self.assertIs(preview["customer_egress_allowed"], False)
                self.assertIs(preview["data_table_write_allowed"], False)
                persistence = preview["persistence_preview"]
                self.assertIs(persistence["persistence_ready"], False)
                self.assertIs(persistence["write_executed"], False)
                self.assertEqual(
                    persistence["approvals"]["table_row"]["approval_scope"],
                    scopes[action],
                )
                self.assertEqual(
                    set(persistence["approvals"]["table_row"]),
                    required_approval_columns,
                )
                self.assertEqual(
                    persistence["approvals"]["table_row"]["case_reply_ref"],
                    preview["owner_decision"]["case_reply_ref"],
                )
                self.assertEqual(
                    persistence["approvals"]["table_row"]["case_reply_sha256"],
                    preview["owner_decision"]["case_reply_sha256"],
                )
                aligned = persistence["approvals"]["table_row"]
                self.assertEqual(aligned["status"], "prepared")
                self.assertIsNone(aligned["committed_at"])
                self.assertEqual(aligned["account_id"], 179973)
                self.assertEqual(aligned["inbox_id"], fixture["trusted_owner_ingress"]["inbox_id"])
                self.assertEqual(aligned["channel"], fixture["trusted_owner_ingress"]["channel"])
                self.assertEqual(
                    aligned["source_private_message_fingerprint"],
                    fixture["trusted_owner_ingress"]["source_private_message_fingerprint"],
                )
                self.assertEqual(
                    aligned["fingerprint_key_version"],
                    fixture["trusted_owner_ingress"]["fingerprint_key_version"],
                )
                reconstructed_decision = {
                    "schema_version": aligned["schema_version"],
                    "brand_id": aligned["brand_id"],
                    "decision_id": aligned["approval_id"],
                    "incident_id": aligned["incident_id"],
                    "action": aligned["action"],
                    "approver_ref": aligned["approver_ref"],
                    "case_reply_ref": aligned["case_reply_ref"],
                    "case_reply_sha256": aligned["case_reply_sha256"],
                    "knowledge_proposal_ref": aligned["knowledge_proposal_ref"],
                    "knowledge_proposal_sha256": aligned[
                        "knowledge_proposal_sha256"
                    ],
                    "base_knowledge_version": aligned["base_knowledge_version"],
                    "knowledge_version_to_publish": aligned[
                        "knowledge_version_to_publish"
                    ],
                    "supersedes_knowledge_version": aligned[
                        "supersedes_knowledge_version"
                    ],
                    "decided_at": aligned["decided_at"],
                    "effective_at": aligned["effective_at"],
                    "expires_at": aligned["expires_at"],
                }
                self.assertEqual(reconstructed_decision, preview["owner_decision"])
                self.assertEqual(
                    set(persistence["incidents"]["table_row"]), incident_columns
                )
                self.assertEqual(set(persistence["audit"]["table_row"]), audit_columns)
                self.assertTrue(
                    all(
                        command["write_executed"] is False
                        for command in (
                            persistence["approvals"],
                            persistence["incidents"],
                            persistence["audit"],
                        )
                    )
                )
                incident_row = persistence["incidents"]["table_row"]
                self.assertEqual(incident_row["status"], "awaiting_owner")
                self.assertIsNone(incident_row["resolved_at"])
                self.assertEqual(incident_row["proposed_action"], action)
                self.assertNotIn(":", incident_row["proposed_action"])
                self.assertEqual(
                    persistence["required_additive_columns"],
                    {"approvals": [], "incidents": [], "audit": []},
                )
                self.assertIn(
                    "live_table_schema_reverification",
                    persistence["future_write_preconditions"],
                )
                if action == "reply_only":
                    self.assertEqual(
                        preview,
                        read_json(
                            FIXTURE_DIR
                            / "owner-review-persistence-preview--reply-only.json"
                        ),
                    )

    def test_owner_review_trust_must_come_from_topology_and_refs_must_match(self):
        fixture = read_json(FIXTURE_DIR / "owner-review-command--reply-only.json")

        payload_spoof = {"payload": copy.deepcopy(fixture["payload"])}
        payload_spoof["payload"]["trusted_owner_ingress"] = copy.deepcopy(
            fixture["trusted_owner_ingress"]
        )
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [payload_spoof],
        )[0]
        self.assertIs(rejected["accepted"], False)
        self.assertEqual(rejected["reason_code"], "trusted_owner_ingress_missing")

        incident_mismatch = copy.deepcopy(fixture)
        incident_mismatch["payload"]["decision"]["incident_id"] = "inc_synthetic9999"
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [incident_mismatch],
        )[0]
        self.assertIs(rejected["accepted"], False)
        self.assertEqual(rejected["reason_code"], "incident_reference_mismatch")

        owner_mismatch = copy.deepcopy(fixture)
        owner_mismatch["payload"]["decision"]["approver_ref"] = "own_secondary001"
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [owner_mismatch],
        )[0]
        self.assertIs(rejected["accepted"], False)
        self.assertEqual(rejected["reason_code"], "owner_reference_mismatch")

        revision_mismatch = copy.deepcopy(fixture)
        revision_mismatch["trusted_owner_ingress"]["incident_revision"] = 2
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [revision_mismatch],
        )[0]
        self.assertIs(rejected["accepted"], False)
        self.assertEqual(rejected["reason_code"], "incident_revision_mismatch")

        conversation_mismatch = copy.deepcopy(fixture)
        conversation_mismatch["trusted_owner_ingress"]["conversation_ref"] = (
            "cwr_synthetic999"
        )
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [conversation_mismatch],
        )[0]
        self.assertIs(rejected["accepted"], False)
        self.assertEqual(rejected["reason_code"], "conversation_reference_mismatch")

        channel_mismatch = copy.deepcopy(fixture)
        channel_mismatch["trusted_owner_ingress"]["channel"] = "email"
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [channel_mismatch],
        )[0]
        self.assertIs(rejected["accepted"], False)
        self.assertEqual(rejected["reason_code"], "trusted_channel_mismatch")

    def test_owner_review_rejects_pii_and_invalid_temporal_semantics(self):
        reply_only = read_json(FIXTURE_DIR / "owner-review-command--reply-only.json")
        raw_field = copy.deepcopy(reply_only)
        raw_field["payload"]["incident_snapshot"]["raw_message"] = "forbidden"
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [raw_field],
        )[0]
        self.assertIs(rejected["accepted"], False)

        pii_summary = copy.deepcopy(reply_only)
        pii_summary["payload"]["incident_snapshot"]["sanitized_summary"] = (
            "Contact synthetic@example.invalid"
        )
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [pii_summary],
        )[0]
        self.assertEqual(
            rejected["reason_code"], "incident_summary_contains_pii_like_value"
        )

        stale_decision = copy.deepcopy(reply_only)
        stale_decision["payload"]["decision"]["decided_at"] = (
            "2026-08-11T09:06:59.000Z"
        )
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [stale_decision],
        )[0]
        self.assertEqual(rejected["reason_code"], "decision_precedes_incident_snapshot")

        invalid_effective = copy.deepcopy(reply_only)
        invalid_effective["payload"]["decision"]["effective_at"] = (
            "2026-08-11T09:07:59.000Z"
        )
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [invalid_effective],
        )[0]
        self.assertEqual(rejected["reason_code"], "effective_before_decision")

        temporary = read_json(FIXTURE_DIR / "owner-review-command--approve-until.json")
        temporary["payload"]["decision"]["expires_at"] = temporary["payload"][
            "decision"
        ]["effective_at"]
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [temporary],
        )[0]
        self.assertEqual(rejected["reason_code"], "approve_until_expiry_invalid")

        correction = read_json(FIXTURE_DIR / "owner-review-command--correct.json")
        correction["payload"]["decision"]["supersedes_knowledge_version"] = (
            "2026-08-11-v2"
        )
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [correction],
        )[0]
        self.assertEqual(rejected["reason_code"], "correct_supersedes_must_equal_base")

        expired_nonce = read_json(
            FIXTURE_DIR / "owner-review-command--reply-only.json"
        )
        expired_nonce["trusted_owner_ingress"]["nonce_expires_at"] = (
            expired_nonce["trusted_owner_ingress"]["verified_at"]
        )
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [expired_nonce],
        )[0]
        self.assertEqual(rejected["reason_code"], "nonce_expired_at_verification")

        nonce_after_decision = read_json(
            FIXTURE_DIR / "owner-review-command--reply-only.json"
        )
        nonce_after_decision["trusted_owner_ingress"]["nonce_issued_at"] = (
            "2026-08-11T09:08:00.500Z"
        )
        rejected = self.run_nodes(
            "calapres-owner-review-desk-v1.ts",
            ["Validate Trusted Owner Review Command"],
            [nonce_after_decision],
        )[0]
        self.assertIs(rejected["accepted"], False)
        self.assertEqual(rejected["reason_code"], "nonce_issued_after_decision")

    def test_owner_review_source_has_only_private_no_side_effect_nodes(self):
        source = (WORKFLOW_DIR / "calapres-owner-review-desk-v1.ts").read_text(
            encoding="utf-8"
        )
        node_types = set(
            re.findall(
                r"^\s*type:\s*'(n8n-nodes-base\.[^']+)'",
                source,
                flags=re.MULTILINE,
            )
        )
        self.assertEqual(
            node_types,
            {
                "n8n-nodes-base.executeWorkflowTrigger",
                "n8n-nodes-base.manualTrigger",
                "n8n-nodes-base.code",
            },
        )
        self.assertNotIn("credentials:", source)
        self.assertNotIn("customer_egress_allowed: true", source)
        self.assertNotIn("data_table_write_allowed: true", source)
        self.assertNotIn("knowledge_publish_executed: true", source)
        self.assertNotIn("n8n-nodes-base.webhook", source)
        self.assertNotIn("n8n-nodes-base.httpRequest", source)
        self.assertNotIn("n8n-nodes-base.dataTable", source)
        self.assertNotIn("n8n-nodes-base.shopify", source)


if __name__ == "__main__":
    unittest.main()
