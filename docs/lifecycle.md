# Project lifecycle

Use the private GitHub Project [CA Traders — Product & Engineering](https://github.com/users/kushagrarora17/projects/1), linked to this repository. Issues describe work, PRs implement it, Actions deliver it, and Releases describe meaningful shipped versions. Public issues and PRs must contain only public information.

## Planning

Project fields:

| Field | Values |
| --- | --- |
| Status | Inbox, Backlog, Ready, In progress, In review, Done |
| Priority | P0 urgent, P1 next, P2 normal, P3 later |
| Size | S, M, L |
| Target date | Date; set only for committed deadlines |
| Delivery | Pending, Deployed, Verified |

Use the existing Assignees, Labels, Milestone, and Repository fields. Labels identify type (`feature`, `bug`, `maintenance`, `incident`), area (`web`, `studio`, `mcp`, `database`, `infra`), and blocked work (`blocked`). Preserve existing dependency and documentation labels.

Project views:

| View | Layout | Filter / grouping |
| --- | --- | --- |
| Backlog | Table | Open issues; group by Priority |
| Current work | Board | Status is Ready, In progress, or In review; columns by Status |
| Roadmap | Roadmap | Parent feature issues with Target date set; use Target date as the date field |
| Bugs & operations | Table | Labels bug, incident, or maintenance; group by Priority |

Built-in workflows auto-add open repository issues to Inbox, set closed issues to Done, return reopened issues to Inbox, and archive closed items after 30 days without updates. The initial backlog has been imported; auto-add does not backfill older issues. Auto-close on moving a card to Done is disabled. Review unfinished work before closing a parent issue. Start with one implementation task In progress.

Use milestones for meaningful release scope, without invented deadlines. Triage the seeded backlog before setting priorities or target dates.

## Implementation and delivery

Create all PRs as drafts. Complete checks and independent review, then obtain explicit owner approval before marking a PR ready. Merge manually only when explicitly authorized; auto-merge is disabled.

Move an issue to Ready when its acceptance criteria and dependencies are clear, In progress when implementation starts, In review when its PR is ready, and Done when implementation is merged. Track partial work with `Refs #`; reserve `Closes #` for complete acceptance criteria.

Delivery is independent of Status: Pending until production deployment succeeds, Deployed after successful deployment and automated smoke checks, and Verified after the issue's acceptance criteria have been checked in production. Update Delivery manually using the deployment evidence; do not equate merge or a successful build with production verification.

The existing CI validates web, E2E, Studio, infrastructure, workflows, dependencies, and CodeQL before `ci-ok`. Main deployments use the same validated SHA and the `production` environment. Each successful component deployment records its SHA, URL, image or component, run link, and smoke-check result in the job summary and a delivery artifact. Environment deployment history records the deployment outcome, including failures.

For a meaningful release, run **Prepare release** on main with a new version tag and the successful main CI run ID. It creates a draft release for the CI-validated SHA only when at least one component deployed and the overall run succeeded. Review the generated notes and component delivery artifacts, then publish the draft from GitHub Releases. Skipped components keep their previously deployed versions. Publishing the release does not redeploy anything.

## Recovery

Application recovery and database recovery are separate operations. Migrations are forward-only and must remain compatible with the previous application until the new version is deployed.

For an application incident:

1. Open an incident issue, record impact and the failing workflow or deployment, and identify the last known good component SHA from its delivery record.
2. Prefer a revert PR, let `ci-ok` pass, and deploy the resulting main commit through the existing pipeline. Reverting application changes must not remove or rewrite applied migration files.
3. If urgent redeployment of an existing image is necessary, use Azure's App Service deployment configuration to select the previously recorded ACR image digest or SHA tag, then verify `/api/health`, catalog pages, and the affected capability. Record the manual action in the incident and reconcile main through a PR. The existing manual deploy workflow deploys current main; it is not an arbitrary-SHA rollback tool.
4. For Studio, republish the last known good Netlify deploy, verify `/` and `/structure`, and reconcile main through a PR.
5. Database problems require a forward repair migration or an assessed point-in-time restore to a separate server. Verify backup retention and restore capability before relying on recovery. Assess writes since the restore point and connection changes before any cutover; do not apply down migrations automatically.
6. Close the incident only after verification, recording root cause and linked prevention work.

## Operations and cadence

**Operations inbox** polls recent main workflow runs hourly and on demand. It creates or updates one open incident per failing monitored workflow, with run links and a recovery checklist. It does not execute code or consume artifacts from those runs. A failed run alone does not establish a customer outage, and later success does not auto-close the incident. Manually triage impact and close obsolete failures. Azure remains the runtime detection source: capture actionable alerts as incidents using the maintenance form; workflow polling does not detect runtime outages.

Weekly: triage Inbox, choose the next few Ready items, review blocked work and dependency PRs, and confirm delivery verification. Monthly: review releases, incidents, cloud and AI costs, security alerts, deferred major dependency updates, and backup/restore readiness. Add staging when work regularly requires realistic integration checks before production. Add CODEOWNERS and required reviewer ownership when another maintainer joins.
