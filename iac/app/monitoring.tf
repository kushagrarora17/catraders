variable "runtime_alerts_enabled" {
  description = "Enable production availability probes and runtime alerts after confirming the private owner destination."
  type        = bool
  default     = false
}

variable "runtime_alert_email" {
  description = "Private owner incident inbox. Supply through TF_VAR_runtime_alert_email; never put it in public incident content. Stored by Azure and in restricted Terraform state."
  type        = string
  sensitive   = true
  default     = ""
}

variable "runtime_studio_probe_url" {
  type    = string
  default = "https://sanity.caelitelube.com/structure"
  validation {
    condition     = can(regex("^https://[^/?#]+/[^?#]*$", var.runtime_studio_probe_url))
    error_message = "Use a public HTTPS Studio path without query strings or fragments."
  }
}

resource "azurerm_monitor_action_group" "runtime" {
  count               = var.runtime_alerts_enabled ? 1 : 0
  name                = "${local.name}-runtime-owner"
  resource_group_name = azurerm_resource_group.main.name
  short_name          = "runtime"
  email_receiver {
    name                    = "production-owner"
    email_address           = var.runtime_alert_email
    use_common_alert_schema = true
  }
  lifecycle {
    precondition {
      condition     = can(regex("^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$", var.runtime_alert_email))
      error_message = "Confirm and supply the owner's private incident email before enabling runtime alerts."
    }
  }
  tags = local.tags
}

resource "azurerm_application_insights" "availability" {
  count               = var.runtime_alerts_enabled ? 1 : 0
  name                = "ai-${local.name}-availability"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  tags                = local.tags
}

resource "azurerm_application_insights_standard_web_test" "runtime" {
  for_each = var.runtime_alerts_enabled ? {
    web    = "${trimsuffix(local.site_url, "/")}/api/health"
    studio = var.runtime_studio_probe_url
  } : {}
  name                    = "${local.name}-${each.key}-availability"
  resource_group_name     = azurerm_resource_group.main.name
  location                = azurerm_resource_group.main.location
  application_insights_id = azurerm_application_insights.availability[0].id
  geo_locations           = ["us-va-ash-azr", "us-ca-sjc-azr", "emea-nl-ams-azr"]
  frequency               = 300
  timeout                 = 30
  enabled                 = true
  retry_enabled           = true
  request {
    url = each.value
  }
  validation_rules {
    expected_status_code        = 200
    ssl_check_enabled           = true
    ssl_cert_remaining_lifetime = 7
  }
  tags = local.tags
}

resource "azurerm_monitor_metric_alert" "availability" {
  for_each            = azurerm_application_insights_standard_web_test.runtime
  name                = "${local.name}-runtime-${each.key}-availability"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [each.value.id, azurerm_application_insights.availability[0].id]
  description         = "Public component availability failed in at least two locations. Owner must verify affected capabilities."
  severity            = 1
  frequency           = "PT1M"
  window_size         = "PT5M"
  application_insights_web_test_location_availability_criteria {
    web_test_id           = each.value.id
    component_id          = azurerm_application_insights.availability[0].id
    failed_location_count = 2
  }
  action {
    action_group_id = azurerm_monitor_action_group.runtime[0].id
  }
  tags = local.tags
}

locals {
  runtime_metrics = {
    web-http5xx = {
      scope       = azurerm_linux_web_app.main.id, namespace = "Microsoft.Web/sites", metric = "Http5xx"
      aggregation = "Total", operator = "GreaterThanOrEqual", threshold = 3, severity = 2
    }
    database-availability = {
      scope       = azurerm_postgresql_flexible_server.main.id, namespace = "Microsoft.DBforPostgreSQL/flexibleServers", metric = "is_db_alive"
      aggregation = "Maximum", operator = "LessThan", threshold = 1, severity = 1
    }
    database-storage = {
      scope       = azurerm_postgresql_flexible_server.main.id, namespace = "Microsoft.DBforPostgreSQL/flexibleServers", metric = "storage_percent"
      aggregation = "Average", operator = "GreaterThanOrEqual", threshold = 85, severity = 2
    }
  }
}

resource "azurerm_monitor_metric_alert" "runtime" {
  for_each            = var.runtime_alerts_enabled ? local.runtime_metrics : {}
  name                = "${local.name}-runtime-${each.key}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [each.value.scope]
  description         = "Production capability needs owner triage. Follow the recovery guide; do not include customer data in incidents."
  severity            = each.value.severity
  frequency           = "PT1M"
  window_size         = "PT5M"
  criteria {
    metric_namespace = each.value.namespace
    metric_name      = each.value.metric
    aggregation      = each.value.aggregation
    operator         = each.value.operator
    threshold        = each.value.threshold
  }
  action {
    action_group_id = azurerm_monitor_action_group.runtime[0].id
  }
  tags = local.tags
}
