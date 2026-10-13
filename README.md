# CA Traders — Automotive Marketplace & Quote Engine

A content-driven catalog of automotive fluids (engine oils, coolants, …). The landing page (`/`) markets the wholesale business and takes general inquiries; customers can also browse the catalog, add products to a quote cart and submit a Request for Quote (RFQ). The spec is in [TRD.md](TRD.md).

| Layer | Tech |
| --- | --- |
| Web app | Next.js 16 (App Router, `standalone` output), React 19, Tailwind CSS 4 (semantic tokens + CVA) |
| Content | Sanity (standalone Studio in [`studio/`](studio)), project `51ngrb7a`, dataset `production` |
| Quote cart | Zustand + `persist` (localStorage key `automotive-quote-basket`) |
| RFQ + inquiry storage | PostgreSQL (Azure Database for PostgreSQL in prod) via Drizzle ORM |
| Email | Azure Communication Services |
| Tooling | Bun 1.4 (package manager / scripts / tests), Node ≥ 24 (runtime), Podman or Docker |

## Project layout

```
src/
  app/(automotive)/        # automotive route group: theme + pages (/, /products, /products/[slug], /quote)
  app/api/                 # quotes, inquiries, availability, webhooks/sanity, health
  app/{robots,sitemap,opengraph-image}.ts(x)  # SEO metadata routes (use SITE_URL)
  components/ui/           # design-system primitives (Button/buttonVariants, Container, Field, SectionHeading)
  lib/                     # cn() and shared zod helpers
  features/site/           # header, footer, nav, contact constants (phone/email/hours live in contact.ts)
  features/landing/        # landing-page sections, brand logos, JSON-LD
  features/inquiry/        # landing-page inquiry form + zod schema
  features/catalog/        # GROQ queries, cached fetchers, filter parsing, catalog UI
  features/quote-cart/     # Zustand store, zod request schema, cart + form components
  server/db/               # Drizzle schema + pg pool
  server/quotes/           # RFQ service, repository, reference numbers, emails
  server/inquiries/        # inquiry repository + emails
  server/email/            # shared Azure Communication Services sender
  sanity/                  # client, image URLs, generated types (TypeGen)
  styles/themes/           # per-vertical CSS tokens (dark default + [data-surface="light"] sections)
studio/                    # Sanity Studio (own package.json)
drizzle/                   # SQL migrations (generated)
docker/Dockerfile          # multi-stage standalone image
```

## Content model

- **Category**: a three-level tree (L1 → L2 → L3). Each category has an explicit `level`, and L2 and L3 categories point to a `parent` exactly one level above them.
- **Attribute**: a filterable dimension such as Viscosity Grade, Pack Size, Specification or Coolant Technology. Its slug becomes the catalog URL filter key (`/products?viscosity=5w-30`). `allowMultiple` permits several values per product, which suits specs and approvals.
- **Attribute Value**: an allowed value of an attribute (`5W-30`, `4 L`, `API SP`).
- **Product**: `title`, `slug`, `sku`, `category` (a reference), `attributeValues` (references), `inStock`, `images` and `description`. Each pack size is its own product/SKU.
- **Review** (`testimonial`): `quote`, `name`, `role`, `city`, `rating` and `sortOrder`. Shown in the landing-page Testimonials section, which is hidden when there are none.
- **Service area** (`serviceArea`, a singleton): `region`, `description` and `cities`. Drives the landing-page Service Area section (hidden until it exists) and the inquiry form's City drop-down, which lists the cities A–Z with "Others" last for a free-text city.
- **Stock**: out-of-stock products stay visible with a badge and can still be quoted. They're marked "(out of stock)" in the quote list and in the quote emails.

Each document carries a `vertical` field (automotive, baby or home). Every web query filters on `vertical == "automotive"`.

## Local development

Prerequisites: Node 24 (`.nvmrc`), Bun 1.4.2, and Podman or Docker.

```bash
bun install
```

```bash
cp .env.example .env.local
```

```bash
bun run db:up
```

```bash
bun run db:migrate
```

```bash
bun run dev
```

`db:up` starts `postgres:17-alpine` as the container `catraders-postgres`. For Docker, set `CONTAINER_CLI=docker`. The site runs at http://localhost:3000.

### Sanity Studio

```bash
cd studio && bun install
```

