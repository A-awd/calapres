'use strict';

const {
  AtomicStorageContract,
  AtomicStorageUnknownError,
  resultEnvelope,
  safeAtomicCall,
  validateCommand,
} = require('../adapters/atomic-storage-contract');

const IMPLEMENTATION_STATUS =
  'implementation_candidate_pending_live_postgres_validation';

const FUNCTION_NAMES = Object.freeze({
  claim_request_replay: 'calapres_cs.atomic_claim_signed_webhook_request_replay',
  claim_business_event: 'calapres_cs.atomic_claim_business_event',
  complete_business_event: 'calapres_cs.atomic_complete_business_event',
  advance_conversation_generation:
    'calapres_cs.atomic_advance_signed_webhook_conversation_generation',
  read_generation: 'calapres_cs.atomic_read_generation',
  schedule_conversation_retry: 'calapres_cs.atomic_schedule_conversation_retry',
  claim_due_conversation_retry: 'calapres_cs.atomic_claim_due_conversation_retry',
  transition_conversation_job: 'calapres_cs.atomic_transition_conversation_job',
  prepare_owner_review: 'calapres_cs.atomic_prepare_owner_review',
  compare_and_commit_owner_decision: 'calapres_cs.atomic_compare_and_commit_owner_decision',
  claim_chatwoot_reconciliation_scan:
    'calapres_cs.atomic_claim_chatwoot_reconciliation_scan',
  compare_and_advance_chatwoot_message_cursor:
    'calapres_cs.atomic_compare_and_advance_chatwoot_message_cursor',
  read_chatwoot_reconciliation_cursor:
    'calapres_cs.atomic_read_chatwoot_reconciliation_cursor',
});

const RECONCILIATION_INGRESS_FUNCTION_NAMES = Object.freeze({
  claim_request_replay: 'calapres_cs.atomic_claim_reconciliation_request_replay',
  advance_conversation_generation:
    'calapres_cs.atomic_advance_reconciliation_conversation_generation',
});

function functionSql(operation, command) {
  const reconciliationFunction = RECONCILIATION_INGRESS_FUNCTION_NAMES[operation];
  if (reconciliationFunction &&
      command.request_source === 'chatwoot_reconciliation_api_v1') {
    return `/* calapres_cs:function-${operation.replaceAll('_', '-')}-reconciliation */ ` +
      `SELECT ${reconciliationFunction}($1::jsonb) AS result`;
  }
  return FUNCTION_SQL[operation];
}

const FUNCTION_SQL = Object.freeze(Object.fromEntries(
  Object.entries(FUNCTION_NAMES).map(([operation, functionName]) => [
    operation,
    `/* calapres_cs:function-${operation.replaceAll('_', '-')} */ ` +
      `SELECT ${functionName}($1::jsonb) AS result`,
  ]),
));

const TRANSACTION_SQL = Object.freeze({
  begin: '/* calapres_cs:tx-begin */ BEGIN',
  isolation: '/* calapres_cs:tx-isolation */ SET TRANSACTION ISOLATION LEVEL SERIALIZABLE',
  statementTimeout:
    "/* calapres_cs:tx-timeout */ SELECT set_config('statement_timeout', $1, true)",
  commit: '/* calapres_cs:tx-commit */ COMMIT',
  rollback: '/* calapres_cs:tx-rollback */ ROLLBACK',
});

class PostgresAtomicStorage extends AtomicStorageContract {
  constructor({ pool, brandId, statementTimeoutMs = 5000 }) {
    super();
    if (!pool || typeof pool.connect !== 'function') {
      throw new TypeError('pool must provide connect() for a dedicated transaction client');
    }
    if (brandId !== 'calapres') {
      throw new TypeError('brandId must be the pinned pilot brand');
    }
    if (!Number.isInteger(statementTimeoutMs) || statementTimeoutMs < 100 ||
        statementTimeoutMs > 120000) {
      throw new TypeError('statementTimeoutMs must be between 100 and 120000');
    }
    this.pool = pool;
    this.brandId = brandId;
    this.statementTimeoutMs = statementTimeoutMs;
    this.implementation_status = IMPLEMENTATION_STATUS;
  }

  async _acquire() {
    const client = await this.pool.connect();
    if (!client || typeof client.query !== 'function' || typeof client.release !== 'function') {
      throw new AtomicStorageUnknownError('driver_unknown');
    }
    return { client, release: () => client.release() };
  }

