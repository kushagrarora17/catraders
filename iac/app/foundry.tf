variable "foundry_enabled" {
  description = "Provision GPT-6.1 Terra for standalone testing before enabling automatic content reviews."
  type        = bool
  default     = true
}

locals {
  foundry_enabled = var.foundry_enabled || var.content_review_enabled
}

resource "azurerm_cognitive_account" "foundry" {
  count                         = local.foundry_enabled ? 1 : 0
  name                          = "ai-${var.project}-luna-${var.environment}"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = coalesce(var.content_review_location, var.location)
  kind                          = "OpenAI"
  sku_name                      = "S0"
  custom_subdomain_name         = "ai-${var.project}-luna-${var.environment}"
  local_auth_enabled            = false
  public_network_access_enabled = true
  tags                          = local.tags
}

resource "azurerm_cognitive_deployment" "foundry" {
  lifecycle { create_before_destroy = true }
  count                = local.foundry_enabled ? 1 : 0
  name                 = "gpt-6.1-terra"
  cognitive_account_id = azurerm_cognitive_account.foundry[0].id
  model {
    format  = "OpenAI"
    name    = "gpt-6.1-terra"
    version = "2026-10-26"
  }
  sku {
    name     = "GlobalStandard"
    capacity = 1000
  }
}

resource "azurerm_role_assignment" "foundry_deployer" {
  count                = local.foundry_enabled ? 1 : 0
  scope                = azurerm_cognitive_account.foundry[0].id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = data.azurerm_client_config.current.object_id
}

output "foundry" {
  value = local.foundry_enabled ? {
    endpoint   = azurerm_cognitive_account.foundry[0].endpoint
    deployment = azurerm_cognitive_deployment.foundry[0].name
  } : null
}
