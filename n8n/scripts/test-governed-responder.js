#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { createGovernedResponder } = require('../modules/governed-responder');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main(argv) {
  if (argv.length !== 1) {
    throw new Error('usage: test-governed-responder.js <one message>');
  }

  const repoRoot = path.resolve(__dirname, '..', '..');
  const manifestPath = path.join(
    repoRoot,
    'support',
    'brands',
    'calapres',
    'knowledge',
    'candidate-manifest.json',
  );
  const manifest = readJson(manifestPath);
  if (
    manifest.current_version !== '2026-08-25-v4-candidate'
    || !Array.isArray(manifest.versions)
  ) {
    throw new Error('invalid candidate manifest');
  }
  const candidates = manifest.versions.filter((row) => row.version === manifest.current_version);
  if (
    candidates.length !== 1
    || candidates[0].status !== 'candidate_offline'
    || typeof candidates[0].path !== 'string'
  ) {
    throw new Error('candidate release is not uniquely resolved');
  }

  const releasePath = path.resolve(repoRoot, candidates[0].path);
  if (!releasePath.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error('candidate release path is outside the repository');
  }
  const release = readJson(releasePath);
  const responder = createGovernedResponder(release);
  const decision = responder.decide({ message: argv[0] });
  process.stdout.write(`${JSON.stringify({
    mode: 'offline_source_only',
    decision,
    rendered_reply: responder.render(decision),
  }, null, 2)}\n`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
