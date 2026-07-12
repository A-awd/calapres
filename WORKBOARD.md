# Calapres Workboard

Coordination board for agents (Claude / Codex / Gemini). One agent per domain at a time.
Take a lock before working a domain; release it when done.

## Locks

| Domain | Status | Holder | Since | Scope |
|---|---|---|---|---|
| n8n runtime | RELEASED ✅ | Claude | 2026-07-12 | Rebuilt flow to `calapres_*` RPC model + injected one real product (735368737) live. Done. |
| Supabase schema / migrations / `sync/` | FREE (Codex domain) | — | — | NOT touched by Claude this session (read-only introspection only). |

## Result — n8n runtime (Claude), 2026-07-12

**LIVE / runtime** (actually executed on n8n Cloud, not setup-only):

- New canonical flow: **`Calapres: Nawadir Dior -> Supabase -> Shopify (RPC)`** — id **`7avGWOyfXJVrBGV9`**, 32 nodes.
  Triggers: Manual (`Manual One-Product Test` → seeds product 735368737), Schedule (`Every 6 Hours` → sitemap crawl), Error Trigger.
- Old flat-model flow **`Vsf1Epd3ssfbw10i`** → **archived** (replaced). Diagnostic flow **`q2dH9AYGBu2oaPZd`** → **archived**.
- Credentials bound **by code** via `newCredential(name, id)` — no manual UI binding needed. Proven by probe exec 3894 (HTTP 200 from Supabase + Shopify) and the full live runs. On every Supabase HTTP node: `Supabase Calapres Service Role` (`Fy9EgJSOBnSspe4w`); on both Shopify nodes: `Shopify-Calapres` (`QLsvwO73GFsQfy0w`).
- Successful one-product execution: **`29163`** (all 27 active nodes success). Idempotency re-run: **`29165`** (same IDs, PUT not create).

**Path proven:** Supplier → `supplier_products` (raw POST) → `calapres_resolve_brand` → `calapres_upsert_fragrance_product` → `calapres_upsert_product_variant` → `calapres_link_supplier_product` → `product_variants` → Shopify (one parent + one variant, `status=draft`, `sku=calapres_sku`).

**IDs (from exec 29163, confirmed in DB):**
- `supplier_products.id` = `32f2f461-dc25-4507-a71a-9c7550453455`
- `brand_id` = `386dddf2-7a6f-4a2c-9573-dc98c5b7d94d` (Aramis)
- `fragrance_product_id` = `a16c8ce5-2f1e-46a9-ac27-abd8def2e0c3` (normalized `aramis classic`, EDT, unenriched/pending)
- `product_variant_id` = `c842fe46-4c1a-463a-bfe9-7672972373a2`
- `calapres_sku` = `CAL-ND-P735368737` · `selling_price` = `272.5` · `compare_at_price` = `null`
- Shopify product `9471021515008` (draft), variant `48796235038976` (price 272.50, sku CAL-ND-P735368737), handle `عطر-اراميس-كلاسيك-او-دو-تواليت-110مل`.

**Idempotency:** after 2 runs → `brands=1, fragrances(aramis classic)=1, variants(735368737)=1, supplier_rows=1`. No duplicate parent/variant.

**Note:** the probe row `CAL-ND-P273109549` was NOT created by this work — the probe was a read-only `SELECT ... limit 1` that returned a pre-existing row. Nothing to clean up (no deletion performed; deletion is owner-approval only).

## Remaining / next

- Owner decision: for an **enriched + in_stock** product, business rules say `active` but this task's barrier says `draft`. This run left the (pre-existing, enriched) Shopify parent as `draft` and only touched price/availability/SKU (enriched guard honored). Confirm desired final status policy for enriched in-stock items.
- Optional: activate the RPC flow's Schedule trigger for recurring catalog sync (currently inactive; manual proof only).
- Second-size variant test (e.g. a 50ml of the same fragrance) to demonstrate multi-variant-under-one-parent live (DB constraints already guarantee it).
