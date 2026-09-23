# Operational readiness — Calapres design service (2026-09-23)

Legend:
- **Impl**: implemented in source.
- **Local**: tested in this workspace.
- **Deployed**: running where customers can reach it.
- **Live**: verified on the real storefront or store.

| Item | Impl | Local | Deployed | Live | Note |
|---|---|---|---|---|---|
| Upload path: preview, approve, cart | yes | UI suite + Chromium 390 px | backup theme only | not re-verified | This workspace cannot reach calapres.com |
| Name path UI (3/6/9, batches, restore, server approval) | yes | UI suite + Chromium 390 px (placeholder tiles) | backup theme, endpoint blank | no | Button honestly disabled until a real backend exists |
| Backup section + template | yes | section MD5 ec8d5d29… equals repo | **yes** — `templates/product.design-service.json` endpoint `/apps/calapres-design` (read back MD5 0d8c9749…, other content unchanged) | partly: the storefront preview could not be fetched here (robots.txt blocks preview URLs; no browser). Disabled state is covered by the JSDOM suite only | Primary theme untouched |
| App-proxy authentication | yes | yes (Shopify doc vector) | **yes** — app `Calapres Name Design` (426882269185), version `calapres-design-proxy-1`, scope `write_app_proxy`, installed; secret only in Docker Manager | **yes** — Claude WebFetch 2026-09-23 03:40: `https://calapres.com/apps/calapres-design/ping` → 200 `{"ok":true,"proxied":true,"generation":false}`; Codex: backend `/healthz` → `proxy:true` | |
| Sessions, quota 9 / rolling 24 h, isolation | yes | yes | no | no | |
| Reservation budget, halt, lease, queue deadline | yes | yes | no | no | Reservation policy, not an invoice cap |
| OpenAI adapter | yes | mocked fetch only | no | no | No key; no real call made |
| Screening and duplicates | yes | synthetic images | no | no | Not spelling verification |
| Write-once originals and immutable URLs | yes | yes | no | no | |
| Approval receipts and order verification (webhook, CLI) | yes | yes | no | no | CLI path needs no extra scope; webhook optional (read_orders + protected data) |
| Backup, restore, prune tooling | yes | yes | no | no | |
| **Hosting on the existing Hostinger VPS** | yes | compact compose builder tested (35/35; restore byte-identical; tamper refused) | **yes** — owner deployed Codex's compact compose in hPanel; `calapres-design` Running, init exited 0 | **Codex:** direct HTTPS `GET /healthz` returned 200 `{"ok":true,"proxy":false,"generation":false}`, valid TLS; n8n/traefik still Running. Not re-verifiable from this workspace (VPS unreachable from here) | Deployed file ≠ repo builder output byte-for-byte; same design |
| Render Blueprint (`deploy/render.yaml`) | yes | build and start simulated | not used | no | Superseded by the owner's choice of the existing VPS; no purchase |
| Server-side service secret (`SERVICE_SECRET_FILE`) | yes | generated once, 0600, reused, never logged | no | no | Never typed or transmitted |
| Closed proxy until the app exists | yes | 503 on every proxy/webhook route, healthz `proxy:false` | no | no | |
| Mounted-disk guard | yes | refuses missing / non-mounted dir; starts on a real mount | no | no | No silent ephemeral fallback |
| Signed proxy probe `GET /proxy/ping` | yes | signed 200, unsigned or tampered 401 | no | no | Live check via the storefront URL |
| Container / systemd / Caddy package (VPS alternative) | yes | file set started with Node 24; compose YAML parsed | no | no | Image not built here (no registry access) |
| Dedicated Shopify app + proxy | yes (Dev Dashboard, by Codex) | — | **yes** | **yes** (see row above) | |
| Real Arabic quality | — | — | — | **not tested** | Final bounded test after the key |
| Physical print specification | — | — | — | open | Size, format and colour are acceptance inputs |

## Status after Shopify integration (2026-09-23 03:40 Riyadh)

No infrastructure blocker remains. Still open, in order:

1. **Live UI check in a browser**, by the owner or Codex. Open the backup preview:
   `https://calapres.com/products/<handle>?view=design-service&preview_theme_id=166572294400`
   - "أرفع تصميمي" (upload) must work as before.
   - "صمّم اسمي" (design my name) must show the unavailable state.
   - This workspace cannot render preview URLs.
2. **Activation (last; owner-approved)**, in hPanel > Docker Manager > `calapres-design` >
   environment, then redeploy the same project (do not replace its compose):
   - `OPENAI_API_KEY`: a dedicated project key.
   - `PRICE_TEXT_INPUT_USD_PER_M` and `PRICE_IMAGE_OUTPUT_USD_PER_M`: re-read from OpenAI's
     official price page on that day. Read on 2026-09-23: 2.50 and 15.
   - `PRICE_IMAGE_INPUT_USD_PER_M=0`
   - `MAX_OUTPUT_TOKENS_PER_IMAGE`: the operator ceiling. The illustration uses 4160; it is
     unverified.
   - `BUDGET_USD_MICROS`: the owner's number × 1 000 000. It must be at least one batch
     reservation; the `started` log line shows `batchReserveMicros`.
   - `GENERATION_ENABLED=true`
   - Also set a provider-side monthly limit for that OpenAI project. This reduces exposure, but it
     is not a hard cap.
   - Check: `/apps/calapres-design/ping` shows `generation:true`.
3. **Bounded real Arabic test** (6–10 names), checked by a person.
4. **One real order test:**
   - The cart line must carry the absolute URL
     `https://calapres.com/apps/calapres-design/a/<sha256>.png`, together with the name, id,
     version, approval receipt and approval text.
   - Then `node verify-order.mjs <order.json> --export <dir>` inside the container must return
     `verified`.
   - Not yet tested end to end.

Durability of the order image URL:
- Originals are write-once and never pruned once approved or ordered.
- They live on `/opt/calapres-design/data`, which is covered by the VPS weekly backup.
- The URL works only while the service and the app proxy exist.
- Schedule `node maintenance.mjs backup` as well.

GitHub: push is still refused here. Import `calapres-transfer.patch` from Codex, and commit the
exact deployed compose, which contains no secrets.
