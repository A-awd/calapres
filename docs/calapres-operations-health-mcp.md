# Calapres operations-health MCP

Status: source-only and inactive.

## Why this exists

Codex must use an available official connector or narrowly scoped MCP path before asking the owner
to sign in through a browser. The existing Easy Life MCP gateway deliberately exposes only
`Start_Day` and `Get_Run_Result`; it must not be widened into an n8n administration surface.

This Calapres-owned gateway therefore exposes exactly one read-only tool:
`Get_Calapres_Operations_Health`.

## What it may return

The tool returns only the sanitized contract in
`n8n/schemas/calapres-operations-health-snapshot.schema.json`:

- observation time and an overall health classification;
- Telegram owner-bridge health, bounded timestamps, and a non-secret failure code;
- Chatwoot monitoring health, bounded unanswered totals/age, and a non-secret failure code.

It must never return message text, transcript text, customer names, phones, emails, order data,
tokens, credential identifiers, webhook URLs, or raw execution errors.

`unknown` and `monitoring_unavailable` are truthful states. They must not be translated to
`disconnected`.

## Architecture

```text
Codex official MCP connector
        |
        v
inactive owner-only MCP gateway
        |
        v
fixed authenticated GET /webhook/calapres/operations-health
        |
        v
sanitized health producer (separate deployment and approval)
```

The gateway cannot search, edit, activate, or execute arbitrary n8n workflows. It cannot send a
Telegram or Chatwoot message and cannot read Shopify or advertising data. The upstream producer is
a separate component so health collection can change without broadening Codex permissions.

## Required producer behavior

Before any activation, the producer must:

1. authenticate a dedicated reader credential;
2. derive status from a project-owned heartbeat/monitoring source rather than accepting caller
   claims;
3. fail closed to `unknown` or `monitoring_unavailable` when evidence is stale or inaccessible;
4. emit exactly the schema fields and no additional properties;
5. use bounded error codes such as `HEARTBEAT_STALE`, `UPSTREAM_TIMEOUT`, or
   `MONITORING_NOT_ATTACHED`, never raw provider errors;
6. avoid persistence of customer payloads and secrets;
7. be verified with synthetic healthy, stale, degraded, unavailable, and redaction cases.

## Deployment boundary

Repository source is not deployment. Production activation, OAuth binding, header-credential
binding, connector registration, or changes to the existing Owner Telegram Voice Bridge require
fresh owner approval and a live canary. No such production action is performed by this change.
