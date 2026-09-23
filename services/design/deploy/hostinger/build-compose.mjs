#!/usr/bin/env node
// Builds the compose project for the existing Hostinger VPS (hPanel > Docker Manager).
//
// Constraints found on the live VPS (2026-09-23):
//   - Hostinger rejects compose content above 32 768 characters.
//   - The existing Traefik runs with network_mode host, docker provider, entrypoint `websecure` and
//     resolver `letsencrypt`; there is no shared `traefik-proxy` network. This project therefore owns
//     its own bridge network and changes nothing in Traefik or in other projects.
//
// The runtime (Node built-ins only) is shipped as one brotli+base64 config. An init container runs a
// small bootstrap that restores the files into the `calapres-runtime` volume, checks every SHA-256
// against a separate list, and prepares the data directory. The service mounts that volume read-only.
// The output contains NO secrets: SHOPIFY_API_SECRET and, last, OPENAI_API_KEY come from the project
// environment in Docker Manager; SERVICE_SECRET is generated on the data volume at first start.
//
// The deployed file was produced by Codex from the same runtime with the same design; this builder is
// the repository's reproducible equivalent. Compare before replacing a running deployment.
//
// Usage: node deploy/hostinger/build-compose.mjs <out.yaml> [git-head]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { brotliCompressSync, constants } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..');
export const RUNTIME_FILES = ['server.mjs', 'app.mjs', 'config.mjs', 'cost.mjs', 'ledger.mjs', 'png.mjs', 'provider.mjs', 'screen.mjs',
  'security.mjs', 'store.mjs', 'verify.mjs', 'verify-order.mjs', 'worker.mjs', 'maintenance.mjs'];
export const HOST = 'calapres-design.srv1335184.hstgr.cloud';
export const MAX_COMPOSE_CHARS = 32768;
const DATA = '/opt/calapres-design/data';
const IMAGE = 'node:24-bookworm-slim';
const NET = 'calapres-design-net';

// Runs in the init container as root. Paths are overridable only so the test suite can run it.
export const BOOTSTRAP = `const fs=require('fs'),z=require('zlib'),c=require('crypto'),e=process.env;
const P=e.PACK_DIR||'/pack',A=e.APP_DIR||'/app',D=e.DATA_INIT_DIR||'/data';
const files=JSON.parse(z.brotliDecompressSync(Buffer.from(fs.readFileSync(P+'/runtime.b64','utf8'),'base64')));
const want=JSON.parse(fs.readFileSync(P+'/sums.json','utf8'));
if(Object.keys(files).sort().join()!==Object.keys(want).sort().join())throw Error('RUNTIME_FILE_SET_MISMATCH');
for(const f of Object.keys(want)){if(c.createHash('sha256').update(files[f],'utf8').digest('hex')!==want[f])throw Error('RUNTIME_DIGEST_MISMATCH '+f);}
for(const f of fs.readdirSync(A))fs.rmSync(A+'/'+f,{recursive:true,force:true});
for(const f of Object.keys(want))fs.writeFileSync(A+'/'+f,files[f],{mode:0o444});
fs.mkdirSync(D,{recursive:true});if(process.getuid()===0)fs.chownSync(D,1000,1000);fs.chmodSync(D,0o700);
console.log('runtime restored: '+Object.keys(want).length+' files verified');
`;

const q = (s) => JSON.stringify(s); // JSON strings are valid YAML double-quoted scalars
// Shipped form of a runtime file: identical code with whole-line `//` comments removed (none of the
// runtime files uses block comments or has a comment line inside a template literal). The test suite
// runs the restored files, so the shipped bytes themselves are exercised.
export const shipped = (src) => src.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const block = (s) => s.replace(/\n$/, '').split('\n').map((l) => (l ? '      ' + l : '')).join('\n');

