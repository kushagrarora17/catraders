resource "azurerm_container_registry" "main" {
  name                = "acr${local.compact}${local.suffix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  # Pushes use the GitHub OIDC identity, pulls use the web app's managed identity.
  admin_enabled = false
  tags          = local.tags
}

resource "azurerm_role_assignment" "web_app_acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.main.identity[0].principal_id
  principal_type       = "ServicePrincipal"
}
