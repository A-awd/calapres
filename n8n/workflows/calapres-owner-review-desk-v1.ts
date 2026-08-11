import { expr, ifElse, node, trigger, workflow } from '@n8n/workflow-sdk';

/*
 * Calapres Owner Review Desk v1 - observation-only source preview.
 *
 * This workflow is private. The execute-workflow input must be reached only
 * from an owner-authenticated topology that creates trusted_owner_ingress
 * outside the decision payload. The current booleans are synthetic contract
 * evidence, not sufficient authority for a future write. There is no public
 * ingress, credential, external call, model, customer egress, knowledge
 * publication, or Data Table node in this release.
 */

const calledByTrustedOwnerTopology = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.2,
  config: {
    name: 'Private Trusted Owner Review Input',
    parameters: {
      inputSource: 'passthrough',
    },
    position: [160, 220],
  },
});

const manualTest = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Manual Sanitized Owner Fixture Only',
    parameters: {},
    position: [160, 520],
  },
});

const createSanitizedOwnerFixture = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Create Sanitized Owner Review Fixture',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return [{
  json: {
    trusted_owner_ingress: {
      schema_version: '1.0',
      brand_id: 'calapres',
      kind: 'owner_review_topology_v1',
      source: 'private_owner_review_topology',
      account_id: 179973,
      inbox_id: 128058,
      channel: 'whatsapp',
      conversation_ref: 'cwr_synthetic001',
      source_private_message_fingerprint: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      fingerprint_key_version: 'hmac-sha256-v1',
      owner_authenticated: true,
      owner_authorized: true,
      replay_protection_verified: true,
      incident_lookup_verified: true,
      incident_snapshot_sanitized: true,
      owner_ref: 'own_primary001',
      incident_id: 'inc_synthetic0001',
      incident_revision: 1,
      review_idempotency_fingerprint: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      command_digest: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      auth_evidence_fingerprint: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      nonce_fingerprint: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      nonce_issued_at: '2026-08-11T09:07:50.000Z',
      nonce_expires_at: '2026-08-11T09:13:00.000Z',
      verified_at: '2026-08-11T09:08:01.000Z'
    },
    payload: {
      schema_version: '1.0',
      brand_id: 'calapres',
      incident_snapshot: {
        schema_version: '1.0',
        brand_id: 'calapres',
        incident_id: 'inc_synthetic0001',
        revision: 1,
        correlation_id: 'calapres:synthetic:004',
        conversation_ref: 'cwr_synthetic001',
        order_ref: null,
        severity: 'medium',
        category: 'return_or_refund',
        reason_code: 'owner_authority_required',
        sanitized_summary: 'Return request requires owner review; no customer details are stored.',
        status: 'awaiting_owner',
        draft_ref: 'dft_synthetic001',
        owner_decision_ref: null,
        created_at: '2026-08-11T09:07:00.000Z',
        updated_at: '2026-08-11T09:07:00.000Z',
        resolved_at: null
      },
      decision: {
        schema_version: '1.0',
        brand_id: 'calapres',
        decision_id: 'dec_synthetic0001',
        incident_id: 'inc_synthetic0001',
        action: 'reply_only',
        approver_ref: 'own_primary001',
        case_reply_ref: 'dft_synthetic001',
        case_reply_sha256: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        knowledge_proposal_ref: null,
        knowledge_proposal_sha256: null,
        base_knowledge_version: null,
        knowledge_version_to_publish: null,
        supersedes_knowledge_version: null,
        decided_at: '2026-08-11T09:08:00.000Z',
        effective_at: '2026-08-11T09:08:00.000Z',
        expires_at: null
      }
    }
  }
}];
`,
    },
    position: [420, 520],
  },
});

const validateOwnerReview = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Validate Trusted Owner Review Command',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const rootKeys = new Set(['trusted_owner_ingress', 'payload']);
const trustedKeys = new Set([
  'schema_version',
  'brand_id',
  'kind',
  'source',
  'account_id',
  'inbox_id',
  'channel',
  'conversation_ref',
  'source_private_message_fingerprint',
  'fingerprint_key_version',
  'owner_authenticated',
  'owner_authorized',
  'replay_protection_verified',
  'incident_lookup_verified',
  'incident_snapshot_sanitized',
  'owner_ref',
  'incident_id',
  'incident_revision',
  'review_idempotency_fingerprint',
  'command_digest',
  'auth_evidence_fingerprint',
  'nonce_fingerprint',
  'nonce_issued_at',
  'nonce_expires_at',
  'verified_at'
]);
const payloadKeys = new Set(['schema_version', 'brand_id', 'incident_snapshot', 'decision']);
const incidentKeys = new Set([
  'schema_version',
  'brand_id',
  'incident_id',
  'revision',
  'correlation_id',
  'conversation_ref',
  'order_ref',
  'severity',
  'category',
  'reason_code',
  'sanitized_summary',
  'status',
  'draft_ref',
  'owner_decision_ref',
  'created_at',
  'updated_at',
  'resolved_at'
]);
const decisionKeys = new Set([
  'schema_version',
  'brand_id',
  'decision_id',
  'incident_id',
  'action',
  'approver_ref',
  'case_reply_ref',
  'case_reply_sha256',
  'knowledge_proposal_ref',
  'knowledge_proposal_sha256',
  'base_knowledge_version',
  'knowledge_version_to_publish',
  'supersedes_knowledge_version',
  'decided_at',
  'effective_at',
  'expires_at'
]);
const actions = new Set(['reply_only', 'approve', 'approve_until', 'correct']);
const severities = new Set(['low', 'medium', 'high', 'critical']);
const categories = new Set([
  'knowledge_gap',
  'identity_ambiguity',
  'customer_complaint',
  'return_or_refund',
  'order_change',
  'payment_dispute',
  'privacy',
  'legal',
  'security',
  'connector_failure',
  'schema_failure',
  'rate_limit',
  'other'
]);
const allowedOwnerRefs = new Set(['own_primary001']);
const inboxChannels = new Map([
  [128031, 'instagram'],
  [128033, 'tiktok'],
  [128058, 'whatsapp'],
  [128326, 'email']
]);
const ownerPattern = /^own_[A-Za-z0-9_-]{6,80}$/;
const incidentPattern = /^inc_[A-Za-z0-9_-]{8,80}$/;
const decisionPattern = /^dec_[A-Za-z0-9_-]{8,80}$/;
const conversationPattern = /^cwr_[A-Za-z0-9_-]{6,128}$/;
const correlationPattern = /^calapres:[A-Za-z0-9:_-]{1,100}$/;
const orderPattern = /^sho_[A-Za-z0-9_-]{6,128}$/;
const draftPattern = /^dft_[A-Za-z0-9_-]{6,128}$/;
const proposalPattern = /^kpr_[A-Za-z0-9_-]{8,128}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const reasonPattern = /^[a-z][a-z0-9_]{2,80}$/;
const versionPattern = /^([0-9]{4})-([0-9]{2})-([0-9]{2})-v([1-9][0-9]*)$/;
const isoPattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]{1,3})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;
const prohibitedKeyPattern = /(^|_)(raw|phone|email|address|message|content|transcript|attachment|payment|secret|token|customer_name|order_payload)($|_)/i;
const emailValuePattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}/i;
const phoneValuePattern = /(?:[+]?[0-9][ ()-]?){7,}/;
const urlValuePattern = /https?:\/\//i;

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactObject(value, expectedKeys, prefix, issues) {
  if (!plainObject(value)) {
    issues.push(prefix + '_not_object');
    return {};
  }
  const unknown = Object.keys(value).filter((key) => !expectedKeys.has(key));
  if (unknown.length > 0) issues.push(prefix + '_unexpected_field');
  if (Object.keys(value).length !== expectedKeys.size) issues.push(prefix + '_required_field_missing');
  return value;
}

function timestamp(value) {
  if (typeof value !== 'string' || !isoPattern.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function versionParts(value) {
  if (typeof value !== 'string') return null;
  const match = versionPattern.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const revision = Number(match[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return [date.getTime(), revision];
}

function versionIsNewer(target, base) {
  const targetParts = versionParts(target);
  const baseParts = versionParts(base);
  if (!targetParts || !baseParts) return false;
  if (targetParts[0] !== baseParts[0]) return targetParts[0] > baseParts[0];
  return targetParts[1] > baseParts[1];
}

function containsProhibitedKey(value) {
  if (Array.isArray(value)) return value.some((entry) => containsProhibitedKey(entry));
  if (!plainObject(value)) return false;
  return Object.entries(value).some(([key, nested]) => (
    prohibitedKeyPattern.test(key) || containsProhibitedKey(nested)
  ));
}

return $input.all().map((item) => {
  const root = plainObject(item.json) ? item.json : {};
  const issues = [];

  if (!plainObject(root.trusted_owner_ingress)) issues.push('trusted_owner_ingress_missing');
  const exactRoot = exactObject(root, rootKeys, 'root', issues);
  const trusted = exactObject(exactRoot.trusted_owner_ingress, trustedKeys, 'trusted_owner_ingress', issues);
  const payload = exactObject(exactRoot.payload, payloadKeys, 'payload', issues);
  const incident = exactObject(payload.incident_snapshot, incidentKeys, 'incident_snapshot', issues);
  const decision = exactObject(payload.decision, decisionKeys, 'decision', issues);

  if (containsProhibitedKey(payload)) issues.push('raw_or_pii_field_forbidden');

  if (trusted.schema_version !== '1.0') issues.push('trusted_schema_version_invalid');
  if (trusted.brand_id !== 'calapres') issues.push('trusted_brand_not_calapres');
  if (trusted.kind !== 'owner_review_topology_v1') issues.push('trusted_kind_invalid');
  if (trusted.source !== 'private_owner_review_topology') issues.push('trusted_source_invalid');
  if (trusted.account_id !== 179973) issues.push('trusted_account_not_calapres');
  if (!inboxChannels.has(trusted.inbox_id)) issues.push('trusted_inbox_not_allowlisted');
  if (inboxChannels.get(trusted.inbox_id) !== trusted.channel) issues.push('trusted_channel_mismatch');
  if (!conversationPattern.test(trusted.conversation_ref || '')) issues.push('trusted_conversation_ref_invalid');
  if (!digestPattern.test(trusted.source_private_message_fingerprint || '')) issues.push('source_private_message_fingerprint_invalid');
  if (!/^hmac-sha256-v[1-9][0-9]*$/.test(trusted.fingerprint_key_version || '')) issues.push('fingerprint_key_version_invalid');
  if (trusted.owner_authenticated !== true) issues.push('owner_not_authenticated');
  if (trusted.owner_authorized !== true) issues.push('owner_not_authorized');
  if (trusted.replay_protection_verified !== true) issues.push('owner_replay_protection_missing');
  if (trusted.incident_lookup_verified !== true) issues.push('incident_lookup_not_verified');
  if (trusted.incident_snapshot_sanitized !== true) issues.push('incident_snapshot_not_sanitized');
  if (!ownerPattern.test(trusted.owner_ref || '')) issues.push('trusted_owner_ref_invalid');
  if (!allowedOwnerRefs.has(trusted.owner_ref)) issues.push('trusted_owner_not_allowlisted');
  if (!incidentPattern.test(trusted.incident_id || '')) issues.push('trusted_incident_id_invalid');
  if (!Number.isInteger(trusted.incident_revision) || trusted.incident_revision < 1) issues.push('incident_revision_invalid');
  if (!digestPattern.test(trusted.review_idempotency_fingerprint || '')) issues.push('review_idempotency_invalid');
  if (!digestPattern.test(trusted.command_digest || '')) issues.push('command_digest_invalid');
  if (!digestPattern.test(trusted.auth_evidence_fingerprint || '')) issues.push('auth_evidence_invalid');
  if (!digestPattern.test(trusted.nonce_fingerprint || '')) issues.push('nonce_fingerprint_invalid');

  if (payload.schema_version !== '1.0') issues.push('payload_schema_version_invalid');
  if (payload.brand_id !== 'calapres') issues.push('brand_not_calapres');

  if (incident.schema_version !== '1.0') issues.push('incident_schema_version_invalid');
  if (incident.brand_id !== 'calapres') issues.push('incident_brand_not_calapres');
  if (!incidentPattern.test(incident.incident_id || '')) issues.push('incident_id_invalid');
  if (!Number.isInteger(incident.revision) || incident.revision < 1) issues.push('incident_snapshot_revision_invalid');
  if (!correlationPattern.test(incident.correlation_id || '')) issues.push('correlation_id_invalid');
  if (!conversationPattern.test(incident.conversation_ref || '')) issues.push('conversation_ref_invalid');
  if (incident.order_ref !== null && !orderPattern.test(incident.order_ref || '')) issues.push('order_ref_invalid');
  if (!severities.has(incident.severity)) issues.push('incident_severity_invalid');
  if (!categories.has(incident.category)) issues.push('incident_category_invalid');
  if (!reasonPattern.test(incident.reason_code || '')) issues.push('incident_reason_invalid');
  if (typeof incident.sanitized_summary !== 'string' || incident.sanitized_summary.length < 1 || incident.sanitized_summary.length > 500) issues.push('incident_summary_invalid');
  if (
    typeof incident.sanitized_summary === 'string' &&
    (emailValuePattern.test(incident.sanitized_summary) || phoneValuePattern.test(incident.sanitized_summary) || urlValuePattern.test(incident.sanitized_summary))
  ) issues.push('incident_summary_contains_pii_like_value');
  if (incident.status !== 'awaiting_owner') issues.push('incident_not_awaiting_owner');
  if (incident.draft_ref !== null && !draftPattern.test(incident.draft_ref || '')) issues.push('incident_draft_ref_invalid');
  if (incident.owner_decision_ref !== null) issues.push('incident_already_decided');
  if (incident.resolved_at !== null) issues.push('incident_already_resolved');

  if (decision.schema_version !== '1.0') issues.push('decision_schema_version_invalid');
  if (decision.brand_id !== 'calapres') issues.push('decision_brand_not_calapres');
  if (!decisionPattern.test(decision.decision_id || '')) issues.push('decision_id_invalid');
  if (!incidentPattern.test(decision.incident_id || '')) issues.push('decision_incident_id_invalid');
  if (!actions.has(decision.action)) issues.push('decision_action_invalid');
  if (!ownerPattern.test(decision.approver_ref || '')) issues.push('approver_ref_invalid');
  if (!draftPattern.test(decision.case_reply_ref || '')) issues.push('case_reply_ref_required');
  if (!digestPattern.test(decision.case_reply_sha256 || '')) issues.push('case_reply_digest_required');

  if (
    trusted.incident_id !== incident.incident_id ||
    incident.incident_id !== decision.incident_id
  ) issues.push('incident_reference_mismatch');
  if (trusted.incident_revision !== incident.revision) issues.push('incident_revision_mismatch');
  if (trusted.conversation_ref !== incident.conversation_ref) issues.push('conversation_reference_mismatch');
  if (trusted.owner_ref !== decision.approver_ref) issues.push('owner_reference_mismatch');

  const incidentCreatedAt = timestamp(incident.created_at);
  const incidentUpdatedAt = timestamp(incident.updated_at);
  const decidedAt = timestamp(decision.decided_at);
  const effectiveAt = timestamp(decision.effective_at);
  const verifiedAt = timestamp(trusted.verified_at);
  const nonceIssuedAt = timestamp(trusted.nonce_issued_at);
  const nonceExpiresAt = timestamp(trusted.nonce_expires_at);
  const expiresAt = decision.expires_at === null ? null : timestamp(decision.expires_at);
  if (
    incidentCreatedAt === null ||
    incidentUpdatedAt === null ||
    decidedAt === null ||
    effectiveAt === null ||
    verifiedAt === null ||
    nonceIssuedAt === null ||
    nonceExpiresAt === null ||
    (decision.expires_at !== null && expiresAt === null)
  ) issues.push('timestamp_invalid');
  if (incidentCreatedAt !== null && incidentUpdatedAt !== null && incidentCreatedAt > incidentUpdatedAt) issues.push('incident_timestamp_invalid');
  if (incidentUpdatedAt !== null && decidedAt !== null && incidentUpdatedAt > decidedAt) issues.push('decision_precedes_incident_snapshot');
  if (decidedAt !== null && verifiedAt !== null && decidedAt > verifiedAt) issues.push('decision_after_trusted_verification');
  if (nonceIssuedAt !== null && verifiedAt !== null && nonceIssuedAt > verifiedAt) issues.push('nonce_issued_after_verification');
  if (nonceIssuedAt !== null && decidedAt !== null && nonceIssuedAt > decidedAt) issues.push('nonce_issued_after_decision');
  if (verifiedAt !== null && nonceExpiresAt !== null && verifiedAt >= nonceExpiresAt) issues.push('nonce_expired_at_verification');
  if (decidedAt !== null && effectiveAt !== null && decidedAt > effectiveAt) issues.push('effective_before_decision');

  if (decision.action === 'reply_only') {
    if (
      decision.knowledge_proposal_ref !== null ||
      decision.knowledge_proposal_sha256 !== null ||
      decision.base_knowledge_version !== null ||
      decision.knowledge_version_to_publish !== null ||
      decision.supersedes_knowledge_version !== null ||
      decision.expires_at !== null
    ) issues.push('reply_only_knowledge_fields_forbidden');
    if (incident.draft_ref !== null && decision.case_reply_ref !== incident.draft_ref) issues.push('reply_only_draft_reference_mismatch');
  }

  if (decision.action === 'approve' || decision.action === 'approve_until' || decision.action === 'correct') {
    if (!proposalPattern.test(decision.knowledge_proposal_ref || '')) issues.push('knowledge_proposal_ref_required');
    if (!digestPattern.test(decision.knowledge_proposal_sha256 || '')) issues.push('knowledge_proposal_digest_required');
    if (!versionParts(decision.base_knowledge_version)) issues.push('base_knowledge_version_invalid');
    if (!versionParts(decision.knowledge_version_to_publish)) issues.push('target_knowledge_version_invalid');
    if (!versionIsNewer(decision.knowledge_version_to_publish, decision.base_knowledge_version)) issues.push('target_knowledge_version_not_newer');
  }

  if (incident.draft_ref !== decision.case_reply_ref) issues.push('case_reply_incident_draft_mismatch');

  if (decision.action === 'approve') {
    if (decision.supersedes_knowledge_version !== null) issues.push('approve_supersedes_forbidden');
    if (decision.expires_at !== null) issues.push('approve_expiry_forbidden');
  }

  if (decision.action === 'approve_until') {
    if (decision.supersedes_knowledge_version !== null) issues.push('approve_until_supersedes_forbidden');
    if (expiresAt === null) issues.push('approve_until_expiry_required');
    if (expiresAt !== null && effectiveAt !== null && expiresAt <= effectiveAt) issues.push('approve_until_expiry_invalid');
  }

  if (decision.action === 'correct') {
    if (!versionParts(decision.supersedes_knowledge_version)) issues.push('correct_supersedes_required');
    if (decision.supersedes_knowledge_version !== decision.base_knowledge_version) issues.push('correct_supersedes_must_equal_base');
    if (decision.expires_at !== null) issues.push('correct_expiry_forbidden');
  }

  return {
    json: issues.length === 0
      ? {
          accepted: true,
          reason_code: 'owner_review_command_valid',
          validated_request: {
            trusted_owner_ingress: trusted,
            payload: payload
          },
          customer_egress_allowed: false,
          data_table_write_allowed: false,
          knowledge_publish_allowed: false
        }
      : {
          accepted: false,
          reason_code: issues[0] || 'owner_review_command_rejected',
          validated_request: null,
          customer_egress_allowed: false,
          data_table_write_allowed: false,
          knowledge_publish_allowed: false
        }
  };
});
`,
    },
    position: [720, 340],
  },
});

