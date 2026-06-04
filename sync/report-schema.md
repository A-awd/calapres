# Calapres Sync Run Summary Schema

`sync/report.js` converts an offline or n8n run summary into stable JSON and Markdown.

## Shape

```json
{
  "runId": "offline-sample",
  "mode": "offline",
  "startedAt": "2026-06-04T00:00:00.000Z",
  "finishedAt": "2026-06-04T00:00:01.000Z",
  "timingMs": 1000,
  "offset": {
    "start": 0,
    "next": 300,
    "chunkSize": 300,
    "total": 3155,
    "wrapped": false
  },
  "counts": {
    "created": 0,
    "updated": 0,
    "drafted": 0,
    "skippedEnriched": 0,
    "unchanged": 0,
    "errors": 0
  },
  "errors": []
}
```

## Rules

- `created` means new imported draft products generated for review.
- `drafted` means supplier-missing products marked draft/out-of-stock, never deleted.
- `offset.next` is persisted by n8n between runs; it wraps to `0` after the final catalog chunk.
- Markdown output is intended for run notes and owner-facing summaries.
