# Production monitoring and recovery

Refs #75. This records observations and the procedure to complete acceptance; it is not evidence of a successful recovery drill. Never put customer records, alert payloads, email destinations or credentials in public incidents or artifacts.

## Observed baseline — 2026-11-09

Read-only Azure inspection found no production metric, activity-log or scheduled-query alert rules and no production action group. App Service and PostgreSQL diagnostics go to Log Analytics without a notification route. The repository owner owns incident triage and recovery; the owner confirmed a private email destination in chat. Supply that address privately at activation time.

| Capability | Baseline / prepared detection | Route after activation |
| --- | --- | --- |
| Public website | Currently HTTP 200; independent HTTPS health probe from three locations, plus three HTTP 5xx in five minutes | Owner action-group email; owner-assigned GitHub incident |
| Public Studio | Currently HTTP 200 on `/` and `/structure`; independent HTTPS `/structure` probe from three locations | Same route; probe does not test editor sign-in or Sanity writes |
| Database-dependent requests and MCP | Seven-day backups, HA disabled; database `is_db_alive` zero for the five-minute window; storage >=85% | Same route; database liveness does not test app firewall/credentials or successful form persistence |
| Email, content review, authenticated operations | No verified alert route; general website errors are incomplete coverage | Follow-up: server error/email delivery, queue age and poison-message signals, plus isolated end-to-end capability checks |

