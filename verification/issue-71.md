# Issue #71 verification plan

## Local evidence

- OAuth and MCP Playwright end-to-end suite: 28/28 passed, including write operations.
- Focused audit and token unit tests passed; TypeScript check passed.
- Independent review of the audit identity context fix found no actionable issues.
- Live OAuth provider sign-in and production acceptance are not verified by mocked local tests.

## Before production acceptance

1. Register Google and Microsoft OAuth applications and configure their redirect URIs for the target environment.
2. Create the separate private Sanity project/dataset for operator identities and configure the authorized operator, `kushagrarora.17@gmail.com`.
3. Store provider credentials in the approved secret store; never commit them or send them in chat.
4. Deploy to staging with the production-shaped database migration and configuration.
5. Verify authorized sign-in and MCP access with each provider, and confirm an unapproved identity is denied.
6. Disable or change the operator record and verify existing access and refresh tokens are rejected.
7. Exercise representative MCP writes and inspect audit records for actor, action, and target; confirm they contain no customer text or secrets.
8. After staging passes, deploy to production and repeat sign-in, denial, revocation, and audit checks.

Record environment, commit SHA, timestamps, test identities (without credentials), outcomes, and links to relevant logs. Do not mark the issue fully verified until live provider and production checks pass.
