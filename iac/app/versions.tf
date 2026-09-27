terraform {
  # >= 1.11 for ephemeral resources and write-only arguments, which keep the
  # database password and webhook secret out of state.
  required_version = ">= 1.11"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.7"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.14"
    }
  }

  # Configured by `terraform init -backend-config=backend.hcl` (see ../bootstrap).
  backend "azurerm" {}
}

provider "azurerm" {
  features {}
  subscription_id                = var.subscription_id
  storage_use_azuread            = true
  resource_providers_to_register = ["Microsoft.Communication"]
}
