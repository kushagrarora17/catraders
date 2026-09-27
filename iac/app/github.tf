# Passwordless deploys: GitHub Actions exchanges its OIDC token for this identity.
resource "azurerm_user_assigned_identity" "github_deploy" {
  name                = "id-${local.name}-github-deploy"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags
}

resource "azurerm_federated_identity_credential" "github_deploy" {
  name                      = "github-${var.github_environment}"
  user_assigned_identity_id = azurerm_user_assigned_identity.github_deploy.id
  issuer                    = "https://token.actions.githubusercontent.com"
  audience                  = ["api://AzureADTokenExchange"]
  # Only jobs running in this repo's GitHub environment can assume the identity. The repo uses
  # GitHub's immutable subject format (owner@id/repo@id), so a deleted and re-created repo or
  # account with the same name can't match. Check with:
  #   gh api repos/OWNER/REPO/actions/oidc/customization/sub   -> sub_claim_prefix
  subject = "repo:${local.github_owner}@${var.github_repository_owner_id}/${local.github_repo}@${var.github_repository_id}:environment:${var.github_environment}"
}

locals {
  github_owner = split("/", var.github_repository)[0]
  github_repo  = split("/", var.github_repository)[1]
}

resource "azurerm_role_assignment" "github_acr_push" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_user_assigned_identity.github_deploy.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "github_web_app" {
  scope                = azurerm_linux_web_app.main.id
  role_definition_name = "Website Contributor"
  principal_id         = azurerm_user_assigned_identity.github_deploy.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_role_assignment" "github_resource_group_reader" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.github_deploy.principal_id
  principal_type       = "ServicePrincipal"
}
