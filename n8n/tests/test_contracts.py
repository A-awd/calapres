import copy
import datetime
import json
import re
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = REPO_ROOT / "n8n" / "schemas"
FIXTURE_DIR = REPO_ROOT / "n8n" / "tests" / "fixtures"
BRAND_DIR = REPO_ROOT / "support" / "brands" / "calapres"


def read_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def schema_name(path):
    suffix = ".schema.json"
    return path.name[: -len(suffix)] if path.name.endswith(suffix) else path.stem


def fixture_schema_name(path):
    return path.name.split("--", 1)[0]


def apply_pointer(document, operation, pointer, value=None):
    parts = [part.replace("~1", "/").replace("~0", "~") for part in pointer.split("/")[1:]]
    target = document
    for part in parts[:-1]:
        target = target[part]
    final = parts[-1]
    if operation == "remove":
        del target[final]
    elif operation in {"add", "replace"}:
        target[final] = value
    else:
        raise ValueError(f"unsupported fixture mutation: {operation}")


def type_matches(value, expected):
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "null":
        return value is None
    raise ValueError(f"unsupported JSON Schema type in local validator: {expected}")


def is_datetime(value):
    if not isinstance(value, str):
        return False
    try:
        datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        return "T" in value
    except ValueError:
        return False


def resolve_pointer(document, pointer):
    value = document
    for part in pointer.split("/")[1:]:
        value = value[part.replace("~1", "/").replace("~0", "~")]
    return value


def validate(instance, schema, schemas, root_schema=None, path="$", errors=None):
    """Validate the strict JSON Schema subset used by this repository.

    This intentionally has no third-party dependency. Supported keywords are the ones present in
    n8n/schemas: $ref, type, const, enum, required, properties, additionalProperties, oneOf,
    allOf, if/then, string length/pattern/format, and numeric bounds.
    """

    if errors is None:
        errors = []
    if root_schema is None:
        root_schema = schema

    if "$ref" in schema:
        reference = schema["$ref"]
        if reference.startswith("#/"):
            target = resolve_pointer(root_schema, reference[1:])
            target_root = root_schema
        else:
            target_name = reference.rsplit("/", 1)[-1].replace(".schema.json", "")
            target = schemas[target_name]
            target_root = target
        return validate(instance, target, schemas, target_root, path, errors)

    if "type" in schema:
        expected = schema["type"]
        accepted = expected if isinstance(expected, list) else [expected]
        if not any(type_matches(instance, item) for item in accepted):
            errors.append(f"{path}: expected type {accepted}, got {type(instance).__name__}")
            return errors

    if "const" in schema and instance != schema["const"]:
        errors.append(f"{path}: value does not match const")

    if "enum" in schema and instance not in schema["enum"]:
        errors.append(f"{path}: value is outside enum")

    if isinstance(instance, dict):
        required = schema.get("required", [])
        for key in required:
            if key not in instance:
                errors.append(f"{path}: missing required property {key}")

        properties = schema.get("properties", {})
        for key, value in instance.items():
            if key in properties:
                validate(value, properties[key], schemas, root_schema, f"{path}/{key}", errors)
            elif schema.get("additionalProperties") is False:
                errors.append(f"{path}: additional property {key} is forbidden")

    if isinstance(instance, str):
        if "minLength" in schema and len(instance) < schema["minLength"]:
            errors.append(f"{path}: string is shorter than minLength")
        if "maxLength" in schema and len(instance) > schema["maxLength"]:
            errors.append(f"{path}: string is longer than maxLength")
        if "pattern" in schema and re.search(schema["pattern"], instance) is None:
            errors.append(f"{path}: string does not match pattern")
        if schema.get("format") == "date-time" and not is_datetime(instance):
            errors.append(f"{path}: invalid date-time")

    if isinstance(instance, (int, float)) and not isinstance(instance, bool):
        if "minimum" in schema and instance < schema["minimum"]:
            errors.append(f"{path}: value is below minimum")
        if "maximum" in schema and instance > schema["maximum"]:
            errors.append(f"{path}: value is above maximum")

    if isinstance(instance, list):
        if "minItems" in schema and len(instance) < schema["minItems"]:
            errors.append(f"{path}: array is shorter than minItems")
        if "maxItems" in schema and len(instance) > schema["maxItems"]:
            errors.append(f"{path}: array is longer than maxItems")
        if schema.get("uniqueItems") is True:
            encoded = [json.dumps(item, sort_keys=True) for item in instance]
            if len(encoded) != len(set(encoded)):
                errors.append(f"{path}: array items are not unique")
        if "items" in schema:
            for index, value in enumerate(instance):
                validate(
                    value,
                    schema["items"],
                    schemas,
                    root_schema,
                    f"{path}/{index}",
                    errors,
                )

    if "oneOf" in schema:
        matches = 0
        for branch in schema["oneOf"]:
            branch_errors = []
            validate(instance, branch, schemas, root_schema, path, branch_errors)
            if not branch_errors:
                matches += 1
        if matches != 1:
            errors.append(f"{path}: expected exactly one oneOf branch, got {matches}")

    for branch in schema.get("allOf", []):
        validate(instance, branch, schemas, root_schema, path, errors)

    if "if" in schema:
        condition_errors = []
        validate(instance, schema["if"], schemas, root_schema, path, condition_errors)
        if not condition_errors and "then" in schema:
            validate(instance, schema["then"], schemas, root_schema, path, errors)

    return errors


