# Project State

## Current phase

One Brain foundation and security reconciliation.

## Approved state

- Canonical name: calapres.
- Project type: active business commerce project.
- GitHub is the permanent source of truth.
- The repository contains useful existing implementation and history that must be preserved.
- The product scope includes an Arabic-first perfume storefront, Shopify, Supabase application components, and workflow automation.

## Safety status

The migration review identified possible historical credential exposure. The values are intentionally absent here. Until rotation, history remediation, and a fresh scan are complete, security cleanliness remains unverified.

## Next action

Rotate affected credentials outside GitHub, plan history remediation without destroying useful history, create sanitized exports of required live configuration, and reconcile outstanding branches before normal feature work resumes.

## Constraints

Do not copy live secrets, customer records, order records, raw conversations, or unsanitized automation exports into GitHub. Do not modify production systems as part of documentation migration.

## Repository synchronization evidence

- Verified: 2026-07-18
- Canonical repository: `A-awd/calapres`
- Approved default branch: `main`
- Verified effective ref: `migration/one-brain-foundation`
- Verified baseline revision: `a3b2dbd85c06fd2ebe2362c3ca5b287320af099e`
- Evidence: the One Brain documents were refreshed from that exact GitHub revision; no business code or production system was changed.
- Runtime requirement: each agent must fetch or inspect the branch tip and remote synchronization state again before work. Local working-tree state was not inferred through the connector.
