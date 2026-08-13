'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const workflow = JSON.parse(readFileSync(join(
  __dirname,
  '../../deployments/calapres-cs-bot-protected-draft.json',
), 'utf8'));

const nodesByName = new Map(workflow.nodes.map((node) => [node.name, node]));

function directTargets(source) {
  const connection = workflow.connections[source] || {};
  return Object.values(connection)
    .flat(2)
    .filter(Boolean)
    .map((edge) => edge.node);
}

function reachableFrom(source) {
  const reached = new Set();
  const pending = [source];
  while (pending.length) {
    const current = pending.shift();
    if (reached.has(current)) continue;
    reached.add(current);
    pending.push(...directTargets(current));
  }
  return reached;
}

test('protected Calapres draft preserves the reviewed rollback and no-save settings', () => {
  assert.equal(workflow.workflow_id, 'kAyF0D3ZZHxc0Hwp');
  assert.equal(workflow.active_version_id, '8c518aeb-22c2-4ab9-bcef-7418029386da');
  assert.equal(workflow.publish_state, 'draft_not_published');
  assert.equal(workflow.node_count, workflow.nodes.length);
  assert.equal(workflow.settings.saveDataSuccessExecution, 'none');
  assert.equal(workflow.settings.saveDataErrorExecution, 'none');
  assert.equal(workflow.settings.saveManualExecutions, false);
});

test('all node expressions and graph edges resolve to existing nodes', () => {
  const missing = [];
  for (const node of workflow.nodes) {
    const source = JSON.stringify(node.parameters || {});
    for (const match of source.matchAll(/\$\(['\"]([^'\"]+)['\"]\)/g)) {
      if (!nodesByName.has(match[1])) missing.push([node.name, match[1]]);
    }
  }
  for (const [source, connection] of Object.entries(workflow.connections)) {
    if (!nodesByName.has(source)) missing.push(['connection source', source]);
    for (const target of Object.values(connection).flat(2).filter(Boolean)) {
      if (!nodesByName.has(target.node)) missing.push([source, target.node]);
    }
  }
  assert.deepEqual(missing, []);
});

test('customer egress has one fail-closed gate and recovery can never reach it', () => {
  const incoming = [];
  for (const [source, connection] of Object.entries(workflow.connections)) {
    for (const [output, targets] of (connection.main || []).entries()) {
      for (const target of targets || []) {
        if (target.node === 'Send Reply') incoming.push({ source, output });
      }
    }
  }
  assert.deepEqual(incoming, [{ source: 'Customer Egress Authorized?', output: 0 }]);
  assert.equal(reachableFrom('Recover Ambiguous Sends Every 15 Minutes').has('Send Reply'), false);
  assert.equal(workflow.safety.recovery_customer_send_allowed, false);
});

test('recovery verifies the Chatwoot reply digest and retries reads without resending', () => {
  assert.ok(nodesByName.has('Hash Recovered Chatwoot Reply'));
  assert.ok(nodesByName.has('Recovered Reply Digest Matches?'));
  assert.ok(nodesByName.has('Postgres Customer Reply 13 Release Recovery Retry'));
  assert.deepEqual(
    directTargets('Route Customer Reply Recovery'),
    [
      'Hash Recovered Chatwoot Reply',
      'Postgres Customer Reply 12 Fail Recovery Closed',
      'Postgres Customer Reply 13 Release Recovery Retry',
    ],
  );
});

test('Shopify is read-only and no forbidden customer-write surfaces exist', () => {
  const serialized = JSON.stringify(workflow);
  const shopify = nodesByName.get('GET Shopify Orders Read Only');
  assert.equal(shopify.parameters.method, 'POST');
  assert.match(shopify.parameters.url, /graphql\.json$/);
  assert.doesNotMatch(JSON.stringify(shopify.parameters), /\bmutation\b/i);
  assert.doesNotMatch(serialized, /(?:AgentBot|Captain|supabase)/i);
  assert.doesNotMatch(serialized, /message_type['\"]?\s*:\s*['\"]private/i);
});

test('frozen draft contains no credential secret values or customer fixtures', () => {
  const serialized = JSON.stringify(workflow);
  assert.doesNotMatch(serialized, /sk-[A-Za-z0-9_-]{16,}/);
  assert.doesNotMatch(serialized, /Bearer\s+[A-Za-z0-9._-]{16,}/i);
  assert.doesNotMatch(serialized, /postgres(?:ql)?:\/\/[^\s\"]+:[^@\s\"]+@/i);
  assert.doesNotMatch(serialized, /(?:raw_body|transcript|phone_number|email_address)\s*:/i);
});
