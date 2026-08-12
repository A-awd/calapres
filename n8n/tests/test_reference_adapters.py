import shutil
import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_TEST_DIR = REPO_ROOT / "n8n" / "tests" / "node"


class ReferenceAdapterTests(unittest.TestCase):
    def test_node_reference_adapter_harnesses(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "Node.js is required for the local reference adapter harness")
        tests = [
            str(NODE_TEST_DIR / "atomic-storage-adapter.test.js"),
            str(NODE_TEST_DIR / "shopify-identity-adapter.test.js"),
            str(NODE_TEST_DIR / "postgres-atomic-storage.test.js"),
        ]
        self.assertTrue(all(Path(path).is_file() for path in tests))
        completed = subprocess.run(
            [node, "--test", *tests],
            cwd=REPO_ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(
            completed.returncode,
            0,
            f"Node adapter harness failed:\n{completed.stdout}\n{completed.stderr}",
        )


if __name__ == "__main__":
    unittest.main()
