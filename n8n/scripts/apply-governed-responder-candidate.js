#!/usr/bin/env node
'use strict';

const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { createGovernedResponder } = require('../modules/governed-responder');

const root = join(__dirname, '../..');
const workflowPath = join(root, 'n8n/deployments/calapres-cs-bot-protected-draft.json');
const manifestPath = join(root, 'n8n/deployments/calapres-cs-bot-protected-draft.update-manifest.json');
const releasePath = join(root, 'support/brands/calapres/knowledge/2026-08-25-v4-candidate.json');
const governedNodeName = 'Governed Customer Scope Router';

function fail(message) {
  throw new Error(message);
}

function targets(workflow, source) {
  return Object.values(workflow.connections[source] || {})
    .flat(2)
    .filter(Boolean)
    .map((edge) => edge.node);
}

function incoming(workflow, targetName) {
  const result = [];
  for (const [source, connection] of Object.entries(workflow.connections)) {
    for (const [output, edges] of (connection.main || []).entries()) {
      for (const edge of edges || []) {
        if (edge.node === targetName) result.push({ source, output });
      }
    }
  }
  return result;
}

function nodeByName(workflow, name) {
  const node = workflow.nodes.find((candidate) => candidate.name === name);
  if (!node) fail(`required node is missing: ${name}`);
  return node;
}

function buildRouterCode(release) {
  const factory = createGovernedResponder.toString();
  return `'use strict';\n`
    + `const __release=${JSON.stringify(release)};\n`
    + `const __createGovernedResponder=${factory};\n`
    + `const __responder=__createGovernedResponder(__release);\n`
    + `const s=$input.first().json||{};\n`
    + `const text=s.context&&typeof s.context.customer_text==='string'?s.context.customer_text:'';\n`
    + `const decision=__responder.decide({message:text,scope_notice_sent:s.scope_notice_sent===true});\n`
    + `const reply=__responder.render(decision);\n`
    + `const routeMap={fixed_reply:1,uncertain:1,dynamic_read:2,out_of_scope:4,handoff:5};\n`
    + `const routeIndex=routeMap[decision.route];\n`
    + `if(!Number.isInteger(routeIndex)||routeIndex===3||decision.model_allowed!==false)throw new Error('governed_route_invalid');\n`
    + `const capability=decision.dynamic_read&&decision.dynamic_read.provider==='shopify'?decision.dynamic_read.capability:null;\n`
    + `const sendReady=(routeIndex===1||routeIndex===4)&&decision.suppress_reply!==true;\n`
    + `return[{json:{...s,route_index:routeIndex,decision_kind:decision.decision_kind,request_kind:capability,`
    + `reply_text:reply,response_id:decision.response_id,knowledge_version:decision.knowledge_version,`
    + `dynamic_read:capability,order_number:decision.order_number,model_allowed:false,tool_allowed:decision.tool_allowed,`
    + `reason_code:decision.reason_code,suppress_reply:decision.suppress_reply,send_ready:sendReady,`
    + `error_code:routeIndex===5?'customer_requested_human':null}}];`;
}

function updateShopifyPreparation(node) {
  let code = node.parameters.jsCode;
  code = code.replace(
    "const s=$input.first().json||{};const phone=s.customer_phone;const orderNumber=s.order_number;",
    "const s=$input.first().json||{};const phone=s.customer_phone;const orderNumber=s.order_number?('#'+String(s.order_number).replace(/^#/,'')):null;",
  );
  code = code.replace(
    "if(s.decision_kind==='product'){",
    "if(['product_catalog','product_info'].includes(s.dynamic_read)){",
  );
  code = code.replace(
    "const catalog=s.catalog_request===true||!topic;",
    "const catalog=s.dynamic_read==='product_catalog'||!topic;",
  );
  if (!code.includes("if(['product_catalog','product_info'].includes(s.dynamic_read))")) {
    fail('Shopify preparation contract was not updated');
  }
  node.parameters.jsCode = code;
}

function updateShopifyRenderer(node) {
  let code = node.parameters.jsCode;
  code = code.replace(
    "decision_kind:'product',\n    reply_text:('المتوفر حاليًا: '+items.join('، ')+'. إذا ودك أساعدك تختار، قل لي اللون أو المناسبة.')",
    "decision_kind:'faq',\n    reply_text:('لقيت في المتجر الآن: '+items.join('، ')+'. إذا ودك أساعدك تختار، قل لي اللون أو المناسبة.')",
  );
  if (!code.includes("لقيت في المتجر الآن: ") || code.includes('المتوفر حاليًا: ')) {
    fail('Shopify product renderer contract was not updated');
  }
  node.parameters.jsCode = code;
}

