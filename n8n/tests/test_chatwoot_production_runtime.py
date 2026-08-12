import json
import os
import re
import shutil
import subprocess
import unittest
from pathlib import Path

try:
    from test_contracts import schema_name, validate
except ModuleNotFoundError:  # pragma: no cover - supports direct module execution
    from n8n.tests.test_contracts import schema_name, validate


REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = REPO_ROOT / "n8n" / "schemas"
RUNTIME_PATH = REPO_ROOT / "n8n" / "runtime" / "chatwoot-observation-runtime.js"
NODE_TEST_PATH = (
    REPO_ROOT / "n8n" / "tests" / "node" / "chatwoot-observation-runtime.test.js"
)
SAMPLE_PATH = (
    REPO_ROOT / "n8n" / "tests" / "node" / "chatwoot-observation-runtime-samples.js"
)


def node_binary():
    return shutil.which("node")


class ChatwootProductionRuntimeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.node = node_binary()
        cls.schemas = {
            schema_name(path): json.loads(path.read_text(encoding="utf-8"))
            for path in sorted(SCHEMA_DIR.glob("*.schema.json"))
        }

    def run_node(self, *arguments):
        if self.node is None:
            self.skipTest("Node.js is unavailable; production JavaScript was not executed")
        environment = dict(os.environ)
        environment["NODE_NO_WARNINGS"] = "1"
        return subprocess.run(
            [self.node, *map(str, arguments)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
            env=environment,
        )

    def test_exact_production_javascript_runtime_suite(self):
        result = self.run_node("--test", NODE_TEST_PATH)
        self.assertEqual(
            result.returncode,
            0,
            (result.stderr or result.stdout).strip(),
        )
        match = re.search(r"^# pass ([0-9]+)$", result.stdout, re.MULTILINE)
        self.assertIsNotNone(match, result.stdout)
        self.assertGreaterEqual(int(match.group(1)), 18)
        self.assertIn("# fail 0", result.stdout)

    def test_runtime_outputs_match_existing_strict_contracts(self):
        result = self.run_node(SAMPLE_PATH)
        self.assertEqual(result.returncode, 0, result.stderr.strip())
        samples = json.loads(result.stdout)
        schema_map = {
            "ingress": "chatwoot-ingress-verification",
            "event_identity": "chatwoot-event-identity-evidence",
            "wait_state": "delayed-observation-state",
            "live_reread": "chatwoot-live-reread-evidence",
            "post_delay_decision": "chatwoot-post-delay-decision",
        }
        for sample_name, contract_name in schema_map.items():
            with self.subTest(sample=sample_name):
                errors = validate(
                    samples[sample_name],
                    self.schemas[contract_name],
                    self.schemas,
                )
                self.assertEqual(errors, [], "\n".join(errors))

        failure_schema_map = {
            "ingress_failures": "chatwoot-ingress-verification",
            "live_reread_failures": "chatwoot-live-reread-evidence",
            "post_delay_decision_failures": "chatwoot-post-delay-decision",
        }
        for sample_name, contract_name in failure_schema_map.items():
            self.assertTrue(samples[sample_name])
            for index, sample in enumerate(samples[sample_name]):
                with self.subTest(sample=sample_name, index=index):
                    errors = validate(
                        sample,
                        self.schemas[contract_name],
                        self.schemas,
                    )
                    self.assertEqual(errors, [], "\n".join(errors))

        serialized = json.dumps(samples, ensure_ascii=False)
        self.assertNotIn("نص عميل حساس", serialized)
        self.assertNotIn("سر اختباري", serialized)
        self.assertNotIn("calapres-public-webhook-secret-v1", serialized)
        self.assertFalse(samples["post_delay_decision"]["customer_egress_allowed"])

    def test_runtime_source_has_no_direct_effect_or_secret_access(self):
        source = RUNTIME_PATH.read_text(encoding="utf-8")
        forbidden_invocations = (
            "require(",
            "fetch(",
            "$http.",
            "$httpRequest(",
            "process.env",
            "getCredentials(",
            "$getWorkflowStaticData(",
            "DataTable(",
        )
        for invocation in forbidden_invocations:
            with self.subTest(invocation=invocation):
                self.assertNotIn(invocation, source)
        self.assertNotIn("api.chatwoot.com", source)
        self.assertNotIn("calapres-public-webhook-secret-v1", source)
        self.assertNotIn("access_token", source.lower())


if __name__ == "__main__":
    unittest.main()
