import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
STYLE_DIR = REPO_ROOT / "support" / "brands" / "calapres" / "response-style"


class CalapresResponseStyleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with (STYLE_DIR / "manifest.json").open("r", encoding="utf-8") as handle:
            cls.manifest = json.load(handle)
        current = cls.manifest["current_version"]
        record = next(
            row for row in cls.manifest["versions"] if row["version"] == current
        )
        with (REPO_ROOT / record["path"]).open("r", encoding="utf-8") as handle:
            cls.style = json.load(handle)

    def test_current_release_is_approved_and_calapres_scoped(self):
        self.assertEqual(self.style["brand_id"], "calapres")
        self.assertEqual(self.style["status"], "approved")
        self.assertEqual(self.style["version"], self.manifest["current_version"])
        self.assertEqual(self.style["identity"]["arabic_brand_spelling"], "كالابريز")
        self.assertNotIn("كالابريس", json.dumps(self.style, ensure_ascii=False))

    def test_all_four_channels_have_bounded_style(self):
        channels = self.style["channel_style"]
        self.assertEqual(set(channels), {"whatsapp", "instagram", "tiktok", "email"})
        for channel, policy in channels.items():
            with self.subTest(channel=channel):
                self.assertGreaterEqual(policy["max_sentences"], 1)
                self.assertLessEqual(policy["max_sentences"], 6)
                self.assertGreaterEqual(policy["emoji_max"], 0)
                self.assertLessEqual(policy["emoji_max"], 1)

    def test_order_lookup_is_proactive_but_identity_safe(self):
        policy = self.style["order_lookup_behavior"]
        self.assertIs(policy["proactive_before_question"], True)
        self.assertIs(policy["order_number_alone_proves_ownership"], False)
        self.assertIs(policy["names_or_social_handles_can_link_identity"], False)
        self.assertIn("Shopify", policy["whatsapp"])
        self.assertIn("Shopify", policy["email"])

    def test_examples_never_claim_customer_action_completed(self):
        forbidden = ("تم التعديل", "تم الإلغاء", "تم الاسترجاع", "تم التعويض")
        for example in self.style["examples"]:
            with self.subTest(scenario=example["scenario"]):
                self.assertTrue(example["draft"].strip())
                self.assertFalse(any(term in example["draft"] for term in forbidden))


if __name__ == "__main__":
    unittest.main()
