resource "azurerm_service_plan" "main" {
  name                = "asp-${local.name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = var.app_service_sku
  tags                = local.tags
}

locals {
  key_vault_ref = {
    for key, secret in {
      database_url          = azurerm_key_vault_secret.database_url
      sanity_webhook_secret = azurerm_key_vault_secret.sanity_webhook_secret
      acs_connection_string = azurerm_key_vault_secret.acs_connection_string
    } : key => "@Microsoft.KeyVault(SecretUri=${secret.versionless_id})"
  }

  # Can't reference the web app's own default_hostname from its app_settings (cycle).
  web_app_name = "app-${local.name}-${local.suffix}"
  site_url     = coalesce(var.site_url, "https://${local.web_app_name}.azurewebsites.net")
}

resource "azurerm_linux_web_app" "main" {
  name                = local.web_app_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true

  ftp_publish_basic_authentication_enabled       = false
  webdeploy_publish_basic_authentication_enabled = false

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on                               = var.app_service_sku != "F1"
    ftps_state                              = "Disabled"
    http2_enabled                           = true
    minimum_tls_version                     = "1.2"
    health_check_path                       = "/api/health"
    health_check_eviction_time_in_min       = 5
    container_registry_use_managed_identity = true

    application_stack {
      # CI (azure-deploy.yml) deploys commit-tagged images; this is only the initial value.
      docker_image_name   = "${var.container_image_repository}:latest"
      docker_registry_url = "https://${azurerm_container_registry.main.login_server}"
    }
  }

  app_settings = {
    WEBSITES_PORT                       = "3000"
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "false"

    SANITY_PROJECT_ID     = var.sanity_project_id
    SANITY_DATASET        = var.sanity_dataset
    SANITY_WEBHOOK_SECRET = local.key_vault_ref.sanity_webhook_secret

    DATABASE_URL = local.key_vault_ref.database_url

    AZURE_COMMUNICATION_CONNECTION_STRING = local.key_vault_ref.acs_connection_string
    EMAIL_SENDER_ADDRESS                  = local.email_sender_address
    QUOTE_NOTIFICATION_EMAIL              = var.quote_notification_email

    # Canonical URL for metadata, sitemap and robots.txt.
    SITE_URL = local.site_url
  }

  logs {
    detailed_error_messages = false
    failed_request_tracing  = false

    application_logs {
      file_system_level = "Information"
    }

    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 35
      }
    }
  }

  tags = local.tags

  lifecycle {
    ignore_changes = [
      # Owned by the deploy workflow.
      site_config[0].application_stack[0].docker_image_name,
    ]
  }
}

resource "azurerm_monitor_diagnostic_setting" "web_app" {
  name                       = "to-log-analytics"
  target_resource_id         = azurerm_linux_web_app.main.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AppServiceConsoleLogs"
  }

  enabled_log {
    category = "AppServiceHTTPLogs"
  }

  enabled_log {
    category = "AppServicePlatformLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
