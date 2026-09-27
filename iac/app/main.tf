data "azurerm_client_config" "current" {}

# Suffix for globally unique names (ACR, Key Vault, web app, Postgres, ACS).
resource "random_string" "suffix" {
  length  = 4
  upper   = false
  special = false
}

locals {
  name    = "${var.project}-${var.environment}"
  compact = "${var.project}${var.environment}"
  suffix  = random_string.suffix.result

  tags = merge({
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
    repository  = var.github_repository
  }, var.tags)
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name}"
  location = var.location
  tags     = local.tags
}

resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${local.name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days
  tags                = local.tags
}
