# The Wrangler-managed arkham-build-api Worker binds this database as DATABASE.
resource "cloudflare_d1_database" "legacy_api" {
  account_id = var.cloudflare_account_id
  name       = "DATABASE"

  read_replication = {
    mode = "disabled"
  }

  lifecycle {
    prevent_destroy = true
  }
}
