function buildRunSummary(input) {
  const run = input && typeof input === 'object' ? input : {};
  const buckets = run.buckets || run.reconcilePlan || {};
  const startedAt = run.startedAt || new Date(0).toISOString();
  const finishedAt = run.finishedAt || startedAt;
  const timingMs = Number(run.timingMs || run.durationMs || 0);
  const offset = run.offset || {};
  return {
    runId: run.runId || 'offline-sample',
    mode: run.mode || 'offline',
    startedAt,
    finishedAt,
    timingMs,
    offset: {
      start: Number(offset.start || offset.offset || 0),
      next: Number(offset.next || offset.nextOffset || 0),
      chunkSize: Number(offset.chunkSize || run.chunkSize || 0),
      total: Number(offset.total || run.total || 0),
      wrapped: Boolean(offset.wrapped)
    },
    counts: {
      created: countBucket(run.counts && run.counts.created, buckets.toCreate),
      updated: countBucket(run.counts && run.counts.updated, buckets.toUpdate),
      drafted: countBucket(run.counts && run.counts.drafted, buckets.toMarkOutOfStock),
      skippedEnriched: countBucket(run.counts && run.counts.skippedEnriched, buckets.toSkipEnriched),
      unchanged: countBucket(run.counts && run.counts.unchanged, buckets.unchanged),
      errors: countBucket(run.counts && run.counts.errors, run.errors)
    },
    errors: run.errors || []
  };
}

function toMarkdown(summary) {
  const data = buildRunSummary(summary);
  const percent = data.offset.total ? Math.round((Math.min(data.offset.next || data.offset.total, data.offset.total) / data.offset.total) * 100) : 0;
  return [
    '# Calapres Sync Run Summary',
    '',
    '- Run: `' + data.runId + '`',
    '- Mode: `' + data.mode + '`',
    '- Timing: `' + data.timingMs + 'ms`',
    '- Offset: `' + data.offset.start + ' -> ' + data.offset.next + '` of `' + data.offset.total + '` (' + percent + '% catalog complete this cycle)',
    '- Wrapped: `' + data.offset.wrapped + '`',
    '',
    '| Bucket | Count |',
    '| --- | ---: |',
    '| Created | ' + data.counts.created + ' |',
    '| Updated | ' + data.counts.updated + ' |',
    '| Drafted/out of stock | ' + data.counts.drafted + ' |',
    '| Skipped enriched | ' + data.counts.skippedEnriched + ' |',
    '| Unchanged | ' + data.counts.unchanged + ' |',
    '| Errors | ' + data.counts.errors + ' |',
    ''
  ].join('\n');
}

function toJson(summary) {
  return JSON.stringify(buildRunSummary(summary), null, 2);
}

function countBucket(value, fallback) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(fallback)) return fallback.length;
  if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback;
  return 0;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildRunSummary, toMarkdown, toJson };
}
