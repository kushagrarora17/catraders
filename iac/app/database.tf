locals {
  postgres_admin_login = "catraders_admin"
}

# Ephemeral: generated per run and never written to state. It is only sent to
# Azure (server + DATABASE_URL secret) when postgres_password_version changes.
ephemeral "random_password" "postgres_admin" {
  length  = 40
  special = false
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                          = "psql-${local.name}-${local.suffix}"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = azurerm_resource_group.main.location
  version                       = var.postgres_version
  sku_name                      = var.postgres_sku
  storage_mb                    = var.postgres_storage_mb
  auto_grow_enabled             = true
  backup_retention_days         = var.postgres_backup_retention_days
  geo_redundant_backup_enabled  = false
  public_network_access_enabled = true

  administrator_login               = local.postgres_admin_login
  administrator_password_wo         = ephemeral.random_password.postgres_admin.result
  administrator_password_wo_version = var.postgres_password_version

  authentication {
    password_auth_enabled         = true
    active_directory_auth_enabled = false
  }

  tags = local.tags

  lifecycle {
    # Holds customer RFQs. Remove this deliberately if the environment must be torn down.
    prevent_destroy = true
    # Azure picks the zone; don't fight it on later plans.
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = var.project
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# 0.0.0.0 is Azure's special "allow Azure services" rule. Leave it off
# (postgres_allow_azure_services = false): it admits every Azure-hosted client.
# Destroy it only after the web app's own rules exist, so an apply does not
# open a gap where nothing can connect.
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  count            = var.postgres_allow_azure_services ? 1 : 0
  name             = "AllowAllAzureServicesAndResourcesWithinAzureIps"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"

  depends_on = [azurerm_postgresql_flexible_server_firewall_rule.web_app]
}

# App Service has no VNet integration, so each address it might egress from
# needs a rule. possible_outbound_ip_address_list is the stamp's full set, not
# only the addresses in use today. A brand-new stack has to create the web app
# before this can be planned (see iac/README.md). github-runner-* rules are
# opened by the deploy workflow and are not managed here.
resource "azurerm_postgresql_flexible_server_firewall_rule" "web_app" {
  for_each = toset(azurerm_linux_web_app.main.possible_outbound_ip_address_list)

  name             = "webapp-${replace(each.value, ".", "-")}"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = each.value
  end_ip_address   = each.value
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allowed" {
  for_each         = var.postgres_allowed_ip_ranges
  name             = each.key
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = each.value.start_ip_address
  end_ip_address   = each.value.end_ip_address
}

resource "azurerm_monitor_diagnostic_setting" "postgres" {
  name                       = "to-log-analytics"
  target_resource_id         = azurerm_postgresql_flexible_server.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "PostgreSQLLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
