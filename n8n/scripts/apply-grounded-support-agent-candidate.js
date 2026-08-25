'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const { createGroundedSupportEngine } = require('../modules/grounded-support-agent');

const repoRoot = path.join(__dirname, '..', '..');
const workflowPath = path.join(repoRoot, 'n8n', 'deployments', 'calapres-cs-bot-protected-draft.json');
const manifestPath = path.join(
  repoRoot,
  'n8n',
  'deployments',
  'calapres-cs-bot-protected-draft.update-manifest.json',
);
const packPath = path.join(
  repoRoot,
  'support',
  'brands',
  'calapres',
  'agent',
  '2026-08-25-v1-candidate.json',
);

const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const brandPack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
const engine = createGroundedSupportEngine(brandPack);
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));

function requiredNode(name) {
  const node = nodes.get(name);
  if (!node) throw new Error(`missing workflow node: ${name}`);
  return node;
}

const embeddedEngine = [
  `const __brandPack=${JSON.stringify(brandPack)};`,
  `const __createGroundedSupportEngine=${engine.factorySource};`,
  'const __groundedEngine=__createGroundedSupportEngine(__brandPack);',
].join('\n');

requiredNode('Governed Customer Scope Router').parameters.jsCode = [
  "'use strict';",
  embeddedEngine,
  'const s=$input.first().json||{};',
  'const c=s.context||{};',
  'const classifierInput=__groundedEngine.buildClassifierInput({',
  '  customer_message:c.customer_text,',
  '  recent_context:Array.isArray(s.recent_context)?s.recent_context:[],',
  '});',
  'return[{json:{...s,route_index:3,decision_kind:\'grounded_classification\',',
  '  classifier_input:classifierInput,knowledge_version:__brandPack.version,',
  '  dynamic_read:null,order_number:null,product_search_terms:[],shopify_request:null,',
  '  model_allowed:true,tool_allowed:false,send_ready:false,reply_text:null,error_code:null}}];',
].join('\n');

requiredNode('Calapres Brain').parameters = {
  promptType: 'define',
  text: '={{ JSON.stringify($json.classifier_input) }}',
  options: {
    systemMessage: [
      'أنت مصنّف مقيد لخدمة عملاء كالابريز.',
      'صنّف المعنى فقط ولا تعتمد على كلمات منفردة.',
      'لا تكتب ردًا للعميل ولا تجب عن السؤال.',
      'استخدم فقط هوية البراند والفئات والحقائق والقدرات الموجودة في المدخل.',
      'أي طقس أو أخبار أو نصيحة عامة أو متجر آخر أو منتج خارج الكتالوج يصنف out_of_scope.',
      'إذا كان وصف المنتج محتملًا داخل فئات المتجر فاختر product_search واستخرج حتى ست كلمات بحث قصيرة.',
      'لا تخترع منتجًا أو سعرًا أو سياسة أو أداة. أخرج الكائن المطلوب فقط.',
    ].join(' '),
  },
};

const model = requiredNode('OpenAI Calapres Restricted Model');
model.parameters = {
  model: model.parameters.model,
  responsesApiEnabled: true,
  options: {
    temperature: 0,
    reasoningEffort: 'low',
    maxTokens: 800,
    maxRetries: 1,
    timeout: 30000,
    promptCacheKey: 'calapres-grounded-classifier-v1',
    safetyIdentifier: "={{ 'calapres_cw_' + $('Interpret Model Budget Reservation').first().json.context.conversation_id }}",
    textFormat: {
      textOptions: {
        type: 'json_schema',
        verbosity: 'low',
        name: 'calapres_support_classification',
        schema: engine.classificationSchema,
        description: 'A classification decision only. It never contains a customer answer.',
        strict: true,
      },
    },
  },
};

requiredNode('Humanize Text').parameters.jsCode = [
  "'use strict';",
  embeddedEngine,
  "const s=$('Interpret Model Budget Reservation').first().json||{};",
  'const raw=$input.first().json&&$input.first().json.output;',
  'let parsed=null;',
  'try{parsed=typeof raw===\'string\'?JSON.parse(raw):raw;}catch(e){}',
  'let decision=null;',
  'try{decision=__groundedEngine.interpretClassification(parsed,{scope_notice_sent:s.scope_notice_sent===true});}catch(e){}',
  'if(!decision)return[{json:{...s,route_index:1,decision_kind:\'clarification\',',
  '  classifier_input:null,agent_decision:null,dynamic_read:null,order_number:null,',
  '  product_search_terms:[],shopify_request:null,model_allowed:false,tool_allowed:false,',
  '  send_ready:true,reply_text:__brandPack.replies.clarification_ar,error_code:null,',
  '  reason_code:\'classifier_invalid\'}}];',
  'const routeMap={fixed_reply:1,uncertain:1,dynamic_read:2,out_of_scope:4,handoff:5};',
  'const routeIndex=routeMap[decision.route];',
  'if(!Number.isInteger(routeIndex)||routeIndex===3)throw new Error(\'grounded_route_invalid\');',
  'let shopifyRequest=null;',
  'if(decision.capability===\'product_search\')shopifyRequest=__groundedEngine.buildShopifyProductRequest(decision);',
  'const decisionKind=decision.intent===\'product_search\'?\'faq\':',
  '  decision.intent===\'order_status\'?\'order\':',
  '  decision.intent===\'order_change_request\'?\'sensitive_request\':',
  '  decision.intent===\'greeting\'?\'greeting\':',
  '  decision.intent===\'out_of_scope\'?\'out_of_scope\':',
  '  decision.intent===\'human_request\'?\'clarification\':\'faq\';',
  'return[{json:{...s,route_index:routeIndex,decision_kind:decisionKind,',
  '  classifier_input:null,agent_decision:decision,dynamic_read:decision.capability,',
  '  order_number:decision.order_number,product_search_terms:decision.product_search_terms,',
  '  shopify_request:shopifyRequest,model_allowed:false,tool_allowed:decision.tool_allowed,',
  '  send_ready:decision.send_ready,reply_text:decision.reply_text,',
  '  suppress_reply:decision.suppress_reply,reason_code:decision.reason_code,',
  '  error_code:decision.route===\'handoff\'?\'customer_requested_human\':null}}];',
].join('\n');

