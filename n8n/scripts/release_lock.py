#!/usr/bin/env python3
"""Build or verify the deterministic Calapres customer-service release lock.

The script is intentionally read-only. ``--emit`` prints the canonical lock to stdout so the
reviewed result can be added with the repository's normal patch workflow. ``--check`` compares a
committed lock with the current executable contracts and exits non-zero on drift.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
BRAND_ROOT = REPO_ROOT / "support" / "brands" / "calapres"
DEFAULT_LOCK = BRAND_ROOT / "customer-service-release-lock.json"


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"expected object: {path.relative_to(REPO_ROOT)}")
    return value


def manifest_release_paths(manifest_path: Path) -> list[Path]:
    manifest = read_json(manifest_path)
    current = manifest.get("current_version")
    versions = manifest.get("versions")
    if not isinstance(current, str) or not isinstance(versions, list):
        raise ValueError(f"invalid release manifest: {manifest_path.relative_to(REPO_ROOT)}")
    current_matches = [row for row in versions if isinstance(row, dict) and row.get("version") == current]
    if len(current_matches) != 1:
        raise ValueError(f"current release is not uniquely resolved: {manifest_path.relative_to(REPO_ROOT)}")
    resolved_paths: list[Path] = []
    seen_versions: set[str] = set()
    seen_paths: set[Path] = set()
    for row in versions:
        if (
            not isinstance(row, dict)
            or not isinstance(row.get("version"), str)
            or not isinstance(row.get("path"), str)
            or row["version"] in seen_versions
        ):
            raise ValueError(f"invalid or duplicate release row: {manifest_path.relative_to(REPO_ROOT)}")
        resolved = (REPO_ROOT / row["path"]).resolve()
        if REPO_ROOT not in resolved.parents or not resolved.is_file():
            raise ValueError(f"release path is outside or missing: {row['path']}")
        if resolved in seen_paths:
            raise ValueError(f"duplicate release path: {row['path']}")
        seen_versions.add(row["version"])
        seen_paths.add(resolved)
        resolved_paths.append(resolved)
    return resolved_paths


def release_paths() -> list[Path]:
    paths: set[Path] = set()
    for pattern in (
        "n8n/workflows/*.ts",
        "n8n/runtime/*.js",
        "n8n/adapters/*.js",
        "n8n/modules/*.js",
        "n8n/deployments/*.json",
        "n8n/postgres/**/*.js",
        "n8n/postgres/migrations/*.sql",
        "n8n/schemas/*.schema.json",
        "support/brands/calapres/context-trust/*.json",
    ):
        paths.update(path.resolve() for path in REPO_ROOT.glob(pattern) if path.is_file())

    paths.add((BRAND_ROOT / "registry.json").resolve())
    for relative_manifest in (
        "agent/manifest.json",
        "knowledge/manifest.json",
        "response-style/manifest.json",
        "model-policy/manifest.json",
    ):
        manifest_path = BRAND_ROOT / relative_manifest
        paths.add(manifest_path.resolve())
        paths.update(manifest_release_paths(manifest_path))

    missing = [path for path in paths if not path.is_file()]
    if missing:
        raise ValueError("missing release files: " + ", ".join(str(path) for path in missing))
    return sorted(paths, key=lambda path: path.relative_to(REPO_ROOT).as_posix())


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_json(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def build_lock() -> dict[str, Any]:
    files = []
    for path in release_paths():
        raw = path.read_bytes()
        files.append(
            {
                "path": path.relative_to(REPO_ROOT).as_posix(),
                "sha256": sha256_bytes(raw),
                "bytes": len(raw),
            }
        )

    release_payload = {
        "release_id": "calapres-customer-service-protected-reply-v1",
        "brand_id": "calapres",
        "mode": "protected_customer_reply_candidate",
        "files": files,
    }
    return {
        "schema_version": "1.0",
        **release_payload,
        "release_digest_sha256": sha256_bytes(canonical_json(release_payload)),
    }


def formatted(value: dict[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def check(lock_path: Path) -> list[str]:
    if not lock_path.is_file():
        return [f"release lock missing: {lock_path}"]
    try:
        saved = read_json(lock_path)
        expected = build_lock()
    except (OSError, ValueError, json.JSONDecodeError) as error:
        return [str(error)]
    if saved == expected:
        return []

    errors = ["customer-service release lock drifted"]
    saved_files = {
        row.get("path"): row
        for row in saved.get("files", [])
        if isinstance(row, dict) and isinstance(row.get("path"), str)
    }
    expected_files = {row["path"]: row for row in expected["files"]}
    for path in sorted(set(saved_files) | set(expected_files)):
        if path not in saved_files:
            errors.append(f"unlocked file: {path}")
        elif path not in expected_files:
            errors.append(f"stale locked file: {path}")
        elif saved_files[path] != expected_files[path]:
            errors.append(f"content drift: {path}")
    if saved.get("release_digest_sha256") != expected["release_digest_sha256"]:
        errors.append("release digest mismatch")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--emit", action="store_true")
    group.add_argument("--check", type=Path, nargs="?", const=DEFAULT_LOCK)
    args = parser.parse_args()

    if args.emit:
        print(formatted(build_lock()), end="")
        return 0

    errors = check(args.check.resolve())
    if errors:
        for error in errors:
            print(error)
        return 1
    print("Calapres customer-service release lock verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