```bash
bunx sanity login
```

```bash
bun run studio:dev
```

The Studio runs at http://localhost:3333. `sanity login` is a one-time step, and seeding and deploys need it.

To load sample categories, attributes and products (the script is idempotent):

```bash
bun run seed
```

Other Studio tasks, run from `studio/`:

| Command | Purpose |
| --- | --- |
| `bun run deploy` | Deploy the Studio to `*.sanity.studio` |
| `bun run deploy-schema` | Deploy the schema to the Content Lake (for MCP/agents) |
| `bun run typegen` | Regenerate `src/sanity/types.ts` after changing schemas or queries |
| `bun run validate` | Validate the schema |

The web app reads Sanity on the server only, so no CORS origin is needed for it.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` / `build` / `start` | Next.js |
| `bun run lint` / `typecheck` | ESLint / `tsc` (after `next typegen`) |
| `bun run test` | `bun test` with `.env.local` loaded. The Postgres integration tests run when `DATABASE_URL` is set. |
| `bun run test:e2e` | Playwright end-to-end tests (`e2e/`) against a coverage build of the app, a mock Sanity API and the Postgres in `E2E_DATABASE_URL` (default: the local `db:up` container). Fails under 85% line coverage of `src/`; report in `coverage/e2e/index.html`. First run `bunx playwright install chromium`. |
| `bun run db:up` / `db:down` | Start or stop local Postgres (Podman) |
| `bun run db:generate` | Create a migration from `src/server/db/schema.ts` |
| `bun run db:migrate` | Apply pending migrations to `DATABASE_URL` (`scripts/migrate.ts`; the deploy workflow runs the same command) |
| `bun run studio:dev` / `typegen` / `seed` | Studio shortcuts |

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `SANITY_PROJECT_ID` / `SANITY_DATASET` | no | Default to `51ngrb7a` / `production` |
| `SANITY_API_READ_TOKEN` | no | Only needed if the dataset becomes private |
| `SANITY_WEBHOOK_SECRET` | yes | Must match the secret on the Sanity webhook |
| `DATABASE_URL` | yes | For Azure, append `?sslmode=verify-full` |
| `AZURE_COMMUNICATION_CONNECTION_STRING` | prod | If unset, emails are logged and skipped |
| `EMAIL_SENDER_ADDRESS` | prod | A verified ACS sender, e.g. `DoNotReply@<id>.azurecomm.net` |
| `QUOTE_NOTIFICATION_EMAIL` | no | Internal inbox that gets new-RFQ and landing-page inquiry notices |
| `SITE_URL` | prod | Public URL for canonical links, Open Graph, `sitemap.xml` and `robots.txt`. Defaults to `http://localhost:3000` |
| `MCP_ADMIN_PASSWORD` | for MCP | Password on the MCP sign-in screen. Without it (and `MCP_JWT_SECRET`) `/api/mcp` returns 503 |
| `MCP_JWT_SECRET` | for MCP | At least 32 characters; signs MCP access tokens |
| `SANITY_API_WRITE_TOKEN` | for MCP | Sanity **Editor** token; the MCP catalog and review tools fail without it |

In Azure, Terraform (`iac/app`) sets these as App Settings. The secrets are Key Vault references, e.g. `@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/database-url)`, which the web app's managed identity resolves.

## Caching and revalidation

Catalog reads use `fetch` with `cache: 'force-cache'` and the tag `automotive-products` (see `src/features/catalog/api.ts`). They read from the Sanity API, not the CDN, so a revalidation never re-caches stale CDN data.

- `/` is prerendered at build time, so the build needs network access to Sanity.
- Product pages are generated on their first request and then cached (ISR).
- `/products` renders per request from the cached data.

