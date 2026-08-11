import copy
import datetime
import hashlib
import hmac
import json
import re
import unittest
from pathlib import Path

try:
    from test_contracts import schema_name, validate
except ModuleNotFoundError:  # pragma: no cover - supports direct module execution
    from n8n.tests.test_contracts import schema_name, validate


REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_DIR = REPO_ROOT / "n8n" / "schemas"
FIXTURE_DIR = REPO_ROOT / "n8n" / "tests" / "fixtures"
SIGNATURE_PATTERN = re.compile(r"^sha256=[a-f0-9]{64}$")
TIMESTAMP_PATTERN = re.compile(r"^[0-9]{10}$")
STRICT_ISO_PATTERN = re.compile(
    r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}"
    r"(?:\.[0-9]{1,6})?(?:Z|[+-][0-9]{2}:[0-9]{2})$"
)
MAX_RAW_BODY_SIZE_BYTES = 1024 * 1024
PUBLIC_EVENT_IDENTITY_TEST_KEY = "calapres-public-event-identity-test-key-v1"
PUBLIC_EVENT_IDENTITY_KEY_VERSION = "synthetic-event-identity-v1"
PUBLIC_EVENT_IDENTITY_RETAINED_TEST_KEY = (
    "calapres-public-event-identity-test-key-retained-v0"
)
EVENT_IDENTITY_CANONICAL_FORMAT = (
    "json-minified-ordered:[schema_version,account_id,inbox_id,event,"
    "conversation_id,message_id]"
)
ANCHOR_MESSAGE_FINGERPRINT_DOMAIN = "calapres-message-anchor-v1:"
INBOX_CHANNELS = {
    128031: "instagram",
    128033: "tiktok",
    128058: "whatsapp",
    128326: "email",
}
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


