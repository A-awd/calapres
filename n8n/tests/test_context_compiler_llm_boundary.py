import json
import shutil
import subprocess
import unittest
from pathlib import Path

from test_contracts import read_json, schema_name, validate


REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_TEST = REPO_ROOT / "n8n" / "tests" / "context-compiler-llm-boundary.test.js"


class ContextCompilerLlmBoundaryNodeTests(unittest.TestCase):
    @staticmethod
    def node_binary():
        return shutil.which("node") or "/Users/awd./.local/bin/node"

    def test_node_contract_and_adversarial_suite(self):
        result = subprocess.run(
            [self.node_binary(), "--test", str(NODE_TEST)],
            cwd=REPO_ROOT,
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(
            result.returncode,
            0,
            f"stdout:\n{result.stdout}\n\nstderr:\n{result.stderr}",
        )
        self.assertIn("# pass 51", result.stdout)
        self.assertIn("# fail 0", result.stdout)

    def test_runtime_shapes_validate_against_repository_schemas(self):
        script = r"""
const fs=require('node:fs');
const compiler=require('./n8n/modules/context-compiler');
const boundary=require('./n8n/modules/provider-neutral-llm-boundary');
const read=(file)=>JSON.parse(fs.readFileSync(file,'utf8'));
const knowledgeManifest=read('support/brands/calapres/knowledge/manifest.json');
const responseStyleManifest=read('support/brands/calapres/response-style/manifest.json');
const sources={
  registry:read('support/brands/calapres/registry.json'),
  knowledge_manifest:knowledgeManifest,
  knowledge_release:read('support/brands/calapres/knowledge/2026-08-11-v3.json'),
  response_style_manifest:responseStyleManifest,
  response_style_release:read('support/brands/calapres/response-style/2026-08-11-v1.json'),
  knowledge_history_releases:Object.fromEntries(knowledgeManifest.versions.map(row=>[row.version,read(row.path)])),
  response_style_history_releases:Object.fromEntries(responseStyleManifest.versions.map(row=>[row.version,read(row.path)]))
};
const asOf='2026-08-11T18:00:00+03:00';
const anchor=read('support/brands/calapres/context-trust/2026-08-11-v1.json');
const pin=read('support/brands/calapres/context-trust/compiled-context-release-v1.json');
const aliases=anchor.brand_isolation.forbidden_brand_names;
const compiled=compiler.compileBrandContext(sources,anchor,asOf);
const sanitization=boundary.sanitizeCustomerText({
  brand_id:'calapres', channel:'whatsapp', content_kind:'text',
  current_message:'كم الشحن؟', forbidden_brand_names:aliases
});
const request=boundary.buildProviderNeutralRequest({
  request_ref:`lr_${'a'.repeat(64)}`, evaluated_at:asOf,
  compiled_context:compiled,
  sanitization, verified_live_fact_options:[], forbidden_brand_names:aliases
});
const candidate={
  intent:'shipping_policy', risk:'low', requested_action:'answer',
  draft_text:'رسوم الشحن تعتمد على قيمة الطلب.', confidence:0.99,
  knowledge_fact_ids:['shipping.threshold'], live_fact_ids:[],
  needs_live_lookup:false, escalation_reason_code:null
};
const response={
  schema_version:'1.0', request_ref:request.request_ref,
  request_digest:request.request_digest,
  compiled_context_digest:request.compiled_context_digest, candidate
};
const parse=boundary.parseProviderNeutralResponse(JSON.stringify(response),{
  request, compiled_context:compiled,
  forbidden_brand_names:aliases, response_received_at:'2026-08-11T15:00:30.000Z'
},{clock:()=>new Date('2026-08-11T15:00:31.000Z')});
process.stdout.write(JSON.stringify({anchor,pin,compiled,sanitization,request,response,parse}));
"""
        result = subprocess.run(
            [self.node_binary(), "-e", script],
            cwd=REPO_ROOT,
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        documents = json.loads(result.stdout)
        schema_dir = REPO_ROOT / "n8n" / "schemas"
        schemas = {
            schema_name(path): read_json(path)
            for path in sorted(schema_dir.glob("*.schema.json"))
        }
        names = {
            "anchor": "context-trust-anchor",
            "pin": "compiled-context-release-pin",
            "compiled": "compiled-brand-context",
            "sanitization": "llm-sanitization-result",
            "request": "provider-neutral-llm-request",
            "response": "provider-neutral-llm-response-envelope",
            "parse": "provider-neutral-llm-parse-result",
        }
        for document_name, contract_name in names.items():
            with self.subTest(document=document_name):
                self.assertEqual(
                    validate(documents[document_name], schemas[contract_name], schemas),
                    [],
                )

    def test_release_lock_covers_every_manifested_history_version_and_context_pin(self):
        result = subprocess.run(
            [
                shutil.which("python3") or "/usr/bin/python3",
                str(REPO_ROOT / "n8n" / "scripts" / "release_lock.py"),
                "--emit",
            ],
            cwd=REPO_ROOT,
            check=False,
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        locked_paths = {row["path"] for row in json.loads(result.stdout)["files"]}
        for expected in {
            "support/brands/calapres/knowledge/2026-08-11-v1.json",
            "support/brands/calapres/knowledge/2026-08-11-v2.json",
            "support/brands/calapres/knowledge/2026-08-11-v3.json",
            "support/brands/calapres/response-style/2026-08-11-v1.json",
            "support/brands/calapres/model-policy/2026-08-11-v1.json",
            "support/brands/calapres/context-trust/compiled-context-release-v1.json",
            "n8n/modules/compiled-context-trust-root.js",
            "n8n/deployments/calapres-customer-service-edge-v2.update-manifest.json",
        }:
            self.assertIn(expected, locked_paths)


if __name__ == "__main__":
    unittest.main()
