# Repository Health

## Snapshot

- Repository: `A-awd/calapres`
- Visibility: public
- Type: Shopify theme and operations repository
- Canonical branch: `main`
- Operational source of truth: Shopify

## Verified

- Theme directories contain no Supabase dependency.
- The legacy React application and Supabase stack were removed from the active tree.
- The retired supplier and database synchronization code was removed.
- Historical code remains recoverable through Git.
- Shopify-only CI validates the theme and blocks runtime Supabase reintroduction.

## Remaining hardening

- Reconcile the live theme source into `main`.
- Make `main` the deployment source without triggering an unintended live deployment.
- Validate the complete live theme after reconciliation.
- Continue secret scanning and keep customer and order data out of Git.
