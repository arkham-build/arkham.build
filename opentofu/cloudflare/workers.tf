# Wrangler owns the Worker script and bindings; OpenTofu owns its custom domain.
resource "cloudflare_workers_custom_domain" "legacy_api" {
  account_id = var.cloudflare_account_id
  zone_id    = var.cloudflare_zone_id
  zone_name  = "arkham.build"
  hostname   = "api-cf.arkham.build"
  service    = "arkham-build-api"
}