const prepareShopify = requiredNode('Prepare Shopify Order Read');
const oldPrepare = prepareShopify.parameters.jsCode;
const orderStart = oldPrepare.indexOf('if(!phone)');
if (orderStart < 0) throw new Error('unable to locate preserved order lookup code');
prepareShopify.parameters.jsCode = [
  'const s=$input.first().json||{};const phone=s.customer_phone;const orderNumber=s.order_number?(\'#\'+String(s.order_number).replace(/^#/,\'\')):null;',
  "if(s.dynamic_read==='product_search'){",
  '  if(!s.shopify_request||typeof s.shopify_request.query!==\'string\'||!s.shopify_request.variables)',
  '    return[{json:{...s,shopify_lookup_ready:false,send_ready:true,decision_kind:\'clarification\',reply_text:\'وش حاب تعرف عن منتجات كالابريز أو طلبك؟\'}}];',
  '  return[{json:{...s,shopify_lookup_ready:true,shopify_lookup_mode:\'grounded_product_search\'}}];',
  '}',
  oldPrepare.slice(orderStart),
].join('\n');

const buildShopifyReply = requiredNode('Build Verified Shopify Order Reply');
const legacyRendererMarker = '// CALAPRES_LEGACY_ORDER_RENDER_V1';
const currentShopifyRenderer = buildShopifyReply.parameters.jsCode;
let legacyShopifyRenderer = currentShopifyRenderer;
if (currentShopifyRenderer.includes(legacyRendererMarker)) {
  legacyShopifyRenderer = currentShopifyRenderer
    .slice(currentShopifyRenderer.indexOf(legacyRendererMarker) + legacyRendererMarker.length)
    .replace(/^\n/u, '');
} else if (currentShopifyRenderer.startsWith("'use strict';")) {
  const legacyStart = currentShopifyRenderer.indexOf(
    "const s=$('Prepare Shopify Order Read').first().json||{};const h=$input.first().json||{};",
  );
  if (legacyStart < 0) throw new Error('unable to locate preserved Shopify order renderer');
  legacyShopifyRenderer = currentShopifyRenderer.slice(legacyStart);
}
buildShopifyReply.parameters.jsCode = [
  "'use strict';",
  embeddedEngine,
  "const __groundedState=$('Prepare Shopify Order Read').first().json||{};",
  'const __groundedHttp=$input.first().json||{};',
  "if(__groundedState.shopify_lookup_mode==='grounded_product_search'){",
  '  const rendered=__groundedEngine.renderShopifyProductReply(__groundedState.agent_decision,{statusCode:__groundedHttp.statusCode,body:__groundedHttp.body});',
  '  return[{json:{...__groundedState,...rendered,shopify_request:null,agent_decision:null,dynamic_read:null}}];',
  '}',
  legacyRendererMarker,
  legacyShopifyRenderer,
].join('\n');

requiredNode('Validate Escalation and Build Finalize').parameters.jsCode = [
  "const s=$('Build Human Escalation').first().json||{};",
  'const h=$input.first().json||{};',
  "const payload=h.body&&typeof h.body==='object'?h.body.payload:null;",
  "if(h.statusCode!==200||!Array.isArray(payload)||!payload.includes('human'))throw new Error('chatwoot_human_label_not_committed');",
  'return[{json:{...s,label_request_body:null,send_ready:true,decision_kind:\'clarification\',',
  '  reply_text:s.reply_text||\'أكيد، بحوّل طلبك لفريق خدمة العملاء.\'}}];',
].join('\n');

workflow.connections['Humanize Text'] = {
  main: [[{ node: 'Route Customer Service Decision', type: 'main', index: 0 }]],
};
workflow.connections['Validate Escalation and Build Finalize'] = {
  main: [[{ node: 'Pre-Send Continuation', type: 'main', index: 0 }]],
};

workflow.node_count = workflow.nodes.length;
workflow.grounded_support_candidate = {
  brand_pack: 'support/brands/calapres/agent/2026-08-25-v1-candidate.json',
  engine: 'n8n/modules/grounded-support-agent.js',
  mode: 'strict_classifier_shopify_read_deterministic_renderer',
  live_proof: false,
};

if (workflow.node_count !== 100) throw new Error(`unexpected node count: ${workflow.node_count}`);
const incomingSendEdges = Object.entries(workflow.connections).flatMap(([source, connection]) =>
  (connection.main || []).flatMap((edges, output) => (edges || []).flatMap((edge) =>
    edge.node === 'Send Reply' ? [{ source, output }] : [])));
if (JSON.stringify(incomingSendEdges) !== JSON.stringify([
  { source: 'Customer Egress Authorized?', output: 0 },
])) throw new Error('Send Reply authorization edge changed');

const workflowText = `${JSON.stringify(workflow, null, 2)}\n`;
fs.writeFileSync(workflowPath, workflowText);

manifest.source_sha256 = createHash('sha256').update(workflowText).digest('hex');
manifest.create_allowed = false;
manifest.activation_allowed = false;
manifest.publish_allowed = false;
manifest.credential_binding_allowed = false;
manifest.live_sync_executed = false;
manifest.source_only = true;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

process.stdout.write(`${manifest.source_sha256}\n`);
