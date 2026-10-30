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
  description = "Internal inbox for new RFQ and inquiry notifications. Empty disables the internal email."
  type        = string
  default     = ""
}

variable "sanity_webhook_secret_version" {
  description = "Bump to generate and store a new Sanity webhook secret."
  type        = number
  default     = 1
}

# ── MCP server (catalog & RFQ management) ─────────────────────────────────

variable "mcp_admin_password_version" {
  description = "Bump to generate a new MCP sign-in password (all MCP clients keep working until their refresh tokens expire)."
  type        = number
  default     = 1
}

variable "mcp_jwt_secret_version" {
  description = "Bump to generate a new MCP token-signing secret. Signs out every MCP client."
  type        = number
  default     = 1
}

variable "sanity_write_token" {
  description = "Sanity API token with Editor access (sanity.io/manage → API → Tokens); lets the MCP server edit content. Ephemeral: never stored in state, so TF_VAR_sanity_write_token must be set on every plan and apply while sanity_write_token_version is above 0 (the provider rejects a version without a value)."
  type        = string
  default     = null
  sensitive   = true
  ephemeral   = true
}

variable "sanity_write_token_version" {
  description = "0 leaves the Sanity write token unprovisioned (MCP catalog tools report an error). Set to 1, and bump to rotate, together with sanity_write_token."
  type        = number
  default     = 0
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
  description = "Bump to rotate the admin password. The server and the database-url secret (migrations) update together. The web app uses database-url-app and is not rotated by this."
  type        = number
  default     = 1
}

variable "postgres_allow_azure_services" {
  description = "Create the 0.0.0.0 firewall rule that allows every Azure service. Leave false: the web app is allowed by its possible outbound IPs instead. Turning this on admits any client hosted in Azure."
  type        = bool
  default     = false
}

variable "postgres_allowed_ip_ranges" {
  description = "Extra client IP ranges allowed through the Postgres firewall, besides the web app's possible outbound IPs. For running migrations by hand. Deploy-workflow github-runner-* rules are temporary and are not listed here."
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

variable "site_url" {
  description = "Public site URL used for canonical links and the sitemap (e.g. https://caelitelube.com). Defaults to the web app's azurewebsites.net hostname."
  type        = string
  default     = null
}

variable "custom_domain" {
  description = "Apex domain to bind to the web app (e.g. caelitelube.com). Needs the cloudflare-origin certificate in Key Vault first; see ../README.md."
  type        = string
  default     = null
}

variable "app_service_rp_object_id" {
  description = "Object ID of the Microsoft Azure App Service service principal in this tenant (az ad sp show --id abfa0a7c-a6b6-4736-8310-5855508787cd --query id -o tsv). It reads the origin certificate from Key Vault."
  type        = string
  default     = null
}
