<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project notes

- Spec: `TRD.md`. Setup, env vars and deployment: `README.md`.
- Use **Bun** (`bun install`, `bun run <script>`, `bun run test`). `studio/` is a standalone Sanity Studio with its own toolchain.
- DB schema: `src/server/db/schema.ts`; generate migrations with `bun run db:generate`.
- MCP: `/api/mcp`, tools in `src/server/mcp/` (register in `server.ts`), OAuth in `src/server/oauth/`. Sanity writes must call helpers in `src/server/mcp/revalidate.ts`.
- Terraform: `iac/bootstrap/` = state storage, `iac/app/` = everything else; azurerm v5. Keep secrets out of state with ephemeral values and write-only (`*_wo`) arguments. Deploys use GitHub OIDC.