def collect_refs(value):
    if isinstance(value, dict):
        for key, nested in value.items():
            if key == "$ref":
                yield nested
            else:
                yield from collect_refs(nested)
    elif isinstance(value, list):
        for nested in value:
            yield from collect_refs(nested)


class ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schemas = {
            schema_name(path): read_json(path)
            for path in sorted(SCHEMA_DIR.glob("*.schema.json"))
        }

    def validation_errors(self, name, document):
        return validate(document, self.schemas[name], self.schemas)

    def assert_valid(self, name, document):
        errors = self.validation_errors(name, document)
        self.assertEqual(errors, [], "\n".join(errors))

    def test_schema_documents_and_references_are_well_formed(self):
        self.assertTrue(self.schemas)
        for name, schema in self.schemas.items():
            with self.subTest(schema=name):
                self.assertEqual(schema["$schema"], "https://json-schema.org/draft/2020-12/schema")
                self.assertTrue(schema["$id"].endswith(f"/{name}.schema.json"))
                self.assertEqual(schema["type"], "object")
                closed_directly = schema.get("additionalProperties") is False
                closed_by_reference = any(
                    branch.get("$ref") == "event-envelope.schema.json"
                    for branch in schema.get("allOf", [])
                    if isinstance(branch, dict)
                )
                self.assertTrue(closed_directly or closed_by_reference)
                for reference in collect_refs(schema):
                    if reference.startswith("#/"):
                        resolve_pointer(schema, reference[1:])
                    else:
                        target_name = reference.rsplit("/", 1)[-1].replace(".schema.json", "")
                        self.assertIn(target_name, self.schemas)

    def test_all_valid_fixtures_validate(self):
        fixtures = sorted((FIXTURE_DIR / "valid").glob("*.json"))
        self.assertTrue(fixtures)
        for path in fixtures:
            name = fixture_schema_name(path)
            with self.subTest(fixture=path.name):
                self.assertIn(name, self.schemas)
                self.assert_valid(name, read_json(path))

    def test_core_contract_is_generic_and_calapres_edge_is_strict(self):
        self.assertEqual(
            self.schemas["core-input"]["properties"]["event"]["$ref"],
            "event-envelope.schema.json",
        )
        self.assertEqual(
            self.schemas["core-input"]["properties"]["candidate"]["$ref"],
            "llm-candidate.schema.json",
        )
        self.assertNotIn("provider", self.schemas["llm-candidate"]["properties"])
        future = read_json(
            FIXTURE_DIR / "valid" / "event-envelope--generic-brand.json"
        )
        self.assert_valid("event-envelope", future)
        self.assertTrue(self.validation_errors("calapres-event-envelope", future))

    def test_fail_closed_mutations_are_rejected(self):
        cases = read_json(FIXTURE_DIR / "fail-closed-cases.json")
        self.assertGreaterEqual(len(cases), 15)
        for case in cases:
            document = copy.deepcopy(read_json(FIXTURE_DIR / case["base_fixture"]))
            apply_pointer(
                document,
                case["operation"],
                case["path"],
                case.get("value"),
            )
            errors = self.validation_errors(case["schema"], document)
            with self.subTest(case=case["name"]):
                self.assertTrue(errors, f"fail-closed case unexpectedly validated: {case['name']}")

    def test_registry_has_exact_pilot_channel_boundary(self):
        registry = read_json(BRAND_DIR / "registry.json")
        channels = registry["chatwoot"]["channels"]
        enabled = {
            row["channel"]: row["inbox_id"]
            for row in channels
            if row["enabled"] and row["accept_events"]
        }
        self.assertEqual(
            enabled,
            {
                "instagram": 128031,
                "tiktok": 128033,
                "whatsapp": 128058,
                "email": 128326,
            },
        )
        website = next(row for row in channels if row["channel"] == "website")
        self.assertEqual(website["inbox_id"], 128028)
        self.assertIs(website["enabled"], False)
        self.assertIs(website["accept_events"], False)

    def test_registry_observation_mode_cannot_send(self):
        registry = read_json(BRAND_DIR / "registry.json")
        runtime = registry["runtime"]
        self.assertEqual(runtime["mode"], "observation")
        self.assertIs(runtime["customer_egress_enabled"], False)
        self.assertIs(runtime["kill_switch"], True)
        responders = registry["chatwoot"]["single_responder"]
        self.assertFalse(any(responders.values()))

    def test_edge_persistence_projections_match_exact_live_table_columns(self):
        expected_columns = {
            "edge-dedup-table-row": {
                "event_key",
                "delivery_id",
                "message_id",
                "conversation_id",
                "channel",
                "correlation_id",
                "status",
                "received_at",
                "processed_at",
                "expires_at",
            },
            "edge-conversation-job-table-row": {
                "job_key",
                "conversation_id",
                "channel",
                "generation_token",
                "last_message_id",
                "correlation_id",
                "status",
                "human_owned",
                "due_at",
                "updated_at",
            },
            "edge-incident-table-row": {
                "schema_version",
                "brand_id",
                "incident_revision",
                "correlation_id",
                "reason_code",
                "draft_ref",
                "conversation_id",
                "created_at",
                "incident_id",
                "incident_type",
                "order_ref",
                "owner_decision",
                "proposed_action",
                "resolved_at",
                "severity",
                "status",
                "summary_sanitized",
                "updated_at",
            },
            "edge-audit-table-row": {
                "schema_version",
                "brand_id",
                "idempotency_key",
                "outcome",
                "actor_type",
                "conversation_ref",
                "incident_id",
                "knowledge_version",
                "workflow_release",
                "audit_id",
                "correlation_id",
                "created_at",
                "decision",
                "details_sanitized",
                "event_type",
                "reason_code",
                "source_ref",
            },
        }
        expected_live_types = {
            "edge-dedup-table-row": {
                "event_key": "string",
                "delivery_id": "string",
                "message_id": "string",
                "conversation_id": "string",
                "channel": "string",
                "correlation_id": "string",
                "status": "string",
                "received_at": "date",
                "processed_at": "date",
                "expires_at": "date",
            },
            "edge-conversation-job-table-row": {
                "job_key": "string",
                "conversation_id": "string",
                "channel": "string",
                "generation_token": "string",
                "last_message_id": "string",
                "correlation_id": "string",
                "status": "string",
                "human_owned": "boolean",
                "due_at": "date",
                "updated_at": "date",
            },
            "edge-incident-table-row": {
                key: "date" if key in {"created_at", "resolved_at", "updated_at"}
                else "number" if key == "incident_revision"
                else "string"
                for key in expected_columns["edge-incident-table-row"]
            },
            "edge-audit-table-row": {
                key: "date" if key == "created_at" else "string"
                for key in expected_columns["edge-audit-table-row"]
            },
        }
        prohibited = {
            "message_body",
            "raw_message",
            "phone",
            "email",
            "address",
            "attachment",
            "order_payload",
            "payment_data",
        }

        def live_type(property_schema):
            if property_schema.get("format") == "date-time":
                return "date"
            declared = property_schema.get("type")
            declared_types = declared if isinstance(declared, list) else [declared]
            if "boolean" in declared_types:
                return "boolean"
            if "integer" in declared_types or "number" in declared_types:
                return "number"
            return "string"

        for schema_name_value, columns in expected_columns.items():
            with self.subTest(schema=schema_name_value):
                schema = self.schemas[schema_name_value]
                self.assertIs(schema["additionalProperties"], False)
                self.assertEqual(set(schema["properties"]), columns)
                self.assertEqual(set(schema["required"]), columns)
                self.assertFalse(columns & prohibited)
                self.assertEqual(
                    {
                        key: live_type(property_schema)
                        for key, property_schema in schema["properties"].items()
                    },
                    expected_live_types[schema_name_value],
                )

        registry = read_json(BRAND_DIR / "registry.json")
        audit_fixture = read_json(
            FIXTURE_DIR / "valid" / "edge-audit-table-row--draft-observed.json"
        )
        self.assertEqual(
            audit_fixture["knowledge_version"],
            registry["knowledge"]["current_version"],
        )

    def test_dedup_release_reserves_all_identifier_columns_as_null(self):
        row = read_json(FIXTURE_DIR / "valid" / "edge-dedup-table-row--claimed.json")
        self.assertEqual(len(row), 10)
        reserved = {
            "delivery_id": "unsigned-delivery",
            "message_id": "900001",
            "conversation_id": "700001",
            "channel": "whatsapp",
            "correlation_id": "calapres:700001:900001",
        }
        for field, poisoned_value in reserved.items():
            poisoned = dict(row)
            poisoned[field] = poisoned_value
            with self.subTest(field=field):
                self.assertTrue(
                    self.validation_errors("edge-dedup-table-row", poisoned)
                )

    def test_core_output_audit_reason_matches(self):
        fixture = read_json(
            FIXTURE_DIR / "valid" / "core-output--observed-draft.json"
        )
        self.assertEqual(
            fixture["reason_code"], fixture["sanitized_audit"]["reason_code"]
        )
        self.assertIs(fixture["customer_egress_allowed"], False)

    def test_runtime_manifest_maps_all_isolated_tables(self):
        manifest = read_json(BRAND_DIR / "runtime-manifest.json")
        workflows = {row["logical_name"]: row for row in manifest["workflows"]}
        self.assertEqual(
            set(workflows),
            {
                "optix_customer_service_core_v1",
                "calapres_customer_service_edge_v1",
                "calapres_shopify_order_index_v1",
                "calapres_owner_review_desk_v1",
            },
        )
        for name in {
            "optix_customer_service_core_v1",
            "calapres_customer_service_edge_v1",
        }:
            row = workflows[name]
            self.assertEqual(row["state"], "inactive")
            self.assertIs(row["published"], False)
            self.assertIs(row["public_webhook"], False)
            self.assertIs(row["customer_egress"], False)
        index = workflows["calapres_shopify_order_index_v1"]
        self.assertEqual(index["id"], "cLHCuJ21r4RAuDTE")
        self.assertEqual(index["state"], "inactive")
        self.assertIs(index["published"], False)
        self.assertIs(index["public_webhook"], False)
        self.assertIs(index["customer_egress"], False)
        self.assertIs(index["shopify_write"], False)
        self.assertIs(index["credentials_bound"], False)
        self.assertTrue((REPO_ROOT / index["source_path"]).is_file())
        self.assertTrue((REPO_ROOT / index["input_schema"]).is_file())
        self.assertTrue((REPO_ROOT / index["table_row_schema"]).is_file())
        owner_desk = workflows["calapres_owner_review_desk_v1"]
        self.assertEqual(owner_desk["id"], "hU7sAMAQSg9Obgky")
        self.assertEqual(owner_desk["state"], "inactive")
        self.assertIs(owner_desk["published"], False)
        self.assertIs(owner_desk["public_webhook"], False)
        self.assertIs(owner_desk["credentials_bound"], False)
        self.assertIs(owner_desk["customer_egress"], False)
        self.assertIs(owner_desk["data_table_write"], False)
        self.assertIs(owner_desk["knowledge_publish"], False)
        self.assertEqual(owner_desk["caller_policy"], "none")
        self.assertTrue((REPO_ROOT / owner_desk["source_path"]).is_file())
        self.assertTrue((REPO_ROOT / owner_desk["input_schema"]).is_file())
        self.assertTrue((REPO_ROOT / owner_desk["output_schema"]).is_file())
        edge_extension = workflows["calapres_customer_service_edge_v1"]["source_extensions"]
        self.assertEqual(edge_extension["delayed_observation_stage"], "merged_into_edge")
        self.assertEqual(edge_extension["live_deployment"], "imported_inactive")
        self.assertEqual(edge_extension["node_count"], 23)
        self.assertIs(edge_extension["wait_state_contains_customer_content"], False)
        self.assertTrue((REPO_ROOT / edge_extension["wait_carrier_schema"]).is_file())
        self.assertTrue((REPO_ROOT / edge_extension["post_delay_recheck_schema"]).is_file())
        tables = {row["logical_name"]: row for row in manifest["data_tables"]}
        self.assertEqual(
            set(tables),
            {
                "dedup",
                "jobs",
                "customer_links",
                "order_index",
                "verification",
                "incidents",
                "approvals",
                "audit",
            },
        )
        for row in tables.values():
            self.assertEqual(row["state"], "empty")
            self.assertTrue((REPO_ROOT / row["schema"]).is_file())
            if "table_row_schema" in row:
                self.assertTrue((REPO_ROOT / row["table_row_schema"]).is_file())
        self.assertEqual(tables["approvals"]["column_count"], 34)
        self.assertEqual(tables["incidents"]["column_count"], 18)
        self.assertEqual(tables["audit"]["column_count"], 17)
        self.assertIs(manifest["safety"]["customer_egress_enabled"], False)
        self.assertIs(manifest["safety"]["manual_execution_retention_enabled"], False)
        self.assertIs(manifest["safety"]["wait_state_contains_customer_content"], False)
        self.assertIs(manifest["safety"]["shopify_index_writes_enabled"], False)
        self.assertIs(manifest["safety"]["owner_review_writes_enabled"], False)
        self.assertIs(
            manifest["safety"]["owner_review_knowledge_publish_enabled"], False
        )
        self.assertIs(manifest["safety"]["paused_catalog_table_reused"], False)
        configs = manifest["configuration_manifests"]
        self.assertEqual(configs["response_style"]["status"], "approved")
        self.assertEqual(configs["model_policy"]["status"], "proposed")
        self.assertIs(configs["model_policy"]["active"], False)
        self.assertTrue((REPO_ROOT / configs["response_style"]["path"]).is_file())
        self.assertTrue((REPO_ROOT / configs["model_policy"]["path"]).is_file())

    def test_current_knowledge_is_versioned_and_source_backed(self):
        manifest = read_json(BRAND_DIR / "knowledge" / "manifest.json")
        current = manifest["current_version"]
        record = next(row for row in manifest["versions"] if row["version"] == current)
        knowledge = read_json(REPO_ROOT / record["path"])
        self.assertEqual(knowledge["brand_id"], "calapres")
        self.assertEqual(knowledge["version"], current)
        self.assertEqual(knowledge["status"], "approved")
        source_ids = {source["source_id"] for source in knowledge["sources"]}
        self.assertEqual(
            source_ids,
            {
                "refund-policy",
                "shipping-policy",
                "faq",
                "privacy-policy",
                "terms-of-service",
            },
        )
        for source in knowledge["sources"]:
            self.assertTrue(source["url"].startswith("https://calapres.com/"))
            self.assertEqual(source["retrieved_at"], "2026-08-11")
        return_entries = [
            entry for entry in knowledge["entries"] if entry["category"] == "returns"
        ]
        self.assertTrue(return_entries)
        self.assertTrue(all(entry["authority"] == "owner_required" for entry in return_entries))
        legal_entries = [
            entry for entry in knowledge["entries"] if entry["category"] == "legal_reference"
        ]
        self.assertTrue(legal_entries)
        self.assertTrue(all(entry["authority"] == "mandatory_stop" for entry in legal_entries))
        renderable_entries = [
            entry for entry in knowledge["entries"] if "customer_response_ar" in entry
        ]
        self.assertTrue(renderable_entries)
        self.assertTrue(
            all(entry["authority"] == "draft_only" for entry in renderable_entries)
        )
        self.assertTrue(
            all(entry["customer_response_ar"].strip() for entry in renderable_entries)
        )
        self.assertFalse(
            any(
                "customer_response_ar" in entry
                for entry in knowledge["entries"]
                if entry["authority"] in {"owner_required", "mandatory_stop"}
            )
        )
        shipping_threshold = next(
            entry
            for entry in knowledge["entries"]
            if entry["knowledge_id"] == "shipping.threshold"
        )
        core_fixture = read_json(
            FIXTURE_DIR / "valid" / "core-input--observation.json"
        )
        self.assertEqual(
            core_fixture["context"]["knowledge_facts"][0]["response_text"],
            shipping_threshold["customer_response_ar"],
        )

        candidate = read_json(
            FIXTURE_DIR / "valid" / "llm-candidate--shipping-policy.json"
        )
        known_fact_ids = {entry["knowledge_id"] for entry in knowledge["entries"]}
        self.assertTrue(set(candidate["knowledge_fact_ids"]).issubset(known_fact_ids))

    def test_workflow_source_has_no_public_or_customer_egress_nodes(self):
        workflow_dir = REPO_ROOT / "n8n" / "workflows"
        sources = {
            path.name: path.read_text(encoding="utf-8")
            for path in sorted(workflow_dir.glob("*.ts"))
        }
        self.assertEqual(
            set(sources),
            {
                "calapres-customer-service-edge-v1.ts",
                "calapres-owner-review-desk-v1.ts",
                "calapres-shopify-order-index-v1.ts",
                "optix-customer-service-core-v1.ts",
            },
        )
        forbidden_node_types = {
            "n8n-nodes-base.webhook",
            "n8n-nodes-base.respondToWebhook",
            "n8n-nodes-base.httpRequest",
            "n8n-nodes-base.shopify",
            "n8n-nodes-base.emailSend",
            "n8n-nodes-base.gmail",
            "n8n-nodes-base.whatsApp",
            "n8n-nodes-base.facebookGraphApi",
            "n8n-nodes-base.dataTable",
            "@n8n/n8n-nodes-langchain.agent",
        }
        for filename, source in sources.items():
            with self.subTest(workflow=filename):
                for node_type in forbidden_node_types:
                    self.assertNotIn(f"type: '{node_type}'", source)
                self.assertIn("customer_egress_allowed: false", source)
        self.assertIn(
            "n8n-nodes-base.executeWorkflowTrigger",
            sources["optix-customer-service-core-v1.ts"],
        )
        edge = sources["calapres-customer-service-edge-v1.ts"]
        self.assertIn("type: 'n8n-nodes-base.wait'", edge)
        self.assertIn("Build Identifiers-only Post-Response Wait State", edge)
        self.assertIn("Chatwoot Live Re-read Slot - Fail Closed No Credential", edge)
        self.assertNotIn("calapres-delayed-observation-worker", "\n".join(sources))
        index = sources["calapres-shopify-order-index-v1.ts"]
        self.assertIn("Private HMAC-only Index Command", index)
        self.assertIn("write_executed: false", index)
        self.assertIn("shopify_write_allowed: false", index)
        owner_desk = sources["calapres-owner-review-desk-v1.ts"]
        self.assertIn("Private Trusted Owner Review Input", owner_desk)
        self.assertIn("data_table_write_allowed: false", owner_desk)
        self.assertIn("knowledge_publish_executed: false", owner_desk)

    def test_wait_carrier_is_identifiers_only_and_recheck_is_fail_closed(self):
        carrier = self.schemas["delayed-observation-state"]
        properties = set(carrier["properties"])
        self.assertFalse(
            properties
            & {
                "content",
                "message_body",
                "sender_ref",
                "candidate",
                "draft_text",
                "phone",
                "email",
                "address",
                "status",
                "assignee",
                "assignee_id",
                "owner_id",
            }
        )
        self.assertTrue(
            {
                "wait_state_fingerprint",
                "event_identity_key_version",
                "event_identity_fingerprint",
                "baseline_fingerprint_key_version",
                "baseline_status_fingerprint",
                "baseline_assignee_fingerprint",
            }.issubset(properties)
        )
        self.assertEqual(carrier["properties"]["customer_egress_allowed"]["const"], False)
        recheck = read_json(
            FIXTURE_DIR / "valid" / "observation-recheck--clear.json"
        )
        self.assert_valid("observation-recheck", recheck)
        self.assertIs(recheck["source_verified"], True)
        self.assertIs(recheck["eligible_for_observation"], True)

    def test_order_index_contract_is_hmac_only_and_supports_guest_orders(self):
        command = self.schemas["order-index-command"]
        record = self.schemas["order-index-record"]
        self.assertEqual(
            record["properties"]["buyer_phone_fingerprint"]["$ref"],
            "#/$defs/optional_fingerprint",
        )
        self.assertEqual(
            record["$defs"]["optional_fingerprint"]["pattern"],
            "^[a-f0-9]{64}$",
        )
        self.assertNotIn("phone", command["properties"])
        self.assertNotIn("email", command["properties"])
        self.assertNotIn("order_payload", command["properties"])
        guest = read_json(
            FIXTURE_DIR / "valid" / "order-index-record--guest-active.json"
        )
        self.assert_valid("order-index-record", guest)
        self.assertIsNone(guest["shopify_customer_gid"])
        self.assertIsNone(guest["buyer_phone_fingerprint"])
        self.assertRegex(guest["recipient_phone_fingerprint"], r"^[a-f0-9]{64}$")

    def test_valid_persisted_fixtures_have_no_direct_customer_fields(self):
        prohibited = {
            "phone",
            "email",
            "address",
            "message_body",
            "raw_message",
            "transcript",
            "token",
            "secret",
            "password",
            "api_key",
            "attachment",
        }

        def visit(value, location):
            if isinstance(value, dict):
                for key, nested in value.items():
                    self.assertNotIn(key.lower(), prohibited, f"prohibited field at {location}")
                    visit(nested, f"{location}/{key}")
            elif isinstance(value, list):
                for index, nested in enumerate(value):
                    visit(nested, f"{location}/{index}")

        for path in sorted((FIXTURE_DIR / "valid").glob("*.json")):
            with self.subTest(fixture=path.name):
                visit(read_json(path), path.name)


if __name__ == "__main__":
    unittest.main()
