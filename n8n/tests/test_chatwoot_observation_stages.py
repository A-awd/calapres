import json
import os
import re
import shutil
import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
RUNTIME_PATH = (
    REPO_ROOT / "n8n" / "runtime" / "chatwoot-observation-stages.js"
)
NODE_TEST_PATH = (
    REPO_ROOT / "n8n" / "tests" / "node" / "chatwoot-observation-stages.test.js"
)
ATTACK_FIXTURE_PATH = (
    REPO_ROOT
    / "n8n"
    / "tests"
    / "fixtures"
    / "chatwoot-observation-stage-attacks.json"
)


class ChatwootObservationStageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.node = shutil.which("node")

    def run_node(self, *arguments):
        if self.node is None:
            self.skipTest("Node.js is unavailable; staged production JavaScript was not executed")
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

    def test_exact_staged_production_javascript_suite(self):
        completed = self.run_node("--test", NODE_TEST_PATH)
        self.assertEqual(
            completed.returncode,
            0,
            (completed.stderr or completed.stdout).strip(),
        )
        match = re.search(r"^# pass ([0-9]+)$", completed.stdout, re.MULTILINE)
        self.assertIsNotNone(match, completed.stdout)
        self.assertGreaterEqual(int(match.group(1)), 15)
        self.assertIn("# fail 0", completed.stdout)

    def test_runtime_and_exact_node_test_are_valid_javascript(self):
        for path in (RUNTIME_PATH, NODE_TEST_PATH):
            with self.subTest(path=path.name):
                completed = self.run_node("--check", path)
                self.assertEqual(
                    completed.returncode,
                    0,
                    (completed.stderr or completed.stdout).strip(),
                )

    def test_attack_fixture_is_bounded_json(self):
        fixture = json.loads(ATTACK_FIXTURE_PATH.read_text(encoding="utf-8"))
        self.assertEqual(fixture["schema_version"], "1.0")
        self.assertEqual(fixture["max_raw_body_size_bytes"], 1024 * 1024)
        self.assertLessEqual(len(json.dumps(fixture, ensure_ascii=False)), 16_384)
        self.assertGreaterEqual(len(fixture["preflight"]), 6)
        self.assertGreaterEqual(len(fixture["post_delay"]), 7)

    def test_staged_source_has_no_direct_effect_or_secret_access(self):
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
        self.assertNotIn("access_token", source.lower())
        self.assertNotIn("calapres-public-webhook-secret-v1", source)


if __name__ == "__main__":
    unittest.main()
