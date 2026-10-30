resource "azurerm_key_vault" "main" {
  # Max 24 chars: "kv-" + up to 16 + "-" + 4.
  name                       = "kv-${substr(local.compact, 0, 16)}-${local.suffix}"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  rbac_authorization_enabled = true
  purge_protection_enabled   = var.key_vault_purge_protection
  soft_delete_retention_days = 30
  tags                       = local.tags
}

# Whoever runs Terraform manages the secrets.
resource "azurerm_role_assignment" "key_vault_deployer" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# The web app resolves @Microsoft.KeyVault(...) app settings with its identity.
resource "azurerm_role_assignment" "key_vault_web_app" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.main.identity[0].principal_id
  principal_type       = "ServicePrincipal"
}

# RBAC assignments take a while to propagate; writing secrets before then 403s.
resource "time_sleep" "key_vault_rbac" {
  create_duration = "60s"
  depends_on      = [azurerm_role_assignment.key_vault_deployer]
}

resource "azurerm_key_vault_secret" "database_url" {
  name         = "database-url"
  key_vault_id = azurerm_key_vault.main.id
  content_type = "postgres connection string"
  value_wo = format(
    "postgres://%s:%s@%s:5432/%s?sslmode=verify-full",
    local.postgres_admin_login,
    urlencode(ephemeral.random_password.postgres_admin.result),
    azurerm_postgresql_flexible_server.main.fqdn,
    azurerm_postgresql_flexible_server_database.app.name,
  )
  value_wo_version = var.postgres_password_version

  depends_on = [time_sleep.key_vault_rbac]
}

# Connection string for catraders_app (db/catraders_app.sql). The password is
# chosen out of band — do not put it in configuration or in a TF_VAR.
# `value` is only the placeholder used when Terraform itself creates the
# secret. ignore_changes keeps a later apply from publishing a new version
# over the URL written with `az keyvault secret set`.
# value_wo is the wrong tool here: the provider writes it whenever
# value_wo_version changes, and importing a secret that was created by hand
# leaves that version unset, so the next apply would replace the real URL
# with this placeholder. See iac/README.md for the set-then-import order.
# The provider reads `value` back into state; the state account is RBAC-only.
resource "azurerm_key_vault_secret" "database_url_app" {
  name         = "database-url-app"
  key_vault_id = azurerm_key_vault.main.id
  content_type = "postgres connection string (catraders_app)"
  value        = "unset"

  lifecycle {
    ignore_changes = [value]
  }

  depends_on = [time_sleep.key_vault_rbac]
}

# Shared with the Sanity GROQ webhook; read it with the command in the
# `sanity_webhook` output.
ephemeral "random_password" "sanity_webhook_secret" {
  length  = 48
  special = false
}

resource "azurerm_key_vault_secret" "sanity_webhook_secret" {
  name             = "sanity-webhook-secret"
  key_vault_id     = azurerm_key_vault.main.id
  value_wo         = ephemeral.random_password.sanity_webhook_secret.result
  value_wo_version = var.sanity_webhook_secret_version

  depends_on = [time_sleep.key_vault_rbac]
}

resource "azurerm_key_vault_secret" "acs_connection_string" {
  name         = "acs-connection-string"
  key_vault_id = azurerm_key_vault.main.id
  value        = azurerm_communication_service.main.primary_connection_string

  depends_on = [time_sleep.key_vault_rbac]
}

# Password for the MCP server's OAuth consent screen. Read it with the command in the `mcp` output.
ephemeral "random_password" "mcp_admin" {
  length  = 24
  special = false
}

resource "azurerm_key_vault_secret" "mcp_admin_password" {
  name             = "mcp-admin-password"
  key_vault_id     = azurerm_key_vault.main.id
  value_wo         = ephemeral.random_password.mcp_admin.result
  value_wo_version = var.mcp_admin_password_version

  depends_on = [time_sleep.key_vault_rbac]
}

# Signs the MCP server's access tokens.
ephemeral "random_password" "mcp_jwt" {
  length  = 64
  special = false
}

resource "azurerm_key_vault_secret" "mcp_jwt_secret" {
  name             = "mcp-jwt-secret"
  key_vault_id     = azurerm_key_vault.main.id
  value_wo         = ephemeral.random_password.mcp_jwt.result
  value_wo_version = var.mcp_jwt_secret_version

  depends_on = [time_sleep.key_vault_rbac]
}

# Editor token the MCP server uses to write to Sanity. Created only once a token is supplied.
resource "azurerm_key_vault_secret" "sanity_write_token" {
  count = var.sanity_write_token_version > 0 ? 1 : 0

  name             = "sanity-write-token"
  key_vault_id     = azurerm_key_vault.main.id
  value_wo         = var.sanity_write_token
  value_wo_version = var.sanity_write_token_version

  depends_on = [time_sleep.key_vault_rbac]
}

# Import the origin certificate from the CLI (az keyvault certificate import).
resource "azurerm_role_assignment" "key_vault_deployer_certificates" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# App Service itself (not the web app's identity) reads the certificate secret to bind it.
resource "azurerm_role_assignment" "key_vault_app_service_rp" {
  count                = var.app_service_rp_object_id == null ? 0 : 1
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = var.app_service_rp_object_id
  principal_type       = "ServicePrincipal"
}
