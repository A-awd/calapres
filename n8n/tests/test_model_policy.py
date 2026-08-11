import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
POLICY_DIR = REPO_ROOT / "support" / "brands" / "calapres" / "model-policy"


class CalapresModelPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (POLICY_DIR / "manifest.json").open("r", encoding="utf-8") as handle:
            cls.manifest = json.load(handle)
        current = cls.manifest["current_version"]
        row = next(row for row in cls.manifest["versions"] if row["version"] == current)
        with (REPO_ROOT / row["path"]).open("r", encoding="utf-8") as handle:
            cls.policy = json.load(handle)

    def test_policy_is_proposed_not_live(self):
        self.assertEqual(self.policy["brand_id"], "calapres")
        self.assertEqual(self.policy["status"], "proposed")
        self.assertEqual(self.policy["purpose"], "structured_classification_and_internal_draft_only")
        self.assertIs(self.policy["configuration"]["customer_egress_allowed"], False)

    def test_model_has_no_tools_memory_or_silent_fallback(self):
        config = self.policy["configuration"]
        self.assertIs(config["tools_enabled"], False)
        self.assertIs(config["provider_memory_enabled"], False)
        self.assertIs(config["automatic_provider_fallback"], False)
        self.assertEqual(config["model_draft_authority"], "untrusted_not_forwarded")
        self.assertEqual(
            config["grounded_output_renderer"],
            "approved_knowledge_or_verified_live_fact_response_text_only",
        )
        self.assertIs(self.policy["failure_policy"]["fallback_to_another_model"], False)

    def test_direct_identifiers_are_never_sent(self):
        minimization = self.policy["data_minimization"]
        for key in (
            "send_raw_phone",
            "send_raw_email",
            "send_address",
            "send_order_number",
            "send_payment_data",
            "send_attachment_binary",
        ):
            with self.subTest(field=key):
                self.assertIs(minimization[key], False)


if __name__ == "__main__":
    unittest.main()
