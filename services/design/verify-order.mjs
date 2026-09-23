#!/usr/bin/env node
// Production tool: verify an order's personalised lines and export the exact approved originals.
// Usage: node verify-order.mjs <order.json> [--export <dir>]
// order.json may be a Shopify webhook/REST order or a GraphQL order with lineItems.customAttributes.
// Needs DATA_DIR, SHOPIFY_SHOP and SERVICE_SECRET (or SERVICE_SECRET_FILE) like the server. Read-only apart from --export copies.
import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './config.mjs';
import { Ledger } from './ledger.mjs';
import { AssetStore } from './store.mjs';
import { verifyLine, orderLines } from './verify.mjs';

const [file, flag, dir] = process.argv.slice(2);
if (!file) { console.error('usage: verify-order.mjs <order.json> [--export <dir>]'); process.exit(2); }
if (!process.env.SERVICE_SECRET && process.env.SERVICE_SECRET_FILE && existsSync(process.env.SERVICE_SECRET_FILE)) process.env.SERVICE_SECRET = readFileSync(process.env.SERVICE_SECRET_FILE, 'utf8').trim();
const config = loadConfig();
if (!config.serviceSecret) { console.error('SERVICE_SECRET is required'); process.exit(2); }
const order = JSON.parse(readFileSync(file, 'utf8'));
const ledger = new Ledger(join(config.dataDir, 'ledger.sqlite'));
const store = new AssetStore(join(config.dataDir, 'originals'));
let bad = 0;
for (const line of orderLines(order)) {
  const r = verifyLine(line.props, { ledger, store, shop: config.shop, secret: config.serviceSecret });
  if (r.status === 'not_personalized') continue;
  if (r.status === 'invalid' || r.reason) bad++;
  const out = { order: String(order.id ?? order.name), line: line.id, status: r.status, reason: r.reason || null, design: r.designId || null, name: r.name || null, sha256: r.sha256 || null };
  if (flag === '--export' && dir && r.status === 'verified') {
    mkdirSync(dir, { recursive: true });
    out.exported = join(dir, `${String(order.id ?? 'order').replace(/\D/g, '')}-${line.id.replace(/\D/g, '')}-${r.sha256}.png`);
    copyFileSync(r.path, out.exported);
  }
  console.log(JSON.stringify(out));
}
ledger.close();
process.exit(bad ? 1 : 0);
