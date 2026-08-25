import shutil
import subprocess
import unittest
from pathlib import Path

from n8n.tests.node_test_summary import parse_node_test_summary


REPO_ROOT = Path(__file__).resolve().parents[2]
RUNTIME = (
    REPO_ROOT
    / "n8n"
    / "runtime"
    / "chatwoot-reconciliation-ingress-bridge.js"
)
NODE_TEST = (
    REPO_ROOT
    / "n8n"
    / "tests"
    / "node"
    / "chatwoot-reconciliation-ingress-bridge.test.js"
)


class ChatwootReconciliationIngressBridgeTests(unittest.TestCase):
    def test_node_adversarial_harness(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node.js is required for the bridge harness")
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
            f"Reconciliation ingress bridge failed:\n{completed.stdout}\n{completed.stderr}",
        )
        passed, failed = parse_node_test_summary(completed.stdout)
        self.assertGreaterEqual(passed, 16)
        self.assertEqual(failed, 0)

    def test_source_is_pure_and_explicitly_not_a_signed_webhook_gate(self):
        source = RUNTIME.read_text(encoding="utf-8")
        for forbidden in (
            "require(",
            "process.env",
            "node:http",
            "node:https",
            "node:fs",
            "INSERT INTO",
            "customer_send",
        ):
            self.assertNotIn(forbidden, source)
        for required in (
            "chatwoot_reconciliation_api_v1",
            "calapres-chatwoot-reconciliation-request-attempt-v1:",
            "source_binding_sha256",
            "signed_webhook_evidence: null",
            "raw_body_evidence: null",
            "atomic_write_allowed: false",
            "ready_for_atomic_call: false",
            "bev_claim_",
        ):
            self.assertIn(required, source)


if __name__ == "__main__":
    unittest.main()
