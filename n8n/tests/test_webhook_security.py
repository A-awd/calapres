import hashlib
import hmac
import json
import re
import unittest
from pathlib import Path


FIXTURE = (
    Path(__file__).resolve().parent
    / "fixtures"
    / "chatwoot-webhook-signature-vectors.json"
)
SIGNATURE_PATTERN = re.compile(r"^sha256=[a-f0-9]{64}$")


def signature(secret, timestamp, raw_body):
    signed = timestamp.encode("ascii") + b"." + raw_body.encode("utf-8")
    digest = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def timestamp_is_fresh(now, timestamp, max_age=300, max_future_skew=60):
    age = now - int(timestamp)
    return -max_future_skew <= age <= max_age


class ChatwootWebhookSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with FIXTURE.open("r", encoding="utf-8") as handle:
            cls.fixture = json.load(handle)

    def test_official_raw_byte_formula_matches_public_vectors(self):
        secret = self.fixture["public_test_secret"]
        for vector in self.fixture["vectors"]:
            with self.subTest(vector=vector["name"]):
                actual = signature(secret, vector["timestamp"], vector["raw_body"])
                self.assertTrue(SIGNATURE_PATTERN.fullmatch(actual))
                self.assertTrue(hmac.compare_digest(actual, vector["signature"]))

    def test_json_reformatting_breaks_the_signature(self):
        secret = self.fixture["public_test_secret"]
        vector = self.fixture["vectors"][1]
        parsed = json.loads(vector["raw_body"])
        reformatted = json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
        self.assertNotEqual(reformatted, vector["raw_body"])
        self.assertFalse(
            hmac.compare_digest(
                signature(secret, vector["timestamp"], reformatted),
                vector["signature"],
            )
        )

    def test_timestamp_replay_window_is_fail_closed(self):
        now = 1786450300
        self.assertTrue(timestamp_is_fresh(now, "1786450000"))
        self.assertFalse(timestamp_is_fresh(now, "1786449999"))
        self.assertTrue(timestamp_is_fresh(now, "1786450360"))
        self.assertFalse(timestamp_is_fresh(now, "1786450361"))

    def test_malformed_signature_headers_are_rejected(self):
        invalid = [
            "",
            "sha256=abc",
            "SHA256=" + "0" * 64,
            "sha256=" + "G" * 64,
            "md5=" + "0" * 64,
            "sha256=" + "0" * 65,
        ]
        for value in invalid:
            with self.subTest(value=value):
                self.assertIsNone(SIGNATURE_PATTERN.fullmatch(value))


if __name__ == "__main__":
    unittest.main()
