# Apex domain proxied by Cloudflare. TLS to the origin uses a Cloudflare Origin CA certificate
# imported into Key Vault as "cloudflare-origin" (Cloudflare SSL mode: Full (strict)).
locals {
  custom_domain_enabled = var.custom_domain != null
}

data "azurerm_key_vault_certificate" "origin" {
  count        = local.custom_domain_enabled ? 1 : 0
  name         = "cloudflare-origin"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_app_service_certificate" "origin" {
  count               = local.custom_domain_enabled ? 1 : 0
  name                = "cloudflare-origin"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  key_vault_secret_id = data.azurerm_key_vault_certificate.origin[0].versionless_secret_id
  tags                = local.tags

  depends_on = [azurerm_role_assignment.key_vault_app_service_rp]
}

resource "azurerm_app_service_custom_hostname_binding" "apex" {
  count               = local.custom_domain_enabled ? 1 : 0
  hostname            = var.custom_domain
  app_service_name    = azurerm_linux_web_app.main.name
  resource_group_name = azurerm_resource_group.main.name

  # The certificate binding below owns ssl_state and thumbprint.
  lifecycle {
    ignore_changes = [ssl_state, thumbprint]
  }
}

resource "azurerm_app_service_certificate_binding" "apex" {
  count               = local.custom_domain_enabled ? 1 : 0
  hostname_binding_id = azurerm_app_service_custom_hostname_binding.apex[0].id
  certificate_id      = azurerm_app_service_certificate.origin[0].id
  ssl_state           = "SniEnabled"
}
