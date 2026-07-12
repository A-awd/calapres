# HANDOFFS

Session log for cross-agent handoffs. Newest entry first.

## 2026-07-12 — Claude — Push recovery + supplier access probe + style-sample pipeline

**Launch-first decision:** launch with what we have, perfect the fetch layer afterwards. The push
pipeline (Supabase → Shopify, drafts) is unblocked and drained; catalog completeness (~1,081 URLs
not yet in `supplier_products`) is a follow-up fetch-layer task, not a launch blocker.

**Credential fix (Task 0) — done, no secret involved.** The push workflow `sNjYDNqXvu1o35yW`
("Calapres — Push New Products (Draft)") was failing every 5 min at node "Check Push Lock" with
`Credentials not found`. Root cause was NOT an expired key: the active workflow version's
main-path nodes referenced a stale/deleted credential id, while the error-branch node still used
the valid credential (its inserts were succeeding the whole time). Fix: re-pointed all 11
`supabaseApi` nodes to credential `Fy9EgJSOBnSspe4w` ("Supabase Calapres Service Role") and all 3
`shopifyOAuth2Api` nodes to `QLsvwO73GFsQfy0w` ("Shopify-Calapres") via MCP `setNodeCredential`,
republished. The service_role key was never revealed, pasted, or rotated.

**Push recovery (Task 1) — complete.**
- Queue drained 534 → 0 (`supplier_products` where `shopify_product_id is null and supplier_price
  is not null`). All 1,819 priced products now carry `shopify_product_id`, `shopify_variant_id`,
  `shopify_sync_status='synced'`; `shopify_products` has 1,819 rows.
- 2 transient mid-drain errors (one Supabase RPC 5xx, one Shopify create 4xx) self-healed on
  retry runs; the tag-lookup-then-update path dedupes correctly.
- Adjacent bug found + fixed: on an EMPTY batch the workflow never reached "Release Push Lock"
  (n8n zero-item semantics), leaving a stale `running` row in `sync_runs` that made every later
  run skip. Added `alwaysOutputData` on "Get Unpushed Batch" + new "Batch Empty?" IF that routes
  the empty case straight to "Release Push Lock"; republished; cleared the one stale lock row
  (status → completed, no deletion).
- Set `resolved_at` on all open `push_error` rows in `sync_errors`: 7,141 rows (the 7,137 stale
  ones plus 4 from the recovery window). Timestamp update only; nothing deleted.

**Fetch-layer plan (Tasks 2–3).** Probe workflow `W72xf2pT9mFx5mNb` ("Calapres — Supplier Access
Probe", manual, temp) fetched from n8n Cloud: robots.txt, sitemap.xml, child sitemap-1.xml, and a
product page — all HTTP 200 with full bodies, with BOTH default UA and Chrome UA + Accept-Language ar.
Product page returns full HTML (166 KB, JSON-LD + Salla inline data) even with default UA.
=> Direct HTTP from n8n stays the primary (and only needed) fetch layer. Firecrawl NOT installed;
Task 3 skipped by its own condition. Note: supplier robots.txt sets `Content-Signal: ai-train=no,
search=yes, ai-input=yes` and allows crawling. Child sitemaps are small (sitemap-1.xml ≈ 3 KB) —
sitemap-based discovery for the ~1,081 missing URLs should read the sitemap INDEX and then walk
child sitemaps; keep BbIuB2zL6HIxRlYh pull pattern (batched, junk-safe, never delete).

**Style samples (Task 4) — built, blocked on credits.** Workflow `58usEQ0UOJFzZ2Hw`
("Calapres — Style Samples (Warm Light Luxury)", manual, gated, NOT bulk): 4 locked-spec prompts
(one per approved surface) + supplier reference image (product 263557422 Nishane Hacivat) →
Higgsfield platform API → poll loop → 4 URLs. Endpoint discovery (probe workflow
`svCjXObuFsP3sV6T`): platform API is `POST https://platform.higgsfield.ai/v1/text2image/{model}`
with body `{"params":{prompt,input_images,aspect_ratio,...}}`, poll `GET /v1/job-sets/{id}` (v1)
or `/requests/{id}/status` (v2). Model slug on this API is `nano-banana` (no `nano-banana-pro`
slug exists there; 12 slug variants probed — the platform exposes the nano-banana family under
one slug; its param schema matches the published nano_banana_pro spec). BLOCKER: the API key in
credential `G31rYKMmDk8hyh2G` authenticates fine but the platform wallet has NO API credits —
soul dispatch returns 403 "Not enough credits"; nano-banana dispatch surfaces as 404. One owner
action needed: top up API credits at platform.higgsfield.ai (or issue a key on the account that
has them). The consumer account (Ultra plan, ~3,035 credits) is separate from platform API
credits; MCP-side generation was also attempted but generation tools require interactive
permission approval not available in the autonomous session. Once credits exist: open workflow
`58usEQ0UOJFzZ2Hw` → Execute → it outputs 4 URLs in "Style Sample Results". No other product
gets generated before Awd approves the style.

**Temp workflows kept for evidence (all manual/inactive):** `W72xf2pT9mFx5mNb` (supplier probe),
`svCjXObuFsP3sV6T` (Higgsfield endpoint probe), `58usEQ0UOJFzZ2Hw` (style samples — keep).
