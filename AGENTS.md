<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project notes

- Spec: `TRD.md`. Setup, env vars and deployment: `README.md`.
- Package manager and test runner is **Bun** (`bun install`, `bun run <script>`, `bun run test`). Node ≥ 24 is the runtime; never add npm/yarn/pnpm lockfiles.
- `studio/` is a standalone Sanity Studio with its own `package.json`; it is excluded from the root tsconfig/eslint/Docker context.
- After changing Sanity schemas or any `defineQuery` in `src/`, run `bun run typegen` and commit `src/sanity/types.ts`. Query variable names must be unique.
- Every GROQ query must filter `vertical == "automotive"`; catalog fetches go through `src/features/catalog/api.ts` so they carry the `automotive-products` cache tag.
- DB schema lives in `src/server/db/schema.ts`; create migrations with `bun run db:generate` (never hand-edit applied migrations).
- Local Postgres runs in Podman: `bun run db:up`.
