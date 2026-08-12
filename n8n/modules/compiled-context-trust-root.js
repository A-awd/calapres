'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  ContextCompilerError,
  verifyCompiledContextReleasePin,
} = require('./context-compiler');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const TRUSTED_PIN_RELATIVE_PATH =
  'support/brands/calapres/context-trust/compiled-context-release-v1.json';
const TRUSTED_PIN_PATH = path.resolve(REPO_ROOT, TRUSTED_PIN_RELATIVE_PATH);
const TRUSTED_PIN_RAW_SHA256 =
  'sha256:5a0201f1e8c36782e454e36a289ddda7e7eb5a13289f7903c057a572adaa35ef';
const MAX_TRUSTED_PIN_BYTES = 4096;

function fail(code, message) {
  throw new ContextCompilerError(code, message);
}

function rawSha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function loadTrustedCompiledContextReleasePin(compiledContext) {
  if (
    TRUSTED_PIN_PATH !==
    path.join(REPO_ROOT, ...TRUSTED_PIN_RELATIVE_PATH.split('/'))
  ) {
    fail('compiled_context_trust_root_invalid', 'trusted pin path did not resolve exactly');
  }

  let raw;
  try {
    raw = fs.readFileSync(TRUSTED_PIN_PATH);
  } catch {
    fail('compiled_context_trust_root_unavailable', 'trusted compiled-context pin is unavailable');
  }
  if (raw.length === 0 || raw.length > MAX_TRUSTED_PIN_BYTES) {
    fail('compiled_context_trust_root_invalid', 'trusted compiled-context pin has an invalid size');
  }
  if (rawSha256(raw) !== TRUSTED_PIN_RAW_SHA256) {
    fail('compiled_context_trust_root_mismatch', 'trusted compiled-context pin bytes do not match the build-time root');
  }

  let pin;
  try {
    pin = JSON.parse(raw.toString('utf8'));
  } catch {
    fail('compiled_context_trust_root_invalid', 'trusted compiled-context pin is not valid JSON');
  }
  verifyCompiledContextReleasePin(pin, compiledContext);
  return JSON.parse(JSON.stringify(pin));
}

module.exports = {
  TRUSTED_PIN_RELATIVE_PATH,
  TRUSTED_PIN_RAW_SHA256,
  loadTrustedCompiledContextReleasePin,
};
