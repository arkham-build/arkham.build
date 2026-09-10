resource "cloudflare_turnstile_widget" "frontend" {
  account_id = var.cloudflare_account_id
  name       = "arkham.build"
  domains    = ["arkham.build"]
  mode       = "managed"

  bot_fight_mode  = false
  clearance_level = "interactive"
  ephemeral_id    = false
  offlabel        = false
  region          = "world"

  lifecycle {
    prevent_destroy = true
  }
}
