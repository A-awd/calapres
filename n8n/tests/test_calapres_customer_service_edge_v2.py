import hashlib
import json
import os
import re
import shutil
import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_PATH = (
    REPO_ROOT / "n8n" / "workflows" / "calapres-customer-service-edge-v2.ts"
)
NODE_TEST_PATH = (
    REPO_ROOT
    / "n8n"
    / "tests"
    / "node"
    / "calapres-customer-service-edge-v2.test.js"
)
MANIFEST_PATH = (
    REPO_ROOT
    / "n8n"
    / "deployments"
    / "calapres-customer-service-edge-v2.update-manifest.json"
)
MANIFEST_SCHEMA_PATH = (
    REPO_ROOT / "n8n" / "schemas" / "n8n-workflow-deployment-manifest.schema.json"
)


class CalapresCustomerServiceEdgeV2Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.node = shutil.which("node")

    def run_node(self, *arguments):
        if self.node is None:
            self.skipTest("Node.js is unavailable; Edge v2 source tests were not executed")
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

    def test_exact_edge_v2_source_suite(self):
        completed = self.run_node("--test", NODE_TEST_PATH)
        self.assertEqual(
            completed.returncode,
            0,
            (completed.stderr or completed.stdout).strip(),
        )
        match = re.search(r"^# pass ([0-9]+)$", completed.stdout, re.MULTILINE)
        self.assertIsNotNone(match, completed.stdout)
        self.assertGreaterEqual(int(match.group(1)), 8)
        self.assertIn("# fail 0", completed.stdout)

    def test_edge_v2_test_file_is_valid_javascript(self):
        completed = self.run_node("--check", NODE_TEST_PATH)
        self.assertEqual(
            completed.returncode,
            0,
            (completed.stderr or completed.stdout).strip(),
        )

    def test_edge_v2_source_is_immutable_and_source_only(self):
        source = WORKFLOW_PATH.read_text(encoding="utf-8")
        self.assertIn("workflow('calapres-customer-service-edge-v2'", source)
        self.assertIn("LLM Trust Gate Closed - No Call", source)
        self.assertNotIn("updateWorkflow", source)
        self.assertNotIn("activateWorkflow", source)
        self.assertNotIn("publishWorkflow", source)

    def test_update_existing_manifest_matches_its_strict_schema(self):
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        schema = json.loads(MANIFEST_SCHEMA_PATH.read_text(encoding="utf-8"))
        self.assertEqual(set(manifest), set(schema["required"]))
        self.assertFalse(schema["additionalProperties"])
        for key, property_schema in schema["properties"].items():
            if "const" in property_schema:
                self.assertEqual(manifest[key], property_schema["const"], key)
        recovery_schema = schema["properties"]["recovery_schedule"]
        self.assertEqual(
            set(manifest["recovery_schedule"]),
            set(recovery_schema["required"]),
        )
        for key, property_schema in recovery_schema["properties"].items():
            self.assertEqual(
                manifest["recovery_schedule"][key],
                property_schema["const"],
                key,
            )
        source_hash = hashlib.sha256(WORKFLOW_PATH.read_bytes()).hexdigest()
        self.assertEqual(manifest["source_sha256"], source_hash)


if __name__ == "__main__":
    unittest.main()
