# Passwordless deploys: GitHub Actions exchanges its OIDC token for this identity.
resource "azurerm_user_assigned_identity" "github_deploy" {
  name                = "id-${local.name}-github-deploy"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags
}

resource "azurerm_federated_identity_credential" "github_deploy" {
  name                      = "github-${var.github_environment}"
  user_assigned_identity_id = azurerm_user_assigned_identity.github_deploy.id
  issuer                    = "https://token.actions.githubusercontent.com"
  audience                  = ["api://AzureADTokenExchange"]
  # Only jobs running in this repo's GitHub environment can assume the identity. The repo uses
  # GitHub's immutable subject format (owner@id/repo@id), so a deleted and re-created repo or
  # account with the same name can't match. Check with:
  #   gh api repos/OWNER/REPO/actions/oidc/customization/sub   -> sub_claim_prefix
  subject = "repo:${local.github_owner}@${var.github_repository_owner_id}/${local.github_repo}@${var.github_repository_id}:environment:${var.github_environment}"
}

locals {
  github_owner = split("/", var.github_repository)[0]
  github_repo  = split("/", var.github_repository)[1]
}

resource "azurerm_role_assignment" "github_acr_push" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.github_deploy.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "github_web_app" {
  scope                = azurerm_linux_web_app.main.id
  role_definition_name = "Website Contributor"
  principal_id         = azurerm_user_assigned_identity.github_deploy.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "github_resource_group_reader" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.github_deploy.principal_id
  principal_type       = "ServicePrincipal"
}

# ── Database migrations from the deploy workflow ──────────────────────────
# The workflow reads the admin DATABASE_URL (secret database-url) from Key Vault, opens a
# temporary Postgres firewall rule for the runner's IP, runs `bun run db:migrate`, and removes
# the rule again. Both grants are scoped as narrowly as Azure allows. The web app's
# database-url-app secret is not readable by this identity; migrations stay on the admin role.

# Read access to the admin DATABASE_URL secret only, not the whole vault and not database-url-app.
resource "azurerm_role_assignment" "github_database_url" {
  scope                = azurerm_key_vault_secret.database_url.resource_versionless_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.github_deploy.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_definition" "postgres_firewall_manager" {
  name        = "${local.name} Postgres firewall rule manager"
  scope       = azurerm_postgresql_flexible_server.main.id
  description = "Add and remove firewall rules on the app's PostgreSQL server (and nothing else)."

  permissions {
    actions = [
      "Microsoft.DBforPostgreSQL/flexibleServers/read",
      "Microsoft.DBforPostgreSQL/flexibleServers/firewallRules/read",
      "Microsoft.DBforPostgreSQL/flexibleServers/firewallRules/write",
      "Microsoft.DBforPostgreSQL/flexibleServers/firewallRules/delete",
    ]
  }

  assignable_scopes = [azurerm_postgresql_flexible_server.main.id]
}

resource "azurerm_role_assignment" "github_postgres_firewall" {
  scope              = azurerm_postgresql_flexible_server.main.id
  role_definition_id = azurerm_role_definition.postgres_firewall_manager.role_definition_resource_id
  principal_id       = azurerm_user_assigned_identity.github_deploy.principal_id
  principal_type     = "ServicePrincipal"
}

# Firewall changes are long-running operations that the CLI polls, and Azure serves the polling
# URLs from subscription scope, so the server-scoped role above can't cover them. Read-only.
resource "azurerm_role_definition" "postgres_operation_reader" {
  name        = "${local.name} Postgres operation status reader"
  scope       = "/subscriptions/${data.azurerm_client_config.current.subscription_id}"
  description = "Poll the status of PostgreSQL long-running operations."

  permissions {
    actions = [
      "Microsoft.DBforPostgreSQL/locations/azureAsyncOperation/read",
      "Microsoft.DBforPostgreSQL/locations/operationResults/read",
    ]
  }

  assignable_scopes = ["/subscriptions/${data.azurerm_client_config.current.subscription_id}"]
}

resource "azurerm_role_assignment" "github_postgres_operations" {
  scope              = "/subscriptions/${data.azurerm_client_config.current.subscription_id}"
  role_definition_id = azurerm_role_definition.postgres_operation_reader.role_definition_resource_id
  principal_id       = azurerm_user_assigned_identity.github_deploy.principal_id
  principal_type     = "ServicePrincipal"
}