  async _query(client, text, values = []) {
    const result = await client.query({ text, values });
    if (!result || !Array.isArray(result.rows)) {
      throw new AtomicStorageUnknownError('driver_unknown');
    }
    return result;
  }

  _normalizeDatabaseError(error) {
    if (error && error.code === '57014') {
      return new AtomicStorageUnknownError('timeout_unknown');
    }
    return error;
  }

  _verifiedDescriptor(operation, databaseResult) {
    if (!databaseResult || typeof databaseResult !== 'object' || Array.isArray(databaseResult)) {
      throw new AtomicStorageUnknownError('database_envelope_invalid');
    }
    const exactKeys = [
      'contract_verified',
      'status',
      'operation',
      'outcome',
      'value',
      'error_code',
    ].sort();
    const actualKeys = Object.keys(databaseResult).sort();
    if (actualKeys.length !== exactKeys.length ||
        actualKeys.some((key, index) => key !== exactKeys[index]) ||
        databaseResult.contract_verified !== true ||
        databaseResult.operation !== operation) {
      throw new AtomicStorageUnknownError('database_envelope_invalid');
    }
    resultEnvelope(
      operation,
      databaseResult.status,
      databaseResult.outcome,
      databaseResult.value,
      databaseResult.error_code,
    );
    return {
      status: databaseResult.status,
      outcome: databaseResult.outcome,
      value: databaseResult.value,
      error_code: databaseResult.error_code,
    };
  }

  _execute(operation, command) {
    return safeAtomicCall(operation, async () => {
      validateCommand(operation, command);
      if (command.brand_id !== this.brandId) {
        throw new TypeError(`${operation}.brand_id does not match the bound brand`);
      }
      const { client, release } = await this._acquire();
      let began = false;
      let committed = false;
      try {
        await this._query(client, TRANSACTION_SQL.begin);
        began = true;
        await this._query(client, TRANSACTION_SQL.isolation);
        await this._query(
          client,
          TRANSACTION_SQL.statementTimeout,
          [String(this.statementTimeoutMs)],
        );
        const called = await this._query(
          client,
          functionSql(operation, command),
          [JSON.stringify(command)],
        );
        if (called.rows.length !== 1 || !Object.hasOwn(called.rows[0], 'result')) {
          throw new AtomicStorageUnknownError('database_envelope_invalid');
        }
        const descriptor = this._verifiedDescriptor(operation, called.rows[0].result);
        await this._query(client, TRANSACTION_SQL.commit);
        committed = true;
        return descriptor;
      } catch (error) {
        if (began && !committed) {
          try {
            await this._query(client, TRANSACTION_SQL.rollback);
          } catch (_rollbackError) {
            // Preserve uncertainty from the original failure.
          }
        }
        throw this._normalizeDatabaseError(error);
      } finally {
        release();
      }
    });
  }

  claim_request_replay(command) { return this._execute('claim_request_replay', command); }
  claim_business_event(command) { return this._execute('claim_business_event', command); }
  complete_business_event(command) { return this._execute('complete_business_event', command); }
  advance_conversation_generation(command) {
    return this._execute('advance_conversation_generation', command);
  }
  read_generation(command) { return this._execute('read_generation', command); }
  schedule_conversation_retry(command) {
    return this._execute('schedule_conversation_retry', command);
  }
  claim_due_conversation_retry(command) {
    return this._execute('claim_due_conversation_retry', command);
  }
  transition_conversation_job(command) {
    return this._execute('transition_conversation_job', command);
  }
  prepare_owner_review(command) { return this._execute('prepare_owner_review', command); }
  compare_and_commit_owner_decision(command) {
    return this._execute('compare_and_commit_owner_decision', command);
  }
  claim_chatwoot_reconciliation_scan(command) {
    return this._execute('claim_chatwoot_reconciliation_scan', command);
  }
  compare_and_advance_chatwoot_message_cursor(command) {
    return this._execute('compare_and_advance_chatwoot_message_cursor', command);
  }
  read_chatwoot_reconciliation_cursor(command) {
    return this._execute('read_chatwoot_reconciliation_cursor', command);
  }
}

module.exports = {
  FUNCTION_NAMES,
  FUNCTION_SQL,
  IMPLEMENTATION_STATUS,
  PostgresAtomicStorage,
  RECONCILIATION_INGRESS_FUNCTION_NAMES,
  TRANSACTION_SQL,
  functionSql,
};
