import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const syncDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedApiNote = /deployed live n8n flow currently uses (?:Admin API )?`2025-01`/;
const stale = [
  { pattern: /calapres\.myshopify\.com/i, label: 'old Shopify domain' },
  { pattern: /storefront remains closed/i, label: 'closed storefront wording' },
  { pattern: /SHOPIFY_SHOP_DOMAIN/, label: 'old Shopify env var' }
];

let failures = 0;
for (const file of walk(syncDir).filter((name) => name.endsWith('.md'))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const rule of stale) {
    if (rule.pattern.test(text)) {
      console.error(path.relative(process.cwd(), file) + ': ' + rule.label);
      failures += 1;
    }
  }
  for (const line of text.split(/\r?\n/)) {
    if (line.includes('2025-01') && !allowedApiNote.test(line)) {
      console.error(path.relative(process.cwd(), file) + ': 2025-01 outside explicit compatibility note');
      failures += 1;
    }
  }
}

if (failures) process.exitCode = 1;
else console.log('doc-lint: clean');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