const ownerReviewAccepted = ifElse({
  version: 2.3,
  config: {
    name: 'Owner Review Command Accepted?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [
          {
            leftValue: expr('{{ $json.accepted }}'),
            operator: { type: 'boolean', operation: 'true', singleValue: true },
            rightValue: '',
          },
        ],
        combinator: 'and',
      },
    },
    position: [1000, 340],
  },
});

const buildNoWritePersistencePreview = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Exact Owner Persistence Preview - No Write',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
const scopes = {
  reply_only: 'case_only',
  approve: 'knowledge_permanent',
  approve_until: 'knowledge_temporary',
  correct: 'knowledge_correction'
};

return $input.all().map((item) => {
  const request = item.json.validated_request;
  const trusted = request.trusted_owner_ingress;
  const incident = request.payload.incident_snapshot;
  const decision = request.payload.decision;
  const auditId = 'aud_' + trusted.review_idempotency_fingerprint.slice(0, 24);

  const requiredApprovalRow = {
    schema_version: '1.0',
    brand_id: 'calapres',
    account_id: trusted.account_id,
    inbox_id: trusted.inbox_id,
    channel: trusted.channel,
    approval_id: decision.decision_id,
    incident_id: incident.incident_id,
    incident_revision: trusted.incident_revision,
    conversation_id: incident.conversation_ref,
    approval_scope: scopes[decision.action],
    action: decision.action,
    status: 'prepared',
    approver_ref: decision.approver_ref,
    case_reply_ref: decision.case_reply_ref,
    case_reply_sha256: decision.case_reply_sha256,
    knowledge_proposal_ref: decision.knowledge_proposal_ref,
    knowledge_proposal_sha256: decision.knowledge_proposal_sha256,
    base_knowledge_version: decision.base_knowledge_version,
    knowledge_version_to_publish: decision.knowledge_version_to_publish,
    supersedes_knowledge_version: decision.supersedes_knowledge_version,
    effective_at: decision.effective_at,
    expires_at: decision.expires_at,
    decided_at: decision.decided_at,
    audit_ref: auditId,
    committed_at: null,
    command_digest: trusted.command_digest,
    auth_evidence_kind: trusted.kind,
    auth_evidence_fingerprint: trusted.auth_evidence_fingerprint,
    nonce_fingerprint: trusted.nonce_fingerprint,
    nonce_issued_at: trusted.nonce_issued_at,
    nonce_expires_at: trusted.nonce_expires_at,
    review_idempotency_fingerprint: trusted.review_idempotency_fingerprint,
    source_private_message_fingerprint: trusted.source_private_message_fingerprint,
    fingerprint_key_version: trusted.fingerprint_key_version
  };

  const incidentRow = {
    schema_version: '1.0',
    brand_id: 'calapres',
    incident_revision: incident.revision,
    correlation_id: incident.correlation_id,
    reason_code: incident.reason_code,
    draft_ref: incident.draft_ref,
    conversation_id: incident.conversation_ref,
    created_at: incident.created_at,
    incident_id: incident.incident_id,
    incident_type: incident.category,
    order_ref: incident.order_ref,
    owner_decision: decision.decision_id,
    proposed_action: decision.action,
    resolved_at: null,
    severity: incident.severity,
    status: 'awaiting_owner',
    summary_sanitized: 'Incident ' + incident.incident_id + ' remains awaiting owner; category=' + incident.category + '; reason=' + incident.reason_code + '; decision=' + decision.action + ' recorded as preview only.',
    updated_at: decision.decided_at
  };

  const auditRow = {
    schema_version: '1.0',
    brand_id: 'calapres',
    idempotency_key: trusted.review_idempotency_fingerprint,
    outcome: 'validated_no_write',
    actor_type: 'owner',
    conversation_ref: incident.conversation_ref,
    incident_id: incident.incident_id,
    knowledge_version: decision.knowledge_version_to_publish,
    workflow_release: 'calapres-owner-review-desk-v1',
    audit_id: auditId,
    correlation_id: incident.correlation_id,
    created_at: trusted.verified_at,
    decision: 'owner_decision_preview',
    details_sanitized: 'Validated owner action ' + decision.action + ' for incident ' + incident.incident_id + '; preview only and no persistence executed.',
    event_type: 'owner_decision_recorded',
    reason_code: 'owner_decision_validated_no_write',
    source_ref: decision.decision_id
  };

  return {
    json: {
      schema_version: '1.0',
      brand_id: 'calapres',
      accepted: true,
      decision: 'owner_decision_preview',
      reason_code: 'owner_decision_validated_no_write',
      owner_decision: decision,
      incident_reference: {
        incident_id: incident.incident_id,
        incident_revision: incident.revision,
        conversation_ref: incident.conversation_ref,
        status_before: incident.status
      },
      persistence_preview: {
        mode: 'preview_no_write',
        persistence_ready: false,
        required_additive_columns: {
          approvals: [],
          incidents: [],
          audit: []
        },
        future_write_preconditions: [
          'fresh_chatwoot_incident_reread',
          'owner_actor_allowlist_match',
          'cryptographic_nonce_attestation',
          'command_digest_recomputed_from_canonical_payload',
          'case_reply_digest_reverification',
          'knowledge_proposal_digest_reverification',
          'incident_revision_compare_and_swap',
          'atomic_idempotency_guarantee',
          'live_table_schema_reverification'
        ],
        approvals: {
          table_id: 'mjSEDJWfXqCL0sG0',
          required_operation: 'upsert_after_all_write_preconditions',
          key_column: 'approval_id',
          table_row: requiredApprovalRow,
          write_executed: false
        },
        incidents: {
          table_id: 'N3UJZWRMNehLX4l7',
          required_operation: 'update_after_all_write_preconditions',
          key_column: 'incident_id',
          table_row: incidentRow,
          write_executed: false
        },
        audit: {
          table_id: '4YBUAuuEgXYiaybJ',
          required_operation: 'insert_after_all_write_preconditions',
          key_column: 'audit_id',
          table_row: auditRow,
          write_executed: false
        },
        write_executed: false
      },
      knowledge_publish_executed: false,
      customer_egress_allowed: false,
      data_table_write_allowed: false
    }
  };
});
`,
    },
    position: [1280, 220],
  },
});

const buildFailClosedRejection = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Fail-Closed Owner Review Rejection',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: `
return $input.all().map((item) => ({
  json: {
    schema_version: '1.0',
    brand_id: 'calapres',
    accepted: false,
    decision: 'no_action',
    reason_code: item.json.reason_code || 'owner_review_command_rejected',
    persistence_preview: {
      mode: 'none',
      persistence_ready: false,
      commands: [],
      write_executed: false
    },
    knowledge_publish_executed: false,
    customer_egress_allowed: false,
    data_table_write_allowed: false
  }
}));
`,
    },
    position: [1280, 480],
  },
});

export default workflow('calapres-owner-review-desk-v1', 'Calapres | Owner Review Desk v1')
  .add(calledByTrustedOwnerTopology)
  .to(validateOwnerReview)
  .to(ownerReviewAccepted.onTrue(buildNoWritePersistencePreview).onFalse(buildFailClosedRejection))
  .add(manualTest)
  .to(createSanitizedOwnerFixture)
  .to(validateOwnerReview);
