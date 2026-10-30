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
| App Service plan (Linux, B1) + Web App for Containers | System-assigned identity, HTTPS only, TLS 1.2, FTP/basic publishing off, Always On, health check and warmup `/api/health`, container start limit 300s, `WEBSITES_PORT=3000` |
| PostgreSQL Flexible Server 17 (B1ms, 32 GB) + database `catraders` | Public access with a firewall: one rule per address in the web app's `possible_outbound_ip_address_list`, plus any `postgres_allowed_ip_ranges`. The 0.0.0.0 "allow Azure services" rule stays off unless `postgres_allow_azure_services` is set. TLS required. `prevent_destroy` is on. |
| Key Vault (RBAC) | Holds `database-url` (admin, migrations), `database-url-app` (the `catraders_app` role the web app uses), `sanity-webhook-secret` and `acs-connection-string`. The web app reads them through `@Microsoft.KeyVault(...)` app-setting references. |
| Communication Services + Email (Azure-managed domain) | The sender is `DoNotReply@<id>.azurecomm.net` |
| Log Analytics | Collects App Service console, HTTP and platform logs, Postgres logs, and metrics |
| User-assigned identity + GitHub federated credential | Lets `azure-deploy.yml` log in with OIDC; no passwords or keys are stored in GitHub. Roles: `AcrPush` on the registry, `Website Contributor` on the app, `Reader` on the resource group. |

Secrets stay out of state where the provider allows it:

- The Postgres admin password and the Sanity webhook secret are **ephemeral** random values, passed to Azure through **write-only** arguments. They never appear in plan or state.
- The ACS connection string is a computed attribute of the ACS resource, so it's in state. The state account is protected by RBAC.
- `database-url-app` is different on purpose. Terraform creates the secret, then `lifecycle.ignore_changes` on `value` so a later apply does not overwrite the URL. The password is set with `az keyvault secret set` (below) and is not in the configuration. The provider reads that value back into state; the state account is the same RBAC-protected one. Write-only `value_wo` would replace a hand-set URL on the apply that imports it, because importing leaves `value_wo_version` unset.

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
terraform apply -target=azurerm_linux_web_app.main
```

```bash
terraform apply
```

The firewall rules are one per address in the web app's `possible_outbound_ip_address_list`, and that list does not exist until the app does, so the first command creates the app and the second adds the rules. Postgres is the slow part. This leaves `database-url-app` set to the placeholder `unset` until step 5. An existing production stack should do step 5 before applying this configuration; it already has a web app, so a single apply is enough once the secret is imported.

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

**4. Database migrations.** The deploy workflow applies them automatically, using the `AZURE_POSTGRES_SERVER`, `AZURE_KEY_VAULT_NAME` and `AZURE_DATABASE_URL_SECRET` variables set above. `AZURE_DATABASE_URL_SECRET` stays `database-url` (the admin). The app role in `database-url-app` cannot run DDL, so don't point the workflow at it. Terraform grants the deploy identity read access to the `database-url` secret only, and a custom role that can add and remove firewall rules on the Postgres server (the temporary `github-runner-*` rules). Nothing is needed here unless you want to migrate by hand: add your IP to `postgres_allowed_ip_ranges`, apply, then run this from the repo root:

```bash
DATABASE_URL="$(terraform -chdir=iac/app output -raw database_url_command | sh)" bun run db:migrate
```

**5. App role and firewall.** Do this before the apply that turns off the Azure-services rule, or the site loses the database until the role and secret exist. Migrations keep using `database-url`.

1. From an allowed IP, connect as `catraders_admin` (the URL is `terraform output -raw database_url_command`) and run [`db/catraders_app.sql`](../db/catraders_app.sql). It creates `catraders_app` with no DDL and no superuser. Re-running does not change the password.
2. Set a URL-safe password the file deliberately does not contain: `ALTER ROLE catraders_app PASSWORD '...';` (`openssl rand -hex 24` needs no URL encoding).
3. Write the connection string. This creates the secret, or adds a version if Terraform already stored the placeholder `unset`. Terraform will not overwrite a value you set this way.

```bash
FQDN="$(terraform output -raw postgres_fqdn)"
VAULT="$(terraform output -raw key_vault_name)"
printf '%s' "postgres://catraders_app:<password>@${FQDN}:5432/catraders?sslmode=verify-full" \
  | az keyvault secret set --vault-name "$VAULT" --name database-url-app --file /dev/stdin
