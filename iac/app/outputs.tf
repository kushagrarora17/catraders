output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "web_app_name" {
  value = azurerm_linux_web_app.main.name
}

output "web_app_url" {
  value = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "acr_login_server" {
  value = azurerm_container_registry.main.login_server
}

output "postgres_fqdn" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "key_vault_name" {
  value = azurerm_key_vault.main.name
}

output "email_sender_address" {
  value = local.email_sender_address
}

output "github_actions_secrets" {
  description = "Secrets for the GitHub `production` environment (masked in public workflow logs)."
  sensitive   = true
  value = {
    AZURE_CLIENT_ID       = azurerm_user_assigned_identity.github_deploy.client_id
    AZURE_TENANT_ID       = data.azurerm_client_config.current.tenant_id
    AZURE_SUBSCRIPTION_ID = data.azurerm_client_config.current.subscription_id
  }
}

output "github_actions_variables" {
  description = "Repository variables for .github/workflows/azure-deploy.yml."
  value = {
    AZURE_RESOURCE_GROUP = azurerm_resource_group.main.name
    AZURE_WEBAPP_NAME    = azurerm_linux_web_app.main.name
    ACR_NAME             = azurerm_container_registry.main.name
    ACR_LOGIN_SERVER     = azurerm_container_registry.main.login_server
    # Used by the deploy workflow to run database migrations as the admin role.
    # This must stay database-url, not database-url-app (the app role cannot DDL).
    AZURE_POSTGRES_SERVER     = azurerm_postgresql_flexible_server.main.name
    AZURE_KEY_VAULT_NAME      = azurerm_key_vault.main.name
    AZURE_DATABASE_URL_SECRET = azurerm_key_vault_secret.database_url.name
  }
}

output "sanity_webhook" {
  description = "Values for the Sanity GROQ webhook (sanity.io/manage → API → Webhooks)."
  value = {
    url              = "https://${azurerm_linux_web_app.main.default_hostname}/api/webhooks/sanity"
    read_secret_with = "az keyvault secret show --vault-name ${azurerm_key_vault.main.name} --name ${azurerm_key_vault_secret.sanity_webhook_secret.name} --query value -o tsv"
  }
}

output "database_url_command" {
  description = "Prints the admin DATABASE_URL (catraders_admin) for running migrations from an allowed IP."
  value       = "az keyvault secret show --vault-name ${azurerm_key_vault.main.name} --name ${azurerm_key_vault_secret.database_url.name} --query value -o tsv"
}

output "database_url_app_secret_name" {
  description = "Key Vault secret the web app reads (catraders_app). Terraform ignores its value; set it out of band. See iac/README.md."
  value       = azurerm_key_vault_secret.database_url_app.name
}

output "mcp" {
  description = "Connect Claude to the MCP server: add this URL as a custom connector, then sign in with the password."
  value = {
    url                      = "${local.site_url}/api/mcp"
    read_password_with       = "az keyvault secret show --vault-name ${azurerm_key_vault.main.name} --name ${azurerm_key_vault_secret.mcp_admin_password.name} --query value -o tsv"
    sanity_write_token_ready = var.sanity_write_token_version > 0
  }
}
