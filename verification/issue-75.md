# Issue #75 verification plan

## Local and read-only evidence

- Runtime incident unit tests passed; workflow syntax validation passed.
- Terraform provider-schema and mock plan checks passed for enabled, disabled, and missing-recipient configurations.
- Read-only production plan with the existing PostgreSQL password version: 9 additions, 0 changes, 0 deletions. The plan was not applied.
- Production currently lacks the proposed Azure monitors/action group. Current health endpoints responded successfully during inspection.
- Existing database backup and availability settings do not demonstrate the requested recovery objectives. The RPO/RTO targets remain unproven.

## Before production acceptance

1. Review the Terraform plan and apply it through the approved deployment process.
2. Verify the Azure alert rules, action group, and regional availability tests exist and target the intended resources.
3. Trigger a controlled test alert. Confirm delivery to the configured owner destination and creation of one actionable GitHub incident without secrets or customer data.
4. Verify repeated alert delivery is deduplicated, and test workflow-failure notification.
5. Restore PostgreSQL to an isolated target using point-in-time recovery. Measure the recovered data point and elapsed recovery time against the issue's RPO/RTO goals.
6. Recover the web app and Sanity Studio from the documented retained artifacts into an isolated environment. Verify health checks and core catalog and Studio flows.
7. Record results, timestamps, resource identifiers, alert/incident links, and measured recovery point/time. Keep production acceptance open until all required checks pass.

Do not run a production restore as the verification target; use an isolated target and preserve production data.