```

4. If Terraform state does not already contain this secret, import it before applying. Skip the import when state already has `azurerm_key_vault_secret.database_url_app` (the first apply of a new stack creates it). Applying while the secret exists in Azure but not in state stops with "already exists" and does not overwrite the value.

```bash
SECRET_ID="$(az keyvault secret show --vault-name "$VAULT" --name database-url-app --query id -o tsv)"
terraform import azurerm_key_vault_secret.database_url_app "$SECRET_ID"
```

5. `terraform apply`. That removes the 0.0.0.0 rule (unless `postgres_allow_azure_services` is true), adds a firewall rule for each of the web app's possible outbound IPs, and points the app setting `DATABASE_URL` at `database-url-app`. The 0.0.0.0 rule is destroyed only after those IP rules exist. Rules named `github-runner-*` are not in state; the deploy workflow still adds and removes them.

Step 2 is the two-apply sequence for a stack that has no web app yet. Production already has one, so after the import a single apply is enough.

**6. Point Sanity at the site.** Use `terraform output sanity_webhook` for the URL and for the command that reads the secret. Create the webhook as described in the root README.

**7. Deploy.** Push to `main`, or run the *Deploy Next.js Automotive App to Azure* workflow by hand. The workflow builds the image, applies pending migrations as the admin, then deploys. Until the first image is pushed, the web app shows container pull errors. That's expected.

To roll the lockdown back: point `DATABASE_URL` at the `database-url` reference again and set `postgres_allow_azure_services = true`, then apply. In a hurry, create the 0.0.0.0 firewall rule (`AllowAllAzureServicesAndResourcesWithinAzureIps`, start and end `0.0.0.0`) and set the app setting back to the `database-url` Key Vault reference, then restart the web app. Do that in Terraform as well before the next apply, or the apply puts the lockdown back. Leave the `catraders_app` role in place until the app is confirmed on the admin URL. Dropping it is `DROP ROLE catraders_app`. The admin secret is unchanged.

## Day-2

| Task | How |
| --- | --- |
| Rotate the admin DB password | Bump `postgres_password_version`, then `terraform apply`. The server and the `database-url` secret (migrations) change together. The web app keeps using `database-url-app`. |
| Rotate the app DB password | `ALTER ROLE catraders_app PASSWORD '...'`, then `az keyvault secret set` on `database-url-app` with the new URL, then restart the web app. Terraform ignores that secret's value, so the next apply leaves it. |
| Rotate the webhook secret | Bump `sanity_webhook_secret_version`, apply, update the secret in Sanity, then restart the web app. |
| Scale up | Change `app_service_sku` (e.g. `P0v3`) or `postgres_sku` (e.g. `GP_Standard_D2ds_v5`). |
| Use a custom email domain | Switch `domain_management` to `CustomerManaged` in `email.tf` and add the DNS records from `verification_records`. |
| Use a custom domain | Proxy the apex through Cloudflare (SSL mode Full (strict)). Set `app_service_rp_object_id` and apply, issue a Cloudflare Origin CA certificate and import it into Key Vault as `cloudflare-origin` (`az keyvault certificate import`), then set `custom_domain` and `site_url` and apply again. Set the repo variable `SITE_URL` so the next deploy bakes it into the sitemap. DNS: `asuid` TXT from `customDomainVerificationId`, proxied CNAMEs for `@` and `www`. |
| Another environment | Use a separate state `key` in `backend.hcl` and set `environment = "staging"`. |

To tear the environment down, first remove `prevent_destroy` from the Postgres server in `database.tf`, then run `terraform destroy`.

## Notes

- GitHub issues OIDC tokens with the immutable subject `repo:OWNER@OWNER_ID/REPO@REPO_ID:environment:production`. The IDs come from `github_repository_owner_id` and `github_repository_id`. If you fork or move the repo, update them from `gh api repos/OWNER/REPO/actions/oidc/customization/sub`, otherwise Azure login fails with `AADSTS700213`.

- The web app connects as `catraders_app` (`db/catraders_app.sql`, secret `database-url-app`). Migrations connect as `catraders_admin` (`database-url`).
- With `postgres_allow_azure_services` left false, only the web app's possible outbound IPs, `postgres_allowed_ip_ranges`, and in-flight `github-runner-*` rules can connect. Private networking would be a separate change.
- Next's data cache is per instance. Before scaling the web app beyond one instance, add a shared cache handler (see the root README).
