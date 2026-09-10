resource "cloudflare_bot_management" "zone" {
  zone_id = var.cloudflare_zone_id

  ai_bots_protection              = "block"
  content_bots_protection         = "disabled"
  crawler_protection              = "disabled"
  enable_js                       = false
  is_robots_txt_managed           = true
  optimize_wordpress              = false
  sbfm_definitely_automated       = "allow"
  sbfm_static_resource_protection = false
  sbfm_verified_bots              = "allow"
  suppress_session_score          = false
}
