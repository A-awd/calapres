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
const publishedVersionId = 'b67ae1e3-98df-4665-9bee-29754d1beafd';

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

const classificationParserName = 'Calapres Classification Parser';
const composerPrepareName = 'Prepare Natural Response Composition';
const composerGateName = 'Natural Response Needed?';
const composerAgentName = 'Calapres Natural Response Composer';
const composerModelName = 'OpenAI Calapres Composer Model';
const composerParserName = 'Calapres Natural Response Parser';
const composerValidatorName = 'Validate Natural Response Composition';

const incomingCondition = requiredNode('Should Reply?').parameters.conditions.conditions
  .find((condition) => condition.id === 'incoming');
if (!incomingCondition) throw new Error('missing incoming Chatwoot gate');
incomingCondition.leftValue = "={{ $json.body.message_type === 'incoming' || Number($json.body.message_type) === 0 }}";
incomingCondition.operator = {
  operation: 'true',
  singleValue: true,
  type: 'boolean',
};
incomingCondition.rightValue = true;

const verifiedRoute = requiredNode('Verify Chatwoot Anchor and Route');
const oldContextMap = ".map((row) => ({ direction: Number(row.message_type) === 0 ? 'customer' : 'store',\n    text: String(row.content).slice(0, 500) }));";
const canonicalContextMap = ".map((row) => ({ direction: Number(row.message_type) === 0 ? 'incoming' : 'outgoing',\n    content: String(row.content).slice(0, 500) }));";
if (verifiedRoute.parameters.jsCode.includes(oldContextMap)) {
  verifiedRoute.parameters.jsCode = verifiedRoute.parameters.jsCode.replace(
    oldContextMap,
    canonicalContextMap,
  );
} else if (!verifiedRoute.parameters.jsCode.includes(canonicalContextMap)) {
  throw new Error('unable to locate Chatwoot context mapping');
}

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
  hasOutputParser: true,
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
  },
};

const classificationParser = {
  id: '1b7289fa-e39d-43ab-a80d-f6d0da02a001',
  name: classificationParserName,
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  typeVersion: 1.3,
  position: [720, 336],
  parameters: {
    schemaType: 'manual',
    inputSchema: JSON.stringify(engine.classificationSchema),
    autoFix: false,
  },
};
if (nodes.has(classificationParser.name)) {
  Object.assign(nodes.get(classificationParser.name), classificationParser);
} else {
  workflow.nodes.push(classificationParser);
  nodes.set(classificationParser.name, classificationParser);
}
workflow.connections[classificationParserName] = {
  ai_outputParser: [[{ node: 'Calapres Brain', type: 'ai_outputParser', index: 0 }]],
};

requiredNode('Humanize Text').parameters.jsCode = [
  "'use strict';",
  embeddedEngine,
  "const s=$('Interpret Model Budget Reservation').first().json||{};",
  'const incoming=$input.first().json||{};',
  'let raw=incoming.output!==undefined?incoming.output:incoming;',
  'if(raw&&typeof raw===\'object\'&&raw.output!==undefined)raw=raw.output;',
  'let parsed=null;',
  'try{',
  '  if(typeof raw===\'string\'){',
  '    const cleaned=raw.trim().replace(/^```(?:json)?\\s*/i,\'\').replace(/\\s*```$/,\'\');',
  '    parsed=JSON.parse(cleaned);',
  '  }else parsed=raw;',
  '}catch(e){}',
  'if(parsed&&typeof parsed===\'object\'&&parsed.output&&typeof parsed.output===\'object\')parsed=parsed.output;',
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

const composerSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string', minLength: 2, maxLength: 400 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    grounded: { type: 'boolean' },
  },
  required: ['reply', 'confidence', 'grounded'],
};

