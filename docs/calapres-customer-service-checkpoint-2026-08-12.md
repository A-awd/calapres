# Calapres customer-service source checkpoint — 2026-08-12

Status: preserved work in progress; source-only; not approved for import, credential binding,
publication, activation, model calls, durable writes, or customer egress.

## Why this checkpoint exists

This checkpoint preserves the complete Calapres-only customer-service work completed after GitHub
revision `bfb191c1d1c573e2911df46661246e37b2ec808d`. It is intentionally isolated from `main` so the
large unfinished source set can be resumed without rebuilding it or misrepresenting it as a
production release.

Checkpoint branch: `agent/preserve-calapres-customer-service-checkpoint`

## Preserved implementation

- the source-only Calapres Edge v2 update candidate targeting existing workflow
  `e442GlRmKP4IO8pm` only;
- signed Chatwoot ingress stages, same-item native-Crypto boundaries, transport replay and stable
  business-event identities;
- identifiers-only waiting, bounded double Chatwoot re-read, generation cancellation, due-job
  recovery, and best-effort four-inbox reconciliation building blocks;
- a provider-neutral atomic-storage contract with thirteen logical operations, an in-memory
  concurrency reference, a fixed-function PostgreSQL adapter, and migrations `0001`–`0007`;
- separated signed-webhook, reconciliation, and owner database roles;
- deterministic brand-context compilation, fixed trust pins, provider-neutral model contracts,
  adversarial sanitization, and deterministic approved-response rendering;
- read-only Shopify identity adapter contracts, strict schemas, synthetic fixtures, CI source, and
  security/concurrency tests;
- decision 0011 and the accompanying pilot, operations, and provider-evaluation documentation.

## Exact stop point

- Current Edge v2 source SHA-256:
  `de60f93cf038307a1ed56389831aa2dbf81dc1327c5c42b06ce4fdcab9224756`.
- The deployment manifest still pins the prior SHA-256
  `3d5de2eaa8b87deb35601c072e3b2c2590dc7fe02911fb1395b5c66ba91b82bd`.
- Current Node suite: 225 of 226 tests pass. The single failure is that intentional stale-manifest
  mismatch.
- Current Python suite runs 92 tests and reports two failures with the same root cause: the direct
  manifest assertion and the Node-wrapper assertion.
- The account-wide reconciliation building blocks and database operations are preserved, but the
  final reconciliation graph has not yet been integrated and frozen inside Edge v2.
- `customer-service-release-lock.json` has not been emitted because the source is not frozen.

## Live boundary at checkpoint time

The existing live n8n Core, Edge v1, Shopify Order Index, and Owner Review Desk remain inactive and
unpublished, with no active version, no production trigger, no assigned credential, and execution
payload retention disabled. Edge v2 was not imported. No PostgreSQL instance, credential, webhook,
model connection, Shopify scope, customer message, private note, or customer-facing action was
created by this unfinished batch.

## Required resumption sequence

1. Resume from this checkpoint branch; do not regenerate or recreate the existing artifacts.
2. Integrate the bounded reconciliation graph into the same Edge v2 while preserving the separate
   reconciliation credential and the no-send/model-off boundary.
3. Freeze Edge v2, update the deployment-manifest hash once, and emit the final release lock.
4. Run the full Node, Python, JSON, syntax, graph, secret/PII, and independent red-team checks.
5. Update `STATE.md` and `HANDOFF.md` with the final frozen evidence.
6. Merge to `main` only after review. Live PostgreSQL compile/concurrency/role/backup validation and
   all persistent credentials remain later owner-approved gates.
