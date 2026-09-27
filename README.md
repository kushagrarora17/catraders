# CA Traders — Automotive Marketplace & Quote Engine

A content-driven catalog of automotive fluids (engine oils, coolants, …). Customers browse the catalog, add products to a quote cart and submit a Request for Quote (RFQ). The spec is in [TRD.md](TRD.md).

| Layer | Tech |
| --- | --- |
| Web app | Next.js 16 (App Router, `standalone` output), React 19, Tailwind CSS 4 |
| Content | Sanity (standalone Studio in [`studio/`](studio)), project `51ngrb7a`, dataset `production` |
| Quote cart | Zustand + `persist` (localStorage key `automotive-quote-basket`) |
| RFQ storage | PostgreSQL (Azure Database for PostgreSQL in prod) via Drizzle ORM |
| Email | Azure Communication Services |
| Tooling | Bun 1.4 (package manager / scripts / tests), Node ≥ 24 (runtime), Podman or Docker |

## Project layout

```
src/
  app/(automotive)/        # automotive route group: theme + pages (/, /products, /products/[slug], /quote)
  app/api/                 # quotes, availability, webhooks/sanity, health
  features/catalog/        # GROQ queries, cached fetchers, filter parsing, catalog UI
  features/quote-cart/     # Zustand store, zod request schema, cart + form components
  server/db/               # Drizzle schema + pg pool
  server/quotes/           # RFQ service, repository, reference numbers, emails
  sanity/                  # client, image URLs, generated types (TypeGen)
  styles/themes/           # per-vertical CSS tokens
studio/                    # Sanity Studio (own package.json)
drizzle/                   # SQL migrations (generated)
docker/Dockerfile          # multi-stage standalone image
```

## Content model

- **Category**: a three-level tree (L1 → L2 → L3). Each category has an explicit `level`, and L2 and L3 categories point to a `parent` exactly one level above them.
- **Attribute**: a filterable dimension such as Viscosity Grade, Pack Size, Specification or Coolant Technology. Its slug becomes the catalog URL filter key (`/products?viscosity=5w-30`). `allowMultiple` permits several values per product, which suits specs and approvals.
- **Attribute Value**: an allowed value of an attribute (`5W-30`, `4 L`, `API SP`).
- **Product**: `title`, `slug`, `sku`, `category` (a reference), `attributeValues` (references), `inStock`, `images` and `description`. Each pack size is its own product/SKU.
- **Stock**: out-of-stock products stay visible with a badge, but they can't be added to a quote. The API also rejects them with a 409.

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
| `bun run db:up` / `db:down` | Start or stop local Postgres (Podman) |
| `bun run db:generate` | Create a migration from `src/server/db/schema.ts` |
| `bun run db:migrate` | Apply migrations to `DATABASE_URL` |
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
| `QUOTE_NOTIFICATION_EMAIL` | no | Internal inbox that gets new-RFQ notices |

In Azure, set these as App Settings that use Key Vault references, e.g. `@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/database-url/)`. Grant the web app's managed identity the *Key Vault Secrets User* role.

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
| Filter | `_type in ["product", "category", "attribute", "attributeValue"]` |
| Projection | `{_type, vertical}` |
| Secret | Same value as `SANITY_WEBHOOK_SECRET` |

The route checks the `sanity-webhook-signature` HMAC and then calls `revalidateTag('automotive-products', { expire: 0 })`.

> **Scaling out:** Next's data cache is per instance. If the app runs on more than one instance, revalidation only reaches the instance that got the webhook. Before scaling out, configure a shared [`cacheHandler`](https://nextjs.org/docs/app/api-reference/config/next-config-js/incrementalCacheHandlerPath), e.g. Redis.

## API

### `POST /api/quotes`

The request body is the TRD's shape without vehicle `specs`. Items are `{ productId, title, sku?, quantity }`.

- The body is validated with zod (`src/features/quote-cart/schema.ts`).
- Products are re-checked in Sanity: they must exist, be in the automotive vertical, and be in stock. Canonical titles and SKUs are stored, not the ones the client sent.
- The request and its items are inserted in one transaction.
- Emails are sent after the response.

| Status | Meaning |
| --- | --- |
| `201` | `{ success: true, referenceNumber: "RFQ-2026-90214", message }` |
| `400` | `INVALID_JSON`, `VALIDATION_FAILED` (with `issues`) or `UNKNOWN_PRODUCTS` (with `productIds`) |
| `409` | `OUT_OF_STOCK` (with `productIds`) |
| `413` | The body is larger than 100 KB |

### Other endpoints

- `GET /api/availability?ids=a,b` returns the current stock status of cart items. The cart uses it to flag items that became unavailable.
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

GitHub Actions:

- **`.github/workflows/ci.yml`** runs on PRs and pushes to `main`:
  - lint, typecheck, migrations and tests against a Postgres service, then the build;
  - Studio schema validation, the Studio build, and a check that the committed TypeGen output is current.
- **`.github/workflows/azure-deploy.yml`** runs after CI passes on `main`. It builds the image, pushes it to ACR, and deploys it to the `app-automotive-prod` Web App.

  Required secrets: `AZURE_CREDENTIALS` (service principal JSON), `ACR_LOGIN_SERVER`, `ACR_USERNAME` and `ACR_PASSWORD`.

Database migrations aren't part of the deploy workflow. Apply them before deploying code that needs them:

```bash
DATABASE_URL='postgres://…azure.com:5432/…?sslmode=verify-full' bun run db:migrate
```

The Azure Postgres firewall has to allow the machine that runs this.

## Known limitations / next steps

- The UI is intentionally bare.
- There is no rate limiting or bot protection on `POST /api/quotes`. Consider Azure Front Door WAF or a captcha.
- Reference numbers use 90,000 random values per year, and the insert retries on a collision. Widen the format if volume grows.
- There is no admin UI for RFQ status (`quote_status`) yet.
