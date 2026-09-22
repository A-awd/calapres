import json
import pathlib
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / "n8n/workflows/calapres-operations-health-mcp.template.json"
MANIFEST = ROOT / "n8n/deployments/calapres-operations-health-mcp.manifest.json"
SCHEMA = ROOT / "n8n/schemas/calapres-operations-health-snapshot.schema.json"


class CalapresOperationsHealthMcpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = json.loads(WORKFLOW.read_text())
        cls.manifest = json.loads(MANIFEST.read_text())
        cls.schema = json.loads(SCHEMA.read_text())

    def test_gateway_is_inactive_and_exposes_one_tool(self):
        self.assertFalse(self.workflow["active"])
        self.assertEqual(self.manifest["release_state"], "source_only_inactive")
        tool_nodes = [n for n in self.workflow["nodes"] if n["type"].endswith("httpRequestTool")]
        self.assertEqual([n["name"] for n in tool_nodes], ["Get_Calapres_Operations_Health"])
        self.assertEqual(self.manifest["required_tools"], ["Get_Calapres_Operations_Health"])

    def test_tool_is_fixed_read_only_get(self):
        node = next(n for n in self.workflow["nodes"] if n["name"] == "Get_Calapres_Operations_Health")
        params = node["parameters"]
        self.assertEqual(params["method"], "GET")
        self.assertEqual(params["url"], "__N8N_BASE_URL__/webhook/calapres/operations-health")
        self.assertNotIn("body", params)
        self.assertFalse(params["sendBody"])
        self.assertEqual(params["authentication"], "genericCredentialType")

    def test_execution_payload_storage_is_disabled(self):
        settings = self.workflow["settings"]
        self.assertEqual(settings["saveDataErrorExecution"], "none")
        self.assertEqual(settings["saveDataSuccessExecution"], "none")
        self.assertFalse(settings["saveExecutionProgress"])
        self.assertFalse(settings["saveManualExecutions"])

    def test_schema_is_closed_and_contains_no_customer_content_fields(self):
        self.assertFalse(self.schema["additionalProperties"])
        raw = json.dumps(self.schema).lower()
        for forbidden in ("message_text", "transcript", "customer_name", "phone", "email",
                          "token", "credential_id", "webhook_url", "order_data"):
            self.assertNotIn(forbidden, raw)
        chatwoot = self.schema["properties"]["chatwoot_monitoring"]
        self.assertFalse(chatwoot["additionalProperties"])
        self.assertIn("monitoring_unavailable", chatwoot["properties"]["status"]["enum"])


if __name__ == "__main__":
    unittest.main()