Create a webhook at [sanity.io/manage](https://www.sanity.io/manage/project/51ngrb7a) → API → Webhooks:

| Setting | Value |
| --- | --- |
| URL | `https://<your-host>/api/webhooks/sanity` |
| Dataset | `production` |
| Trigger on | Create, Update, Delete |
| Filter | `_type in ["product", "category", "attribute", "attributeValue", "testimonial", "serviceArea"]` |
| Projection | `{_type, vertical}` |
| Secret | Same value as `SANITY_WEBHOOK_SECRET` |

The route checks the `sanity-webhook-signature` HMAC and then calls `revalidateTag(tag, { expire: 0 })`, where `tag` is `automotive-products` for catalog types, `automotive-testimonials` for reviews and `automotive-service-area` for the service area.

> **Scaling out:** Next's data cache is per instance. If the app runs on more than one instance, revalidation only reaches the instance that got the webhook. Before scaling out, configure a shared [`cacheHandler`](https://nextjs.org/docs/app/api-reference/config/next-config-js/incrementalCacheHandlerPath), e.g. Redis.

## API

### `POST /api/quotes`

The request body is the TRD's shape without vehicle `specs`. Items are `{ productId, title, sku?, quantity }`.

- The body is validated with zod (`src/features/quote-cart/schema.ts`).
- Products are re-checked in Sanity: they must exist and be in the automotive vertical. Each item's stock status at submission is kept in its specifications snapshot. Canonical titles and SKUs are stored, not the ones the client sent.
- The request and its items are inserted in one transaction.
- Emails are sent after the response.

| Status | Meaning |
| --- | --- |
| `201` | `{ success: true, referenceNumber: "RFQ-2026-90214", message }` |
| `400` | `INVALID_JSON`, `VALIDATION_FAILED` (with `issues`) or `UNKNOWN_PRODUCTS` (with `productIds`) |
| `413` | The body is larger than 100 KB |

### Other endpoints

- `GET /api/availability?ids=a,b` returns the current stock status of cart items. The cart uses it to flag items that were removed or went out of stock.
- `POST /api/webhooks/sanity` triggers revalidation (see above).
- `GET /api/health` is the liveness probe.

## Deployment

Build and run the image locally (works with Podman or Docker):

```bash
podman build -f docker/Dockerfile -t automotive-site .
```

```bash
podman run --rm -p 3000:3000 --env-file .env.local automotive-site
```

Inside a container, `localhost` in `DATABASE_URL` refers to the container itself. Use `host.containers.internal` (Podman) or `host.docker.internal` (Docker) to reach the database on the host.

Azure infrastructure is defined in Terraform under [`iac/`](iac). It covers App Service, ACR, Postgres, Key Vault, Communication Services, Log Analytics and the GitHub OIDC identity. See [iac/README.md](iac/README.md) for first-time setup.

GitHub Actions:

- **`.github/workflows/ci.yml`** runs on PRs and pushes to `main`:
  - lint, typecheck, migrations and tests against a Postgres service, then the build;
  - a check that `src/server/db/schema.ts` and the committed migrations agree, so a schema change can't merge without its migration;
  - Studio schema validation, the Studio build, and a check that the committed TypeGen output is current;
  - `terraform fmt` and `validate` for both IaC stacks.
- **`.github/workflows/azure-deploy.yml`** runs after CI passes on `main`. It logs in to Azure with **OIDC** (no stored secrets), builds the image and pushes it to ACR, **applies pending database migrations**, and only then deploys the image to the Web App.

  It needs two sets of values from Terraform (see [iac/README.md](iac/README.md)):

  - **`production` environment secrets:** `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`. They're masked in the public logs.
  - **Repository variables:** `AZURE_RESOURCE_GROUP`, `AZURE_WEBAPP_NAME`, `ACR_NAME`, `ACR_LOGIN_SERVER`, plus `AZURE_POSTGRES_SERVER`, `AZURE_KEY_VAULT_NAME` and `AZURE_DATABASE_URL_SECRET` for migrations. The job is skipped until the first four are set, and fails with a clear message if the migration ones are missing.

  Only pushes to this repository's `main` (or a manual run) can deploy. CI runs from fork pull requests never reach the deploy job.

**Database migrations** run automatically on every deploy, after the image is built and before it is released:

1. The workflow reads `DATABASE_URL` from Key Vault (the deploy identity can read only that secret) and opens a temporary Postgres firewall rule for the runner's IP.
2. `bun run db:migrate` applies pending migrations from `drizzle/`. It retries the first connection for up to five minutes while Azure applies the rule.
3. The rule is removed again, even if the migration failed or the run was cancelled. A rule left behind by a hard-killed run is swept at the start of the next one.
4. Only if all of that succeeded does the deploy step run. A failed migration leaves the running site untouched.

Rules for writing migrations: they are forward-only and there is no automatic rollback. The previous release keeps serving until the deploy step finishes, so make each migration compatible with the code that is still running (add columns and tables first, remove or rename in a later release). Create them with `bun run db:generate` and commit the result; CI fails if `schema.ts` changed without one. Never edit a migration that has already been applied.

To run migrations by hand (for example to recover a failed deploy), add your IP to `postgres_allowed_ip_ranges`, then from the repo root:

```bash
DATABASE_URL="$(terraform -chdir=iac/app output -raw database_url_command | sh)" bun run db:migrate
```

## MCP server (catalog & RFQ management)

`/api/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) endpoint (streamable HTTP, stateless) that lets Claude manage the catalog and quote pipeline in plain language. Everything runs inside this app; the code is in `src/server/mcp/` (tools) and `src/server/oauth/` (sign-in).

**Tools**

| Area | Tools |
| --- | --- |
| Catalog (read) | `search_products`, `get_product`, `get_taxonomy` |
| Catalog (write) | `create_product`, `update_product`, `set_stock` (bulk, by SKU or id), `set_visibility`, `import_products_csv` |
| Taxonomy | `upsert_category`, `upsert_attribute`, `upsert_attribute_value` |
| Reviews | `list_reviews`, `upsert_review` (and `set_visibility`) |
| Service area | `get_service_area`, `update_service_area` |
| Quotes & inquiries | `list_requests`, `get_request`, `update_request_status` |

- **Writes publish immediately** and expire the catalog cache. There is no draft step. `set_visibility` unpublishes (moves the document to a draft), which is reversible; no tool deletes anything.
- **CSV import** is a dry run by default. Columns: `sku` (required), `title`, `category`, `in_stock`, `description`, `image_url`, plus `attr:<attribute-slug>` columns with `|`-separated values. Rows with errors are skipped; valid rows still apply.
- **Studio rules are re-checked server-side** (category levels and parents, one value per single-valued attribute, reserved attribute slugs, unique SKUs and slugs) because API writes bypass Studio validation.
- `update_request_status` only records the status; it does not email the customer.

**Sign-in.** The server is its own OAuth 2.1 authorization server (dynamic client registration, PKCE S256, 1-hour access tokens, rotating 30-day refresh tokens). The consent screen asks for the single shared admin password. Discovery documents are at `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource/api/mcp`. Tokens are bound to `${SITE_URL}/api/mcp` and rejected for any other audience. Failed sign-ins are rate-limited per IP, in memory, so per instance.

**Connecting**

1. In sanity.io/manage → API → Tokens, create a token with the **Editor** role.
2. Provision it: `export TF_VAR_sanity_write_token=<token>`, set `sanity_write_token_version = 1` in `terraform.tfvars`, and apply. Keep the variable exported for every later plan or apply, or Terraform errors. The sign-in password and signing secret are generated by Terraform.
3. Read the password: `terraform -chdir=iac/app output -json mcp` shows the URL and the Key Vault command that prints it.
4. Add the URL as a connector:
   - **Claude Code:** `claude mcp add --transport http catraders https://<your-host>/api/mcp`, then `/mcp` to sign in.
   - **claude.ai / Claude Desktop:** Settings → Connectors → Add custom connector.

**Locally,** put `MCP_ADMIN_PASSWORD`, `MCP_JWT_SECRET` (32+ characters) and, for the content tools, `SANITY_API_WRITE_TOKEN` in `.env.local`, run `bun run db:migrate` (it adds the `oauth_*` tables), start `bun run dev`, and add `http://localhost:3000/api/mcp`. Local writes go to whatever `SANITY_DATASET` points at, which is `production` by default, so point it at a scratch dataset before experimenting.

## Known limitations / next steps

- The UI is intentionally bare.
- There is no rate limiting or bot protection on `POST /api/quotes`. Consider Azure Front Door WAF or a captcha.
- Reference numbers use 90,000 random values per year, and the insert retries on a collision. Widen the format if volume grows.
- RFQ status is changed through the MCP server (`update_request_status`); there is no web admin UI for it.
- The MCP server has one shared password and no per-person audit trail. Move the consent step to Microsoft Entra sign-in if more people need access.
- MCP client registration uses dynamic client registration only (no Client ID Metadata Documents yet).
- The MCP sign-in rate limiter is in memory; it needs a shared store before scaling out (same caveat as the cache).