PostHog remains useful for application exception investigation and [error tracking alerts](https://posthog.com/docs/error-tracking/alerts). The existing browser SDK and the available PostHog evidence do not establish independent availability detection during a complete outage. The prepared Azure probes run outside the app and Studio; no production PostHog configuration was changed.

Live PostgreSQL inspection found retention **7 days**, earliest restore point **2026-11-02 15:26 UTC** at inspection, geo-redundant backup **disabled**, HA **disabled**, and a Burstable B1ms server. These are observed settings, not a successful restore. The app has one B1 worker, without deployment slots.

## Enable and verify the runtime route

`iac/app/monitoring.tf` is disabled by default. Set `runtime_alerts_enabled=true` and supply the privately confirmed destination as `TF_VAR_runtime_alert_email` through the operator's normal secure environment. The email is stored in Azure and restricted Terraform state; it is not a secret credential or a public output. Review the full Terraform plan before applying; do not use a targeted apply that omits dependencies. Existing ephemeral inputs still need their normal secure provisioning. No production apply has been performed for this change.

A read-only production-state plan on 2026-11-09 proposed **9 additions, 0 changes, 0 deletions**: one Insights component, two availability probes, one owner action group and five alert rules. Preserve the deployed `postgres_password_version=2` explicitly when planning/applying: the local default is 1, which initially proposed rotating the existing database password and updating its Key Vault URL. The corrected plan used the existing production variables plus `-var=runtime_alerts_enabled=true -var=postgres_password_version=2`; the required ephemeral input remained in process memory. Re-plan before activation and stop if any existing database, credential, application or unrelated resource would change. Do not reset versions or rotate credentials as part of monitoring activation.

The action group sends direct email. Standard availability probes run every **300 seconds**, require two failed locations, and retry failures. Other metric rules evaluate a five-minute window every minute. The GitHub route polls every five minutes with the existing production OIDC identity's resource-group Reader grant. The workflow is restricted to the default branch and the production environment. `RUNTIME_INCIDENT_OWNER` can override the repository owner. The configured rule prefix must match Terraform's `catraders-prod` deployment name.

The router accepts only the five configured rule names, severities 0–2 and alerts scoped to the production subscription/resource group. It publishes static capability text, severity, canonical time and an opaque alert UUID. It excludes free-text descriptions, contexts, resource names, logs and customer fields. One incident is created per Azure alert instance; repeated polling checks open **and closed** incidents, preserves human notes, and never reopens or auto-closes an incident. A new alert instance after a distinct failure can create another incident. Brief failures resolved before polling remain actionable triage work. Azure history is queried for one day; workflow downtime beyond that can require manual backfill. Router failures are monitored separately by Operations inbox.

Activation acceptance:

1. Confirm the five rules, the action group destination and three probe locations in Azure. Confirm registration of `Microsoft.Insights` (registered during the baseline inspection).
2. Use Azure's action-group test with a synthetic metric alert. Confirm receipt at the private owner inbox; record timestamps only. This tests notification delivery, not detection.
3. In an isolated test deployment, deliberately fail a probe and a database-dependent capability. Do not interrupt production. Observe a real Azure alert instance, owner email and one sanitized GitHub incident. Re-run routing to verify deduplication; ensure a resolved signal does not auto-close the incident. Do not claim that a fabricated payload proves live detection.
4. Record detection, email delivery, GitHub scheduling/queue delay and triage latency separately. Confirm raw descriptions, customer-like test fields and credentials never reach the public issue. Local `bun test scripts/runtime-incidents.test.ts` verifies the sanitizer/deduplicator with fixtures only.

These probes and scheduled GitHub routing **cannot establish the owner's two-minute downtime objective**. Five-minute probes plus alert evaluation and Actions queue delays already exceed it. Follow-up requires a faster independent monitor with a measured direct notification path and a recovery architecture that can meet the target; publishing this baseline does not resolve that gap.

## Recorded component recovery targets

| Component | Current delivery | Retained recovery candidate |
| --- | --- | --- |
| Web | `b3b8abe918adcfdfe7f53d0907e049895b893fee`, [delivery](https://github.com/kushagrarora17/catraders/actions/runs/42602145979/artifacts/13667162135); ACR digest `sha256:8ce6885e95fe7d11100d57c8da48e7f2ddfb85115581aa2d0a7d1bf3df07147f` | `d968f1894739c2c3f0f930f225577d7e2cd9d0f0`, [delivery](https://github.com/kushagrarora17/catraders/actions/runs/42560666258/artifacts/13649736180); retained digest `sha256:dfbfce10cb98269492206a30fbaf00b1e05a438c3e2254314fa35e0bcb1766ee` |
| Studio | `d968f1894739c2c3f0f930f225577d7e2cd9d0f0`, [delivery](https://github.com/kushagrarora17/catraders/actions/runs/42560666258/artifacts/13649556066), Netlify deploy `6af1495d2c4b4655de129550` | Earlier ready deploy `6af0a8b8f92d1ea0e51976ce`, SHA `f1d92d8ac2b0342201e986b3ca59d027dc44fabd`; its permalink `/` and `/structure` returned 200 |

Read-only checks confirmed the configured web image and retained ACR digest, Netlify's published Studio deploy and previous deploy, and HTTP 200 on the current website health/home/catalog and Studio root/structure pages. Latest main skipped Studio; it retained its separate SHA. Delivery artifacts report acceptance pending. Image retention and healthy routes do not prove a rollback works with today's schema or that Studio editing works.

For an isolated application recovery drill, select the recorded retained digest, run it against the restored database and isolated content configuration, and disable outbound customer email and production review triggers. Verify health, catalog pages and the affected database-dependent capability; measure startup and acceptance time. Verify schema compatibility without removing applied migrations. For Studio, rebuild the retained SHA with the isolated dataset and deploy that build to an isolated site; test `/`, `/structure`, deep-link refresh, sign-in and catalog editing there. Dataset configuration is embedded at build time: never edit through a retained production bundle during the drill, because it still targets production. Reusing a prior deploy permalink proves only build availability. Any production image switch or Studio republish follows the lifecycle guide and requires a separately assessed cutover; reconcile main through a PR. The manual deploy workflow deploys main, not an arbitrary SHA.

## Isolated PostgreSQL point-in-time restore drill

Plan the source, UTC restore point, isolated destination name/resource group, network access, limited drill duration/cost and cleanup before executing. The destination must differ from production. Do not change production connection strings, DNS, firewall rules or application settings, and do not test customer notifications. Obtain approval for destructive cleanup of the restored copy. The restored server contains customer data: keep it in the same controlled subscription, restrict network access and access grants, and publish aggregate evidence only.

1. Re-read `az postgres flexible-server show` for the source, selecting only `name`, `backup`, `highAvailability`, `state` and `sku`. Confirm the UTC restore point is within the live retention window. Read baseline table counts and latest durable timestamps privately using a read-only transaction; account for writes during the measurement window.
2. Start an elapsed timer and use `az postgres flexible-server restore --resource-group <isolated-group> --name <unique-drill-server> --source-server <source-resource-id> --restore-time <UTC-point> --no-wait`. Confirm the destination name and resource group before submitting. A new server is created; there is no production cutover.
3. Poll the destination's state to Ready and record provisioning time. Verify all inherited networking/access settings before opening a single-IP temporary verification rule. Never enable the all-Azure-services rule or broad public ranges. Retrieve credentials into process memory through the established secure path; never put a connection string in logs, shell history, issue text or a file.
4. Connect only to the destination. Verify expected schema/migration history, constraints, representative quote/item and inquiry relationships, row counts and timestamps relative to the restore point. Inspect records privately; retain only aggregates. Run the retained application as described above against this clone. Record separate restore, data-validation and app-acceptance durations.
5. Compare the requested restore point, latest recovered durable transaction evidence and source writes since that point. Record any discrepancy and potential lost writes. A successful connection or matching row count alone does not demonstrate zero data loss.
6. After approved cleanup, remove temporary access and delete **only** the isolated restore resources. Verify no drill server, temporary firewall rules or changed production settings remain. Record elapsed time, retained evidence, cost and cleanup outcome.

Azure documents [PITR RPO of up to five minutes](https://learn.microsoft.com/en-us/azure/postgresql/backup-restore/concepts-backup-restore). A new-server restore is not an automatic failover. The zero-data-loss objective is **not met by the verified baseline**; assess [synchronous HA](https://learn.microsoft.com/en-us/azure/postgresql/high-availability/concepts-high-availability), supported compute tier, zone/region failure coverage, cost and application reconnect behavior separately. Do not promise regional zero loss or two-minute recovery from a configuration flag.

## Acceptance record still required

| Evidence | Status |
| --- | --- |
| Live alert inventory, backup settings, retained component references | Observed read-only above |
| Full production-state monitoring plan | 9 additions, no existing-resource changes or deletions; not applied |
| Sanitizer/deduplication with hostile synthetic fields | Local tests; no live notification implied |
| Terraform apply and actual owner notification | Pending activation and timed delivery test |
| Real runtime failure → Azure signal → sanitized GitHub incident | Pending isolated end-to-end exercise |
| Isolated PITR, representative integrity and retained app acceptance | Not performed |
| Studio recovery, authenticated editing and measured recovery time | Not performed |
| <=2-minute downtime / zero-data-loss objectives | Not demonstrated; architectural follow-up required |

Keep #75 open and Delivery unverified until its required drills and runtime route evidence are recorded. Record follow-up decisions and measured limits without representing local tests or successful CI as production recovery verification.
