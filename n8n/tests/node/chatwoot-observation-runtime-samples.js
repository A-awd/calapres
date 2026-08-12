'use strict';

const {
  NOW_EPOCH_SECONDS,
  RETAINED_EVENT_KEY,
  anchorRow,
  defaultConversation,
  makeRuntimeHarness,
  payloadFor,
  prepareScenario,
  runClearScenario,
  signedRequest,
} = require('./chatwoot-observation-runtime-harness');

function decisionState(waitState) {
  return {
    currentGeneration: waitState.generation,
    idempotencyConsumed: false,
    brandEnabled: true,
    killSwitch: false,
  };
}

async function rereadFailureSamples() {
  const routeScenario = await prepareScenario();
  routeScenario.harness.setConversationResponses([
    { statusCode: 200, body: defaultConversation({ account_id: 999999 }) },
  ]);
  const route = await routeScenario.harness.runtime.performBoundedLiveReread({
    waitState: routeScenario.waitState,
  });

  const rateScenario = await prepareScenario();
  rateScenario.harness.setConversationResponses([{ statusCode: 429, body: null }]);
  const rate = await rateScenario.harness.runtime.performBoundedLiveReread({
    waitState: rateScenario.waitState,
  });

  const truncatedScenario = await prepareScenario();
  const rows = Array.from({ length: 100 }, (_, index) =>
    anchorRow(truncatedScenario.waitState, {
      id: Number(truncatedScenario.waitState.anchor_message_id) + index,
      message_type: index === 0 ? 0 : 2,
    }));
  truncatedScenario.harness.setMessageResponses([
    { statusCode: 200, body: { payload: rows } },
    { statusCode: 200, body: { payload: rows } },
  ]);
  const truncated = await truncatedScenario.harness.runtime.performBoundedLiveReread({
    waitState: truncatedScenario.waitState,
  });

  const statusScenario = await prepareScenario();
  const resolved = defaultConversation({ status: 'resolved' });
  statusScenario.harness.setConversationResponses([
    { statusCode: 200, body: resolved },
    { statusCode: 200, body: resolved },
  ]);
  const status = await statusScenario.harness.runtime.performBoundedLiveReread({
    waitState: statusScenario.waitState,
  });

  const scenarios = [
    [routeScenario, route],
    [rateScenario, rate],
    [truncatedScenario, truncated],
    [statusScenario, status],
  ];
  return {
    evidence: scenarios.map(([, evidence]) => evidence),
    decisions: scenarios.map(([scenario, evidence]) =>
      scenario.harness.runtime.buildPostDelayDecision({
        waitState: scenario.waitState,
        evidence,
        state: decisionState(scenario.waitState),
      })),
  };
}

async function ingressFailureSamples(clearResult) {
  const duplicate = await clearResult.harness.runtime.verifySignedIngress({
    ...clearResult.request,
    deliveryHeader: 'different-untrusted-delivery',
  });
  const mismatchHarness = makeRuntimeHarness();
  const mismatchRequest = signedRequest(payloadFor());
  mismatchRequest.rawBodyBytes = new Uint8Array([
    ...mismatchRequest.rawBodyBytes,
    32,
  ]);
  const mismatch = await mismatchHarness.runtime.verifySignedIngress(mismatchRequest);
  const oversizedHarness = makeRuntimeHarness();
  const oversized = await oversizedHarness.runtime.verifySignedIngress({
    rawBodyBytes: new Uint8Array(1048577),
    timestamp: String(NOW_EPOCH_SECONDS),
    signatureHeader: 'sha256=' + '0'.repeat(64),
    deliveryHeader: null,
  });
  return [duplicate, mismatch, oversized];
}

async function main() {
  const result = await runClearScenario();
  const dualRead = await result.harness.runtime.dualReadBusinessEventIdentity({
    identityResult: result.identityResult,
    requiredPriorVersions: [RETAINED_EVENT_KEY.version],
    dedupTtlSeconds: 3600,
  });
  const rereadFailures = await rereadFailureSamples();
  process.stdout.write(JSON.stringify({
    ingress: result.ingress,
    event_identity: result.identityResult.evidence,
    wait_state: result.waitState,
    dual_read: dualRead,
    live_reread: result.reread,
    post_delay_decision: result.decision,
    ingress_failures: await ingressFailureSamples(result),
    live_reread_failures: rereadFailures.evidence,
    post_delay_decision_failures: rereadFailures.decisions,
  }));
}

main().catch((error) => {
  process.stderr.write(String(error && error.stack ? error.stack : error));
  process.exitCode = 1;
});
