variable "content_review_enabled" {
  description = "Enable automatic product reviews after the worker and Sanity webhook are deployed."
  type        = bool
  default     = true
}

variable "content_review_location" {
  description = "Foundry region with GPT-6.1 Terra quota; defaults to the app region."
  type        = string
  default     = null
}

resource "azurerm_storage_account" "content_review" {
  count                           = var.content_review_enabled ? 1 : 0
  name                            = "st${substr(local.compact, 0, 14)}rv${local.suffix}"
  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  shared_access_key_enabled       = false
  allow_nested_items_to_be_public = false
  min_tls_version                 = "TLS1_2"
  tags                            = local.tags
}

resource "azurerm_role_assignment" "review_storage_deployer" {
  count                = var.content_review_enabled ? 1 : 0
  scope                = azurerm_storage_account.content_review[0].id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "time_sleep" "review_storage_rbac" {
  count           = var.content_review_enabled ? 1 : 0
  create_duration = "60s"
  depends_on      = [azurerm_role_assignment.review_storage_deployer]
}

resource "azurerm_storage_queue" "content_review" {
  for_each           = var.content_review_enabled ? toset(["content-review", "content-review-poison"]) : toset([])
  name               = each.value
  storage_account_id = azurerm_storage_account.content_review[0].id
  depends_on         = [time_sleep.review_storage_rbac]
}

resource "azurerm_linux_function_app" "content_review" {
  count                                          = var.content_review_enabled ? 1 : 0
  name                                           = "func-${local.name}-review-${local.suffix}"
  resource_group_name                            = azurerm_resource_group.main.name
  location                                       = azurerm_resource_group.main.location
  service_plan_id                                = azurerm_service_plan.main.id
  storage_account_name                           = azurerm_storage_account.content_review[0].name
  storage_uses_managed_identity                  = true
  https_only                                     = true
  ftp_publish_basic_authentication_enabled       = false
  webdeploy_publish_basic_authentication_enabled = false
  identity { type = "SystemAssigned" }
  site_config {
    always_on           = var.app_service_sku != "F1"
    minimum_tls_version = "1.2"
    ftps_state          = "Disabled"
    application_stack { node_version = "24" }
  }
  app_settings = merge(local.sanity_write_token_setting, {
    FUNCTIONS_WORKER_RUNTIME       = "node"
    SCM_DO_BUILD_DURING_DEPLOYMENT = "false"
    CONTENT_REVIEW_ENABLED         = "true"
    CONTENT_REVIEW_MODEL           = azurerm_cognitive_deployment.foundry[0].name
    AZURE_OPENAI_ENDPOINT          = azurerm_cognitive_account.foundry[0].endpoint
    CONTENT_REVIEW_QUEUE_URL       = "${azurerm_storage_account.content_review[0].primary_queue_endpoint}content-review"
    ReviewQueue__queueServiceUri   = azurerm_storage_account.content_review[0].primary_queue_endpoint
    SANITY_PROJECT_ID              = var.sanity_project_id
    SANITY_DATASET                 = var.sanity_dataset
  })
  tags = local.tags

  lifecycle {
    precondition {
      condition     = var.sanity_write_token_version > 0 && var.app_service_sku != "F1"
      error_message = "Content review requires a configured Sanity write token and an Always On App Service plan (B1 or higher)."
    }
  }
}

resource "azurerm_role_assignment" "review_worker_roles" {
  for_each = var.content_review_enabled ? {
    queue = { scope = azurerm_storage_account.content_review[0].id, role = "Storage Queue Data Contributor" }
    blob  = { scope = azurerm_storage_account.content_review[0].id, role = "Storage Blob Data Owner" }
    vault = { scope = azurerm_key_vault.main.id, role = "Key Vault Secrets User" }
    model = { scope = azurerm_cognitive_account.foundry[0].id, role = "Cognitive Services OpenAI User" }
  } : {}
  scope                = each.value.scope
  role_definition_name = each.value.role
  principal_id         = azurerm_linux_function_app.content_review[0].identity[0].principal_id
}

resource "azurerm_role_assignment" "review_web_queue" {
  count                = var.content_review_enabled ? 1 : 0
  scope                = azurerm_storage_account.content_review[0].id
  role_definition_name = "Storage Queue Data Message Sender"
  principal_id         = azurerm_linux_web_app.main.identity[0].principal_id
}

output "content_review" {
  value = var.content_review_enabled ? {
    function_app = azurerm_linux_function_app.content_review[0].name
    webhook_url  = "https://${azurerm_linux_web_app.main.default_hostname}/api/webhooks/content-review"
    queue_url    = "${azurerm_storage_account.content_review[0].primary_queue_endpoint}content-review"
  } : null
}

resource "azurerm_role_assignment" "github_review_function" {
  count                = var.content_review_enabled ? 1 : 0
  scope                = azurerm_linux_function_app.content_review[0].id
  role_definition_name = "Website Contributor"
  principal_id         = azurerm_user_assigned_identity.github_deploy.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_monitor_diagnostic_setting" "content_review" {
  count                      = var.content_review_enabled ? 1 : 0
  name                       = "to-log-analytics"
  target_resource_id         = azurerm_linux_function_app.content_review[0].id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  enabled_log {
    category = "FunctionAppLogs"
  }
}
