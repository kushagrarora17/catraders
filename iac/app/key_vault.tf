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