function tightenDormantModel(node) {
  const current = node.parameters.options.systemMessage;
  const prefix = 'هذا مسار احتياطي غير مستخدم. ممنوع الإجابة عن أي سؤال خارج متجر كالابريز، بما في ذلك الطقس والأخبار والمعلومات العامة. أعد العميل إلى المباخر أو الطلبات أو الدفع أو الشحن فقط. ';
  const stripped = current
    .replace('إذا كانت الرسالة تحية أو شكرًا أو مجاملة أو مزحة خفيفة أو سؤالًا اجتماعيًا بسيطًا، تجاوب بلطف ثم ارجع طبيعيًا لخدمة كالابريز. ', '')
    .replace('إذا كانت معلومة عامة بسيطة وآمنة، يجوز جواب مختصر جدًا ثم الانتقال للمساعدة في كالابريز. ', '')
    .replace('ممنوع نسخ جملة رفض ثابتة أو استخدام نفس الرد الحرفي للرسائل المختلفة. ', '');
  node.parameters.options.systemMessage = stripped.startsWith(prefix) ? stripped : prefix + stripped;
}

const workflow = JSON.parse(readFileSync(workflowPath, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const release = JSON.parse(readFileSync(releasePath, 'utf8'));

if (workflow.workflow_id !== 'kAyF0D3ZZHxc0Hwp') fail('unexpected workflow target');
if (manifest.target_workflow_id !== workflow.workflow_id) fail('manifest target mismatch');
nodeByName(workflow, 'Verify Chatwoot Anchor and Route');
nodeByName(workflow, 'Route Customer Service Decision');
nodeByName(workflow, 'Send Reply');

const currentVerifyTargets = targets(workflow, 'Verify Chatwoot Anchor and Route');
if (
  JSON.stringify(currentVerifyTargets) !== JSON.stringify(['Route Customer Service Decision'])
  && JSON.stringify(currentVerifyTargets) !== JSON.stringify([governedNodeName])
) {
  fail('verified anchor graph is not the approved shape');
}
if (JSON.stringify(incoming(workflow, 'Send Reply')) !== JSON.stringify([
  { source: 'Customer Egress Authorized?', output: 0 },
])) {
  fail('Send Reply authorization edge changed');
}

workflow.nodes = workflow.nodes.filter((node) => node.name !== governedNodeName);
delete workflow.connections[governedNodeName];
workflow.connections['Verify Chatwoot Anchor and Route'] = {
  main: [[{ node: governedNodeName, type: 'main', index: 0 }]],
};
workflow.connections[governedNodeName] = {
  main: [[{ node: 'Route Customer Service Decision', type: 'main', index: 0 }]],
};
workflow.nodes.push({
  parameters: {
    mode: 'runOnceForAllItems',
    language: 'javaScript',
    jsCode: buildRouterCode(release),
  },
  id: '99aa5938-85a2-4cf2-b938-95f14a8c73c1',
  name: governedNodeName,
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [2530, 80],
});

updateShopifyPreparation(nodeByName(workflow, 'Prepare Shopify Order Read'));
updateShopifyRenderer(nodeByName(workflow, 'Build Verified Shopify Order Reply'));
tightenDormantModel(nodeByName(workflow, 'Calapres Brain'));
for (const node of workflow.nodes) {
  if (typeof node.parameters?.jsCode === 'string') {
    node.parameters.jsCode = node.parameters.jsCode.replaceAll("decision_kind:'model_fallback'", "decision_kind:'clarification'");
  }
}

workflow.node_count = workflow.nodes.length;
if (workflow.node_count !== 100) fail(`unexpected governed node count: ${workflow.node_count}`);
if (targets(workflow, 'Verify Chatwoot Anchor and Route')[0] !== governedNodeName) fail('router insertion failed');
if (JSON.stringify(incoming(workflow, 'Send Reply')) !== JSON.stringify([
  { source: 'Customer Egress Authorized?', output: 0 },
])) {
  fail('Send Reply authorization edge changed after transformation');
}

const workflowText = `${JSON.stringify(workflow, null, 2)}\n`;
writeFileSync(workflowPath, workflowText, 'utf8');

manifest.source_sha256 = createHash('sha256').update(workflowText).digest('hex');
manifest.create_allowed = false;
manifest.activation_allowed = false;
manifest.publish_allowed = false;
manifest.credential_binding_allowed = false;
manifest.live_sync_executed = false;
manifest.source_only = true;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

process.stdout.write(`${manifest.source_sha256}\n`);
