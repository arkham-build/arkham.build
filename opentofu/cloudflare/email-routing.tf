resource "cloudflare_email_routing_settings" "zone" {
  zone_id = var.cloudflare_zone_id
}

locals {
  email_routing_forwarding_rules = {
    accounts = {
      name      = ""
      recipient = "accounts@arkham.build"
    }
    info = {
      name      = ""
      recipient = "info@arkham.build"
    }
    security = {
      name      = "Rule created at 2025-03-18T21:20:31.433Z"
      recipient = "security@arkham.build"
    }
  }
}

resource "cloudflare_email_routing_rule" "forward" {
  for_each = local.email_routing_forwarding_rules

  zone_id  = var.cloudflare_zone_id
  name     = each.value.name
  enabled  = true
  priority = 0
  source   = "api"

  matchers = [{
    type  = "literal"
    field = "to"
    value = each.value.recipient
  }]

  actions = [{
    type  = "forward"
    value = [var.email_routing_destination_address]
  }]
}

resource "cloudflare_email_routing_catch_all" "zone" {
  zone_id = var.cloudflare_zone_id
  name    = ""
  enabled = false
  source  = "api"

  matchers = [{
    type = "all"
  }]

  actions = [{
    type = "drop"
  }]
}