def read_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def recompute_wait_state_fingerprint(wait_state):
    canonical = json.dumps(
        {field: wait_state[field] for field in WAIT_CARRIER_FIELD_ORDER},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def recompute_synthetic_wait_event_identity(wait_state):
    canonical_tuple = {
        "schema_version": "1.0",
        "account_id": wait_state["account_id"],
        "inbox_id": wait_state["inbox_id"],
        "event": "message_created",
        "conversation_id": wait_state["conversation_id"],
        "message_id": wait_state["anchor_message_id"],
    }
    return event_identity_fingerprint_from_tuple(
        canonical_tuple, PUBLIC_EVENT_IDENTITY_TEST_KEY
    )


def recompute_synthetic_anchor_message_fingerprint(wait_state):
    canonical = {
        "schema_version": "1.0",
        "brand_id": wait_state["brand_id"],
        "account_id": wait_state["account_id"],
        "inbox_id": wait_state["inbox_id"],
        "conversation_id": wait_state["conversation_id"],
        "message_id": wait_state["anchor_message_id"],
        "direction": "inbound",
        "visibility": "public",
        "event_identity_key_version": wait_state["event_identity_key_version"],
        "event_identity_fingerprint": wait_state["event_identity_fingerprint"],
    }
    message = ANCHOR_MESSAGE_FINGERPRINT_DOMAIN + json.dumps(
        canonical, ensure_ascii=False, separators=(",", ":")
    )
    return hmac.new(
        PUBLIC_EVENT_IDENTITY_TEST_KEY.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def live_reread_binding_errors(evidence, wait_state):
    errors = []
    if wait_state["wait_state_fingerprint"] != recompute_wait_state_fingerprint(
        wait_state
    ):
        errors.append("wait_state_fingerprint_invalid")
    if evidence["wait_state_fingerprint"] != wait_state["wait_state_fingerprint"]:
        errors.append("wait_state_fingerprint_mismatch")
    if evidence.get("source_verified") is True:
        if evidence["anchor_message_fingerprint"] != wait_state["message_fingerprint"]:
            errors.append("anchor_message_fingerprint_mismatch")
        if evidence.get("event_identity_anchor_verified") is not True:
            errors.append("event_identity_anchor_not_verified")
    if (
        evidence["event_identity_key_version"]
        != wait_state["event_identity_key_version"]
    ):
        errors.append("event_identity_key_version_mismatch")
    if (
        evidence["event_identity_fingerprint"]
        != wait_state["event_identity_fingerprint"]
    ):
        errors.append("event_identity_fingerprint_mismatch")
    if (
        evidence["baseline_fingerprint_key_version"]
        != wait_state["baseline_fingerprint_key_version"]
    ):
        errors.append("baseline_fingerprint_key_version_mismatch")
    if (
        evidence["baseline_status_fingerprint"]
        != wait_state["baseline_status_fingerprint"]
    ):
        errors.append("baseline_status_fingerprint_mismatch")
    if (
        evidence["baseline_assignee_fingerprint"]
        != wait_state["baseline_assignee_fingerprint"]
    ):
        errors.append("baseline_assignee_fingerprint_mismatch")
    identity_fields = (
        "brand_id",
        "account_id",
        "inbox_id",
        "channel",
        "conversation_id",
        "anchor_message_id",
        "generation",
        "not_before",
    )
    for field in identity_fields:
        if evidence[field] != wait_state[field]:
            errors.append(f"wait_binding_{field}_mismatch")
    anchor_id = wait_state.get("anchor_message_id")
    if not isinstance(anchor_id, str) or not re.fullmatch(r"[1-9][0-9]*", anchor_id):
        errors.append("wait_anchor_message_ordering_id_invalid")
    elif evidence.get("anchor_message_ordering_id") != int(anchor_id):
        errors.append("anchor_message_ordering_id_mismatch")
    if wait_state.get("event_identity_key_version") == PUBLIC_EVENT_IDENTITY_KEY_VERSION:
        if (
            recompute_synthetic_wait_event_identity(wait_state)
            != wait_state.get("event_identity_fingerprint")
        ):
            errors.append("wait_event_identity_anchor_mismatch")
        if (
            recompute_synthetic_anchor_message_fingerprint(wait_state)
            != wait_state.get("message_fingerprint")
        ):
            errors.append("wait_message_fingerprint_mismatch")
    return errors


def iso_from_epoch(value):
    return (
        datetime.datetime.fromtimestamp(value, datetime.timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )


def parse_iso(value):
    return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))


def normalize_chatwoot_timestamp(value):
    """Normalize documented webhook text or API Unix time before comparisons."""

    if isinstance(value, int) and not isinstance(value, bool):
        return iso_from_epoch(value)
    if isinstance(value, str):
        try:
            parsed = datetime.datetime.strptime(value, "%Y-%m-%d %H:%M:%S UTC")
            return parsed.replace(tzinfo=datetime.timezone.utc).isoformat().replace(
                "+00:00", "Z"
            )
        except ValueError:
            if not STRICT_ISO_PATTERN.fullmatch(value):
                return None
            try:
                parsed = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return None
            if parsed.tzinfo is None:
                return None
            return parsed.astimezone(datetime.timezone.utc).isoformat().replace(
                "+00:00", "Z"
            )
    return None


def canonical_event_identity_tuple(payload):
    """Return the exact allowlisted tuple after verified JSON parsing."""

    if not isinstance(payload, dict):
        raise ValueError("payload_not_object")
    if "account" in payload and not isinstance(payload["account"], dict):
        raise ValueError("account_container_invalid")
    if "inbox" in payload and not isinstance(payload["inbox"], dict):
        raise ValueError("inbox_container_invalid")
    if "conversation" in payload and not isinstance(payload["conversation"], dict):
        raise ValueError("conversation_container_invalid")
    account = payload.get("account", {})
    inbox = payload.get("inbox", {})
    conversation = payload.get("conversation", {})
    if "account" in payload and ("id" not in account or account["id"] is None):
        raise ValueError("account_id_invalid")
    if "inbox" in payload and ("id" not in inbox or inbox["id"] is None):
        raise ValueError("inbox_id_invalid")
    if "conversation" in payload and (
        "id" not in conversation or conversation["id"] is None
    ):
        raise ValueError("conversation_id_invalid")
    if "id" in payload and payload["id"] is None:
        raise ValueError("message_id_invalid")
    nested_account_id = account.get("id")
    alias_account_id = payload.get("account_id")
    nested_inbox_id = inbox.get("id")
    alias_inbox_id = payload.get("inbox_id")
    account_id = nested_account_id if "account" in payload else alias_account_id
    inbox_id = nested_inbox_id if "inbox" in payload else alias_inbox_id
    conversation_inbox_id = conversation.get("inbox_id")
    conversation_account_id = conversation.get("account_id")
    event = payload.get("event")
    nested_conversation_id = conversation.get("id")
    alias_conversation_id = payload.get("conversation_id")
    primary_message_id = payload.get("id")
    alias_message_id = payload.get("message_id")
    conversation_id = (
        nested_conversation_id
        if "conversation" in payload
        else alias_conversation_id
    )
    message_id = primary_message_id if "id" in payload else alias_message_id

    if isinstance(account_id, bool) or not isinstance(account_id, int):
        raise ValueError("account_id_invalid")
    if isinstance(inbox_id, bool) or not isinstance(inbox_id, int):
        raise ValueError("inbox_id_invalid")
    if "account" in payload and "account_id" in payload:
        raise ValueError("account_id_alias_conflict")
    if "inbox" in payload and "inbox_id" in payload:
        raise ValueError("inbox_id_alias_conflict")
    if account_id != 179973:
        raise ValueError("account_not_allowlisted")
    if inbox_id not in INBOX_CHANNELS:
        raise ValueError("inbox_not_allowlisted")
    if "inbox_id" in conversation and conversation_inbox_id != inbox_id:
        raise ValueError("inbox_mismatch")
    if "account_id" in conversation and conversation_account_id != account_id:
        raise ValueError("account_mismatch")
    if event != "message_created":
        raise ValueError("event_not_supported")

    def positive_decimal_token(value, field):
        if isinstance(value, bool):
            raise ValueError(f"{field}_invalid")
        if isinstance(value, int) and value > 0:
            value = str(value)
        if not isinstance(value, str) or not re.fullmatch(r"[1-9][0-9]{0,15}", value):
            raise ValueError(f"{field}_invalid")
        if int(value) > 9007199254740991:
            raise ValueError(f"{field}_unsafe_integer")
        return value

    normalized_conversation_id = positive_decimal_token(
        conversation_id, "conversation_id"
    )
    normalized_message_id = positive_decimal_token(message_id, "message_id")
    if "conversation" in payload and "conversation_id" in payload:
        raise ValueError("conversation_id_alias_conflict")
    if "id" in payload and "message_id" in payload:
        raise ValueError("message_id_alias_conflict")

    return {
        "schema_version": "1.0",
        "account_id": account_id,
        "inbox_id": inbox_id,
        "event": event,
        "conversation_id": normalized_conversation_id,
        "message_id": normalized_message_id,
    }


def event_identity_fingerprint(payload, secret):
    canonical_tuple = canonical_event_identity_tuple(payload)
    return event_identity_fingerprint_from_tuple(canonical_tuple, secret)


def event_identity_fingerprint_from_tuple(canonical_tuple, secret):
    canonical = json.dumps(canonical_tuple, separators=(",", ":"), ensure_ascii=False)
    return hmac.new(
        secret.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256
    ).hexdigest()


def dual_read_business_dedup(
    *, payload, keyring, required_prior_versions, existing_event_keys, now, dedup_ttl
):
    """Fail-closed active+retained identity-key lookup through the dedup TTL."""

    def lookup_failure(status):
        return {
            "status": status,
            "lookup_verified": False,
            "unique": False,
            "duplicate": None,
            "matched_key_version": None,
            "candidate_fingerprints": {},
        }

    active_versions = [
        version for version, entry in keyring.items() if entry.get("state") == "active"
    ]
    if len(active_versions) != 1:
        return lookup_failure("keyring_invalid")
    for version in required_prior_versions:
        entry = keyring.get(version)
        if entry is None or entry.get("state") != "retained":
            return lookup_failure("required_prior_key_missing")
        if entry.get("retain_until", 0) < now + dedup_ttl:
            return lookup_failure("prior_key_retention_insufficient")
    candidates = {
        version: event_identity_fingerprint(payload, entry["secret"])
        for version, entry in keyring.items()
        if entry.get("state") in {"active", "retained"}
        and (
            entry.get("state") == "active"
            or entry.get("retain_until", 0) >= now + dedup_ttl
        )
    }
    matched = next(
        (
            version
            for version, fingerprint in candidates.items()
            if fingerprint in existing_event_keys
        ),
        None,
    )
    return {
        "status": "duplicate" if matched is not None else "unique",
        "lookup_verified": True,
        "unique": matched is None,
        "duplicate": matched is not None,
        "matched_key_version": matched,
        "candidate_fingerprints": candidates,
    }


def build_event_identity_evidence(
    *, raw_body, ingress_evidence, secret, key_version
):
    """Build sanitized business-event evidence only after signed ingress acceptance."""

    if not (
        ingress_evidence.get("accepted") is True
        and ingress_evidence.get("normalization_allowed") is True
        and ingress_evidence.get("signature_verified") is True
        and ingress_evidence.get("replay_protection_verified") is True
    ):
        raise ValueError("verified_ingress_required")
    exact_body_sha256 = hashlib.sha256(raw_body.encode("utf-8")).hexdigest()
    if not hmac.compare_digest(
        exact_body_sha256, ingress_evidence.get("body_sha256") or ""
    ):
        raise ValueError("verified_ingress_body_mismatch")
    payload = json.loads(raw_body)
    canonical_tuple = canonical_event_identity_tuple(payload)
    fingerprint = event_identity_fingerprint(payload, secret)
    return {
        "schema_version": "1.0",
        "kind": "chatwoot_event_identity_v1",
        "source": "verified_parse_identity_topology",
        "evidence_id": f"cei_{fingerprint[:24]}",
        "ingress_evidence_ref": ingress_evidence["evidence_id"],
        "brand_scope": "calapres",
        "event_identity_key_version": key_version,
        "canonical_tuple_format": EVENT_IDENTITY_CANONICAL_FORMAT,
        "derived_channel": INBOX_CHANNELS[canonical_tuple["inbox_id"]],
        "channel_source": "allowlisted_inbox_mapping",
        "event_identity_fingerprint": fingerprint,
        "signature_verified_before_parse": True,
        "replay_verified_before_parse": True,
        "verified_parse": True,
        "unsigned_delivery_used": False,
        "payload_brand_used": False,
        "raw_identifiers_in_evidence": False,
        "durable_projection_field": "event_identity_fingerprint",
        "transient_only": True,
        "persistence_allowed": False,
        "wait_payload_allowed": False,
        "data_table_payload_allowed": False,
        "audit_payload_allowed": False,
        "customer_egress_allowed": False,
    }


def sign(secret, timestamp, raw_body):
    signed = timestamp.encode("ascii") + b"." + raw_body.encode("utf-8")
    digest = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def untrusted_delivery_metadata(delivery_header):
    if delivery_header is None:
        return None, None
    return (
        "untrusted_header_metadata",
        hashlib.sha256(delivery_header.encode("utf-8")).hexdigest(),
    )


def verify_signed_ingress(
    *,
    raw_body,
    timestamp,
    signature_header,
    secret,
    now,
    replay_keys,
    replay_store_available=True,
    delivery_header=None,
):
    """Executable contract for the future topology-owned verifier.

    The raw request and signature header are inputs only. Neither is returned. A caller-supplied
    payload cannot manufacture this wrapper because the topology calls this verifier before JSON
    normalization and passes the result beside, rather than inside, the parsed payload.
    """

    raw_body_bytes = raw_body.encode("utf-8")
    raw_body_size_bytes = len(raw_body_bytes)
    received_at = iso_from_epoch(now)
    evidence = {
        "schema_version": "1.0",
        "kind": "chatwoot_hmac_v1",
        "source": "chatwoot_signed_ingress_topology",
        "evidence_id": "",
        "signature_algorithm": "hmac-sha256",
        "signature_message_format": "{timestamp}.{raw_body_utf8_bytes}",
        "raw_body_size_bytes": raw_body_size_bytes,
        "max_raw_body_size_bytes": MAX_RAW_BODY_SIZE_BYTES,
        "body_sha256": None,
        "delivery_id_source": None,
        "delivery_id_fingerprint": None,
        "delivery_id_trusted": False,
        "event_timestamp": None,
        "received_at": received_at,
        "verification_completed_at": received_at,
        "max_age_seconds": 300,
        "max_future_skew_seconds": 60,
        "signature_verified": False,
        "timestamp_verified": False,
        "replay_protection_verified": False,
        "replay_key_material_format": "sha256({signature_header}:{timestamp}:{body_sha256})",
        "replay_key_fingerprint": None,
        "accepted": False,
        "normalization_allowed": False,
        "reason_code": None,
        "transient_only": True,
        "persistence_allowed": False,
        "wait_payload_allowed": False,
        "data_table_payload_allowed": False,
        "audit_payload_allowed": False,
        "customer_egress_allowed": False,
    }

    # This gate deliberately runs before JSON parsing, body hashing, delivery-id extraction,
    # timestamp parsing, or HMAC. Rejected evidence records only the byte count and safe metadata.
    if raw_body_size_bytes == 0 or raw_body_size_bytes > MAX_RAW_BODY_SIZE_BYTES:
        rejection_fingerprint = hashlib.sha256(
            f"body-size-rejected:{raw_body_size_bytes}:{received_at}".encode("ascii")
        ).hexdigest()
        evidence["evidence_id"] = f"cwi_{rejection_fingerprint[:24]}"
        evidence["reason_code"] = (
            "payload_empty" if raw_body_size_bytes == 0 else "payload_too_large"
        )
        return evidence

    body_sha256 = hashlib.sha256(raw_body_bytes).hexdigest()
    delivery_source, delivery_fingerprint = untrusted_delivery_metadata(
        delivery_header
    )
    evidence["evidence_id"] = f"cwi_{body_sha256[:24]}"
    evidence["body_sha256"] = body_sha256
    evidence["delivery_id_source"] = delivery_source
    evidence["delivery_id_fingerprint"] = delivery_fingerprint
    evidence["event_timestamp"] = (
        timestamp
        if isinstance(timestamp, str) and TIMESTAMP_PATTERN.fullmatch(timestamp)
        else None
    )

    if timestamp in {None, ""}:
        evidence["reason_code"] = "timestamp_missing"
        return evidence
    if not isinstance(timestamp, str) or not TIMESTAMP_PATTERN.fullmatch(timestamp):
        evidence["reason_code"] = "timestamp_malformed"
        return evidence
    age = now - int(timestamp)
    if age > evidence["max_age_seconds"]:
        evidence["reason_code"] = "timestamp_stale"
        return evidence
    if age < -evidence["max_future_skew_seconds"]:
        evidence["reason_code"] = "timestamp_future"
        return evidence
    evidence["timestamp_verified"] = True

    if not signature_header:
        evidence["reason_code"] = "signature_missing"
        return evidence
    if not isinstance(signature_header, str) or not SIGNATURE_PATTERN.fullmatch(signature_header):
        evidence["reason_code"] = "signature_malformed"
        return evidence
    expected = sign(secret, timestamp, raw_body)
    if not hmac.compare_digest(expected, signature_header):
        evidence["reason_code"] = "signature_mismatch"
        return evidence
    evidence["signature_verified"] = True

    replay_fingerprint = hashlib.sha256(
        f"{signature_header}:{timestamp}:{body_sha256}".encode("utf-8")
    ).hexdigest()
    evidence["replay_key_fingerprint"] = replay_fingerprint
    if not replay_store_available:
        evidence["reason_code"] = "replay_store_unavailable"
        return evidence
    if replay_fingerprint in replay_keys:
        evidence["reason_code"] = "duplicate_delivery"
        return evidence
    replay_keys.add(replay_fingerprint)
    evidence["replay_protection_verified"] = True
    evidence["accepted"] = True
    evidence["normalization_allowed"] = True
    evidence["reason_code"] = None
    return evidence


def snapshot_set_fingerprint(rows):
    canonical_pairs = sorted(
        ([row["id"], row["message_fingerprint"]] for row in rows),
        key=lambda pair: pair[0],
    )
    canonical = json.dumps(canonical_pairs, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def evaluate_bounded_chatwoot_scan(
    rows, *, account_id, inbox_id, conversation_id, anchor_message_id, anchor_fingerprint
):
    """Executable v1 rule: one raw response, never filtered/paginated."""

    if not isinstance(rows, list):
        return {"status": "schema_invalid", "raw_count": None}
    raw_count = len(rows)
    if raw_count >= 100:
        return {"status": "scan_truncated", "raw_count": raw_count}
    if raw_count < 1:
        return {"status": "anchor_missing", "raw_count": raw_count}

    normalized = []
    for row in rows:
        if not isinstance(row, dict):
            return {"status": "schema_invalid", "raw_count": raw_count}
        message_id = row.get("id")
        if (
            isinstance(message_id, bool)
            or not isinstance(message_id, int)
            or message_id < 1
            or message_id > 9007199254740991
            or row.get("account_id") != account_id
            or row.get("inbox_id") != inbox_id
            or row.get("conversation_id") != conversation_id
            or row.get("message_type") not in {0, 1, 2}
            or not isinstance(row.get("private"), bool)
            or isinstance(row.get("created_at"), bool)
            or not isinstance(row.get("created_at"), int)
            or not re.fullmatch(r"[a-f0-9]{64}", row.get("message_fingerprint", ""))
        ):
            return {"status": "schema_invalid", "raw_count": raw_count}
        normalized.append(row)

    anchors = [row for row in normalized if row["id"] == anchor_message_id]
    if len(anchors) != 1 or anchors[0]["message_fingerprint"] != anchor_fingerprint:
        return {"status": "anchor_missing", "raw_count": raw_count}
    if anchors[0]["message_type"] != 0 or anchors[0]["private"] is not False:
        return {"status": "schema_invalid", "raw_count": raw_count}
    non_activity = [row for row in normalized if row["message_type"] != 2]
    if not non_activity:
        return {"status": "schema_invalid", "raw_count": raw_count}
    return {
        "status": "verified",
        "raw_count": raw_count,
        "set_fingerprint": snapshot_set_fingerprint(normalized),
        "highest_message_id": max(row["id"] for row in normalized),
        "highest_non_activity_id": max(row["id"] for row in non_activity),
    }


def live_scan_semantic_errors(evidence):
    """Validate two independent, non-paginated scans around the numeric anchor."""

    if evidence.get("source_verified") is not True:
        return []
    errors = []
    anchor_id = evidence.get("anchor_message_ordering_id")
    if evidence.get("scan_after_id") != anchor_id - 1:
        errors.append("scan_anchor_cursor_mismatch")
    first_count = evidence.get("scan_first_count")
    second_count = evidence.get("scan_second_count")
    for label, count in (("first", first_count), ("second", second_count)):
        if isinstance(count, bool) or not isinstance(count, int) or count < 1:
            errors.append(f"scan_{label}_count_invalid")
        elif count >= evidence.get("scan_page_size_limit", 100):
            errors.append(f"scan_{label}_truncated")
    if first_count != second_count:
        errors.append("scan_count_changed")
    if evidence.get("scan_first_all_rows_valid") is not True:
        errors.append("scan_first_row_validation_failed")
    if evidence.get("scan_second_all_rows_valid") is not True:
        errors.append("scan_second_row_validation_failed")
    if evidence.get("scan_first_set_fingerprint") != evidence.get(
        "scan_second_set_fingerprint"
    ):
        errors.append("scan_set_fingerprint_changed")
    if evidence.get("scan_sets_equal") is not True:
        errors.append("scan_sets_not_equal")
    if evidence.get("scan_anchor_present_first") is not True:
        errors.append("scan_anchor_missing_first")
    if evidence.get("scan_anchor_present_second") is not True:
        errors.append("scan_anchor_missing_second")
    for field in (
        "scan_anchor_fingerprint_first",
        "scan_anchor_fingerprint_second",
    ):
        if evidence.get(field) != evidence.get("anchor_message_fingerprint"):
            errors.append(f"{field}_mismatch")
    if evidence.get("anchor_message_type") != 0:
        errors.append("anchor_message_type_invalid")
    if evidence.get("anchor_private") is not False:
        errors.append("anchor_visibility_invalid")
    highest_id = evidence.get("scan_highest_message_id")
    if not isinstance(highest_id, int) or highest_id < anchor_id:
        errors.append("scan_highest_message_id_invalid")
    highest_non_activity_id = evidence.get("scan_highest_non_activity_id")
    if (
        isinstance(highest_non_activity_id, bool)
        or not isinstance(highest_non_activity_id, int)
        or highest_non_activity_id < anchor_id
        or (isinstance(highest_id, int) and highest_non_activity_id > highest_id)
    ):
        errors.append("scan_highest_non_activity_id_invalid")
    if highest_non_activity_id != evidence.get("latest_non_activity_ordering_id"):
        errors.append("scan_non_activity_head_mismatch")
    if evidence.get("scan_complete") is not True:
        errors.append("scan_incomplete")

    if evidence.get("conversation_before_route_verified") is not True:
        errors.append("conversation_before_route_unverified")
    if evidence.get("conversation_after_route_verified") is not True:
        errors.append("conversation_after_route_unverified")
    if evidence.get("conversation_snapshots_stable") is not True:
        errors.append("conversation_snapshots_changed")
    if evidence.get("conversation_before_status_fingerprint") != evidence.get(
        "conversation_after_status_fingerprint"
    ):
        errors.append("conversation_status_changed_during_scan")
    if evidence.get("conversation_before_assignee_fingerprint") != evidence.get(
        "conversation_after_assignee_fingerprint"
    ):
        errors.append("conversation_assignee_changed_during_scan")
    if evidence.get("current_status_fingerprint") != evidence.get(
        "conversation_after_status_fingerprint"
    ):
        errors.append("current_status_snapshot_mismatch")
    if evidence.get("current_assignee_fingerprint") != evidence.get(
        "conversation_after_assignee_fingerprint"
    ):
        errors.append("current_assignee_snapshot_mismatch")

    for field in (
        "latest_inbound_ordering_id",
        "latest_public_human_reply_ordering_id",
        "latest_private_note_ordering_id",
        "latest_non_activity_ordering_id",
    ):
        ordering_id = evidence.get(field)
        if (
            isinstance(ordering_id, int)
            and isinstance(highest_id, int)
            and ordering_id > highest_id
        ):
            errors.append(f"{field}_beyond_bounded_scan")
    return errors


def expected_post_delay_reason(evidence, state):
    if evidence["live_read_status"] == "route_mismatch":
        return "route_mismatch"
    if evidence["source_verified"] is not True or evidence["live_read_status"] != "verified":
        return "live_reread_unavailable"
    if state.get("wait_state_binding_verified") is not True:
        return "wait_state_binding_mismatch"
    if live_scan_semantic_errors(evidence):
        return "live_reread_unavailable"
    if state["brand_enabled"] is not True:
        return "brand_disabled"
    if state["kill_switch"] is True:
        return "brand_kill_switch"
    if state["idempotency_consumed"] is True:
        return "idempotency_consumed"
    if evidence["anchor_message_present"] is not True:
        return "anchor_missing"
    if state["expected_generation"] != state["current_generation"]:
        return "stale_generation"
    anchor_id = evidence["anchor_message_ordering_id"]
    if evidence["latest_inbound_ordering_id"] > anchor_id:
        return "newer_inbound"
    if (
        evidence["latest_public_human_reply_ordering_id"] is not None
        and evidence["latest_public_human_reply_ordering_id"] > anchor_id
    ):
        return "human_intervention"
    if (
        evidence["latest_private_note_ordering_id"] is not None
        and evidence["latest_private_note_ordering_id"] > anchor_id
    ):
        return "private_note_present"
    if evidence["latest_non_activity_ordering_id"] > anchor_id:
        return "newer_non_activity"
    if evidence["status_changed"] is True:
        return "status_changed"
    if evidence["assignee_changed"] is True:
        return "assignee_changed"
    return None


def build_post_delay_decision(evidence, wait_state, state_patch=None):
    binding_verified = live_reread_binding_errors(evidence, wait_state) == []
    state = {
        "expected_generation": evidence["generation"],
        "current_generation": evidence["generation"],
        "idempotency_consumed": False,
        "brand_enabled": True,
        "kill_switch": False,
        "wait_state_binding_verified": binding_verified,
    }
    state.update(state_patch or {})
    generation_matches = state["expected_generation"] == state["current_generation"]
    reason = expected_post_delay_reason(evidence, state)
    eligible = reason is None
    return {
        "schema_version": "1.0",
        "kind": "chatwoot_post_delay_decision_v1",
        "source": "post_delay_cancellation_gate",
        "decision_id": evidence["evidence_id"].replace("cwr_", "cwd_", 1),
        "evidence_ref": evidence["evidence_id"],
        "live_read_evidence": copy.deepcopy(evidence),
        "expected_generation": state["expected_generation"],
        "current_generation": state["current_generation"],
        "generation_matches": generation_matches,
        "idempotency_consumed": state["idempotency_consumed"],
        "brand_enabled": state["brand_enabled"],
        "kill_switch": state["kill_switch"],
        "wait_state_binding_verified": state["wait_state_binding_verified"],
        "eligible_for_observation": eligible,
        "observation_draft_allowed": eligible,
        "cancellation_reason": reason,
        "evaluated_at": evidence["checked_at"],
        "transient_only": True,
        "persistence_allowed": False,
        "wait_payload_allowed": False,
        "data_table_payload_allowed": False,
        "audit_payload_allowed": False,
        "customer_egress_allowed": False,
    }


def project_durable_replay_record(evidence):
    """Project the one derived replay value that may outlive transient ingress evidence."""

    return {"replay_key_fingerprint": evidence["replay_key_fingerprint"]}


def project_durable_event_identity(evidence):
    """Business dedup is a separate store/key space from exact-request replay."""

    return {"event_identity_fingerprint": evidence["event_identity_fingerprint"]}


def project_durable_decision_outcome(decision):
    """Project outcome, reason, and opaque references without live API evidence."""

    return {
        "decision_ref": decision["decision_id"],
        "evidence_ref": decision["evidence_ref"],
        "outcome": (
            "eligible_for_observation"
            if decision["eligible_for_observation"]
            else "cancelled"
        ),
        "reason_code": decision["cancellation_reason"],
    }


def post_delay_semantic_errors(decision, wait_state):
    """Cross-field checks required at runtime but not expressible in portable JSON Schema."""

    errors = []
    evidence = decision["live_read_evidence"]
    if decision["evidence_ref"] != evidence["evidence_id"]:
        errors.append("evidence_reference_mismatch")
    if decision["expected_generation"] != evidence["generation"]:
        errors.append("expected_generation_mismatch")
    expected_generation_match = (
        decision["expected_generation"] == decision["current_generation"]
    )
    if decision["generation_matches"] != expected_generation_match:
        errors.append("generation_comparison_mismatch")
    binding_errors = live_reread_binding_errors(evidence, wait_state)
    expected_binding = binding_errors == []
    if decision["wait_state_binding_verified"] != expected_binding:
        errors.append("wait_state_binding_result_mismatch")
    errors.extend(binding_errors)

    not_before = parse_iso(evidence["not_before"])
    read_started_at = parse_iso(evidence["read_started_at"])
    checked_at = parse_iso(evidence["checked_at"])
    evaluated_at = parse_iso(decision["evaluated_at"])
    if read_started_at < not_before:
        errors.append("read_started_before_delay_completed")
    if checked_at < read_started_at:
        errors.append("check_completed_before_read_started")
    if evaluated_at < checked_at:
        errors.append("decision_evaluated_before_evidence_completed")

    if evidence["source_verified"] is True:
        errors.extend(live_scan_semantic_errors(evidence))
        anchor_id = evidence["anchor_message_ordering_id"]
        latest_inbound_id = evidence["latest_inbound_ordering_id"]
        anchor_is_latest = (
            evidence["anchor_message_present"] is True
            and latest_inbound_id == anchor_id
            and evidence["anchor_message_fingerprint"]
            == evidence["latest_inbound_fingerprint"]
        )
        newer_inbound = latest_inbound_id > anchor_id
        if evidence["anchor_is_latest_inbound"] != anchor_is_latest:
            errors.append("latest_inbound_comparison_mismatch")
        if evidence["newer_inbound_present"] != newer_inbound:
            errors.append("newer_inbound_comparison_mismatch")

        public_ref = evidence["latest_public_human_reply_fingerprint"]
        public_at_value = evidence["latest_public_human_reply_created_at"]
        public_source = evidence["latest_public_human_reply_created_at_source"]
        public_ordering_id = evidence["latest_public_human_reply_ordering_id"]
        public_parts = (public_ref, public_at_value, public_source, public_ordering_id)
        if not (all(part is None for part in public_parts) or all(part is not None for part in public_parts)):
            errors.append("public_human_reply_evidence_pair_mismatch")
        public_after_anchor = (
            public_ref is not None
            and public_ordering_id > anchor_id
        )
        if evidence["public_human_reply_present"] != public_after_anchor:
            errors.append("public_human_reply_comparison_mismatch")

        private_ref = evidence["latest_private_note_fingerprint"]
        private_at_value = evidence["latest_private_note_created_at"]
        private_source = evidence["latest_private_note_created_at_source"]
        private_ordering_id = evidence["latest_private_note_ordering_id"]
        private_parts = (private_ref, private_at_value, private_source, private_ordering_id)
        if not (all(part is None for part in private_parts) or all(part is not None for part in private_parts)):
            errors.append("private_note_evidence_pair_mismatch")
        private_after_anchor = (
            private_ref is not None
            and private_ordering_id > anchor_id
        )
        if evidence["private_note_present"] != private_after_anchor:
            errors.append("private_note_comparison_mismatch")

        non_activity_ref = evidence["latest_non_activity_fingerprint"]
        non_activity_at = evidence["latest_non_activity_created_at"]
        non_activity_source = evidence["latest_non_activity_created_at_source"]
        non_activity_id = evidence["latest_non_activity_ordering_id"]
        non_activity_parts = (
            non_activity_ref,
            non_activity_at,
            non_activity_source,
            non_activity_id,
        )
        if not all(part is not None for part in non_activity_parts):
            errors.append("non_activity_evidence_incomplete")
        newer_non_activity = (
            non_activity_ref is not None and non_activity_id > anchor_id
        )
        if evidence["newer_non_activity_present"] != newer_non_activity:
            errors.append("newer_non_activity_comparison_mismatch")

        status_changed = (
            evidence["baseline_status_fingerprint"]
            != evidence["current_status_fingerprint"]
        )
        assignee_changed = (
            evidence["baseline_assignee_fingerprint"]
            != evidence["current_assignee_fingerprint"]
        )
        if evidence["status_changed"] != status_changed:
            errors.append("status_comparison_mismatch")
        if evidence["assignee_changed"] != assignee_changed:
            errors.append("assignee_comparison_mismatch")

    state = {
        "expected_generation": decision["expected_generation"],
        "current_generation": decision["current_generation"],
        "idempotency_consumed": decision["idempotency_consumed"],
        "brand_enabled": decision["brand_enabled"],
        "kill_switch": decision["kill_switch"],
        "wait_state_binding_verified": decision["wait_state_binding_verified"],
    }
    expected_reason = expected_post_delay_reason(evidence, state)
    if decision["cancellation_reason"] != expected_reason:
        errors.append("cancellation_reason_mismatch")
    expected_eligible = expected_reason is None
    if decision["eligible_for_observation"] != expected_eligible:
        errors.append("eligibility_mismatch")
    if decision["observation_draft_allowed"] != expected_eligible:
        errors.append("draft_gate_mismatch")
    return errors


class ChatwootIngressAndRereadContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schemas = {
            schema_name(path): read_json(path)
            for path in sorted(SCHEMA_DIR.glob("*.schema.json"))
        }
        cls.vectors = read_json(
            FIXTURE_DIR / "chatwoot-webhook-signature-vectors.json"
        )

    def assert_schema_valid(self, name, document):
        errors = validate(document, self.schemas[name], self.schemas)
        self.assertEqual(errors, [], "\n".join(errors))

    def assert_schema_invalid(self, name, document):
        self.assertTrue(validate(document, self.schemas[name], self.schemas))

    def test_public_vector_creates_exact_sanitized_topology_evidence(self):
        vector = self.vectors["vectors"][0]
        evidence = verify_signed_ingress(
            raw_body=vector["raw_body"],
            timestamp=vector["timestamp"],
            signature_header=vector["signature"],
            secret=self.vectors["public_test_secret"],
            now=1786450300,
            replay_keys=set(),
            delivery_header="public-test-delivery-a",
        )
        self.assertEqual(
            evidence,
            read_json(
                FIXTURE_DIR
                / "valid"
                / "chatwoot-ingress-verification--accepted.json"
            ),
        )
        self.assert_schema_valid("chatwoot-ingress-verification", evidence)
        self.assertIs(evidence["normalization_allowed"], True)
        self.assertEqual(
            evidence["delivery_id_source"], "untrusted_header_metadata"
        )
        self.assertIs(evidence["delivery_id_trusted"], False)

    def test_signature_is_over_exact_raw_bytes_and_replay_is_body_bound(self):
        vector = self.vectors["vectors"][1]
        accepted = verify_signed_ingress(
            raw_body=vector["raw_body"],
            timestamp=vector["timestamp"],
            signature_header=vector["signature"],
            secret=self.vectors["public_test_secret"],
            now=int(vector["timestamp"]) + 1,
            replay_keys=set(),
            delivery_header="public-test-delivery-a",
        )
        compact = json.dumps(
            json.loads(vector["raw_body"]), ensure_ascii=False, separators=(",", ":")
        )
        rejected = verify_signed_ingress(
            raw_body=compact,
            timestamp=vector["timestamp"],
            signature_header=vector["signature"],
            secret=self.vectors["public_test_secret"],
            now=int(vector["timestamp"]) + 1,
            replay_keys=set(),
            delivery_header="public-test-delivery-a",
        )
        self.assert_schema_valid("chatwoot-ingress-verification", accepted)
        self.assert_schema_valid("chatwoot-ingress-verification", rejected)
        self.assertEqual(rejected["reason_code"], "signature_mismatch")
        self.assertIs(rejected["normalization_allowed"], False)
        self.assertEqual(
            accepted["delivery_id_fingerprint"], rejected["delivery_id_fingerprint"]
        )
        self.assertNotEqual(accepted["body_sha256"], rejected["body_sha256"])
        self.assertIsNotNone(accepted["replay_key_fingerprint"])
        self.assertNotEqual(
            accepted["replay_key_fingerprint"], accepted["delivery_id_fingerprint"]
        )

    def test_changing_untrusted_delivery_header_cannot_escape_replay_guard(self):
        vector = self.vectors["vectors"][0]
        replay_keys = set()
        common = {
            "raw_body": vector["raw_body"],
            "timestamp": vector["timestamp"],
            "signature_header": vector["signature"],
            "secret": self.vectors["public_test_secret"],
            "now": int(vector["timestamp"]),
            "replay_keys": replay_keys,
        }
        first = verify_signed_ingress(
            **common, delivery_header="public-test-delivery-a"
        )
        changed_header = verify_signed_ingress(
            **common, delivery_header="public-test-delivery-b"
        )
        self.assert_schema_valid("chatwoot-ingress-verification", first)
        self.assert_schema_valid("chatwoot-ingress-verification", changed_header)
        self.assertIs(first["accepted"], True)
        self.assertEqual(changed_header["reason_code"], "duplicate_delivery")
        self.assertEqual(
            first["replay_key_fingerprint"],
            changed_header["replay_key_fingerprint"],
        )
        expected_replay_key = hashlib.sha256(
            (
                f"{vector['signature']}:{vector['timestamp']}:"
                f"{first['body_sha256']}"
            ).encode("utf-8")
        ).hexdigest()
        self.assertEqual(first["replay_key_fingerprint"], expected_replay_key)
        self.assertNotEqual(
            first["delivery_id_fingerprint"],
            changed_header["delivery_id_fingerprint"],
        )
        self.assertIs(first["delivery_id_trusted"], False)
        self.assertIs(changed_header["delivery_id_trusted"], False)

    def test_payload_size_is_rejected_before_parse_or_hmac(self):
        for raw_body, expected_reason in (
            ("", "payload_empty"),
            ("x" * (MAX_RAW_BODY_SIZE_BYTES + 1), "payload_too_large"),
        ):
            with self.subTest(reason=expected_reason):
                evidence = verify_signed_ingress(
                    raw_body=raw_body,
                    timestamp="1786450000",
                    signature_header="sha256=" + "0" * 64,
                    secret=None,
                    now=1786450000,
                    replay_keys=set(),
                )
                self.assert_schema_valid("chatwoot-ingress-verification", evidence)
                self.assertEqual(evidence["reason_code"], expected_reason)
                self.assertIs(evidence["accepted"], False)
                self.assertIs(evidence["normalization_allowed"], False)
                self.assertIsNone(evidence["body_sha256"])
                self.assertIsNone(evidence["delivery_id_source"])
                self.assertIsNone(evidence["delivery_id_fingerprint"])
                self.assertIsNone(evidence["event_timestamp"])
                self.assertIsNone(evidence["replay_key_fingerprint"])
                self.assertIs(evidence["signature_verified"], False)
                self.assertIs(evidence["timestamp_verified"], False)
                self.assertIs(evidence["replay_protection_verified"], False)
                self.assertEqual(
                    evidence["raw_body_size_bytes"], len(raw_body.encode("utf-8"))
                )
                self.assertNotIn("raw_body", evidence)

    def test_timestamp_and_replay_fail_closed(self):
        vector = self.vectors["vectors"][0]
        common = {
            "raw_body": vector["raw_body"],
            "timestamp": vector["timestamp"],
            "signature_header": vector["signature"],
            "secret": self.vectors["public_test_secret"],
        }
        stale = verify_signed_ingress(
            **common, now=int(vector["timestamp"]) + 301, replay_keys=set()
        )
        future = verify_signed_ingress(
            **common, now=int(vector["timestamp"]) - 61, replay_keys=set()
        )
        malformed = verify_signed_ingress(
            **{**common, "timestamp": "not-a-time"},
            now=int(vector["timestamp"]),
            replay_keys=set(),
        )
        replay_keys = set()
        first = verify_signed_ingress(
            **common, now=int(vector["timestamp"]), replay_keys=replay_keys
        )
        duplicate = verify_signed_ingress(
            **common, now=int(vector["timestamp"]), replay_keys=replay_keys
        )
        unavailable = verify_signed_ingress(
            **common,
            now=int(vector["timestamp"]),
            replay_keys=set(),
            replay_store_available=False,
        )
        for evidence, reason in (
            (stale, "timestamp_stale"),
            (future, "timestamp_future"),
            (malformed, "timestamp_malformed"),
            (duplicate, "duplicate_delivery"),
            (unavailable, "replay_store_unavailable"),
        ):
            with self.subTest(reason=reason):
                self.assert_schema_valid("chatwoot-ingress-verification", evidence)
                self.assertIs(evidence["accepted"], False)
                self.assertIs(evidence["normalization_allowed"], False)
                self.assertEqual(evidence["reason_code"], reason)
        self.assertIs(first["accepted"], True)

    def test_payload_claims_cannot_manufacture_topology_evidence(self):
        accepted_fixture = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-ingress-verification--accepted.json"
        )
        raw_body = json.dumps(
            {
                "event": "message_created",
                "trusted_ingress": accepted_fixture,
                "signature_verified": True,
                "replay_protection_verified": True,
            },
            separators=(",", ":"),
        )
        evidence = verify_signed_ingress(
            raw_body=raw_body,
            timestamp="1786450000",
            signature_header="sha256=" + "0" * 64,
            secret=self.vectors["public_test_secret"],
            now=1786450000,
            replay_keys=set(),
        )
        self.assertEqual(evidence["reason_code"], "signature_mismatch")
        self.assertIs(evidence["accepted"], False)
        self.assertNotIn("trusted_ingress", evidence)
        self.assertNotIn("payload", evidence)

    def test_ingress_schema_rejects_raw_body_and_inconsistent_success(self):
        accepted = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-ingress-verification--accepted.json"
        )
        raw_leak = copy.deepcopy(accepted)
        raw_leak["raw_body"] = "forbidden"
        self.assert_schema_invalid("chatwoot-ingress-verification", raw_leak)

        inconsistent = copy.deepcopy(accepted)
        inconsistent["signature_verified"] = False
        self.assert_schema_invalid("chatwoot-ingress-verification", inconsistent)

        missing_verified_timestamp = copy.deepcopy(accepted)
        missing_verified_timestamp["event_timestamp"] = None
        self.assert_schema_invalid(
            "chatwoot-ingress-verification", missing_verified_timestamp
        )

        spoofed_source = copy.deepcopy(accepted)
        spoofed_source["source"] = "payload_claim"
        self.assert_schema_invalid("chatwoot-ingress-verification", spoofed_source)

        forged_header_trust = copy.deepcopy(accepted)
        forged_header_trust["delivery_id_trusted"] = True
        self.assert_schema_invalid(
            "chatwoot-ingress-verification", forged_header_trust
        )

    def test_request_replay_and_business_event_identity_are_independent(self):
        payload = {
            "event": "message_created",
            "account": {"id": 179973},
            "inbox": {"id": 128058},
            "conversation": {"id": "700001", "inbox_id": 128058},
            "id": "900001",
        }
        raw_body = json.dumps(payload, separators=(",", ":"))
        replay_keys = set()
        results = []
        for timestamp, delivery in (
            ("1786450000", "unsigned-delivery-a"),
            ("1786450040", "unsigned-delivery-b"),
        ):
            signature = sign(self.vectors["public_test_secret"], timestamp, raw_body)
            ingress = verify_signed_ingress(
                raw_body=raw_body,
                timestamp=timestamp,
                signature_header=signature,
                secret=self.vectors["public_test_secret"],
                now=int(timestamp),
                replay_keys=replay_keys,
                delivery_header=delivery,
            )
            identity = build_event_identity_evidence(
                raw_body=raw_body,
                ingress_evidence=ingress,
                secret=PUBLIC_EVENT_IDENTITY_TEST_KEY,
                key_version=PUBLIC_EVENT_IDENTITY_KEY_VERSION,
            )
            self.assert_schema_valid("chatwoot-ingress-verification", ingress)
            self.assert_schema_valid("chatwoot-event-identity-evidence", identity)
            results.append((ingress, identity))

        first_ingress, first_identity = results[0]
        second_ingress, second_identity = results[1]
        self.assertNotEqual(
            first_ingress["replay_key_fingerprint"],
            second_ingress["replay_key_fingerprint"],
        )
        self.assertEqual(
            first_identity["event_identity_fingerprint"],
            second_identity["event_identity_fingerprint"],
        )
        self.assertEqual(
            first_identity,
            read_json(
                FIXTURE_DIR
                / "valid"
                / "chatwoot-event-identity-evidence--synthetic.json"
            ),
        )
        business_dedup = {first_identity["event_identity_fingerprint"]}
        self.assertIn(second_identity["event_identity_fingerprint"], business_dedup)
        self.assertEqual(
            project_durable_replay_record(first_ingress).keys(),
            {"replay_key_fingerprint"},
        )
        self.assertEqual(
            project_durable_event_identity(first_identity).keys(),
            {"event_identity_fingerprint"},
        )
        self.assertNotEqual(
            project_durable_replay_record(first_ingress),
            project_durable_event_identity(first_identity),
        )

    def test_event_identity_is_bound_to_verified_raw_body_but_not_json_serialization(self):
        payload = {
            "event": "message_created",
            "account": {"id": 179973},
            "inbox": {"id": 128058},
            "conversation": {"id": 700001, "inbox_id": 128058},
            "id": 900001,
        }
        raw_a = json.dumps(payload, separators=(",", ":"))
        raw_b = json.dumps(
            {
                "id": 900001,
                "conversation": {"inbox_id": 128058, "id": "700001"},
                "inbox": {"id": 128058},
                "account": {"id": 179973},
                "event": "message_created",
                "brand": "untrusted-payload-claim",
                "channel": "untrusted-payload-claim",
            },
            indent=2,
        )

        evidences = []
        for index, raw_body in enumerate((raw_a, raw_b)):
            timestamp = str(1786450100 + index)
            ingress = verify_signed_ingress(
                raw_body=raw_body,
                timestamp=timestamp,
                signature_header=sign(
                    self.vectors["public_test_secret"], timestamp, raw_body
                ),
                secret=self.vectors["public_test_secret"],
                now=int(timestamp),
                replay_keys=set(),
                delivery_header=f"unsigned-{index}",
            )
            evidences.append(
                (
                    ingress,
                    build_event_identity_evidence(
                        raw_body=raw_body,
                        ingress_evidence=ingress,
                        secret=PUBLIC_EVENT_IDENTITY_TEST_KEY,
                        key_version=PUBLIC_EVENT_IDENTITY_KEY_VERSION,
                    ),
                )
            )

        self.assertNotEqual(evidences[0][0]["body_sha256"], evidences[1][0]["body_sha256"])
        self.assertEqual(
            evidences[0][1]["event_identity_fingerprint"],
            evidences[1][1]["event_identity_fingerprint"],
        )
        with self.assertRaisesRegex(ValueError, "verified_ingress_body_mismatch"):
            build_event_identity_evidence(
                raw_body=raw_b,
                ingress_evidence=evidences[0][0],
                secret=PUBLIC_EVENT_IDENTITY_TEST_KEY,
                key_version=PUBLIC_EVENT_IDENTITY_KEY_VERSION,
            )

    def test_event_identity_fields_aliases_safe_integers_and_key_rotation(self):
        base = {
            "event": "message_created",
            "account": {"id": 179973},
            "inbox": {"id": 128058},
            "conversation": {"id": "700001", "inbox_id": 128058},
            "id": "900001",
        }
        base_fingerprint = event_identity_fingerprint(
            base, PUBLIC_EVENT_IDENTITY_TEST_KEY
        )
        for mutation in (
            {"conversation": {"id": "700002", "inbox_id": 128058}},
            {"id": "900002"},
            {"inbox": {"id": 128326}, "conversation": {"id": "700001", "inbox_id": 128326}},
        ):
            changed = copy.deepcopy(base)
            changed.update(mutation)
            self.assertNotEqual(
                event_identity_fingerprint(changed, PUBLIC_EVENT_IDENTITY_TEST_KEY),
                base_fingerprint,
            )

        changed_account_tuple = canonical_event_identity_tuple(base)
        changed_account_tuple["account_id"] = 179974
        self.assertNotEqual(
            event_identity_fingerprint_from_tuple(
                changed_account_tuple, PUBLIC_EVENT_IDENTITY_TEST_KEY
            ),
            base_fingerprint,
        )

        existing_old_record = event_identity_fingerprint(
            base, PUBLIC_EVENT_IDENTITY_RETAINED_TEST_KEY
        )
        now = 1786450000
        dedup_ttl = 7 * 24 * 60 * 60
        keyring = {
            "synthetic-event-identity-v2": {
                "state": "active",
                "secret": PUBLIC_EVENT_IDENTITY_TEST_KEY,
            },
            "synthetic-event-identity-v1": {
                "state": "retained",
                "secret": PUBLIC_EVENT_IDENTITY_RETAINED_TEST_KEY,
                "retain_until": now + dedup_ttl,
            },
        }
        duplicate = dual_read_business_dedup(
            payload=base,
            keyring=keyring,
            required_prior_versions={"synthetic-event-identity-v1"},
            existing_event_keys={existing_old_record},
            now=now,
            dedup_ttl=dedup_ttl,
        )
        self.assertEqual(duplicate["status"], "duplicate")
        self.assertIs(duplicate["lookup_verified"], True)
        self.assertIs(duplicate["unique"], False)
        self.assertIs(duplicate["duplicate"], True)
        self.assertEqual(
            duplicate["matched_key_version"], "synthetic-event-identity-v1"
        )

        missing_prior = copy.deepcopy(keyring)
        missing_prior.pop("synthetic-event-identity-v1")
        missing_result = dual_read_business_dedup(
                payload=base,
                keyring=missing_prior,
                required_prior_versions={"synthetic-event-identity-v1"},
                existing_event_keys={existing_old_record},
                now=now,
                dedup_ttl=dedup_ttl,
        )
        self.assertEqual(missing_result["status"], "required_prior_key_missing")
        expired_prior = copy.deepcopy(keyring)
        expired_prior["synthetic-event-identity-v1"]["retain_until"] = now
        expired_result = dual_read_business_dedup(
                payload=base,
                keyring=expired_prior,
                required_prior_versions={"synthetic-event-identity-v1"},
                existing_event_keys={existing_old_record},
                now=now,
                dedup_ttl=dedup_ttl,
        )
        self.assertEqual(
            expired_result["status"], "prior_key_retention_insufficient"
        )
        invalid_keyring = copy.deepcopy(keyring)
        invalid_keyring["synthetic-event-identity-v1"]["state"] = "active"
        invalid_keyring_result = dual_read_business_dedup(
            payload=base,
            keyring=invalid_keyring,
            required_prior_versions={"synthetic-event-identity-v1"},
            existing_event_keys={existing_old_record},
            now=now,
            dedup_ttl=dedup_ttl,
        )
        self.assertEqual(invalid_keyring_result["status"], "keyring_invalid")

        for result in (missing_result, expired_result, invalid_keyring_result):
            with self.subTest(failed_lookup=result["status"]):
                self.assertIs(result["lookup_verified"], False)
                self.assertIs(result["unique"], False)
                self.assertIsNone(result["duplicate"])
                self.assertIsNone(result["matched_key_version"])
                self.assertEqual(result["candidate_fingerprints"], {})

        verified_unique = dual_read_business_dedup(
            payload=base,
            keyring=keyring,
            required_prior_versions={"synthetic-event-identity-v1"},
            existing_event_keys=set(),
            now=now,
            dedup_ttl=dedup_ttl,
        )
        self.assertEqual(verified_unique["status"], "unique")
        self.assertIs(verified_unique["lookup_verified"], True)
        self.assertIs(verified_unique["unique"], True)
        self.assertIs(verified_unique["duplicate"], False)

        invalid_payloads = []
        conflicting_alias = copy.deepcopy(base)
        conflicting_alias["message_id"] = "900002"
        invalid_payloads.append(conflicting_alias)
        leading_zero = copy.deepcopy(base)
        leading_zero["id"] = "0900001"
        invalid_payloads.append(leading_zero)
        unsafe = copy.deepcopy(base)
        unsafe["id"] = "9007199254740992"
        invalid_payloads.append(unsafe)
        malformed_container = copy.deepcopy(base)
        malformed_container["conversation"] = None
        malformed_container["conversation_id"] = "700001"
        invalid_payloads.append(malformed_container)
        null_canonical = copy.deepcopy(base)
        null_canonical["account"] = {"id": None}
        null_canonical["account_id"] = 179973
        invalid_payloads.append(null_canonical)
        missing_canonical = copy.deepcopy(base)
        missing_canonical["account"] = {}
        missing_canonical["account_id"] = 179973
        invalid_payloads.append(missing_canonical)
        null_conversation_route = copy.deepcopy(base)
        null_conversation_route["conversation"]["inbox_id"] = None
        invalid_payloads.append(null_conversation_route)
        null_conversation_account = copy.deepcopy(base)
        null_conversation_account["conversation"]["account_id"] = None
        invalid_payloads.append(null_conversation_account)

        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError):
                    canonical_event_identity_tuple(payload)

    def test_chatwoot_source_timestamps_normalize_before_comparison(self):
        self.assertEqual(
            normalize_chatwoot_timestamp("2020-03-03 13:05:57 UTC"),
            "2020-03-03T13:05:57Z",
        )
        self.assertEqual(
            normalize_chatwoot_timestamp(1786450211),
            "2026-08-11T12:10:11Z",
        )
        self.assertIsNone(normalize_chatwoot_timestamp("2026-08-11 12:10:11"))

    def test_clear_live_reread_and_decision_are_strict_and_ordered(self):
        evidence = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-live-reread-evidence--clear.json"
        )
        wait_state = read_json(
            FIXTURE_DIR / "valid" / "delayed-observation-state--waiting.json"
        )
        decision = build_post_delay_decision(evidence, wait_state)
        self.assert_schema_valid("chatwoot-live-reread-evidence", evidence)
        self.assert_schema_valid("chatwoot-post-delay-decision", decision)
        self.assertEqual(
            decision,
            read_json(
                FIXTURE_DIR / "valid" / "chatwoot-post-delay-decision--clear.json"
            ),
        )
        self.assertEqual(post_delay_semantic_errors(decision, wait_state), [])
        self.assertEqual(live_reread_binding_errors(evidence, wait_state), [])
        self.assertEqual(evidence["source"], "chatwoot_live_api_topology")
        self.assertIs(decision["eligible_for_observation"], True)
        self.assertIs(decision["customer_egress_allowed"], False)

    def test_wait_fingerprint_and_baseline_refs_bind_live_reread(self):
        wait_state = read_json(
            FIXTURE_DIR / "valid" / "delayed-observation-state--waiting.json"
        )
        evidence = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-live-reread-evidence--clear.json"
        )
        self.assertEqual(
            wait_state["wait_state_fingerprint"],
            recompute_wait_state_fingerprint(wait_state),
        )
        self.assertEqual(
            wait_state["baseline_fingerprint_key_version"], "synthetic-v1"
        )
        self.assertEqual(
            wait_state["baseline_status_fingerprint"],
            SYNTHETIC_BASELINE_STATUS_FINGERPRINT,
        )
        self.assertEqual(
            wait_state["baseline_assignee_fingerprint"],
            SYNTHETIC_BASELINE_ASSIGNEE_FINGERPRINT,
        )
        self.assertTrue(
            {"status", "assignee", "assignee_id", "owner_id"}.isdisjoint(wait_state)
        )
        self.assertEqual(live_reread_binding_errors(evidence, wait_state), [])

        tampered_wait = copy.deepcopy(wait_state)
        tampered_wait["generation"] = 2
        self.assertIn(
            "wait_state_fingerprint_invalid",
            live_reread_binding_errors(evidence, tampered_wait),
        )

        for field, expected_error in (
            ("wait_state_fingerprint", "wait_state_fingerprint_mismatch"),
            (
                "baseline_fingerprint_key_version",
                "baseline_fingerprint_key_version_mismatch",
            ),
            (
                "baseline_status_fingerprint",
                "baseline_status_fingerprint_mismatch",
            ),
            (
                "baseline_assignee_fingerprint",
                "baseline_assignee_fingerprint_mismatch",
            ),
        ):
            tampered_evidence = copy.deepcopy(evidence)
            tampered_evidence[field] = (
                "synthetic-v2"
                if field == "baseline_fingerprint_key_version"
                else "0" * 64
            )
            with self.subTest(tampered_evidence=field):
                self.assertIn(
                    expected_error,
                    live_reread_binding_errors(tampered_evidence, wait_state),
                )

    def test_complete_post_delay_cancellation_matrix_is_fail_closed(self):
        base = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-live-reread-evidence--clear.json"
        )
        matrix = read_json(
            FIXTURE_DIR / "chatwoot-live-reread-cancellation-matrix.json"
        )
        wait_state = read_json(
            FIXTURE_DIR / "valid" / "delayed-observation-state--waiting.json"
        )
        self.assertEqual(len(matrix), 12)
        for case in matrix:
            evidence = copy.deepcopy(base)
            evidence.update(case["evidence_patch"])
            decision = build_post_delay_decision(
                evidence, wait_state, case["state_patch"]
            )
            with self.subTest(case=case["name"]):
                self.assert_schema_valid("chatwoot-live-reread-evidence", evidence)
                self.assert_schema_valid("chatwoot-post-delay-decision", decision)
                self.assertEqual(
                    decision["cancellation_reason"], case["expected_reason"]
                )
                self.assertEqual(
                    post_delay_semantic_errors(decision, wait_state), []
                )
                self.assertIs(decision["eligible_for_observation"], False)
                self.assertIs(decision["observation_draft_allowed"], False)
                self.assertIs(decision["customer_egress_allowed"], False)

    def test_wait_anchor_is_authenticated_by_event_and_message_hmac(self):
        wait_state = read_json(
            FIXTURE_DIR / "valid" / "delayed-observation-state--waiting.json"
        )
        evidence = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-live-reread-evidence--clear.json"
        )
        self.assertEqual(
            wait_state["event_identity_fingerprint"],
            recompute_synthetic_wait_event_identity(wait_state),
        )
        self.assertEqual(
            wait_state["message_fingerprint"],
            recompute_synthetic_anchor_message_fingerprint(wait_state),
        )

        substituted_wait = copy.deepcopy(wait_state)
        substituted_wait["anchor_message_id"] = "900002"
        substituted_wait["wait_state_fingerprint"] = recompute_wait_state_fingerprint(
            substituted_wait
        )
        substituted_evidence = copy.deepcopy(evidence)
        substituted_evidence["anchor_message_id"] = "900002"
        substituted_evidence["anchor_message_ordering_id"] = 900002
        substituted_evidence["wait_state_fingerprint"] = substituted_wait[
            "wait_state_fingerprint"
        ]
        errors = live_reread_binding_errors(
            substituted_evidence, substituted_wait
        )
        self.assertIn("wait_event_identity_anchor_mismatch", errors)
        self.assertIn("wait_message_fingerprint_mismatch", errors)

    def test_bounded_scan_counts_raw_rows_before_validation_and_never_paginates(self):
        anchor_fingerprint = (
            "e58778e190933f4362cbb155dcc0a3d39866c9cb59be701c75751eae5eaf3a5a"
        )

        def row(
            message_id,
            *,
            account_id=179973,
            inbox_id=128058,
            message_type=0,
            private=False,
        ):
            return {
                "id": message_id,
                "account_id": account_id,
                "inbox_id": inbox_id,
                "conversation_id": 700001,
                "message_type": message_type,
                "private": private,
                "created_at": 1786448669,
                "message_fingerprint": (
                    anchor_fingerprint if message_id == 900001 else f"{message_id:064x}"[-64:]
                ),
            }

        common = {
            "account_id": 179973,
            "inbox_id": 128058,
            "conversation_id": 700001,
            "anchor_message_id": 900001,
            "anchor_fingerprint": anchor_fingerprint,
        }
        clear = evaluate_bounded_chatwoot_scan([row(900001)], **common)
        self.assertEqual(clear["status"], "verified")
        self.assertEqual(
            clear["set_fingerprint"],
            "7007616b0a6cecc0200a3e778c664b3cfe3aa9d77b816c751909925a04c84f69",
        )

        raw_hundred = [row(900001 + index) for index in range(100)]
        raw_hundred[-1]["inbox_id"] = 999999
        self.assertEqual(
            evaluate_bounded_chatwoot_scan(raw_hundred, **common),
            {"status": "scan_truncated", "raw_count": 100},
        )
        self.assertEqual(
            evaluate_bounded_chatwoot_scan(raw_hundred[:100], **common)["status"],
            "scan_truncated",
        )
        self.assertEqual(
            evaluate_bounded_chatwoot_scan([row(900101)], **common)["status"],
            "anchor_missing",
        )
        attempted_split_page = [row(900101)]
        self.assertEqual(
            evaluate_bounded_chatwoot_scan(raw_hundred, **common)["status"],
            "scan_truncated",
        )
        self.assertEqual(
            evaluate_bounded_chatwoot_scan(attempted_split_page, **common)["status"],
            "anchor_missing",
        )

        cross_route = [row(900001), row(900002, inbox_id=128326)]
        self.assertEqual(
            evaluate_bounded_chatwoot_scan(cross_route, **common)["status"],
            "schema_invalid",
        )
        activity = evaluate_bounded_chatwoot_scan(
            [row(900001), row(900002, message_type=2)], **common
        )
        self.assertEqual(activity["raw_count"], 2)
        self.assertEqual(activity["highest_non_activity_id"], 900001)

        for hostile_anchor in (
            row(900001, message_type=1),
            row(900001, private=True),
            row(900001, message_type=2),
        ):
            with self.subTest(hostile_anchor=hostile_anchor):
                self.assertEqual(
                    evaluate_bounded_chatwoot_scan(
                        [hostile_anchor], **common
                    )["status"],
                    "schema_invalid",
                )

    def test_reread_tampering_truncation_and_same_second_outgoing_fail_closed(self):
        wait_state = read_json(
            FIXTURE_DIR / "valid" / "delayed-observation-state--waiting.json"
        )
        clear = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-live-reread-evidence--clear.json"
        )

        swapped = copy.deepcopy(clear)
        for field in (
            "anchor_message_fingerprint",
            "latest_inbound_fingerprint",
            "latest_non_activity_fingerprint",
            "scan_anchor_fingerprint_first",
            "scan_anchor_fingerprint_second",
        ):
            swapped[field] = "f" * 64
        swapped["scan_first_set_fingerprint"] = "e" * 64
        swapped["scan_second_set_fingerprint"] = "e" * 64
        swapped_decision = build_post_delay_decision(swapped, wait_state)
        self.assertEqual(
            swapped_decision["cancellation_reason"],
            "wait_state_binding_mismatch",
        )
        self.assert_schema_valid("chatwoot-live-reread-evidence", swapped)
        self.assert_schema_valid("chatwoot-post-delay-decision", swapped_decision)
        self.assertIn(
            "anchor_message_fingerprint_mismatch",
            post_delay_semantic_errors(swapped_decision, wait_state),
        )

        forged_outgoing = copy.deepcopy(clear)
        forged_outgoing.update(
            {
                "latest_non_activity_fingerprint": "e" * 64,
                "latest_non_activity_created_at": clear["anchor_message_created_at"],
                "latest_non_activity_created_at_source": "chatwoot_message.created_at_unix_seconds",
                "latest_non_activity_ordering_id": 900002,
                "scan_first_count": 2,
                "scan_second_count": 2,
                "scan_first_set_fingerprint": "e" * 64,
                "scan_second_set_fingerprint": "e" * 64,
                "scan_highest_message_id": 900002,
                "scan_highest_non_activity_id": 900002,
                "newer_non_activity_present": False,
            }
        )
        outgoing_decision = build_post_delay_decision(forged_outgoing, wait_state)
        self.assertEqual(outgoing_decision["cancellation_reason"], "newer_non_activity")
        self.assert_schema_invalid("chatwoot-post-delay-decision", outgoing_decision)
        self.assertIn(
            "newer_non_activity_comparison_mismatch",
            post_delay_semantic_errors(outgoing_decision, wait_state),
        )
        for automation_source in ("agent_bot", "captain", "template_automation"):
            with self.subTest(automation_source=automation_source):
                automation_decision = build_post_delay_decision(
                    forged_outgoing, wait_state
                )
                self.assertEqual(
                    automation_decision["cancellation_reason"],
                    "newer_non_activity",
                )
                self.assertIs(automation_decision["eligible_for_observation"], False)

        for field, hostile_value, semantic_error in (
            ("anchor_message_type", 1, "anchor_message_type_invalid"),
            ("anchor_private", True, "anchor_visibility_invalid"),
        ):
            hostile_anchor = copy.deepcopy(clear)
            hostile_anchor[field] = hostile_value
            hostile_decision = build_post_delay_decision(hostile_anchor, wait_state)
            with self.subTest(hostile_evidence_field=field):
                self.assert_schema_invalid(
                    "chatwoot-live-reread-evidence", hostile_anchor
                )
                self.assertEqual(
                    hostile_decision["cancellation_reason"],
                    "live_reread_unavailable",
                )
                self.assertIn(
                    semantic_error, live_scan_semantic_errors(hostile_anchor)
                )

        for field in ("scan_first_count", "scan_second_count"):
            truncated = copy.deepcopy(clear)
            truncated[field] = 100
            decision = build_post_delay_decision(truncated, wait_state)
            with self.subTest(truncated=field):
                self.assert_schema_invalid("chatwoot-live-reread-evidence", truncated)
                self.assertEqual(decision["cancellation_reason"], "live_reread_unavailable")
                self.assertTrue(
                    any("truncated" in error for error in live_scan_semantic_errors(truncated))
                )

        multipage_claim = copy.deepcopy(clear)
        multipage_claim["scan_page_lengths"] = [100, 0]
        self.assert_schema_invalid("chatwoot-live-reread-evidence", multipage_claim)

        changed_between_scans = copy.deepcopy(clear)
        changed_between_scans.update(
            {
                "scan_second_count": 2,
                "scan_second_set_fingerprint": "d" * 64,
                "scan_sets_equal": False,
                "scan_complete": False,
            }
        )
        changed_decision = build_post_delay_decision(changed_between_scans, wait_state)
        self.assertEqual(
            changed_decision["cancellation_reason"], "live_reread_unavailable"
        )
        self.assert_schema_invalid(
            "chatwoot-live-reread-evidence", changed_between_scans
        )

    def test_chatwoot_http_route_and_schema_failures_cancel_observation(self):
        clear = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-live-reread-evidence--clear.json"
        )
        wait_state = read_json(
            FIXTURE_DIR / "valid" / "delayed-observation-state--waiting.json"
        )
        unavailable_patch = read_json(
            FIXTURE_DIR / "chatwoot-live-reread-cancellation-matrix.json"
        )[0]["evidence_patch"]
        for status, http_status in (
            ("unauthorized", 401),
            ("rate_limited", 429),
            ("unavailable", None),
            ("schema_invalid", 200),
            ("not_found", 404),
        ):
            evidence = copy.deepcopy(clear)
            evidence.update(unavailable_patch)
            evidence["live_read_status"] = status
            evidence["http_status"] = http_status
            decision = build_post_delay_decision(evidence, wait_state)
            with self.subTest(status=status):
                self.assert_schema_valid("chatwoot-live-reread-evidence", evidence)
                self.assert_schema_valid("chatwoot-post-delay-decision", decision)
                self.assertEqual(
                    decision["cancellation_reason"], "live_reread_unavailable"
                )
                self.assertIs(decision["eligible_for_observation"], False)

    def test_reason_must_be_bound_to_its_actual_cancellation_flag(self):
        clear = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-post-delay-decision--clear.json"
        )
        forged = copy.deepcopy(clear)
        forged["eligible_for_observation"] = False
        forged["observation_draft_allowed"] = False
        forged["cancellation_reason"] = "brand_disabled"
        self.assert_schema_invalid("chatwoot-post-delay-decision", forged)

    def test_runtime_cross_field_guards_reject_tampered_evidence(self):
        clear = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-post-delay-decision--clear.json"
        )
        wait_state = read_json(
            FIXTURE_DIR / "valid" / "delayed-observation-state--waiting.json"
        )
        mutations = []

        mismatched_ref = copy.deepcopy(clear)
        mismatched_ref["evidence_ref"] = "cwr_other_evidence_001"
        mutations.append((mismatched_ref, "evidence_reference_mismatch"))

        mismatched_expected_generation = copy.deepcopy(clear)
        mismatched_expected_generation["expected_generation"] = 2
        mismatched_expected_generation["current_generation"] = 2
        mutations.append(
            (mismatched_expected_generation, "expected_generation_mismatch")
        )

        false_generation_result = copy.deepcopy(clear)
        false_generation_result["current_generation"] = 2
        mutations.append((false_generation_result, "generation_comparison_mismatch"))

        early_read = copy.deepcopy(clear)
        early_read["live_read_evidence"]["read_started_at"] = (
            "2026-08-11T09:04:29Z"
        )
        mutations.append((early_read, "read_started_before_delay_completed"))

        reverse_check = copy.deepcopy(clear)
        reverse_check["live_read_evidence"]["checked_at"] = (
            "2026-08-11T12:12:10Z"
        )
        mutations.append((reverse_check, "check_completed_before_read_started"))

        early_decision = copy.deepcopy(clear)
        early_decision["evaluated_at"] = "2026-08-11T12:12:11Z"
        mutations.append(
            (early_decision, "decision_evaluated_before_evidence_completed")
        )

        fake_status_change = copy.deepcopy(clear)
        fake_status_change["live_read_evidence"]["status_changed"] = True
        fake_status_change["eligible_for_observation"] = False
        fake_status_change["observation_draft_allowed"] = False
        fake_status_change["cancellation_reason"] = "status_changed"
        mutations.append((fake_status_change, "status_comparison_mismatch"))

        fake_human_reply = copy.deepcopy(clear)
        fake_human_reply["live_read_evidence"]["public_human_reply_present"] = True
        fake_human_reply["eligible_for_observation"] = False
        fake_human_reply["observation_draft_allowed"] = False
        fake_human_reply["cancellation_reason"] = "human_intervention"
        mutations.append(
            (fake_human_reply, "public_human_reply_comparison_mismatch")
        )

        for document, expected_error in mutations:
            with self.subTest(expected_error=expected_error):
                self.assertIn(
                    expected_error,
                    post_delay_semantic_errors(document, wait_state),
                )

    def test_evidence_outputs_contain_only_identifiers_fingerprints_and_results(self):
        documents = [
            read_json(
                FIXTURE_DIR
                / "valid"
                / "chatwoot-ingress-verification--accepted.json"
            ),
            read_json(
                FIXTURE_DIR
                / "valid"
                / "chatwoot-event-identity-evidence--synthetic.json"
            ),
            read_json(
                FIXTURE_DIR / "valid" / "chatwoot-live-reread-evidence--clear.json"
            ),
            read_json(
                FIXTURE_DIR / "valid" / "chatwoot-post-delay-decision--clear.json"
            ),
        ]
        prohibited_keys = {
            "raw_body",
            "raw_body_bytes",
            "raw_response",
            "response_body",
            "payload",
            "content",
            "message_body",
            "message_text",
            "sender",
            "phone",
            "email",
            "address",
            "signature",
            "signature_header",
            "secret",
            "token",
            "authorization",
            "credentials",
        }

        def visit(value):
            if isinstance(value, dict):
                for key, nested in value.items():
                    self.assertNotIn(key, prohibited_keys)
                    visit(nested)
            elif isinstance(value, list):
                for nested in value:
                    visit(nested)

        for document in documents:
            visit(document)
            encoded = json.dumps(document, ensure_ascii=False)
            self.assertNotIn(self.vectors["public_test_secret"], encoded)
            for vector in self.vectors["vectors"]:
                self.assertNotIn(vector["raw_body"], encoded)

    def test_transient_evidence_cannot_be_wait_or_durable_table_payload(self):
        ingress = read_json(
            FIXTURE_DIR
            / "valid"
            / "chatwoot-ingress-verification--accepted.json"
        )
        event_identity = read_json(
            FIXTURE_DIR
            / "valid"
            / "chatwoot-event-identity-evidence--synthetic.json"
        )
        reread = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-live-reread-evidence--clear.json"
        )
        decision = read_json(
            FIXTURE_DIR / "valid" / "chatwoot-post-delay-decision--clear.json"
        )
        for document in (ingress, event_identity, reread, decision):
            self.assertIs(document["transient_only"], True)
            self.assertIs(document["persistence_allowed"], False)
            self.assertIs(document["wait_payload_allowed"], False)
            self.assertIs(document["data_table_payload_allowed"], False)
            self.assertIs(document["audit_payload_allowed"], False)

        replay_record = project_durable_replay_record(ingress)
        self.assertEqual(
            replay_record,
            {"replay_key_fingerprint": ingress["replay_key_fingerprint"]},
        )
        replay_json = json.dumps(replay_record)
        self.assertNotIn(ingress["body_sha256"], replay_json)
        self.assertNotIn(ingress["delivery_id_fingerprint"], replay_json)

        durable_event_identity = project_durable_event_identity(event_identity)
        self.assertEqual(
            durable_event_identity,
            {
                "event_identity_fingerprint": event_identity[
                    "event_identity_fingerprint"
                ]
            },
        )
        self.assertNotIn("ingress_evidence_ref", durable_event_identity)

        durable_outcome = project_durable_decision_outcome(decision)
        self.assertEqual(
            set(durable_outcome),
            {"decision_ref", "evidence_ref", "outcome", "reason_code"},
        )
        self.assertNotIn("live_read_evidence", durable_outcome)
        self.assertNotIn("response_fingerprint", json.dumps(durable_outcome))

        wait_state = read_json(
            FIXTURE_DIR / "valid" / "delayed-observation-state--waiting.json"
        )
        for key, transient_document in (
            ("ingress_evidence", ingress),
            ("event_identity_evidence", event_identity),
            ("live_reread_evidence", reread),
            ("post_delay_decision", decision),
        ):
            forbidden_wait = copy.deepcopy(wait_state)
            forbidden_wait[key] = transient_document
            self.assert_schema_invalid("delayed-observation-state", forbidden_wait)

        transient_fields = {
            "body_sha256",
            "delivery_id_fingerprint",
            "response_fingerprint",
            "live_read_evidence",
            "ingress_evidence",
        }
        table_schemas = {
            name: schema
            for name, schema in self.schemas.items()
            if name.endswith("table-row")
        }
        self.assertTrue(table_schemas)
        for name, schema in table_schemas.items():
            with self.subTest(table_schema=name):
                self.assertIs(schema.get("additionalProperties"), False)
                self.assertTrue(
                    transient_fields.isdisjoint(schema.get("properties", {}))
                )


if __name__ == "__main__":
    unittest.main()
