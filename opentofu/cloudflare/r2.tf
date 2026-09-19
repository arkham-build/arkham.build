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
    guides = {
      name         = "arkham-build-guides"
      jurisdiction = "default"
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

resource "cloudflare_r2_managed_domain" "guides" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.project["guides"].name
  enabled     = false
}

resource "cloudflare_r2_bucket_cors" "guides" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.project["guides"].name
  rules = [{
    id = "Arkham Build read access"
    allowed = {
      methods = ["GET", "HEAD"]
      origins = [
        "https://arkham.build",
        "https://*.arkham-build-prod.pages.dev",
        "http://localhost:3000",
      ]
    }
  }]
}

resource "cloudflare_r2_custom_domain" "guides" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.project["guides"].name
  domain      = "guides.arkham.build"
  enabled     = true
  zone_id     = var.cloudflare_zone_id
}
