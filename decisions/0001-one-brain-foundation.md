# 0001 — Adopt the One Brain repository foundation

- Status: Accepted
- Scope: Repository operating model

## Decision

calapres is the single canonical name and repository for this project. GitHub is the permanent source of truth. Every meaningful session begins from the latest approved GitHub state and maintains README.md, AGENTS.md, STATE.md, HANDOFF.md, DECISIONS.md, and LAUNCHER.md.

Project operational memory remains in this repository. ai-operating-system supplies reusable global rules only. AI products are interchangeable launchers, and their local memory is non-authoritative.

## Consequences

- Useful existing code and history are preserved.
- Sensitive material and raw conversations are excluded.
- Conflicts are resolved in favor of the latest approved GitHub state or a later recorded decision.
- Security remediation must be completed before declaring the repository clean.

