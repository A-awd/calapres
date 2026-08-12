# Calapres atomic-state provider evaluation

Date: 2026-08-11

Status: Recommendation only; no account, database, network rule, credential, or paid resource has
been created.

Authority: decisions 0006, 0010, and 0011

## Recommendation

Use a dedicated Amazon RDS for PostgreSQL database in the AWS Middle East (UAE) region
(`me-central-1`) for Calapres customer-service operational state, subject to owner approval of the
AWS account, monthly ceiling, public-network boundary, backup window, and region. Start with a
small Single-AZ instance only for credentialed observation and restore testing. Require Multi-AZ
and a new cost approval before customer egress becomes eligible.

This recommendation is intentionally separate from the implementation candidate in the
repository. The SQL contract remains portable PostgreSQL, and no workflow may assume that RDS
already exists.

## Why this is the preferred option

- AWS currently operates three Availability Zones in both Bahrain and UAE. RDS for PostgreSQL is
  available in the UAE region, and the current T4g family is available there.
- It provides a standard PostgreSQL engine, managed backups, point-in-time recovery, encryption,
  monitoring, and an optional Multi-AZ failover path without changing the adapter contract.
- The database can be owned directly in the Calapres operating account instead of being hidden
  behind a workflow vendor or a shared brand database.
- The stored-function boundary can expose thirteen reviewed logical JSONB commands while denying
  direct table access. Source-fixed wrappers give the signed-webhook credential eight callable
  functions, the reconciliation credential six, and the owner-review credential two; shared
  logical operations intentionally overlap, but no credential receives the union.
- UAE is geographically closer than the currently listed Neon regions. The retained rows are
  minimized and pseudonymous, but they are still treated as customer-related data rather than as
  anonymous data.

## Dated price evidence

The official AWS regional price file effective 2026-08-01 lists a Single-AZ PostgreSQL
`db.t4g.micro` in UAE at USD 0.019 per instance-hour. At 730 hours, compute is approximately
USD 13.87 per month. The same file lists Single-AZ PostgreSQL GP3 storage at USD 0.14 per GB-month;
an illustrative 20 GB allocation is USD 2.80 per month. The illustrative subtotal is therefore
USD 16.67 per month before backup storage beyond the included allowance, public IPv4, transfer,
monitoring, support, and tax.

This is not a fixed quote. The exact configuration and calculator estimate must be captured in
the approval record immediately before creation. Single-AZ is not a high-availability production
configuration.

## Network constraint with n8n Cloud

n8n Cloud publishes outbound address ranges but explicitly says that source IP addresses can
change without warning. A public RDS endpoint allowlisted to the current n8n ranges is therefore
an availability risk, not a permanent network identity.

The minimum acceptable observation boundary is:

1. TLS required and certificate verification enabled.
2. Three separate dedicated login credentials. The signed-webhook login inherits only
   `calapres_cs_webhook_runtime`; the reconciliation login inherits only
   `calapres_cs_reconciliation_runtime`; and the owner-review login inherits only
   `calapres_cs_owner_runtime`. The deprecated generic Edge role has no callable functions, and a
   login must never inherit more than one runtime role.
3. No direct table or sequence privileges.
4. A security group limited to the current official n8n Cloud outbound ranges and the PostgreSQL
   port, with a monitored process to detect range changes.
5. Strong password rotation and no shared brand credential.
6. Any network or authentication uncertainty returns `unknown` and stops the event.

If a stable private or fixed-egress connection cannot be approved, do not weaken the security
group to the whole internet. Keep the system in synthetic/no-write mode and revisit n8n hosting or
a provider with a suitable authenticated public boundary.

## Alternative considered: Neon Launch

Neon Launch is operationally simpler and its current pricing page shows usage-based compute,
USD 0.35 per GB-month storage, up to seven days of instant restore history, and a typical small
intermittent workload estimate of about USD 15 per month. Neon also states that storage is
multi-AZ by default.

It is not the first recommendation for this state because Neon's currently published region/status
list does not include a Middle East region; the closest listed choices include Frankfurt and
Singapore. Using it would require an explicit cross-border processing and DPA decision. Its
network controls and restore tier must also be verified for the selected plan at purchase time.

## Creation gates

Do not create the database until all of the following are recorded:

- owner-approved provider, AWS account, UAE region, monthly ceiling, and payment authority;
- exact Single-AZ or Multi-AZ topology and current calculator estimate;
- encryption key ownership, backup/PITR window, retention, deletion protection, and restore-test
  procedure;
- n8n outbound-network rule and failure policy;
- migrations `0001` through `0007` test in an isolated database, including compile, rollback, and
  idempotent re-application;
- concurrency proof for every stored function, including one inbox scan lease and one
  per-conversation cursor compare-and-swap winner;
- role tests proving each n8n login cannot select, insert, update, delete, alter, create, execute
  internal helper functions, or execute the other login's callable functions;
- no-PII inspection of persisted rows;
- customer egress still structurally absent.

## Official references

- [AWS Regions and Availability Zones](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html)
- [Amazon RDS for PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/)
- [AWS RDS UAE regional price file](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/me-central-1/index.json)
- [Amazon RDS T4g regional availability](https://aws.amazon.com/about-aws/whats-new/2023/06/amazon-rds-t4g-database-instances-additional-aws-regions/)
- [n8n Cloud IP addresses](https://docs.n8n.io/manage-cloud/cloud-ip/)
- [Neon pricing](https://neon.com/pricing)
- [Neon region status endpoints](https://neon.com/docs/introduction/status)
