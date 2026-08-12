import shutil
import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_DIR = REPO_ROOT / "n8n" / "workflows"


EXTRACT_AND_PARSE = r"""
const fs = require('fs');
const vm = require('vm');

let source = fs.readFileSync(process.argv[1], 'utf8');
const names = [...source.matchAll(
  /^const ([A-Za-z0-9_]+) = (?:node|trigger|ifElse)\(/gm
)].map((match) => match[1]);

source = source.replace(/^import[^\n]+\n/, '');
source = source.slice(0, source.indexOf('export default'));

const stubs = `
const expr = (value) => '=' + value;
const newCredential = (name) => ({ name });
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
const expose = `\nglobalThis.__workflowNodes = {${names.join(',')}};`;
const context = {};
vm.createContext(context);
vm.runInContext(stubs + source + expose, context);

for (const configuredNode of Object.values(context.__workflowNodes)) {
  const code = configuredNode.parameters && configuredNode.parameters.jsCode;
  if (typeof code !== 'string') continue;
  try {
    new Function(code);
  } catch (error) {
    throw new Error(`${process.argv[1]} :: ${configuredNode.name} :: ${error.message}`);
  }
}
"""


class EmbeddedWorkflowCodeTests(unittest.TestCase):
    def test_every_code_node_contains_parseable_javascript(self):
        node_binary = shutil.which("node")
        if node_binary is None:
            self.skipTest("Node.js is unavailable; embedded n8n Code syntax was not checked")

        workflow_paths = sorted(WORKFLOW_DIR.glob("*.ts"))
        self.assertTrue(workflow_paths)
        for path in workflow_paths:
            with self.subTest(workflow=path.name):
                result = subprocess.run(
                    [node_binary, "-e", EXTRACT_AND_PARSE, str(path)],
                    cwd=REPO_ROOT,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertEqual(
                    result.returncode,
                    0,
                    (result.stderr or result.stdout).strip(),
                )


if __name__ == "__main__":
    unittest.main()
