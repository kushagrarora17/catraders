resource "azurerm_email_communication_service" "main" {
  name                = "ecs-${local.name}"
  resource_group_name = azurerm_resource_group.main.name
  data_location       = var.email_data_location
  tags                = local.tags
}

# Azure-managed sender domain (xxxx.azurecomm.net). Swap for a custom domain
# (domain_management = "CustomerManaged") once DNS verification is set up.
resource "azurerm_email_communication_service_domain" "azure_managed" {
  name              = "AzureManagedDomain"
  email_service_id  = azurerm_email_communication_service.main.id
  domain_management = "AzureManaged"
  tags              = local.tags
}

resource "azurerm_communication_service" "main" {
  name                = "acs-${local.name}-${local.suffix}"
  resource_group_name = azurerm_resource_group.main.name
  data_location       = var.email_data_location
  tags                = local.tags
}

resource "azurerm_communication_service_email_domain_association" "main" {
  communication_service_id = azurerm_communication_service.main.id
  email_service_domain_id  = azurerm_email_communication_service_domain.azure_managed.id
}

locals {
  email_sender_address = "DoNotReply@${azurerm_email_communication_service_domain.azure_managed.from_sender_domain}"
}
