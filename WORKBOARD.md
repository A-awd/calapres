# Calapres Workboard

## Active Tasks

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Batch sync: Nawadirdior → Supabase → Shopify (workflow Vsf1Epd3ssfbw10i) | ✅ Done (160 products, executions 3844/3845/3846) | CHUNK=100, syncOffset=160 |
| 2 | Inject P735368737 (Aramis Classic EDT 110ml) via full RPC pipeline | ✅ Done (executions 3912/3913) | See proof below |

## Completed: Inject P735368737

**Workflow:** "Calapres: Inject P735368737" · id=`tUhxKPw6u2br6JAK` · 19 nodes · manualTrigger
**Credential binding note:** Credentials bind by code via `{ id, name }` explicit object in node config — no manual UI binding needed. `newCredential()` only works for AI/langchain subnodes; HTTP Request nodes require explicit credential object format.
**Execution (run 1):** 3912 · success · 2026-06-06T19:34:51Z
**Execution (run 2 / idempotency):** 3913 · success · 2026-06-06T19:35:29Z — same IDs returned, no duplication

### Supabase RPC returns (both runs identical)
| Function | Return |
|----------|--------|
| `calapres_resolve_brand` | brand_id = `386dddf2-7a6f-4a2c-9573-dc98c5b7d94d` |
| `calapres_upsert_fragrance_product` | fragrance_product_id = `70ce39ed-c034-4550-adba-18f8862272e2` |
| `calapres_upsert_product_variant` | product_variant_id = `c842fe46-4c1a-463a-bfe9-7672972373a2`, calapres_sku = `CAL-ND-P735368737`, selling_price = 272.5, compare_at_price = null |
| `calapres_link_supplier_product` | linked — same 3 IDs confirmed |

### Supabase table verification (live SELECT)
**supplier_products** (`id=32f2f461-dc25-4507-a71a-9c7550453455`):
- calapres_sku: `CAL-ND-P735368737`
- selling_price: `272.50`
- fragrance_product_id: `70ce39ed-c034-4550-adba-18f8862272e2`
- product_variant_id: `c842fe46-4c1a-463a-bfe9-7672972373a2`
- shopify_product_id: `9471021515008`
- shopify_variant_id: `48796235038976`
- shopify_handle: `عطر-اراميس-كلاسيك-او-دو-تواليت-110مل`
- shopify_sync_status: `synced`

**fragrance_products** (`id=70ce39ed-c034-4550-adba-18f8862272e2`):
- brand_id: `386dddf2-7a6f-4a2c-9573-dc98c5b7d94d`
- normalized_name: `aramis-classic-edt`
- concentration: `EDT`
- canonical_name_en: `Aramis Classic Eau de Toilette`
- canonical_name_ar: `اراميس كلاسيك او دو تواليت`

**product_variants** (`id=c842fe46-4c1a-463a-bfe9-7672972373a2`):
- calapres_sku: `CAL-ND-P735368737`
- selling_price: `272.50`
- compare_at_price: null
- size_ml: 110
- fragrance_product_id: `70ce39ed-c034-4550-adba-18f8862272e2`
- supplier_product_id: `735368737`

### Shopify live
- product_id: `9471021515008`
- status: `draft`
- variant_id: `48796235038976`
- price: `272.50`
- SKU: `CAL-ND-P735368737`
- handle: `عطر-اراميس-كلاسيك-او-دو-تواليت-110مل`

**This execution is live/runtime. No setup-only steps were required.**

## Pending Tasks
- [ ] Resume batch sync: update CHUNK=300 in workflow `Vsf1Epd3ssfbw10i`, continue from syncOffset=160
