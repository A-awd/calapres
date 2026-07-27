# sync

The supplier synchronization code that lived here was retired on 2026-07-27 when Nawadir Dior was
removed from the Calapres architecture. See `decisions/0002-retire-nawadir-dior.md`.

The full history remains recoverable from Git. Do not restore it. Calapres has no supplier
crawler, no supplier sync, and no automatic product discovery.

Orchestration now lives entirely in n8n, reading `public.shopify_sync_queue` in Supabase.
