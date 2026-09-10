locals {
  r2_buckets = {
    application = {
      name         = "arkham-build"
      jurisdiction = "default"
    }
    database_backups = {
      name         = "api-arkham-build-backups"
      jurisdiction = "eu"
    }
    souvenirs = {
      name         = "arkham-build-souvenirs"
      jurisdiction = "default"
    }
    strange_eons = {
      name         = "arkham-build-se"
      jurisdiction = "default"
    }
  }
}

resource "cloudflare_r2_bucket" "project" {
  for_each = local.r2_buckets

  account_id    = var.cloudflare_account_id
  name          = each.value.name
  jurisdiction  = each.value.jurisdiction
  storage_class = "Standard"

  lifecycle {
    prevent_destroy = true
  }
}
