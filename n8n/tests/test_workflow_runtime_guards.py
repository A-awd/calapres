import copy
import json
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


if __name__ == "__main__":
    unittest.main()
