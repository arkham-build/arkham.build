resource "cloudflare_ruleset" "rate_limiting" {
  zone_id     = var.cloudflare_zone_id
  name        = "default"
  description = ""
  kind        = "zone"
  phase       = "http_ratelimit"

  rules = [
    {
      action      = "block"
      expression  = "(http.host eq \"api.arkham.build\" and (starts_with(http.request.uri.path, \"/v1/public\") or starts_with(http.request.uri.path, \"/v2/public\") or (http.request.method eq \"POST\" and http.request.uri.path in {\"/v2/oauth/token\" \"/v2/oauth/revoke\"})))"
      description = "Default public and server OAuth rate limit"
      enabled     = true
      ref         = "ddf302a7b2d94ced9c4ec807aa65da5e"

      action_parameters = {
        response = {
          content      = "{ \"message\": \"rate_limit_exceeded\" }"
          content_type = "application/json"
          status_code  = 429
        }
      }

      ratelimit = {
        characteristics     = ["ip.src", "cf.colo.id"]
        mitigation_timeout  = 60
        period              = 60
        requests_per_period = 50
        requests_to_origin  = false
      }
    },
    {
      action      = "block"
      expression  = "(http.host eq \"api.arkham.build\" and ((http.request.method eq \"POST\" and starts_with(http.request.uri.path, \"/v2/account/auth/\")) or (http.request.method in {\"GET\" \"HEAD\"} and http.request.uri.path eq \"/v2/oauth/authorize\")))"
      description = "Rate limit authentication and OAuth"
      enabled     = true
      ref         = "97036468535242ba95d423826fa4e508"

      action_parameters = {
        response = {
          content      = "{ \"message\": \"Rate Limit Exceeded\" }"
          content_type = "application/json"
          status_code  = 429
        }
      }

      ratelimit = {
        characteristics     = ["ip.src", "cf.colo.id"]
        mitigation_timeout  = 60
        period              = 60
        requests_per_period = 10
        requests_to_origin  = false
      }
    },
  ]
}