const composerNodes = [
  {
    id: '1b7289fa-e39d-43ab-a80d-f6d0da02a002',
    name: composerPrepareName,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [680, 140],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: [
        "'use strict';",
        'const s=$input.first().json||{};',
        'const draft=String(s.reply_text||\'\').trim();',
        'const recent=(Array.isArray(s.recent_context)?s.recent_context:[]).slice(-6)',
        '  .filter((row)=>row&&[\'incoming\',\'outgoing\'].includes(row.direction)&&typeof row.content===\'string\')',
        '  .map((row)=>({direction:row.direction,content:row.content.slice(0,500)}));',
        'const customerMessage=String(s.context&&s.context.customer_text||\'\').slice(0,1000);',
        'const compositionRequired=s.send_ready===true&&draft.length>=2;',
        'const composerInput={brand_id:\'calapres\',brand_name_ar:\'كالابريز\',',
        '  business_summary_ar:\'متجر سعودي إلكتروني متخصص في المباخر الفاخرة\',',
        '  customer_message:customerMessage,recent_context:recent,',
        '  decision_kind:s.decision_kind||\'clarification\',grounded_draft:draft,',
        '  allowed_external_tools:[]};',
        'return[{json:{...s,composition_required:compositionRequired,composer_input:composerInput,',
        '  grounded_reply_draft:draft,composer_status:compositionRequired?\'pending\':\'skipped\'}}];',
      ].join('\n'),
    },
  },
  {
    id: '1b7289fa-e39d-43ab-a80d-f6d0da02a003',
    name: composerGateName,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.3,
    position: [900, 140],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{
          id: 'composition-required',
          leftValue: '={{ $json.composition_required === true }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'true', singleValue: true },
        }],
        combinator: 'and',
      },
      options: {},
    },
  },
  {
    id: '1b7289fa-e39d-43ab-a80d-f6d0da02a004',
    name: composerAgentName,
    type: '@n8n/n8n-nodes-langchain.agent',
    typeVersion: 3.1,
    position: [1120, 20],
    onError: 'continueRegularOutput',
    retryOnFail: false,
    parameters: {
      promptType: 'define',
      text: '={{ JSON.stringify($json.composer_input) }}',
      hasOutputParser: true,
      options: {
        systemMessage: [
          'أنت موظف خدمة عملاء سعودي طبيعي ومختصر لمتجر كالابريز.',
          'اكتب الرد النهائي فقط اعتمادًا على grounded_draft وسياق المحادثة المرسل.',
          'تفاعل مع سؤال العميل نفسه ولا تكرر جملة آلية موحدة.',
          'استخدم لهجة سعودية مهذبة وواضحة، من جملة إلى ثلاث جمل، بلا مبالغة أو حشو.',
          'إذا كان السؤال خارج المتجر فلا تجب عنه ولا تبحث خارجيًا؛ صحح اللبس بلطف وأعد الحديث إلى منتجات كالابريز.',
          'لا تضف منتجًا أو سعرًا أو مخزونًا أو شحنًا أو سياسة أو حالة طلب أو إجراء لم يذكره grounded_draft.',
          'لا تغيّر معنى grounded_draft ولا تدّع تنفيذ إلغاء أو استرداد أو تعديل.',
          'لا توجد أي أدوات خارجية متاحة لك. أخرج الكائن المطلوب فقط.',
        ].join(' '),
      },
    },
  },
  {
    id: '1b7289fa-e39d-43ab-a80d-f6d0da02a005',
    name: composerModelName,
    type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
    typeVersion: 1.3,
    position: [1080, 260],
    onError: 'continueRegularOutput',
    retryOnFail: false,
    credentials: model.credentials,
    parameters: {
      model: model.parameters.model,
      responsesApiEnabled: true,
      options: {
        temperature: 0.4,
        reasoningEffort: 'low',
        maxTokens: 500,
        maxRetries: 1,
        timeout: 30000,
        promptCacheKey: 'calapres-grounded-natural-composer-v1',
        safetyIdentifier: "={{ 'calapres_compose_' + $('Prepare Natural Response Composition').first().json.context.conversation_id }}",
      },
    },
  },
  {
    id: '1b7289fa-e39d-43ab-a80d-f6d0da02a006',
    name: composerParserName,
    type: '@n8n/n8n-nodes-langchain.outputParserStructured',
    typeVersion: 1.3,
    position: [1320, 260],
    parameters: {
      schemaType: 'manual',
      inputSchema: JSON.stringify(composerSchema),
      autoFix: false,
    },
  },
  {
    id: '1b7289fa-e39d-43ab-a80d-f6d0da02a007',
    name: composerValidatorName,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1360, 20],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: [
        "'use strict';",
        "const s=$('Prepare Natural Response Composition').first().json||{};",
        'const fallback=String(s.grounded_reply_draft||s.reply_text||\'\').trim();',
        'const incoming=$input.first().json||{};',
        'let raw=incoming.output!==undefined?incoming.output:incoming;',
        'if(raw&&typeof raw===\'object\'&&raw.output!==undefined)raw=raw.output;',
        'let parsed=null;',
        'try{',
        '  if(typeof raw===\'string\'){',
        '    const cleaned=raw.trim().replace(/^```(?:json)?\\s*/i,\'\').replace(/\\s*```$/,\'\');',
        '    parsed=JSON.parse(cleaned);',
        '  }else parsed=raw;',
        '}catch(e){}',
        'if(parsed&&typeof parsed===\'object\'&&parsed.output&&typeof parsed.output===\'object\')parsed=parsed.output;',
        'const fail=(status)=>[{json:{...s,reply_text:fallback,composer_input:null,',
        '  composition_required:false,composer_status:status}}];',
        'if(!parsed||typeof parsed!==\'object\'||parsed.grounded!==true||Number(parsed.confidence)<0.85)',
        '  return fail(\'rejected_invalid_output\');',
        'let reply=String(parsed.reply||\'\').replace(/```[\\s\\S]*?```/g,\'\')',
        '  .replace(/[\\r\\n]+/g,\' \').replace(/[*_~`#]/g,\'\').replace(/\\s+/g,\' \').trim();',
        'if(reply.length<2||reply.length>400)return fail(\'rejected_invalid_length\');',
        'const sentences=reply.split(/(?<=[.!؟])\\s+/u).filter(Boolean);',
        'if(sentences.length>3)return fail(\'rejected_too_long\');',
        'const numberPattern=/[0-9٠-٩]+(?:[.,٫][0-9٠-٩]+)?/g;',
        'const trusted=new Set(fallback.match(numberPattern)||[]);',
        'const candidate=reply.match(numberPattern)||[];',
        'if(candidate.some((value)=>!trusted.has(value)))return fail(\'rejected_untrusted_numbers\');',
        'const forbidden=/(تم (?:إلغاء|الغاء|استرداد|إرجاع|ارجاع|تعديل|شحن)|ألغيت|الغيت|استرجعت|عدلت (?:العنوان|الطلب)|رقم التتبع)/i;',
        'if(forbidden.test(reply)&&!forbidden.test(fallback))return fail(\'rejected_untrusted_action\');',
        'return[{json:{...s,reply_text:reply,composer_input:null,composition_required:false,',
        '  composer_status:\'accepted\'}}];',
      ].join('\n'),
    },
  },
];

