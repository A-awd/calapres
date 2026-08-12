'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const WORKFLOW_PATH = path.join(
  REPO_ROOT,
  'n8n',
  'workflows',
  'calapres-customer-service-edge-v2.ts',
);
const RUNTIME_PATH = path.join(
  REPO_ROOT,
  'n8n',
  'runtime',
  'chatwoot-observation-stages.js',
);
const GENERATOR_PATH = path.join(
  REPO_ROOT,
  'n8n',
  'scripts',
  'generate-calapres-customer-service-edge-v2.js',
);
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  'n8n',
  'deployments',
  'calapres-customer-service-edge-v2.update-manifest.json',
);

const source = fs.readFileSync(WORKFLOW_PATH, 'utf8');
const runtimeSource = fs.readFileSync(RUNTIME_PATH, 'utf8');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function embeddedRuntime() {
  const match = source.match(
    /const STAGED_RUNTIME_SOURCE = (".*");\nconst STAGED_RUNTIME_SOURCE_SHA256 = "([a-f0-9]{64})";/,
  );
  assert.ok(match, 'embedded staged runtime and pinned source hash must be present');
  return { source: JSON.parse(match[1]), pinnedHash: match[2] };
}

function evaluateSource() {
  const configured = [];
  const graphEdges = [];
  const roots = [];
  let evaluable = source.replace(/^import[^\n]+\n/, '');
  evaluable = evaluable.replace(/export default/, 'globalThis.__workflowResult =');
  const stubs = String.raw`
const expr = (value) => '=' + value;
const newCredential = (name) => ({ name });
const __edgeKey = (value) => value.name;
const __addEdge = (from, to, branch) => {
  const key = from + '|' + to + '|' + (branch || 'next');
  if (!globalThis.__edgeKeys.has(key)) {
    globalThis.__edgeKeys.add(key);
    globalThis.__graphEdges.push({ from, to, branch: branch || 'next' });
  }
};
const __chain = (entry, tail) => ({
  __entry: entry,
  __tail: tail,
  to(target) {
    __addEdge(this.__tail, target.__entry, 'next');
    return __chain(this.__entry, target.__tail);
  }
});
const node = (value) => {
  const configuredNode = {
    type: value.type,
    typeVersion: value.version,
    ...value.config,
    __declaredOutput: value.output
  };
  const name = configuredNode.name;
  configuredNode.__entry = name;
  configuredNode.__tail = name;
  configuredNode.to = function(target) {
    __addEdge(name, target.__entry, 'next');
    return __chain(name, target.__tail);
  };
  globalThis.__configured.push(configuredNode);
  return configuredNode;
};
const trigger = node;
const ifElse = (value) => {
  const configuredNode = node({
    type: 'n8n-nodes-base.if',
    version: value.version,
    config: value.config,
    output: value.output
  });
  configuredNode.onTrue = function(target) {
    __addEdge(this.name, target.__entry, 'true');
    return this;
  };
  configuredNode.onFalse = function(target) {
    __addEdge(this.name, target.__entry, 'false');
    return this;
  };
  return configuredNode;
};
const workflow = () => ({
  __tail: null,
  add(target) {
    this.__tail = target.__tail;
    globalThis.__roots.push(target.__entry);
    return this;
  },
  to(target) {
    __addEdge(this.__tail, target.__entry, 'next');
    this.__tail = target.__tail;
    return this;
  }
});
`;
  const context = {
    __configured: configured,
    __graphEdges: graphEdges,
    __edgeKeys: new Set(),
    __roots: roots,
  };
  vm.createContext(context);
  vm.runInContext(stubs + evaluable, context, { filename: WORKFLOW_PATH });
  return { nodes: configured, edges: graphEdges, roots };
}

const evaluated = evaluateSource();
const nodes = evaluated.nodes;
const edges = evaluated.edges;
const roots = [...new Set(evaluated.roots)];
const byType = (type) => nodes.filter((configured) => configured.type === type);
const byName = (name) => nodes.find((configured) => configured.name === name);

function runCodeNode(name, { items = [{ json: {} }], named = {}, executionId = 'test_exec_001' } = {}) {
  const configured = byName(name);
  assert.ok(configured, name);
  assert.equal(configured.type, 'n8n-nodes-base.code');
  const input = {
    first: () => items[0],
    all: () => items,
  };
  const select = (nodeName) => ({
    first: () => {
      assert.ok(Object.prototype.hasOwnProperty.call(named, nodeName), nodeName);
      return named[nodeName];
    },
  });
  const execute = new Function('$input', '$', '$execution', '$json', configured.parameters.jsCode);
  const result = execute(input, select, { id: executionId }, items[0] && items[0].json);
  return configured.parameters.mode === 'runOnceForEachItem' ? [result] : result;
}

function outgoing(name, omitted = null) {
  return edges.filter((edge) => edge.from === name && edge.from !== omitted && edge.to !== omitted);
}

function reachable(start, target, omitted = null) {
  if (start === omitted || target === omitted) return false;
  const pending = [start];
  const seen = new Set();
  while (pending.length) {
    const current = pending.shift();
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const edge of outgoing(current, omitted)) pending.push(edge.to);
  }
  return false;
}

function anyRootReaches(target, omitted = null) {
  return roots.some((root) => reachable(root, target, omitted));
}

