resource "cloudflare_r2_bucket" "opentofu_state" {
  account_id = var.cloudflare_account_id
  name       = "arkham-build-opentofu-state"
  location   = "weur"

  lifecycle {
    prevent_destroy = true
  }
}
