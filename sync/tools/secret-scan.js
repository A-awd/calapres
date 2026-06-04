import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const syncDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const patterns = [
  { label: 'Shopify private token', pattern: /shpat_[a-z0-9]+/i },
  { label: 'Shopify secret', pattern: /shpss_[a-z0-9]+/i },
  { label: 'Bearer token', pattern: /bearer\s+[a-z0-9._-]{12,}/i },
  { label: 'API key assignment', pattern: /\b(api[_-]?key|authorization)\b\s*[:=]\s*['"][a-z0-9._-]{20,}/i },
  { label: 'Email address', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i }
];

let failures = 0;
for (const file of walk(syncDir)) {
  if (file.includes(path.join('sync', 'fixtures'))) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const rule of patterns) {
    if (rule.pattern.test(text)) {
      console.error(path.relative(process.cwd(), file) + ': ' + rule.label);
      failures += 1;
    }
  }
}

if (failures) process.exitCode = 1;
else console.log('secret-scan: clean');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