test('generated source is deterministic and staged runtime is byte-identical', () => {
  const generated = execFileSync(process.execPath, [GENERATOR_PATH], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.equal(generated.replace(/\n+$/, '\n'), source.replace(/\n+$/, '\n'));
  const embedded = embeddedRuntime();
  assert.equal(embedded.source, runtimeSource);
  assert.equal(sha256(embedded.source), embedded.pinnedHash);
  assert.equal(
    embedded.pinnedHash,
    '0045d7cd9313919c175c81e724f285aad1d10830993ded77f8b23ec8aa1d2b1c',
  );
  assert.match(
    source,
    /const STAGED_RUNTIME_PARITY_SHA256 = "dbb11ff31880ef59bb740bbc51aa61ed1d74ade8594c66bbdc47766eebdc2418";/,
  );
});

test('source has one manual preview, one signed webhook, and a disabled 30-minute recovery trigger', () => {
  const manual = byType('n8n-nodes-base.manualTrigger');
  const webhooks = byType('n8n-nodes-base.webhook');
  const schedules = byType('n8n-nodes-base.scheduleTrigger');
  assert.equal(manual.length, 1);
  assert.equal(webhooks.length, 1);
  assert.equal(schedules.length, 1);
  assert.equal(webhooks[0].parameters.httpMethod, 'POST');
  assert.equal(webhooks[0].parameters.responseMode, 'responseNode');
  assert.equal(webhooks[0].parameters.options.rawBody, true);
  assert.equal(webhooks[0].parameters.authentication, 'none');
  assert.match(webhooks[0].parameters.path, /^calapres\//);
  assert.equal(schedules[0].parameters.rule.interval[0].field, 'minutes');
  assert.equal(schedules[0].parameters.rule.interval[0].minutesInterval, 30);
  assert.equal(schedules[0].disabled, true);
  assert.match(schedules[0].name, /Cost SLA Approval/);
  assert.equal(reachable(manual[0].name, 'Call Immutable Optix Core v1 - Observation No LLM'), false);
});

test('all four Calapres inboxes, account and 1MiB gate are pinned in embedded runtime', () => {
  const embedded = embeddedRuntime().source;
  for (const [inbox, channel] of [
    ['128031', 'instagram'],
    ['128033', 'tiktok'],
    ['128058', 'whatsapp'],
    ['128326', 'email'],
  ]) {
    assert.match(embedded, new RegExp(`${inbox}: '${channel}'`));
  }
  assert.match(embedded, /ACCOUNT_ID = 179973/);
  assert.match(embedded, /MAX_RAW_BODY_SIZE_BYTES = 1024 \* 1024/);
});

test('PostgreSQL boundary separates eight Edge functions and reconciliation functions', () => {
  const expected = [
    'claim_signed_webhook_request_replay',
    'claim_business_event',
    'complete_business_event',
    'advance_signed_webhook_conversation_generation',
    'read_generation',
    'schedule_conversation_retry',
    'claim_due_conversation_retry',
    'transition_conversation_job',
    'claim_chatwoot_reconciliation_scan',
    'read_chatwoot_reconciliation_cursor',
    'compare_and_advance_chatwoot_message_cursor',
  ];
  const postgres = byType('n8n-nodes-base.postgres');
  assert.equal(postgres.length, 12);
  const actual = [];
  for (const configured of postgres) {
    assert.equal(configured.parameters.resource, 'database');
    assert.equal(configured.parameters.operation, 'executeQuery');
    assert.equal(configured.parameters.options.queryBatching, 'single');
    assert.equal(
      configured.parameters.options.queryReplacement,
      '={{ [JSON.stringify($json.postgres_command)] }}',
    );
    const operation = configured.parameters.query.match(
      /^SELECT calapres_cs\.atomic_([a-z_]+)\(\$1::jsonb\) AS result$/,
    )[1];
    assert.equal(configured.credentials.postgres.name,
      configured.name.includes('Reconciliation')
        ? 'Calapres Customer Service PostgreSQL Reconciliation Runtime'
        : 'Calapres Customer Service PostgreSQL Webhook and Worker Runtime');
    assert.notEqual(configured.disabled, true);
    const match = configured.parameters.query.match(
      /^SELECT calapres_cs\.atomic_([a-z_]+)\(\$1::jsonb\) AS result$/,
    );
    assert.ok(match, configured.parameters.query);
    actual.push(match[1]);
  }
  assert.deepEqual([...new Set(actual)].sort(), expected.sort());
  assert.equal(actual.filter((operation) =>
    operation === 'advance_signed_webhook_conversation_generation').length, 2);
  assert.equal(new Set(postgres.map((configured) => configured.name)).size, postgres.length);
  assert.doesNotMatch(source, /atomic_prepare_owner_review|atomic_compare_and_commit_owner_decision/);

  const requestProgram = byName('Prepare Request Replay Processing Lease').parameters.jsCode;
  const businessProgram = byName('Finalize Route and Prepare Business Event Lease').parameters.jsCode;
  const combinedProgram = byName('Build Combined Durable Ingress Command').parameters.jsCode;
  const workerProgram = byName('Prepare Worker Claim Without Conversation Identifier').parameters.jsCode;
  const request = requestProgram.slice(requestProgram.lastIndexOf('\nconst signed ='));
  const business = businessProgram.slice(businessProgram.lastIndexOf('\ntry {'));
  const combined = combinedProgram.slice(combinedProgram.lastIndexOf('\ntry {'));
  const worker = workerProgram.slice(workerProgram.lastIndexOf('\nconst executionId ='));
  assert.match(request, /request_ttl_seconds: 600/);
  assert.match(request, /request_source: 'chatwoot_signed_webhook_v1'/);
  assert.match(request, /source_binding_sha256: fingerprint/);
  assert.match(request, /lease_duration_seconds: 300/);
  assert.doesNotMatch(request, /\bexpires_at\s*:/);
  assert.match(business, /event_retention_seconds: 604800/);
  assert.doesNotMatch(business, /\bexpires_at\s*:/);
  assert.match(combined, /delay_seconds: route\.delay_seconds, retention_seconds: 7776000/);
  assert.match(combined, /request_source: request\.request_source/);
  assert.doesNotMatch(combined, /\bdue_at\s*:/);
  assert.doesNotMatch(combined, /\bexpires_at\s*:/);
  assert.doesNotMatch(worker, /conversation_id\s*:/);
});

test('Chatwoot baseline and bounded rereads are GET-only with one read credential', () => {
  const requests = byType('n8n-nodes-base.httpRequest');
  assert.equal(requests.length, 8);
  for (const configured of requests) {
    assert.equal(configured.parameters.method, 'GET');
    assert.equal(configured.parameters.sendBody, false);
    assert.equal(configured.parameters.authentication, 'genericCredentialType');
    assert.equal(configured.parameters.genericAuthType, 'httpHeaderAuth');
    assert.equal(configured.credentials.httpHeaderAuth.name, 'Calapres Chatwoot Read Only');
    assert.match(configured.parameters.url, /^=https:\/\/app\.chatwoot\.com\/api\/v1\/accounts\/179973\//);
    assert.equal(configured.parameters.options.response.response.fullResponse, true);
    assert.equal(configured.parameters.options.response.response.neverError, true);
  }
  assert.equal(requests.filter((configured) => /Messages Worker Reread/.test(configured.name)).length, 2);
  assert.equal(requests.filter((configured) => /Conversation (Before|After) Worker Reread/.test(configured.name)).length, 2);
  assert.equal(requests.filter((configured) => /Reconciliation Discovery/.test(configured.name)).length, 2);
  assert.equal(requests.filter((configured) => /Reconciliation Messages/.test(configured.name)).length, 1);
});

test('204, identifiers-only due-at Wait, Core and model-closed boundaries are explicit', () => {
  const responses = byType('n8n-nodes-base.respondToWebhook');
  const statusCodes = responses.map((configured) => configured.parameters.options.responseCode).sort();
  assert.deepEqual(statusCodes, [204, 204, 204, 400, 401, 413, 503]);
  assert.equal(
    byName('Respond 204 Only After Combined Durable Commit').parameters.enableResponseOutput,
    true,
  );
  const wait = byName('Wait Until PostgreSQL Due At - Identifiers Only');
  assert.equal(wait.parameters.resume, 'specificTime');
  assert.equal(wait.parameters.dateTime, '={{ $json.due_at }}');
  const core = byName('Call Immutable Optix Core v1 - Observation No LLM');
  assert.equal(core.type, 'n8n-nodes-base.executeWorkflow');
  assert.equal(core.parameters.workflowId.value, 'uCBXuRjlv8NyeikO');
  assert.ok(byName('LLM Trust Gate Closed - No Call'));
  assert.match(byName('Attach Source Trusted Kill Switch').parameters.jsCode, /kill_switch: true/);
  assert.equal(
    nodes.some((configured) => /openai|anthropic|gemini|langchain|chatmodel/i.test(configured.type)),
    false,
  );
});

test('every embedded Code program parses and has no direct effect primitive', () => {
  const forbidden = [
    'require(',
    'fetch(',
    '$http.',
    '$httpRequest(',
    'process.env',
    'getCredentials(',
    '$getWorkflowStaticData(',
  ];
  for (const configured of byType('n8n-nodes-base.code')) {
    assert.doesNotThrow(() => new Function(configured.parameters.jsCode), configured.name);
    for (const invocation of forbidden) {
      assert.equal(
        configured.parameters.jsCode.includes(invocation),
        false,
        `${configured.name} contains ${invocation}`,
      );
    }
  }
});

test('every static node-name reference resolves to one unique configured node', () => {
  const counts = new Map();
  for (const configured of nodes) {
    counts.set(configured.name, (counts.get(configured.name) || 0) + 1);
  }
  for (const [name, count] of counts) assert.equal(count, 1, `duplicate node name: ${name}`);

  const references = [];
  const pattern = /\$\(\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)")\s*\)/g;
  const decode = (raw) => raw
    .replace(/\\u([a-fA-F0-9]{4})/g, (_match, value) => String.fromCharCode(parseInt(value, 16)))
    .replace(/\\x([a-fA-F0-9]{2})/g, (_match, value) => String.fromCharCode(parseInt(value, 16)))
    .replace(/\\(['"\\])/g, '$1');
  const scan = (value, owner, parameterPath) => {
    if (typeof value === 'string') {
      pattern.lastIndex = 0;
      for (let match = pattern.exec(value); match; match = pattern.exec(value)) {
        references.push({ owner, parameterPath, target: decode(match[1] ?? match[2]) });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => scan(item, owner, `${parameterPath}[${index}]`));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) {
        scan(item, owner, parameterPath ? `${parameterPath}.${key}` : key);
      }
    }
  };
  for (const configured of nodes) scan(configured.parameters, configured.name, 'parameters');
  assert.ok(references.length >= 20, 'expected static cross-node references were not discovered');
  for (const reference of references) {
    assert.equal(
      counts.get(reference.target),
      1,
      `${reference.owner} ${reference.parameterPath} references missing/ambiguous node ${reference.target}`,
    );
  }
});

test('actual workflow HMAC stages are fixed sequential same-item native Crypto chains', () => {
  const chainSpecs = [
    {
      finalizer: 'Finalize Signed HMAC Constant Time Gate',
      crypto: [{ name: 'Crypto HMAC - Calapres Webhook v1 Placeholder',
        property: 'computed_hmac_hex', value: null,
        credential: 'Calapres Chatwoot Webhook HMAC v1', binary: true }],
    },
    {
      finalizer: 'Finalize Event Identity and Prepare Fixed Route HMAC',
      crypto: [{ name: 'Crypto HMAC - Calapres Event Identity v1 Placeholder',
        property: 'native_event_identity_v1_hex',
        value: '={{ $json.event_plan.hmac_requests[0].material_utf8 }}',
        credential: 'Calapres Event Identity HMAC v1', binary: false }],
    },
    {
      finalizer: 'Finalize Route and Prepare Business Event Lease',
      crypto: [
        { name: 'Crypto HMAC - Calapres Route Message v1 Placeholder',
          property: 'native_message_anchor_v1_hex',
          value: '={{ $json.event_identity.route_hmac_requests[0].material_utf8 }}',
          credential: 'Calapres Event Identity HMAC v1', binary: false },
        { name: 'Crypto HMAC - Calapres Route Conversation v1 Placeholder',
          property: 'native_conversation_v1_hex',
          value: '={{ $json.event_identity.route_hmac_requests[1].material_utf8 }}',
          credential: 'Calapres Event Identity HMAC v1', binary: false },
      ],
    },
    {
      finalizer: 'Build Combined Durable Ingress Command',
      crypto: [
        { name: 'Crypto HMAC - Calapres Ingress Baseline Status v1 Placeholder',
          property: 'native_baseline_status_v1_hex',
          value: '={{ $json.baseline_plan.hmac_requests[0].material_utf8 }}',
          credential: 'Calapres Baseline HMAC v1', binary: false },
        { name: 'Crypto HMAC - Calapres Ingress Baseline Assignee v1 Placeholder',
          property: 'native_baseline_assignee_v1_hex',
          value: '={{ $json.baseline_plan.hmac_requests[1].material_utf8 }}',
          credential: 'Calapres Baseline HMAC v1', binary: false },
      ],
    },
    {
      finalizer: 'Finalize Anchor Event and Prepare Anchor Message HMAC',
      crypto: [{ name: 'Crypto HMAC - Reread Anchor Event Identity Placeholder',
        property: 'native_reread_anchor_event_v1_hex',
        value: '={{ $json.reread_plan.event_hmac_requests[0].material_utf8 }}',
        credential: 'Calapres Event Identity HMAC v1', binary: false }],
    },
    {
      finalizer: 'Finalize Anchor Message and Prepare Fixed Baseline HMAC',
      crypto: [{ name: 'Crypto HMAC - Reread Anchor Message Fingerprint Placeholder',
        property: 'native_reread_anchor_message_v1_hex',
        value: '={{ $json.message_plan.message_hmac_requests[0].material_utf8 }}',
        credential: 'Calapres Event Identity HMAC v1', binary: false }],
    },
    {
      finalizer: 'Build Current Generation Read Command',
      crypto: [
        ['Before Status', 0, 'native_reread_before_status_v1_hex'],
        ['Before Assignee', 1, 'native_reread_before_assignee_v1_hex'],
        ['After Status', 2, 'native_reread_after_status_v1_hex'],
        ['After Assignee', 3, 'native_reread_after_assignee_v1_hex'],
      ].map(([label, index, property]) => ({
        name: `Crypto HMAC - Reread ${label} Placeholder`, property,
        value: `={{ $json.message_plan.reread_plan.baseline_hmac_requests[${index}].material_utf8 }}`,
        credential: 'Calapres Baseline HMAC v1', binary: false,
      })),
    },
  ];

  const validateSnapshot = (snapshot, spec) => {
    const nodeMap = new Map(snapshot.nodes.map((node) => [node.name, node]));
    if (nodeMap.size !== snapshot.nodes.length) throw new Error('duplicate_node');
    const finalizer = nodeMap.get(spec.finalizer);
    if (!finalizer || finalizer.type !== 'n8n-nodes-base.code' ||
        finalizer.parameters.mode !== 'runOnceForEachItem') throw new Error('finalizer_mode');
    for (const token of ['$input.all()', '$input.first()', '$items(', '.first()']) {
      if (finalizer.parameters.jsCode.includes(token)) throw new Error('finalizer_cross_item');
    }
    if (!finalizer.parameters.jsCode.includes('cryptographic_verification_performed_in_code: false')) {
      throw new Error('trust_label_missing');
    }
    const properties = new Set();
    for (const [index, expected] of spec.crypto.entries()) {
      const node = nodeMap.get(expected.name);
      if (!node || node.type !== 'n8n-nodes-base.crypto' || node.typeVersion !== 2 ||
          node.onError !== undefined || node.parameters.action !== 'hmac' ||
          node.parameters.type !== 'SHA256' || node.parameters.encoding !== 'hex' ||
          node.parameters.binaryData !== expected.binary ||
          node.parameters.dataPropertyName !== expected.property ||
          node.credentials.crypto.name !== expected.credential || properties.has(expected.property)) {
        throw new Error('crypto_configuration');
      }
      properties.add(expected.property);
      if (expected.value === null) {
        if (node.parameters.value !== undefined || node.parameters.binaryPropertyName !== 'signed_payload') {
          throw new Error('crypto_binary_input');
        }
      } else if (node.parameters.value !== expected.value ||
          node.parameters.binaryPropertyName !== undefined) throw new Error('crypto_value_input');
      const expectedNext = index + 1 < spec.crypto.length
        ? spec.crypto[index + 1].name : spec.finalizer;
      const outgoingEdges = snapshot.edges.filter((edge) => edge.from === expected.name);
      const incomingEdges = snapshot.edges.filter((edge) => edge.to === expected.name);
      if (outgoingEdges.length !== 1 || outgoingEdges[0].to !== expectedNext ||
          incomingEdges.length !== 1) throw new Error('crypto_lineage');
    }
    const finalizerIncoming = snapshot.edges.filter((edge) => edge.to === spec.finalizer);
    if (finalizerIncoming.length !== 1 ||
        finalizerIncoming[0].from !== spec.crypto.at(-1).name) throw new Error('finalizer_lineage');
  };

  const snapshot = JSON.parse(JSON.stringify({ nodes, edges }));
  for (const spec of chainSpecs) validateSnapshot(snapshot, spec);

  const routeSpec = chainSpecs[2];
  for (const mutate of [
    (copy) => { bySnapshotName(copy, routeSpec.crypto[0].name).parameters.action = 'hash'; },
    (copy) => { bySnapshotName(copy, routeSpec.crypto[0].name).parameters.type = 'MD5'; },
    (copy) => { bySnapshotName(copy, routeSpec.crypto[0].name).parameters.encoding = 'base64'; },
    (copy) => { bySnapshotName(copy, routeSpec.crypto[0].name).parameters.value = '={{ $json.foreign }}'; },
    (copy) => { bySnapshotName(copy, routeSpec.crypto[0].name).parameters.dataPropertyName = 'foreign'; },
    (copy) => { bySnapshotName(copy, routeSpec.crypto[0].name).credentials.crypto.name = 'Foreign'; },
    (copy) => { bySnapshotName(copy, routeSpec.finalizer).parameters.mode = 'runOnceForAllItems'; },
    (copy) => { bySnapshotName(copy, routeSpec.finalizer).parameters.jsCode += '\n$input.first();'; },
    (copy) => { copy.edges.push({ from: 'Route Fingerprint HMAC Ready?',
      to: routeSpec.crypto[1].name, branch: 'true' }); },
    (copy) => { copy.edges.push({ from: routeSpec.crypto[0].name,
      to: routeSpec.finalizer, branch: 'next' }); },
    (copy) => {
      const edgeIndex = copy.edges.findIndex((edge) =>
        edge.from === routeSpec.crypto[0].name && edge.to === routeSpec.crypto[1].name);
      copy.edges.splice(edgeIndex, 1,
        { from: routeSpec.crypto[0].name, to: 'Injected Set', branch: 'next' },
        { from: 'Injected Set', to: routeSpec.crypto[1].name, branch: 'next' });
      copy.nodes.push({ name: 'Injected Set', type: 'n8n-nodes-base.set', typeVersion: 3,
        parameters: {} });
    },
  ]) {
    const changed = JSON.parse(JSON.stringify(snapshot));
    mutate(changed);
    assert.throws(() => validateSnapshot(changed, routeSpec));
  }

  function bySnapshotName(snapshotValue, name) {
    const found = snapshotValue.nodes.find((node) => node.name === name);
    if (!found) throw new Error('snapshot_node_missing');
    return found;
  }
});

test('source has no egress, private note, Shopify, Data Table, owner, or model node', () => {
  const forbiddenTypes = /shopify|openai|anthropic|gemini|facebookGraphApi|dataTable/i;
  const forbiddenNames = /send customer|private note|shopify write|model call|owner review/i;
  for (const configured of nodes) {
    assert.doesNotMatch(configured.type, forbiddenTypes);
    assert.doesNotMatch(configured.name || '', forbiddenNames);
  }
  assert.match(source, /LLM Trust Gate Closed - No Call/);
  assert.match(source, /customer_egress_allowed: false/);
  assert.doesNotMatch(source, /type:\s*['"]@n8n\/n8n-nodes-langchain\./);
  assert.doesNotMatch(source, /atomic_prepare_owner_review|atomic_compare_and_commit_owner_decision/);
});

test('actual graph makes worker lease, full reread and eligibility dominate Core', () => {
  const core = 'Call Immutable Optix Core v1 - Observation No LLM';
  assert.equal(anyRootReaches(core), true);
  for (const required of [
    'Postgres Edge Atomic 07 - claim_due_conversation_retry',
    'Interpret Exclusive Worker Lease',
    'Exclusive Worker Lease Owned?',
    'Attach Source Trusted Kill Switch',
    'Prepare Worker Identifiers Only Reread State',
    'GET Chatwoot Conversation Before Worker Reread',
    'GET Chatwoot Messages Worker Reread A',
    'GET Chatwoot Messages Worker Reread B',
    'GET Chatwoot Conversation After Worker Reread',
    'Prepare Strict Bounded Double Reread',
    'Crypto HMAC - Reread Anchor Event Identity Placeholder',
    'Crypto HMAC - Reread Anchor Message Fingerprint Placeholder',
    'Crypto HMAC - Reread Before Status Placeholder',
    'Crypto HMAC - Reread Before Assignee Placeholder',
    'Crypto HMAC - Reread After Status Placeholder',
    'Crypto HMAC - Reread After Assignee Placeholder',
    'Postgres Edge Atomic 05 - read_generation',
    'Finalize Post Delay Eligibility With Current Generation',
    'Post Delay Eligible for Core?',
    'LLM Trust Gate Closed - No Call',
  ]) {
    assert.ok(byName(required), required);
    assert.equal(anyRootReaches(core, required), false, `${required} must dominate Core`);
  }
  const eligibleFalse = edges.find((edge) =>
    edge.from === 'Post Delay Eligible for Core?' && edge.branch === 'false');
  assert.equal(eligibleFalse.to, 'Prepare Safe Cancellation or Human Owned Transition');
  assert.equal(reachable(eligibleFalse.to, core), false);
});

test('401, 503, completed replay, held/no-job and cancellation paths cannot reach Core', () => {
  const core = 'Call Immutable Optix Core v1 - Observation No LLM';
  for (const terminal of [
    'Respond 400 Invalid Webhook Request',
    'Respond 401 Unauthorized Fail Closed',
    'Respond 413 Payload Too Large',
    'Respond 503 Fail Closed - Delivery Retry Not Guaranteed',
    'Respond 204 Completed Replay Linked Job',
    'Terminal Safe No Egress',
    'Postgres Edge Atomic 08 - transition_conversation_job',
  ]) {
    assert.equal(reachable(terminal, core), false, terminal);
  }
  const requestHeld = edges.find((edge) =>
    edge.from === 'Completed Replay Linked to Durable Job?' && edge.branch === 'false');
  assert.equal(requestHeld.to, 'Respond 503 Fail Closed - Delivery Retry Not Guaranteed');
  const noWorker = edges.find((edge) =>
    edge.from === 'Exclusive Worker Lease Owned?' && edge.branch === 'false');
  assert.equal(noWorker.to, 'Terminal Safe No Egress');
});

test('trusted ingress response gates preserve 400, 401, 413 and reserve 503 for failures', () => {
  assert.equal(byName('Signed Ingress Preflight - Raw Bytes 1MiB Gate').onError,
    'continueRegularOutput');
  assert.equal(byName('Crypto HMAC - Calapres Webhook v1 Placeholder').onError, undefined);
  assert.equal(byName('Finalize Signed HMAC Constant Time Gate').onError, undefined);
  for (const response of byType('n8n-nodes-base.respondToWebhook')) {
    assert.equal(Number.isSafeInteger(response.parameters.options.responseCode), true);
  }
  const now = Math.floor(Date.now() / 1000);
  const signature = 'sha256=' + 'a'.repeat(64);
  const item = (overrides = {}) => ({ json: {
    headers: {
      'content-type': 'application/json',
      'x-chatwoot-timestamp': String(now),
      'x-chatwoot-signature': signature,
    },
    raw_body_base64: Buffer.from('{}').toString('base64'),
    ...overrides,
  } });
  const badRequest = runCodeNode('Signed Ingress Preflight - Raw Bytes 1MiB Gate', {
    items: [item({ headers: {
      'content-type': 'text/plain',
      'x-chatwoot-timestamp': String(now),
      'x-chatwoot-signature': signature,
    } })],
  });
  assert.equal(badRequest[0].json.ingress_disposition, 'bad_request');
  const unauthorized = runCodeNode('Signed Ingress Preflight - Raw Bytes 1MiB Gate', {
    items: [item({ headers: {
      'content-type': 'application/json',
      'x-chatwoot-timestamp': 'malformed',
      'x-chatwoot-signature': signature,
    } })],
  });
  assert.equal(unauthorized[0].json.ingress_disposition, 'unauthorized');
  const tooLarge = runCodeNode('Signed Ingress Preflight - Raw Bytes 1MiB Gate', {
    items: [item({ raw_body_base64: Buffer.alloc(1024 * 1024 + 1, 0x61).toString('base64') })],
  });
  assert.equal(tooLarge[0].json.ingress_disposition, 'too_large');
  const explodingHeaders = new Proxy({}, { ownKeys() { throw new Error('synthetic_failure'); } });
  const failed = runCodeNode('Signed Ingress Preflight - Raw Bytes 1MiB Gate', {
    items: [{ json: { headers: explodingHeaders, raw_body_base64: 'e30=' } }],
  });
  assert.equal(failed[0].json.ingress_disposition, 'service_unavailable');

  const eligible = runCodeNode('Signed Ingress Preflight - Raw Bytes 1MiB Gate', {
    items: [item()],
  });
  assert.equal(eligible[0].json.ingress_disposition, 'hmac_required');
  const mismatch = runCodeNode('Finalize Signed HMAC Constant Time Gate', {
    items: [{ json: { ...eligible[0].json, computed_hmac_hex: 'b'.repeat(64) } }],
  });
  assert.equal(mismatch[0].json.hmac_disposition, 'unauthorized');
  const credentialFailure = runCodeNode('Finalize Signed HMAC Constant Time Gate', {
    items: [{ json: { ...eligible[0].json } }],
  });
  assert.equal(credentialFailure[0].json.hmac_disposition, 'service_unavailable');

  const edge = (from, branch) => edges.find((candidate) =>
    candidate.from === from && candidate.branch === branch);
  assert.equal(edge('Preflight Eligible?', 'false').to, 'Preflight Trusted Unauthorized?');
  assert.equal(edge('Preflight Trusted Unauthorized?', 'true').to,
    'Respond 401 Unauthorized Fail Closed');
  assert.equal(edge('Preflight Trusted Unauthorized?', 'false').to,
    'Preflight Trusted Bad Request?');
  assert.equal(edge('Preflight Trusted Bad Request?', 'true').to,
    'Respond 400 Invalid Webhook Request');
  assert.equal(edge('Preflight Trusted Payload Too Large?', 'true').to,
    'Respond 413 Payload Too Large');
  assert.equal(edge('Preflight Trusted Payload Too Large?', 'false').to,
    'Respond 503 Fail Closed - Delivery Retry Not Guaranteed');
  assert.equal(edge('Signed HMAC Verified?', 'false').to, 'Signed HMAC Trusted Unauthorized?');
  assert.equal(edge('Signed HMAC Trusted Unauthorized?', 'true').to,
    'Respond 401 Unauthorized Fail Closed');
  assert.equal(edge('Signed HMAC Trusted Unauthorized?', 'false').to,
    'Respond 503 Fail Closed - Delivery Retry Not Guaranteed');
});

test('completed replay requires exact linked claim and rejects a mismatched claim before 204', () => {
  const requestContext = { claim_id: 'req_' + 'a'.repeat(64),
    request_source: 'chatwoot_signed_webhook_v1', source_binding_sha256: '9'.repeat(64) };
  const value = {
    account_id: 179973, inbox_id: 128058, channel: 'whatsapp',
    conversation_id: '700001', anchor_message_id: '900001',
    correlation_id: 'calapres:700001:900001',
    event_identity_key_version: 'calapres-identity-hmac-v1',
    event_identity_fingerprint: '1'.repeat(64), conversation_fingerprint: '2'.repeat(64),
    message_fingerprint: '3'.repeat(64), baseline_fingerprint_key_version: 'calapres-hmac-v1',
    baseline_status_fingerprint: '4'.repeat(64), baseline_assignee_fingerprint: '5'.repeat(64),
    delay_policy_version: '2026-08-11-v1', delay_seconds: 45,
    knowledge_version: '2026-08-11-v3', claim_id: requestContext.claim_id,
    lifecycle_status: 'completed', claimed_at: '2026-08-11T15:00:00.000Z',
    expires_at: '2026-08-11T15:10:00.000Z',
    lease_expires_at: '2026-08-11T15:05:00.000Z', attempt_count: 1,
    request_source: requestContext.request_source,
    source_binding_sha256: requestContext.source_binding_sha256,
    business_claim_id: 'bev_claim_' + '6'.repeat(64), job_id: 'job_' + '7'.repeat(64),
    generation: 1, due_at: '2026-08-11T15:01:00.000Z',
  };
  const envelope = (candidate) => ({ json: { result: {
    contract_verified: true, operation: 'claim_request_replay',
    status: 'duplicate_or_conflict', outcome: 'duplicate_completed',
    value: candidate, error_code: null,
  } } });
  const named = { 'Prepare Request Replay Processing Lease': {
    json: { request_context: requestContext },
  } };
  const exact = runCodeNode('Interpret Request Replay Lease Result', {
    items: [envelope(value)], named,
  });
  assert.equal(exact[0].json.request_state, 'ack_completed');
  const mismatched = runCodeNode('Interpret Request Replay Lease Result', {
    items: [envelope({ ...value, claim_id: 'req_' + 'b'.repeat(64) })], named,
  });
  assert.equal(mismatched[0].json.request_state, 'retry');
  assert.equal(mismatched[0].json.linked_job, null);
  const extra = runCodeNode('Interpret Request Replay Lease Result', {
    items: [envelope({ ...value, raw_message: 'leak' })], named,
  });
  assert.equal(extra[0].json.request_state, 'retry');
  assert.equal(reachable('Completed Replay Linked to Durable Job?',
    'Respond 204 Completed Replay Linked Job'), true);
  assert.equal(edges.find((edge) => edge.from === 'Completed Replay Linked to Durable Job?' &&
    edge.branch === 'false').to, 'Respond 503 Fail Closed - Delivery Retry Not Guaranteed');
});

test('worker result uses exact projection and rejects extra raw message or email fields', () => {
  const command = { worker_id: 'edge_worker_test_exec_001', lease_token: 'worker_lease_token_001' };
  const value = {
    job_id: 'job_' + '1'.repeat(64), conversation_id: '700001', generation: 1,
    business_claim_id: 'bev_claim_' + '2'.repeat(64), due_at: '2026-08-11T15:01:00.000Z',
    account_id: 179973, inbox_id: 128058, channel: 'whatsapp', anchor_message_id: '900001',
    correlation_id: 'calapres:700001:900001',
    event_identity_key_version: 'calapres-identity-hmac-v1',
    event_identity_fingerprint: '3'.repeat(64), conversation_fingerprint: '4'.repeat(64),
    message_fingerprint: '5'.repeat(64), baseline_fingerprint_key_version: 'calapres-hmac-v1',
    baseline_status_fingerprint: '6'.repeat(64), baseline_assignee_fingerprint: '7'.repeat(64),
    delay_policy_version: '2026-08-11-v1', delay_seconds: 45,
    knowledge_version: '2026-08-11-v3', worker_id: command.worker_id,
    lease_token: command.lease_token, lease_expires_at: '2026-08-11T15:05:00.000Z',
    attempt_count: 1,
  };
  const named = { 'Prepare Worker Claim Without Conversation Identifier': {
    json: { postgres_command: command },
  } };
  const envelope = (candidate) => ({ json: { result: {
    contract_verified: true, operation: 'claim_due_conversation_retry', status: 'committed',
    outcome: 'job_claimed', value: candidate, error_code: null,
  } } });
  const exact = runCodeNode('Interpret Exclusive Worker Lease', {
    items: [envelope(value)], named,
  });
  assert.equal(exact[0].json.worker_state, 'leased');
  assert.deepEqual(Object.keys(exact[0].json.worker).sort(), ['brand_id', ...Object.keys(value)].sort());
  for (const mutation of [{ raw_message: 'secret' }, { email: 'customer@example.invalid' }]) {
    const rejected = runCodeNode('Interpret Exclusive Worker Lease', {
      items: [envelope({ ...value, ...mutation })], named,
    });
    assert.equal(rejected[0].json.worker_state, 'retry_later');
    assert.equal(rejected[0].json.worker, null);
    assert.equal(JSON.stringify(rejected).includes(Object.values(mutation)[0]), false);
  }
});

test('fresh request for a completed business event is atomically reconciled before a terminal 204', () => {
  const route = {
    account_id: 179973, inbox_id: 128058, channel: 'whatsapp',
    conversation_id: '700001', message_id: '900001',
    correlation_id: 'calapres:700001:900001',
    active_key_version: 'calapres-identity-hmac-v1', retained_key_versions: [],
    storage_key_versions: { active: 'hmac-sha256-v1', retained: [] },
    event_identity_fingerprints: { 'calapres-identity-hmac-v1': 'a'.repeat(64) },
    conversation_fingerprints: { 'calapres-identity-hmac-v1': 'b'.repeat(64) },
    message_fingerprints: { 'calapres-identity-hmac-v1': 'c'.repeat(64) },
  };
  const requestContext = {
    claim_id: 'req_' + 'd'.repeat(64), lease_owner_id: 'edge_ingress_test_exec_001',
    lease_token: 'request_' + 'e'.repeat(48),
  };
  const attemptedBusiness = {
    claim_id: 'bev_claim_' + 'f'.repeat(64), lease_owner_id: 'edge_ingress_test_exec_001',
    lease_token: 'business_' + '1'.repeat(48), job_id: 'job_' + '2'.repeat(64),
  };
  const completed = {
    account_id: 179973, inbox_id: 128058, channel: 'whatsapp',
    conversation_id: '700001', anchor_message_id: '900001',
    correlation_id: 'calapres:700001:900001',
    event_identity_key_version: 'calapres-identity-hmac-v1',
    event_identity_fingerprint: '3'.repeat(64), conversation_fingerprint: '4'.repeat(64),
    message_fingerprint: '5'.repeat(64), baseline_fingerprint_key_version: 'calapres-hmac-v1',
    baseline_status_fingerprint: '6'.repeat(64), baseline_assignee_fingerprint: '7'.repeat(64),
    delay_policy_version: '2026-08-11-v1', delay_seconds: 45,
    knowledge_version: '2026-08-11-v3', claim_id: 'bev_claim_' + '8'.repeat(64),
    lifecycle_status: 'completed', job_id: 'job_' + '9'.repeat(64), generation: 4,
    due_at: '2026-08-11T15:01:00.000Z', state: 'completed',
    observation_id: 'obs_' + 'a'.repeat(40), audit_id: 'aud_' + 'b'.repeat(40),
  };
  const claimResult = (value) => ({ json: { result: {
    contract_verified: true, status: 'duplicate_or_conflict',
    operation: 'claim_business_event', outcome: 'duplicate_completed',
    value, error_code: null,
  } } });
  const claimNamed = { 'Finalize Route and Prepare Business Event Lease': {
    json: { route_identity: route, request_context: requestContext,
      business_context: attemptedBusiness },
  } };
  const interpreted = runCodeNode('Interpret Business Event Lease Result', {
    items: [claimResult(completed)], named: claimNamed,
  });
  assert.equal(interpreted[0].json.business_state, 'completed_reconcile');
  assert.equal(interpreted[0].json.business_context.claim_id, completed.claim_id);
  assert.equal(interpreted[0].json.business_context.job_id, completed.job_id);
  const injected = runCodeNode('Interpret Business Event Lease Result', {
    items: [claimResult({ ...completed, email: 'leak@example.invalid' })], named: claimNamed,
  });
  assert.equal(injected[0].json.business_state, 'retry');
  assert.equal(injected[0].json.completed_bundle, null);

  const reconcileNamed = { 'Interpret Business Event Lease Result': interpreted[0] };
  const built = runCodeNode('Build Completed Event Atomic Request Reconciliation', {
    named: reconcileNamed,
  });
  assert.equal(built[0].json.pipeline_ready, true);
  assert.equal(built[0].json.ingress_mode, 'completed_reconcile');
  assert.equal(built[0].json.postgres_command.request_claim_id, requestContext.claim_id);
  assert.equal(built[0].json.postgres_command.business_claim_id, completed.claim_id);
  assert.equal(built[0].json.postgres_command.job_id, completed.job_id);
  assert.equal(built[0].json.postgres_command.event_identity_fingerprint,
    route.event_identity_fingerprints[route.active_key_version]);
  assert.equal(built[0].json.postgres_command.message_fingerprint,
    route.message_fingerprints[route.active_key_version]);
  assert.equal(built[0].json.postgres_command.conversation_fingerprint,
    completed.conversation_fingerprint);
  const projected = runCodeNode('Project Exact Completed Event Reconciliation Command', {
    items: built,
  });
  assert.equal(projected[0].json.pipeline_ready, true);

  const resultValue = {
    account_id: completed.account_id, inbox_id: completed.inbox_id, channel: completed.channel,
    conversation_id: completed.conversation_id, anchor_message_id: completed.anchor_message_id,
    correlation_id: completed.correlation_id,
    event_identity_key_version: completed.event_identity_key_version,
    event_identity_fingerprint: completed.event_identity_fingerprint,
    conversation_fingerprint: completed.conversation_fingerprint,
    message_fingerprint: completed.message_fingerprint,
    baseline_fingerprint_key_version: completed.baseline_fingerprint_key_version,
    baseline_status_fingerprint: completed.baseline_status_fingerprint,
    baseline_assignee_fingerprint: completed.baseline_assignee_fingerprint,
    delay_policy_version: completed.delay_policy_version, delay_seconds: completed.delay_seconds,
    knowledge_version: completed.knowledge_version,
    request_claim_id: requestContext.claim_id, business_claim_id: completed.claim_id,
    job_id: completed.job_id, generation: completed.generation,
    due_at: completed.due_at, state: 'completed',
  };
  const advanceResult = (value) => ({ json: { result: {
    contract_verified: true, status: 'duplicate_or_conflict',
    operation: 'advance_conversation_generation', outcome: 'duplicate_ingress_bound',
    value, error_code: null,
  } } });
  const finalized = runCodeNode('Validate Completed Event Atomic Reconciliation Before 204', {
    items: [advanceResult(resultValue)],
    named: { 'Project Exact Completed Event Reconciliation Command': projected[0] },
  });
  assert.equal(finalized[0].json.durable_state, 'committed');
  assert.equal(finalized[0].json.ack_mode, 'completed_reconcile');
  assert.equal(finalized[0].json.durable.state, 'completed');
  const mutated = runCodeNode('Validate Completed Event Atomic Reconciliation Before 204', {
    items: [advanceResult({ ...resultValue,
      event_identity_fingerprint: route.event_identity_fingerprints[route.active_key_version] })],
    named: { 'Project Exact Completed Event Reconciliation Command': projected[0] },
  });
  assert.equal(mutated[0].json.durable_state, 'retry');

  const claimFalse = edges.find((edge) => edge.from === 'Business Event Lease Owned?' &&
    edge.branch === 'false');
  assert.equal(claimFalse.to, 'Completed Business Event Requires Atomic Request Reconciliation?');
  assert.equal(reachable('Build Completed Event Atomic Request Reconciliation',
    'Postgres Edge Atomic 04R - advance_conversation_generation completed event reconciliation'), true);
  assert.equal(reachable('Build Completed Event Atomic Request Reconciliation',
    'GET Baseline Chatwoot Conversation Before Durable Commit'), false);
  const responseIncoming = edges.filter((edge) =>
    edge.to === 'Respond 204 Only After Completed Event Atomic Reconciliation');
  assert.deepEqual(responseIncoming.map((edge) => [edge.from, edge.branch]),
    [['Completed Event Request Atomically Reconciled?', 'true']]);
  for (const required of [
    'Project Exact Completed Event Reconciliation Command',
    'Postgres Edge Atomic 04R - advance_conversation_generation completed event reconciliation',
    'Validate Completed Event Atomic Reconciliation Before 204',
    'Completed Event Request Atomically Reconciled?',
  ]) {
    assert.equal(reachable('POST Calapres Chatwoot Signed Raw Webhook',
      'Respond 204 Only After Completed Event Atomic Reconciliation', required), false, required);
  }
  assert.equal(reachable('Respond 204 Only After Completed Event Atomic Reconciliation',
    'Wait Until PostgreSQL Due At - Identifiers Only'), false);
  assert.equal(reachable('Build Completed Event Atomic Request Reconciliation',
    'Respond 204 Only After Combined Durable Commit'), false);
});

test('initial 204 is possible only after baseline HMAC and combined durable commit', () => {
  const accepted = 'Respond 204 Only After Combined Durable Commit';
  const incoming = edges.filter((edge) => edge.to === accepted);
  assert.deepEqual(
    incoming.map((edge) => [edge.from, edge.branch]),
    [['Fresh Durable Job Committed and Pending?', 'true']],
  );
  for (const required of [
    'GET Baseline Chatwoot Conversation Before Durable Commit',
    'Crypto HMAC - Calapres Ingress Baseline Status v1 Placeholder',
    'Crypto HMAC - Calapres Ingress Baseline Assignee v1 Placeholder',
    'Build Combined Durable Ingress Command',
    'Project Exact Fresh Atomic Ingress Command',
    'Postgres Edge Atomic 04 - advance_conversation_generation',
    'Validate Fresh Combined Durable Commit Before 204',
    'Fresh Durable Job Committed and Pending?',
  ]) {
    assert.equal(reachable('POST Calapres Chatwoot Signed Raw Webhook', accepted, required), false, required);
  }
  const replayIncoming = edges.filter((edge) => edge.to === 'Respond 204 Completed Replay Linked Job');
  assert.deepEqual(
    replayIncoming.map((edge) => [edge.from, edge.branch]),
    [['Completed Replay Linked to Durable Job?', 'true']],
  );
});

test('same-Edge crash recovery converges on the one claim-next-due worker boundary', () => {
  const schedule = 'Recovery Schedule 30 Minutes - Source Disabled Pending Cost SLA Approval';
  const wait = 'Wait Until PostgreSQL Due At - Identifiers Only';
  const claim = 'Postgres Edge Atomic 07 - claim_due_conversation_retry';
  assert.equal(reachable(schedule, claim), true);
  assert.equal(reachable(wait, claim), true);
  assert.equal(byType('n8n-nodes-base.postgres').filter((node) =>
    node.parameters.query.includes('claim_due_conversation_retry')).length, 1);
});

test('deployment manifest is update-existing-only and keeps all live authority closed', () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  assert.equal(manifest.deployment_mode, 'update_existing_only');
  assert.equal(manifest.target_workflow_id, 'e442GlRmKP4IO8pm');
  assert.equal(manifest.source_workflow, 'n8n/workflows/calapres-customer-service-edge-v2.ts');
  assert.equal(manifest.create_allowed, false);
  assert.equal(manifest.activation_allowed, false);
  assert.equal(manifest.publish_allowed, false);
  assert.equal(manifest.credential_binding_allowed, false);
  assert.equal(manifest.live_sync_executed, false);
  assert.equal(manifest.recovery_schedule.enabled_in_source, false);
  assert.equal(manifest.recovery_schedule.interval_minutes, 30);
  assert.equal(manifest.recovery_schedule.estimated_top_level_executions_per_30_day_month, 1440);
  assert.equal(manifest.source_sha256, sha256(source));
});
