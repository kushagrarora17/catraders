variable "subscription_id" {
  description = "Azure subscription to deploy into."
  type        = string
}

variable "project" {
  description = "Short project name used in resource names."
  type        = string
  default     = "catraders"

  validation {
    condition     = can(regex("^[a-z0-9]{3,10}$", var.project))
    error_message = "project must be 3-10 lowercase letters or digits."
  }
}

variable "environment" {
  description = "Environment name used in resource names (e.g. prod, staging)."
  type        = string
  default     = "prod"

  validation {
    condition     = can(regex("^[a-z0-9]{2,8}$", var.environment))
    error_message = "environment must be 2-8 lowercase letters or digits."
  }
}

variable "location" {
  description = "Azure region. PostgreSQL Flexible Server must be allowed for the subscription here."
  type        = string
  default     = "centralus"
}

variable "tags" {
  description = "Extra tags applied to every resource."
  type        = map(string)
  default     = {}
}

# ── Web app ───────────────────────────────────────────────────────────────

variable "app_service_sku" {
  description = "App Service plan SKU (B1 or higher; F1 cannot run always-on containers)."
  type        = string
  default     = "B1"
}

variable "container_image_repository" {
  description = "Repository name in ACR that CI pushes to (must match .github/workflows/azure-deploy.yml)."
  type        = string
  default     = "automotive-site"
}

variable "sanity_project_id" {
  type    = string
  default = "51ngrb7a"
}

variable "sanity_dataset" {
  type    = string
  default = "production"
}

variable "quote_notification_email" {
  description = "Internal inbox for new-RFQ notifications. Empty disables the internal email."
  type        = string
  default     = ""
}

variable "sanity_webhook_secret_version" {
  description = "Bump to generate and store a new Sanity webhook secret."
  type        = number
  default     = 1
}

# ── PostgreSQL ────────────────────────────────────────────────────────────

variable "postgres_version" {
  type    = string
  default = "17"
}

variable "postgres_sku" {
  type    = string
  default = "B_Standard_B1ms"
}

variable "postgres_storage_mb" {
  type    = number
  default = 32768
}

variable "postgres_backup_retention_days" {
  type    = number
  default = 7
}

variable "postgres_password_version" {
  description = "Bump to rotate the admin password; the server and the DATABASE_URL secret are updated together."
  type        = number
  default     = 1
}

variable "postgres_allow_azure_services" {
  description = "Allow connections from Azure services (needed by App Service without VNet integration)."
  type        = bool
  default     = true
}

variable "postgres_allowed_ip_ranges" {
  description = "Extra client IP ranges allowed through the Postgres firewall, e.g. for running migrations."
  type = map(object({
    start_ip_address = string
    end_ip_address   = string
  }))
  default = {}
}

# ── Operations / security ─────────────────────────────────────────────────

variable "email_data_location" {
  description = "Data location for Azure Communication Services."
  type        = string
  default     = "United States"
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "key_vault_purge_protection" {
  description = "Prevents permanent deletion of the vault for the retention period."
  type        = bool
  default     = true
}

# ── GitHub Actions (OIDC) ─────────────────────────────────────────────────

variable "github_repository" {
  description = "owner/repo allowed to deploy via OIDC."
  type        = string
  default     = "kushagrarora17/catraders"
}

variable "github_repository_owner_id" {
  description = "Numeric ID of the repository owner (`gh api repos/OWNER/REPO -q .owner.id`). Part of GitHub's immutable OIDC subject."
  type        = number
  default     = 18122348
}

variable "github_repository_id" {
  description = "Numeric ID of the repository (`gh api repos/OWNER/REPO -q .id`). Part of GitHub's immutable OIDC subject."
  type        = number
  default     = 1390939079
}

variable "github_environment" {
  description = "GitHub Actions environment the deploy job runs in (part of the OIDC subject)."
  type        = string
  default     = "production"
}
