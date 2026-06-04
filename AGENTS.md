# Calapres Agent Context

Read this first. This file is the durable project context for any AI agent working on Calapres (Codex, Claude, or others). Do not spend tokens re-discovering facts already recorded here unless current evidence contradicts them.

## 1. PROJECT

- Calapres (كالابريز) is a Riyadh-based Shopify store.
- Category: niche/luxury perfumes plus luxury incense/oud burners.
- It is NOT a gifting store.
- Experience: Arabic-first, RTL, premium/luxury tone.

## 2. REPO LAYOUT & BRANCHES

- `main`: sync/automation code lives in `sync/`, plus docs and this file.
- `shopify-theme`: Shopify Liquid theme synced GitHub -> Shopify.
  - Theme folders: `config/`, `layout/`, `sections/`, `snippets/`, `templates/`, `assets/`, `locales/`.
- Repo root also contains legacy React/Vite/Supabase app files from earlier work. Do not confuse those with the Shopify theme.
- HARD RULE: one agent per branch at a time.
- HARD RULE: theme work NEVER touches `sync/`; sync work NEVER touches theme files.
- State the current branch at the start of every task.

## 3. LIVE INFRA

Verified facts. Do not re-discover unless current state directly contradicts them.

- Shopify store: `unywbe-ub.myshopify.com`
- Shopify Admin: `admin.shopify.com/store/unywbe-ub`
- MAIN published theme: `OnlineStoreTheme/163004449024`
- Supplier: `nawadirdior.sa` (Salla).
- Supplier data source: public product pages only, `/<slug>/p<digits>`.
- Supplier product pages do NOT need JavaScript; category pages do.
- Supplier product data is read from meta tags / JSON-LD / inline Salla page data.
- IMPORTANT: supplier slugs can be stale or misleading. The numeric `/p<id>` is the reliable key, never the slug.
- n8n Cloud: `kunads90.app.n8n.cloud`
- n8n is the active automation system.
- Shopify product metafield definitions exist and are admin-filterable:
  - `supplier.source_url`
  - `supplier.product_id`
  - both owner type `PRODUCT`, type `single_line_text_field`

## 4. n8n CREDENTIALS

Credential IDs are stable. Never paste secrets or token values into code, docs, commits, or chat.

- Shopify OAuth2: id `QLsvwO73GFsQfy0w`, name `Shopify-Calapres`.
- Higgsfield Header Auth: id `G31rYKMmDk8hyh2G`, name `Higgsfield API ( awd-n8n )`.
- Admin API version in code: `2026-04` for REST writes.
- Shopify write pacing: about 1 request/second.

## 5. CALAPRES BUSINESS RULES

Authoritative rules. Every sync and enrichment workflow must honor these.

- PRICING:
  - `price = supplier price + 100 SAR`.
  - If supplier has a discount: `compare_at_price = original + 100`, `price = discounted + 100`.
  - `compare_at_price` must never equal `price`; set it to `null` instead.
- INVENTORY:
  - Status-only inventory.
  - `in_stock` -> Shopify product `active`, variant `inventory_policy=continue`.
  - `out_of_stock` or supplier-missing -> Shopify product `draft`, variant `inventory_policy=deny`.
  - No numeric quantities, ever.
- NEVER DELETE:
  - Missing supplier products become draft/out-of-stock.
  - They auto-return if the supplier product reappears.
  - Product deletion is permanently disabled.
- ENRICHED GUARD:
  - Products tagged `enriched` receive ONLY price + availability from recurring sync.
  - Never overwrite title, description, images, vendor, tags, metafields, or SEO for enriched products.
- TAGS:
  - Canonical imported tag: `imported-nader-dior`.
  - Supplier tag: `supplier:nawadirdior`.
  - Supplier-id tag: `supplier-id-p<id>`.
  - The 18 legacy imports also carry Arabic tag `مستورد-نوادر-ديور`.
  - All Shopify reads for imported products must query:
    `tag:imported-nader-dior OR tag:مستورد-نوادر-ديور`
- MATCHING:
  - Match by `supplier.source_url` metafield OR `supplier.product_id` numeric value OR `supplier-id-p<id>` tag.
  - All 18 existing legacy products are backfilled with `supplier.product_id`.

## 6. WORKING STYLE FOR AGENTS

AI role split:

- Claude: product architecture and design direction.
- Codex: implementation, tests, Supabase safety, and CI hardening.
- Gemini: research, critique, and second-pass review.

Owner standing rules:

- Optimize for maximum speed and complete work packages, not drip-fed single steps.
- Every task should run the full cycle in one pass: diagnose -> fix -> search related/adjacent bugs -> test -> verify -> document -> commit -> push -> concise categorized report.
- Do not stop midway for approval except for data deletion, payments, or publishing/unpublishing to live customers.
- The owner works in the browser only. Do not assume Terminal access for the owner.
- Agents may use their own shell. Any owner-facing action should be a single click, not CLI.
- The owner is highly token-sensitive. Keep reports tight.
- Do heavy work in code/n8n. Do not re-ask for info already in this file.
- Never commit secrets, Supabase service keys, auth tokens, customer data, or private business data.
- Keep dependency-free sync helpers testable offline.
- GitHub push format when token push is needed:
  `https://x-access-token:[TOKEN]@github.com/A-awd/calapres.git`
- If remote moved before push: `git pull origin <branch> --rebase`, then push.

## 7. CURRENT STATE & ROADMAP

### Done

- Theme uploaded and rendering.
- Mobile header fixed: centered logo, language moved to drawer.
- `sync/` dependency-free helpers exist for n8n Code nodes:
  - `parse-product.js`
  - `crawl-supplier.js` (3155 supplier products)
  - `pricing.js`
  - `inventory.js`
  - `reconcile.js`
  - `validate-shopify-shape.js`
  - `shopify-client.js`
  - `setup-metafield-definitions.js`
  - `backfill-existing-products.js`
- `sync/__tests__/run-tests.js`: 43 offline tests passing.
- Shopify metafield definitions created live.
- All 18 legacy imported products backfilled with `supplier.product_id`.
- `sync/backfill-map.json` complete: 18 high-confidence matches, 0 unmatched.
- Dry run generates 20 offline payloads and exact Shopify request shapes.
- `sync/config.js` is the source of truth for store domain, API versions, tags, markup, chunk size, credential ids, namespaces, and supplier constants.
- Generated n8n Code-node bundles live in `sync/n8n-build/`; Claude deploys these artifacts, Codex does not deploy live flows.
- Recurring sync is chunked by persisted offset with `CHUNK_SIZE=300`, carries crawl source URL/product id through parsing, and blocks creates without price or numeric supplier id.
- Pure enrichment helpers exist under `sync/enrich/` for Higgsfield prompts, Arabic SEO/copy, and enriched payload assembly.
- Sync CI exists in `.github/workflows/sync-ci.yml` with syntax, tests, dry-run, doc-lint, secret-scan, and generated-output checks.

### Next

- Claude redeploys/updates live n8n from `sync/n8n-build/manifest.json` and generated Code-node bundles.
- Claude wires Higgsfield live credentials to the generated enrichment nodes.
- Restore/finalize full homepage design on `shopify-theme`.
- Connect custom domain.
- Continue live operations per `sync/PRODUCTION-CHECKLIST.md`.
