resource "cloudflare_dns_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api.arkham.build"
  content = "159.195.14.203"
  type    = "A"
  proxied = true
  ttl     = 1
  tags    = []
}

resource "cloudflare_dns_record" "frontend" {
  zone_id = var.cloudflare_zone_id
  name    = "arkham.build"
  content = "arkham-build-prod.pages.dev"
  type    = "CNAME"
  proxied = true
  ttl     = 1
  tags    = []

  settings = {
    flatten_cname = false
    ipv4_only     = false
    ipv6_only     = false
  }
}

resource "cloudflare_dns_record" "scaleway_dkim" {
  zone_id = var.cloudflare_zone_id
  name    = "a46b05be-6d9b-41e9-b899-248a283462f3._domainkey.arkham.build"
  content = "\"v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzV9cS2MW40iGpvUpmZDWlfWRTz0sGmEJKcVczmZFfRqK/xBpZmmWUmRsp4526LZTLnUicXkneOe2cmihM6hkgU9Osedo9ghJKNyhSYxxXDjGsdnshIbHVpj+6AEsFykBMH5gCtYVfBJyd59JnjoVWZ4TOFeluHNx0OlzInQoqHCH7rpFmcGE1y0\" \"ckONca480h79ETcILso5dKk5DcL8YxyNiTsVZ//HAGDerP9bARAnAOtQmg95qOHUBEaf4MvgMQd0zfcUgWOBMkVvh/wMNC61idBGjjmGjrskM1AtunsGlJX7co/tMjBDM1eFZKu93Uh8mwpsaLKOgYVx1HHsnkQIDAQAB\""
  type    = "TXT"
  proxied = false
  ttl     = 1
  comment = "Scaleway TEM DKIM"
  tags    = []
}

resource "cloudflare_dns_record" "spf" {
  zone_id = var.cloudflare_zone_id
  name    = "arkham.build"
  content = "\"v=spf1 include:_spf.mx.cloudflare.net include:_spf.tem.scaleway.com ~all\""
  type    = "TXT"
  proxied = false
  ttl     = 1
  comment = "Scaleway TEM SPF"
  tags    = []
}

resource "cloudflare_dns_record" "google_site_verification" {
  zone_id = var.cloudflare_zone_id
  name    = "arkham.build"
  content = "\"google-site-verification=QwNE0YQY6RRcRxemeNMC5joBq63LKR-lj2LS_SViIL8\""
  type    = "TXT"
  proxied = false
  ttl     = 3600
  tags    = []
}

resource "cloudflare_dns_record" "dmarc" {
  zone_id = var.cloudflare_zone_id
  name    = "_dmarc.arkham.build"
  content = "\"v=DMARC1; p=quarantine; rua=mailto:d00fb0acbeb542aa88a6fcab4d71686b@dmarc-reports.cloudflare.net;\""
  type    = "TXT"
  proxied = false
  ttl     = 1
  tags    = []
}