export function buildCompose(head = 'unknown') {
  const files = {}, sums = {};
  for (const f of RUNTIME_FILES) {
    files[f] = shipped(readFileSync(join(SRC, f), 'utf8'));
    sums[f] = createHash('sha256').update(files[f], 'utf8').digest('hex');
  }
  const json = Buffer.from(JSON.stringify(files));
  const payload = brotliCompressSync(json, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_LGWIN]: 24,
    [constants.BROTLI_PARAM_SIZE_HINT]: json.length } }).toString('base64');
  const sourceSha = createHash('sha256').update(JSON.stringify(sums)).digest('hex');
  if (BOOTSTRAP.includes('$')) throw Error('BOOTSTRAP_MUST_NOT_CONTAIN_DOLLAR'); // no Compose interpolation surprises
  // Only values that differ from config.mjs defaults (port 8787, shop, proxy paths, x-forwarded-for with
  // 0 trusted hops, 20 jobs/h, 4 pending, 5 images/min, 150 s queue wait, 30 s lease, pinned model, low
  // quality) are listed, to stay under Hostinger's size limit. Traefik appends Shopify's proxy address,
  // so visitors share the per-address limit; session quotas and the global budget are the real controls.
  const env = {
    HOST: '0.0.0.0', DATA_DIR: '/data', REQUIRE_MOUNTED_DATA_DIR: 'true', SERVICE_SECRET_FILE: '/data/service-secret', SERVICE_SECRET_AUTOGEN: 'true',
    IP_REQUESTS_PER_MINUTE: '600',
    SHOPIFY_API_SECRET: '${SHOPIFY_API_SECRET:-}', OPENAI_API_KEY: '${OPENAI_API_KEY:-}',
    GENERATION_ENABLED: '${GENERATION_ENABLED:-false}', BUDGET_USD_MICROS: '${BUDGET_USD_MICROS:-0}',
    PRICE_TEXT_INPUT_USD_PER_M: '${PRICE_TEXT_INPUT_USD_PER_M:-}', PRICE_IMAGE_INPUT_USD_PER_M: '${PRICE_IMAGE_INPUT_USD_PER_M:-0}',
    PRICE_IMAGE_OUTPUT_USD_PER_M: '${PRICE_IMAGE_OUTPUT_USD_PER_M:-}', MAX_OUTPUT_TOKENS_PER_IMAGE: '${MAX_OUTPUT_TOKENS_PER_IMAGE:-}',
  };
  const labels = [
    'traefik.enable=true',
    `traefik.docker.network=${NET}`,
    `traefik.http.routers.calapres-design.rule=Host(\`${HOST}\`) && (PathPrefix(\`/proxy/\`) || Path(\`/healthz\`) || Path(\`/webhooks/orders-create\`))`,
    'traefik.http.routers.calapres-design.entrypoints=websecure',
    'traefik.http.routers.calapres-design.tls.certresolver=letsencrypt',
    'traefik.http.services.calapres-design.loadbalancer.server.port=8787',
    `com.calapres.runtime-sha256=${sourceSha}`,
    `com.calapres.git-head=${head}`,
  ];
  const yaml = `# Calapres design service, existing Hostinger VPS. Built by services/design/deploy/hostinger/build-compose.mjs
# git ${head}; runtime digest-list sha256 ${sourceSha}. No secrets. No published ports.
name: calapres-design
services:
  calapres-design-init:
    image: ${IMAGE}
    user: "0:0"
    network_mode: none
    restart: "no"
    command: ["node", "/pack/bootstrap.cjs"]
    volumes:
      - calapres-runtime:/app
      - ${DATA}:/data
    configs:
      - { source: bootstrap, target: /pack/bootstrap.cjs }
      - { source: runtime, target: /pack/runtime.b64 }
      - { source: sums, target: /pack/sums.json }
  calapres-design:
    image: ${IMAGE}
    user: "1000:1000"
    working_dir: /app
    command: ["node", "server.mjs"]
    depends_on:
      calapres-design-init:
        condition: service_completed_successfully
    restart: unless-stopped
    stop_grace_period: 15s
    mem_limit: 384m
    cpus: 0.5
    pids_limit: 128
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    logging: { driver: json-file, options: { max-size: "10m", max-file: "3" } }
    environment:
${Object.entries(env).map(([k, v]) => `      ${k}: ${q(v)}`).join('\n')}
    volumes:
      - calapres-runtime:/app:ro
      - ${DATA}:/data
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:8787/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    networks: [${NET}]
    labels:
${labels.map((l) => `      - ${q(l)}`).join('\n')}
volumes:
  calapres-runtime: {}
networks:
  ${NET}:
    name: ${NET}
    driver: bridge
configs:
  bootstrap:
    content: |
${block(BOOTSTRAP)}
  sums:
    content: ${q(JSON.stringify(sums))}
  runtime:
    content: ${q(payload)}
`;
  if (yaml.length > MAX_COMPOSE_CHARS) throw Error(`COMPOSE_TOO_LARGE:${yaml.length}`);
  return { yaml, sourceSha, sums, payload };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [out, head] = process.argv.slice(2);
  if (!out) { console.error('usage: build-compose.mjs <out.yaml> [git-head]'); process.exit(2); }
  const { yaml, sourceSha } = buildCompose(head);
  writeFileSync(out, yaml);
  console.log(JSON.stringify({ out, chars: yaml.length, limit: MAX_COMPOSE_CHARS, sourceSha }));
}
