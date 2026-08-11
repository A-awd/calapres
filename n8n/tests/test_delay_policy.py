import copy
import hashlib
import json
import shutil
import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_PATH = REPO_ROOT / "n8n" / "workflows" / "calapres-customer-service-edge-v1.ts"
REGISTRY_PATH = REPO_ROOT / "support" / "brands" / "calapres" / "registry.json"
FIXTURE_DIR = REPO_ROOT / "n8n" / "tests" / "fixtures" / "valid"
WAIT_CARRIER_FIELD_ORDER = (
    "schema_version",
    "brand_id",
    "account_id",
    "inbox_id",
    "channel",
    "conversation_id",
    "anchor_message_id",
    "conversation_fingerprint",
    "message_fingerprint",
    "correlation_id",
    "event_identity_key_version",
    "event_identity_fingerprint",
    "generation",
    "baseline_fingerprint_key_version",
    "baseline_status_fingerprint",
    "baseline_assignee_fingerprint",
    "delay_policy_version",
    "delay_mode",
    "delay_seconds",
    "not_before",
    "knowledge_version",
    "fixture_ref",
    "customer_egress_allowed",
)
SYNTHETIC_BASELINE_STATUS_FINGERPRINT = (
    "69c93750429cb5f26d1a3d8d4483d386794b7b5b7076bb3d1bb8c2debafbae17"
)
SYNTHETIC_BASELINE_ASSIGNEE_FINGERPRINT = (
    "7b6eba87129f7a3768ef79cc3ae44ccd7535cb9d3a0d0471c9b1ad04cb4397e8"
)
SYNTHETIC_EVENT_IDENTITY_FINGERPRINT = (
    "9ee62926cfd806b00e5b45c93bafb9ccbe8d58b09bbb0de574c15b39c5802445"
)


