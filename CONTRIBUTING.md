# Working on CA Traders

Track substantive work in a GitHub issue with a problem, expected outcome, and acceptance criteria. Use a parent issue and independently deliverable sub-issues for larger features. Keep sensitive business planning private and customer data out of this public repository.

Use a short-lived branch and link the issue from the PR. `Closes #123` closes completed work on merge; use `Refs #123` for partial work. Follow `AGENTS.md`, use Bun, and run checks relevant to the change. The `ci-ok` check gates squash merges. Keep infrastructure, authentication, and database migration PRs in draft until their review is complete. Do not enable a mandatory second reviewer while there is only one maintainer.

See [the lifecycle guide](docs/lifecycle.md) for planning, delivery, releases, recovery, and operating cadence. `TRD.md` describes the system; `README.md` explains setup and operation. Update them when behavior or operating procedures change. Record substantial architecture decisions in `docs/decisions/` with context, the decision, and consequences; create a decision file only when needed.
