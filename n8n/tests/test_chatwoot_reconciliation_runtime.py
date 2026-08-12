import json
import shutil
import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
RUNTIME = REPO_ROOT / "n8n" / "runtime" / "chatwoot-reconciliation-runtime.js"
NODE_TEST = REPO_ROOT / "n8n" / "tests" / "node" / "chatwoot-reconciliation-runtime.test.js"
SCHEMA_DIR = REPO_ROOT / "n8n" / "schemas"
FIXTURE_DIR = REPO_ROOT / "n8n" / "tests" / "fixtures" / "valid"


class ChatwootReconciliationRuntimeTests(unittest.TestCase):
    def test_node_adversarial_harness(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node.js is required for the reconciliation harness")
        completed = subprocess.run(
            [node, "--test", str(NODE_TEST)],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(
            completed.returncode,
            0,
            f"Chatwoot reconciliation harness failed:\n{completed.stdout}\n{completed.stderr}",
        )

    def test_contract_artifacts_are_new_closed_json_documents(self):
        schemas = sorted(SCHEMA_DIR.glob("chatwoot-reconciliation-*.schema.json"))
        fixtures = sorted(FIXTURE_DIR.glob("chatwoot-reconciliation-*.json"))
        self.assertEqual(len(schemas), 7)
        self.assertEqual(len(fixtures), 8)
        for path in schemas:
            document = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(document["$schema"], "https://json-schema.org/draft/2020-12/schema")
            self.assertEqual(document["type"], "object")
            self.assertIs(document["additionalProperties"], False)
        for path in fixtures:
            json.loads(path.read_text(encoding="utf-8"))

    def test_runtime_is_effect_free_and_has_explicit_safety_markers(self):
        source = RUNTIME.read_text(encoding="utf-8")
        forbidden = (
            "require(",
            "process.env",
            "api_access_token",
            "node:http",
            "node:https",
            "node:fs",
            "INSERT INTO",
            "customer_send",
        )
        for token in forbidden:
            self.assertNotIn(token, source)
        for required in (
            "chatwoot_reconciliation_v1",
            "before_activation_floor",
            "scan_truncated",
            "proof_rows",
            "coverage: converged ? 'best_effort' : 'incomplete'",
            "discovery_watermark_advance_allowed: false",
            "no_loss_claimed: false",
            "cursor_advance_ready: false",
            "customer_egress_allowed: false",
        ):
            self.assertIn(required, source)


if __name__ == "__main__":
    unittest.main()