def recompute_wait_state_fingerprint(wait_state):
    canonical = json.dumps(
        {field: wait_state[field] for field in WAIT_CARRIER_FIELD_ORDER},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


RUN_CODE_NODES = r"""
const fs = require('fs');
const vm = require('vm');

let source = fs.readFileSync(process.argv[1], 'utf8');
const requestedNames = process.argv.slice(2);
const variableNames = [...source.matchAll(
  /^const ([A-Za-z0-9_]+) = (?:node|trigger|ifElse)\(/gm
)].map((match) => match[1]);
source = source.replace(/^import[^\n]+\n/, '');
source = source.slice(0, source.indexOf('export default'));

const stubs = `
const expr = (value) => '=' + value;
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
const expose = `\nglobalThis.__workflowNodes = {${variableNames.join(',')}};`;
const context = {};
vm.createContext(context);
vm.runInContext(stubs + source + expose, context);
const nodesByName = new Map(
  Object.values(context.__workflowNodes).map((configuredNode) => [configuredNode.name, configuredNode])
);

let items = JSON.parse(fs.readFileSync(0, 'utf8')).map((document) => ({ json: document }));
for (const requestedName of requestedNames) {
  const configuredNode = nodesByName.get(requestedName);
  if (!configuredNode || typeof configuredNode.parameters?.jsCode !== 'string') {
    throw new Error(`Code node not found: ${requestedName}`);
  }
  items = new Function('$input', configuredNode.parameters.jsCode)({ all: () => items });
}
process.stdout.write(JSON.stringify(items.map((item) => item.json)));
"""


class DelayPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.node_binary = shutil.which("node")

    def run_nodes(self, node_names, documents):
        if self.node_binary is None:
            self.skipTest("Node.js is unavailable; delay policy runtime tests were not executed")
        result = subprocess.run(
            [self.node_binary, "-e", RUN_CODE_NODES, str(WORKFLOW_PATH), *node_names],
            cwd=REPO_ROOT,
            input=json.dumps(documents),
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout).strip())
        return json.loads(result.stdout)

    @staticmethod
    def live_wrapper(inbox_id, conversation_id, message_id):
        return {
            "payload": {
                "event": "message_created",
                "account": {"id": 179973},
                "inbox": {"id": inbox_id},
                "conversation": {"id": conversation_id, "inbox_id": inbox_id},
                "id": message_id,
                "delivery_id": f"delivery-{message_id}",
                "message_type": "incoming",
                "private": False,
                "sender": {"id": f"contact-{message_id}", "type": "contact"},
                "created_at": "2026-08-11T12:00:00.000Z",
                "content": "synthetic test content",
            },
            "trusted_ingress": {
                "schema_version": "1.0",
                "kind": "chatwoot_hmac_v1",
                "signature_verified": True,
                "replay_protection_verified": True,
            },
        }

    def test_live_delay_matches_each_channel_policy_and_kill_switch_stays_on(self):
        cases = {
            128031: ("instagram", 30, 75),
            128033: ("tiktok", 30, 75),
            128058: ("whatsapp", 30, 75),
            128326: ("email", 120, 300),
        }
        for index, (inbox_id, (channel, minimum, maximum)) in enumerate(cases.items(), 1):
            with self.subTest(channel=channel):
                document = self.live_wrapper(
                    inbox_id, str(710000 + index), str(910000 + index)
                )
                normalized = self.run_nodes(
                    ["Normalize and Resolve Exact Calapres Inbox"], [document]
                )[0]
                self.assertIs(normalized["accepted"], True)
                self.assertEqual(normalized["envelope"]["channel"], channel)
                self.assertIs(normalized["runtime"]["kill_switch"], True)
                self.assertEqual(normalized["delay_contract"]["delay_mode"], "live_observation")
                self.assertGreaterEqual(normalized["delay_contract"]["delay_seconds"], minimum)
                self.assertLessEqual(normalized["delay_contract"]["delay_seconds"], maximum)
                self.assertIsNone(normalized["delay_contract"]["fixture_ref"])
                self.assertIsNone(
                    normalized["delay_contract"]["baseline_fingerprint_key_version"]
                )
                self.assertIsNone(
                    normalized["delay_contract"]["baseline_status_fingerprint"]
                )
                self.assertIsNone(
                    normalized["delay_contract"]["baseline_assignee_fingerprint"]
                )

                wait_result = self.run_nodes(
                    ["Build Identifiers-only Post-Response Wait State"], [normalized]
                )[0]
                self.assertIs(wait_result["accepted"], False)
                self.assertIsNone(wait_result["wait_state"])
                self.assertEqual(
                    wait_result["fail_reason"],
                    "wait_event_identity_key_version_invalid",
                )

    def test_delay_is_deterministic_for_the_same_event(self):
        document = self.live_wrapper(128058, "710010", "910010")
        first = self.run_nodes(["Normalize and Resolve Exact Calapres Inbox"], [document])[0]
        second = self.run_nodes(["Normalize and Resolve Exact Calapres Inbox"], [document])[0]
        self.assertEqual(
            first["delay_contract"]["delay_seconds"],
            second["delay_contract"]["delay_seconds"],
        )
        self.assertEqual(first["delay_contract"]["not_before"], second["delay_contract"]["not_before"])

    def test_wait_fixture_fingerprints_are_canonically_recomputable(self):
        for filename in (
            "delayed-observation-state--waiting.json",
            "delayed-observation-state--live-whatsapp.json",
            "delayed-observation-state--live-email.json",
        ):
            wait_state = json.loads((FIXTURE_DIR / filename).read_text())
            with self.subTest(fixture=filename):
                self.assertEqual(
                    wait_state["wait_state_fingerprint"],
                    recompute_wait_state_fingerprint(wait_state),
                )

    def test_official_chatwoot_webhook_timestamp_format_is_accepted(self):
        document = self.live_wrapper(128058, "710011", "910011")
        document["payload"]["created_at"] = "2020-03-03 13:05:57 UTC"
        normalized = self.run_nodes(["Normalize and Resolve Exact Calapres Inbox"], [document])[0]
        self.assertIs(normalized["accepted"], True)
        self.assertEqual(normalized["envelope"]["event_at"], "2020-03-03T13:05:57.000Z")
        self.assertTrue(normalized["delay_contract"]["not_before"].endswith("Z"))

    def test_chatwoot_created_at_accepts_integer_unix_seconds_only(self):
        document = self.live_wrapper(128058, "710012", "910012")
        document["payload"]["created_at"] = 1786450211
        normalized = self.run_nodes(
            ["Normalize and Resolve Exact Calapres Inbox"], [document]
        )[0]
        self.assertIs(normalized["accepted"], True)
        self.assertEqual(normalized["envelope"]["event_at"], "2026-08-11T12:10:11.000Z")

    def test_chatwoot_created_at_rejects_float_numeric_string_and_ambiguous_text(self):
        for malformed in (1786450211.5, "1786450211", "2026-08-11 12:10:11"):
            with self.subTest(created_at=malformed):
                document = self.live_wrapper(
                    128058, "710013", "910013"
                )
                document["payload"]["created_at"] = malformed
                normalized = self.run_nodes(
                    ["Normalize and Resolve Exact Calapres Inbox"], [document]
                )[0]
                self.assertIs(normalized["accepted"], False)
                self.assertEqual(normalized["fail_reason"], "event_time_invalid")

    def test_chatwoot_ids_are_canonical_positive_safe_integers(self):
        safe = self.live_wrapper(
            128058, "9007199254740991", "9007199254740991"
        )
        normalized_safe = self.run_nodes(
            ["Normalize and Resolve Exact Calapres Inbox"], [safe]
        )[0]
        self.assertIs(normalized_safe["accepted"], True)

        for malformed, expected_reason in (
            ("090001", "message_id_missing"),
            ("9007199254740992", "message_id_missing"),
        ):
            document = self.live_wrapper(128058, "710019", malformed)
            normalized = self.run_nodes(
                ["Normalize and Resolve Exact Calapres Inbox"], [document]
            )[0]
            with self.subTest(message_id=malformed):
                self.assertIs(normalized["accepted"], False)
                self.assertEqual(normalized["fail_reason"], expected_reason)

        malformed_container = self.live_wrapper(128058, "710020", "910020")
        malformed_container["payload"]["conversation"] = None
        malformed_container["payload"]["conversation_id"] = "710020"
        normalized = self.run_nodes(
            ["Normalize and Resolve Exact Calapres Inbox"], [malformed_container]
        )[0]
        self.assertIs(normalized["accepted"], False)
        self.assertEqual(normalized["fail_reason"], "conversation_container_invalid")

        alias_with_canonical = self.live_wrapper(128058, "710021", "910021")
        alias_with_canonical["payload"]["message_id"] = "910021"
        normalized = self.run_nodes(
            ["Normalize and Resolve Exact Calapres Inbox"], [alias_with_canonical]
        )[0]
        self.assertIs(normalized["accepted"], False)
        self.assertEqual(normalized["fail_reason"], "message_id_alias_conflict")

        hostile_aliases = []
        missing_account_id = self.live_wrapper(128058, "710022", "910022")
        missing_account_id["payload"]["account"] = {}
        missing_account_id["payload"]["account_id"] = 179973
        hostile_aliases.append((missing_account_id, "account_not_allowlisted"))
        missing_inbox_id = self.live_wrapper(128058, "710023", "910023")
        missing_inbox_id["payload"]["inbox"] = {}
        missing_inbox_id["payload"]["inbox_id"] = 128058
        hostile_aliases.append((missing_inbox_id, "inbox_not_allowlisted"))
        missing_conversation_id = self.live_wrapper(128058, "710024", "910024")
        missing_conversation_id["payload"]["conversation"] = {"inbox_id": 128058}
        missing_conversation_id["payload"]["conversation_id"] = "710024"
        hostile_aliases.append(
            (missing_conversation_id, "conversation_id_alias_conflict")
        )
        null_conversation_route = self.live_wrapper(128058, "710025", "910025")
        null_conversation_route["payload"]["conversation"]["inbox_id"] = None
        hostile_aliases.append((null_conversation_route, "inbox_mismatch"))
        null_conversation_account = self.live_wrapper(128058, "710026", "910026")
        null_conversation_account["payload"]["conversation"]["account_id"] = None
        hostile_aliases.append((null_conversation_account, "account_mismatch"))
        for hostile, reason in hostile_aliases:
            with self.subTest(hostile_alias_reason=reason):
                normalized = self.run_nodes(
                    ["Normalize and Resolve Exact Calapres Inbox"], [hostile]
                )[0]
                self.assertIs(normalized["accepted"], False)
                self.assertEqual(normalized["fail_reason"], reason)

    def test_wait_builder_rejects_out_of_range_live_delay(self):
        document = self.live_wrapper(128058, "710014", "910014")
        normalized = self.run_nodes(["Normalize and Resolve Exact Calapres Inbox"], [document])[0]
        normalized["delay_contract"]["event_identity_key_version"] = (
            "calapres-identity-hmac-v1"
        )
        normalized["delay_contract"]["event_identity_fingerprint"] = "8" * 64
        normalized["delay_contract"]["delay_seconds"] = 1
        rejected = self.run_nodes(
            ["Build Identifiers-only Post-Response Wait State"], [normalized]
        )[0]
        self.assertIs(rejected["accepted"], False)
        self.assertEqual(rejected["fail_reason"], "wait_chat_delay_out_of_range")

    def test_wait_builder_rejects_deadline_that_bypasses_delay(self):
        document = self.live_wrapper(128058, "710015", "910015")
        normalized = self.run_nodes(["Normalize and Resolve Exact Calapres Inbox"], [document])[0]
        normalized["delay_contract"]["event_identity_key_version"] = (
            "calapres-identity-hmac-v1"
        )
        normalized["delay_contract"]["event_identity_fingerprint"] = "8" * 64
        normalized["delay_contract"]["not_before"] = normalized["envelope"]["event_at"]
        rejected = self.run_nodes(
            ["Build Identifiers-only Post-Response Wait State"], [normalized]
        )[0]
        self.assertIs(rejected["accepted"], False)
        self.assertEqual(rejected["fail_reason"], "wait_delay_deadline_mismatch")

    def test_synthetic_fixture_remains_one_second_and_cannot_disable_live_kill_switch(self):
        synthetic = self.run_nodes(
            ["Create Sanitized Chatwoot Fixture", "Normalize and Resolve Exact Calapres Inbox"],
            [{}],
        )[0]
        self.assertEqual(synthetic["delay_contract"]["delay_mode"], "synthetic_test")
        self.assertEqual(synthetic["delay_contract"]["delay_seconds"], 1)
        self.assertIs(synthetic["runtime"]["kill_switch"], False)

        wait_result = self.run_nodes(
            ["Build Identifiers-only Post-Response Wait State"], [synthetic]
        )[0]
        self.assertIs(wait_result["accepted"], True)
        wait_state = wait_result["wait_state"]
        self.assertEqual(
            wait_state["wait_state_fingerprint"],
            recompute_wait_state_fingerprint(wait_state),
        )
        self.assertEqual(
            wait_state["baseline_fingerprint_key_version"],
            "synthetic-v1",
        )
        self.assertEqual(
            wait_state["baseline_status_fingerprint"],
            SYNTHETIC_BASELINE_STATUS_FINGERPRINT,
        )
        self.assertEqual(
            wait_state["baseline_assignee_fingerprint"],
            SYNTHETIC_BASELINE_ASSIGNEE_FINGERPRINT,
        )
        self.assertEqual(
            wait_state["event_identity_fingerprint"],
            SYNTHETIC_EVENT_IDENTITY_FINGERPRINT,
        )
        self.assertTrue(
            {"status", "assignee", "assignee_id", "owner_id"}.isdisjoint(
                wait_state
            )
        )

        synthetic_wrapper = self.run_nodes(
            ["Create Sanitized Chatwoot Fixture"], [{}]
        )[0]
        synthetic_wrapper["payload"]["conversation"]["id"] = "700002"
        normalized_tamper = self.run_nodes(
            ["Normalize and Resolve Exact Calapres Inbox"], [synthetic_wrapper]
        )[0]
        self.assertIs(normalized_tamper["accepted"], True)
        rejected_tamper = self.run_nodes(
            ["Build Identifiers-only Post-Response Wait State"],
            [normalized_tamper],
        )[0]
        self.assertIs(rejected_tamper["accepted"], False)
        self.assertEqual(
            rejected_tamper["fail_reason"], "wait_synthetic_identity_mismatch"
        )

        live = self.live_wrapper(128058, "710016", "910016")
        live["payload"]["runtime"] = {"kill_switch": False}
        normalized = self.run_nodes(["Normalize and Resolve Exact Calapres Inbox"], [live])[0]
        self.assertIs(normalized["runtime"]["kill_switch"], True)

    def test_wait_integrity_and_baseline_refs_fail_closed_on_tamper(self):
        synthetic = self.run_nodes(
            ["Create Sanitized Chatwoot Fixture", "Normalize and Resolve Exact Calapres Inbox"],
            [{}],
        )[0]
        wait_result = self.run_nodes(
            ["Build Identifiers-only Post-Response Wait State"], [synthetic]
        )[0]
        self.assertIs(wait_result["accepted"], True)
        wait_state = wait_result["wait_state"]

        tampered_carrier = copy.deepcopy(wait_state)
        tampered_carrier["generation"] = 2
        result = self.run_nodes(
            ["Chatwoot Live Re-read Slot - Fail Closed No Credential"],
            [tampered_carrier],
        )[0]
        self.assertIs(result["recheck_gate_passed"], False)
        self.assertEqual(result["recheck_reason"], "wait_state_fingerprint_mismatch")
        self.assertIs(result["recheck"]["kill_switch"], True)

        recomputed_anchor_substitution = copy.deepcopy(wait_state)
        recomputed_anchor_substitution["anchor_message_id"] = "900002"
        recomputed_anchor_substitution["wait_state_fingerprint"] = (
            recompute_wait_state_fingerprint(recomputed_anchor_substitution)
        )
        result = self.run_nodes(
            ["Chatwoot Live Re-read Slot - Fail Closed No Credential"],
            [recomputed_anchor_substitution],
        )[0]
        self.assertIs(result["recheck_gate_passed"], False)
        self.assertEqual(
            result["recheck_reason"], "synthetic_fixture_binding_mismatch"
        )
        self.assertIs(result["recheck"]["kill_switch"], True)

        extra_field = copy.deepcopy(wait_state)
        extra_field["unexpected_after_wait"] = "must-fail-closed"
        result = self.run_nodes(
            ["Chatwoot Live Re-read Slot - Fail Closed No Credential"],
            [extra_field],
        )[0]
        self.assertIs(result["recheck_gate_passed"], False)
        self.assertEqual(result["recheck_reason"], "wait_state_fingerprint_mismatch")
        self.assertIs(result["recheck"]["kill_switch"], True)

        tampered_baseline = copy.deepcopy(wait_state)
        tampered_baseline["baseline_status_fingerprint"] = "0" * 64
        tampered_baseline["wait_state_fingerprint"] = recompute_wait_state_fingerprint(
            tampered_baseline
        )
        result = self.run_nodes(
            ["Chatwoot Live Re-read Slot - Fail Closed No Credential"],
            [tampered_baseline],
        )[0]
        self.assertIs(result["recheck_gate_passed"], False)
        self.assertEqual(
            result["recheck_reason"],
            "synthetic_baseline_fingerprint_mismatch",
        )
        self.assertIs(result["recheck"]["kill_switch"], True)

        live = self.live_wrapper(128058, "710017", "910017")
        normalized_live = self.run_nodes(
            ["Normalize and Resolve Exact Calapres Inbox"], [live]
        )[0]
        normalized_live["delay_contract"]["baseline_fingerprint_key_version"] = (
            "synthetic-v1"
        )
        normalized_live["delay_contract"]["event_identity_key_version"] = (
            "calapres-identity-hmac-v1"
        )
        normalized_live["delay_contract"]["event_identity_fingerprint"] = "8" * 64
        normalized_live["delay_contract"]["baseline_status_fingerprint"] = "4" * 64
        normalized_live["delay_contract"]["baseline_assignee_fingerprint"] = "5" * 64
        rejected_live = self.run_nodes(
            ["Build Identifiers-only Post-Response Wait State"],
            [normalized_live],
        )[0]
        self.assertIs(rejected_live["accepted"], False)
        self.assertEqual(
            rejected_live["fail_reason"],
            "wait_live_baseline_capture_unavailable",
        )

    def test_wait_node_uses_delay_seconds_expression(self):
        source = WORKFLOW_PATH.read_text(encoding="utf-8")
        self.assertIn("name: 'Wait With Channel Policy - Identifiers Only'", source)
        self.assertIn("amount: expr('{{ $json.delay_seconds }}')", source)

    def test_compiled_delay_and_live_kill_switch_match_registry(self):
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
        self.assertIs(registry["runtime"]["kill_switch"], True)
        self.assertEqual(
            registry["delay_policy"]["chat_seconds"],
            {"minimum": 30, "maximum": 75},
        )
        self.assertEqual(
            registry["delay_policy"]["email_seconds"],
            {"minimum": 120, "maximum": 300},
        )
        self.assertEqual(registry["knowledge"]["current_version"], "2026-08-11-v3")

        live = self.live_wrapper(128326, "710018", "910018")
        normalized = self.run_nodes(["Normalize and Resolve Exact Calapres Inbox"], [live])[0]
        self.assertIs(normalized["runtime"]["kill_switch"], True)
        self.assertEqual(normalized["context"]["knowledge_version"], "2026-08-11-v3")
        self.assertGreaterEqual(normalized["delay_contract"]["delay_seconds"], 120)
        self.assertLessEqual(normalized["delay_contract"]["delay_seconds"], 300)


if __name__ == "__main__":
    unittest.main()
