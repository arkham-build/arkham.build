locals {
  zone_text_settings = {
    always_use_https         = "on"
    automatic_https_rewrites = "on"
    brotli                   = "on"
    browser_check            = "on"
    cache_level              = "aggressive"
    cname_flattening         = "flatten_at_root"
    early_hints              = "on"
    email_obfuscation        = "off"
    http2                    = "on"
    http3                    = "on"
    ipv6                     = "on"
    min_tls_version          = "1.2"
    opportunistic_encryption = "on"
    pq_keyex                 = "on"
    rocket_loader            = "off"
    security_level           = "medium"
    ssl                      = "strict"
    tls_1_3                  = "on"
    websockets               = "on"
  }

  zone_numeric_settings = {
    browser_cache_ttl = 2678400
    challenge_ttl     = 1800
    edge_cache_ttl    = 7200
    max_upload        = 100
  }
}

resource "cloudflare_zone_setting" "text" {
  for_each = local.zone_text_settings

  zone_id    = var.cloudflare_zone_id
  setting_id = each.key
  value      = each.value
}

resource "cloudflare_zone_setting" "numeric" {
  for_each = local.zone_numeric_settings

  zone_id    = var.cloudflare_zone_id
  setting_id = each.key
  value      = each.value
}
