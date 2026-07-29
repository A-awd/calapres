# Nawadir Dior retirement inventory

This is a historical audit record. Decision 0006 later retired Supabase entirely from Calapres.
Nothing in this file is an active instruction, dependency, publication gate, or authorization to
access or restore an external system.

## Verified retirement on 2026-07-27

- Eleven supplier-facing n8n workflows were deactivated and archived.
- Zero Shopify webhook subscriptions were reported.
- Supplier crawling, pricing, inventory, image ingestion, and automatic product discovery were
  prohibited.
- Existing Shopify products were preserved for gradual owner review rather than bulk deletion or
  bulk drafting.
- Historical supplier SKUs were preserved to protect variant matching, orders, inventory, and
  accounting continuity.

## Repository retirement on 2026-07-29

- The legacy React application and its Supabase client were removed.
- Supabase migrations, edge functions, configuration, generated types, SDK dependency, and lock
  files were removed.
- The retired supplier, n8n, and Supabase synchronization source was removed.
- Active project instructions were changed to direct Shopify draft, review, approval, and
  publication.

## External boundary

External historical data was not deleted. It is not an active Calapres dependency and must not be
queried during normal operations. Permanent data disposal requires a separate, exact owner
instruction.

The n8n instance was rechecked read-only on 2026-07-29. The saved Calapres Supabase credential has
eight dependent workflows; all eight are archived and inactive. No active workflow uses that
credential. The credential remains saved pending explicit deletion confirmation.

Archived n8n workflows must remain inactive and must not be restored from Git history. Any future
automation requires a new decision and a bounded Shopify-native purpose.