for (const node of composerNodes) {
  if (nodes.has(node.name)) {
    Object.assign(nodes.get(node.name), node);
  } else {
    workflow.nodes.push(node);
    nodes.set(node.name, node);
  }
}

workflow.connections['Humanize Text'] = {
  main: [[{ node: 'Route Customer Service Decision', type: 'main', index: 0 }]],
};

const composerInputSources = [
  'Route Customer Service Decision',
  'Shopify Order Read Ready?',
  'Verified Order Reply Ready?',
  'Model Reply Safe?',
  'Validate Escalation and Build Finalize',
  'Out of Scope Notice Allowed?',
  'Prepare Model Unavailable Fallback',
];
for (const source of composerInputSources) {
  const connection = workflow.connections[source];
  if (!connection || !Array.isArray(connection.main)) throw new Error(`missing main connection for ${source}`);
  let rewired = 0;
  let alreadyWired = 0;
  for (const edges of connection.main) {
    for (const edge of edges || []) {
      if (edge.node === 'Pre-Send Continuation') {
        edge.node = composerPrepareName;
        rewired += 1;
      } else if (edge.node === composerPrepareName) {
        alreadyWired += 1;
      }
    }
  }
  if (rewired + alreadyWired !== 1) {
    throw new Error(`expected one customer draft edge from ${source}, found ${rewired + alreadyWired}`);
  }
}

workflow.connections[composerPrepareName] = {
  main: [[{ node: composerGateName, type: 'main', index: 0 }]],
};
workflow.connections[composerGateName] = {
  main: [
    [{ node: composerAgentName, type: 'main', index: 0 }],
    [{ node: 'Pre-Send Continuation', type: 'main', index: 0 }],
  ],
};
workflow.connections[composerAgentName] = {
  main: [[{ node: composerValidatorName, type: 'main', index: 0 }]],
};
workflow.connections[composerModelName] = {
  ai_languageModel: [[{ node: composerAgentName, type: 'ai_languageModel', index: 0 }]],
};
workflow.connections[composerParserName] = {
  ai_outputParser: [[{ node: composerAgentName, type: 'ai_outputParser', index: 0 }]],
};
workflow.connections[composerValidatorName] = {
  main: [[{ node: 'Pre-Send Continuation', type: 'main', index: 0 }]],
};

workflow.node_count = workflow.nodes.length;
workflow.active_version_id = publishedVersionId;
workflow.publish_state = 'published_active';
workflow.grounded_support_candidate = {
  brand_pack: 'support/brands/calapres/agent/2026-08-25-v1-candidate.json',
  engine: 'n8n/modules/grounded-support-agent.js',
  mode: 'strict_classifier_shopify_read_grounded_natural_composer',
  live_proof: true,
};

if (workflow.node_count !== 107) throw new Error(`unexpected node count: ${workflow.node_count}`);
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
manifest.live_sync_executed = true;
manifest.source_only = false;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

process.stdout.write(`${manifest.source_sha256}\n`);
