# Infrastructure (Terraform, Azure)

There are two stacks:

| Stack | State | Creates |
| --- | --- | --- |
| [`bootstrap/`](bootstrap) | local | Resource group + storage account/container for remote state. Uses Entra ID auth only (no account keys) and has blob versioning and soft delete. |
| [`app/`](app) | Azure Storage (from bootstrap) | Everything the application runs on (below) |

## What `app/` provisions

Everything is in **Central US** by default. The subscription can't create PostgreSQL Flexible Server in East US 2, East US, West US 2, South Central US or West Europe.

| Resource | Notes |
| --- | --- |
| Resource group `rg-catraders-prod` | |
| Container Registry (Basic) | Admin user disabled. The web app pulls with its managed identity (`AcrPull`). |
| App Service plan (Linux, B1) + Web App for Containers | System-assigned identity, HTTPS only, TLS 1.2, FTP/basic publishing off, health check `/api/health`, `WEBSITES_PORT=3000` |
| PostgreSQL Flexible Server 17 (B1ms, 32 GB) + database `catraders` | Public access with a firewall: Azure services, plus any `postgres_allowed_ip_ranges`. TLS required. `prevent_destroy` is on. |
| Key Vault (RBAC) | Holds `database-url`, `sanity-webhook-secret` and `acs-connection-string`. The web app reads them through `@Microsoft.KeyVault(...)` app-setting references. |
| Communication Services + Email (Azure-managed domain) | The sender is `DoNotReply@<id>.azurecomm.net` |
| Log Analytics | Collects App Service console, HTTP and platform logs, Postgres logs, and metrics |
| User-assigned identity + GitHub federated credential | Lets `azure-deploy.yml` log in with OIDC; no passwords or keys are stored in GitHub. Roles: `AcrPush` on the registry, `Website Contributor` on the app, `Reader` on the resource group. |

Secrets stay out of state where the provider allows it:

- The Postgres admin password and the Sanity webhook secret are **ephemeral** random values, passed to Azure through **write-only** arguments. They never appear in plan or state.
- The ACS connection string is the one exception. It's a computed attribute of the ACS resource, so it's in state. The state account is protected by RBAC.

## First-time setup

Prerequisites: Terraform ≥ 1.11, Azure CLI logged in (`az login`), and Owner (or Contributor + User Access Administrator) on the subscription.

**1. Create the state storage (once):**

```bash
cd iac/bootstrap
```

```bash
cp terraform.tfvars.example terraform.tfvars
```

Set `subscription_id` in `terraform.tfvars`, then:

```bash
terraform init && terraform apply
```

```bash
terraform output -raw backend_hcl > ../app/backend.hcl
```

Commit `iac/app/backend.hcl`. It holds only resource names, no secrets. The bootstrap state stays on your machine; if it's lost, re-import the three resources.

**2. Create the application infrastructure:**

```bash
cd ../app
```

```bash
cp terraform.tfvars.example terraform.tfvars
```

Set `subscription_id` and `quote_notification_email` in `terraform.tfvars`, then:

```bash
terraform init -backend-config=backend.hcl
```

```bash
terraform apply
```

The first apply takes roughly 10–15 minutes; Postgres is the slow part.

**3. Configure GitHub Actions.**

- The Azure client, tenant and subscription IDs go in as **secrets on the `production` environment**. Only the deploy job can read them, and they're masked in the public logs.
- The resource names go in as repository **variables**.

Run these from `iac/app`:

```bash
gh api -X PUT repos/kushagrarora17/catraders/environments/production
```

```bash
terraform output -json github_actions_secrets | jq -r 'to_entries[] | "\(.key)=\(.value)"' > /tmp/gh-secrets.env
```

```bash
gh secret set -f /tmp/gh-secrets.env --env production --repo kushagrarora17/catraders && rm /tmp/gh-secrets.env
```

```bash
terraform output -json github_actions_variables | jq -r 'to_entries[] | "\(.key)=\(.value)"' > /tmp/gh-vars.env
```

```bash
gh variable set -f /tmp/gh-vars.env --repo kushagrarora17/catraders
```

Optionally, restrict the `production` environment to the `main` branch and add required reviewers under Settings → Environments.

**4. Run database migrations.** Add your IP to `postgres_allowed_ip_ranges` in `terraform.tfvars` and apply again, then:

Run this from the repo root:

```bash
DATABASE_URL="$(terraform -chdir=iac/app output -raw database_url_command | sh)" bun run db:migrate
```

**5. Point Sanity at the site.** Use `terraform output sanity_webhook` for the URL and for the command that reads the secret. Create the webhook as described in the root README.

**6. Deploy.** Push to `main`, or run the *Deploy Next.js Automotive App to Azure* workflow by hand. Until the first image is pushed, the web app shows container pull errors. That's expected.

## Day-2

| Task | How |
| --- | --- |
| Rotate the DB password | Bump `postgres_password_version`, then `terraform apply` and restart the web app. The server and the `database-url` secret change together. |
| Rotate the webhook secret | Bump `sanity_webhook_secret_version`, apply, update the secret in Sanity, then restart the web app. |
| Scale up | Change `app_service_sku` (e.g. `P0v3`) or `postgres_sku` (e.g. `GP_Standard_D2ds_v5`). |
| Use a custom email domain | Switch `domain_management` to `CustomerManaged` in `email.tf` and add the DNS records from `verification_records`. |
| Another environment | Use a separate state `key` in `backend.hcl` and set `environment = "staging"`. |

To tear the environment down, first remove `prevent_destroy` from the Postgres server in `database.tf`, then run `terraform destroy`.

## Notes

- The web app connects as the Postgres admin. For least privilege, create a dedicated app role and store its connection string in `database-url` instead.
- The *Allow Azure services* firewall rule admits any Azure-hosted client. For a tighter setup, switch to VNet integration with private access.
- Next's data cache is per instance. Before scaling the web app beyond one instance, add a shared cache handler (see the root README).
