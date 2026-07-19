locals {
  cache_non_success_status_ttl = [
    {
      status_code_range = {
        from = 300
      }
      value = -1
    },
  ]
}

resource "cloudflare_ruleset" "cache" {
  zone_id     = var.cloudflare_zone_id
  name        = "default"
  description = ""
  kind        = "zone"
  phase       = "http_request_cache_settings"

  rules = [
    {
      action      = "set_cache_settings"
      expression  = "(http.host eq \"eons.arkham.build\")"
      description = "[CDN] eons.arkham.build bypass"
      enabled     = true
      ref         = "f30a0146eab14544a0366dafe6445d09"

      action_parameters = {
        cache = false
      }
    },
    {
      action      = "set_cache_settings"
      expression  = "(http.host eq \"cdn.arkham.build\" and not starts_with(http.request.uri.path, \"/fan_made_content\"))"
      description = "[CDN] Everything but fan-made"
      enabled     = true
      ref         = "5d406a33ecef472f809bc43ee5a3622d"

      action_parameters = {
        cache = true
        browser_ttl = {
          default = 2678400
          mode    = "override_origin"
        }
        edge_ttl = {
          default         = 2678400
          mode            = "override_origin"
          status_code_ttl = local.cache_non_success_status_ttl
        }
        respect_strong_etags = false
        serve_stale = {
          disable_stale_while_updating = false
        }
      }
    },
    {
      action      = "set_cache_settings"
      expression  = "(http.host eq \"api.arkham.build\" and starts_with(http.request.uri.path, \"/v1/cache\"))"
      description = "[API] Metadata cache"
      enabled     = true
      ref         = "92c310d0a6574ecdb9c8eaf097b801ab"

      action_parameters = {
        cache = true
        browser_ttl = {
          mode = "respect_origin"
        }
        edge_ttl = {
          mode            = "bypass_by_default"
          status_code_ttl = local.cache_non_success_status_ttl
        }
        respect_strong_etags = true
      }
    },
    {
      action      = "set_cache_settings"
      expression  = "(http.host eq \"api.arkham.build\" and http.request.uri.path eq \"/v2/public/grimoire\")"
      description = "[API] Grimoire cache"
      enabled     = true
      ref         = "752cd2903c373216ed81c802fd7170a5"

      action_parameters = {
        cache = true
        browser_ttl = {
          mode = "respect_origin"
        }
        edge_ttl = {
          mode            = "bypass_by_default"
          status_code_ttl = local.cache_non_success_status_ttl
        }
        respect_strong_etags = true
      }
    },
    {
      action      = "set_cache_settings"
      expression  = "(http.host eq \"api.arkham.build\" and starts_with(http.request.uri.path, \"/v2/public/customization-sheet\"))"
      description = "[API] Customizable sheets"
      enabled     = true
      ref         = "ae487e1cf77947dbbf73d8122b3bb6d1"

      action_parameters = {
        cache = true
        browser_ttl = {
          mode = "respect_origin"
        }
        edge_ttl = {
          mode            = "respect_origin"
          status_code_ttl = local.cache_non_success_status_ttl
        }
      }
    },
    {
      action      = "set_cache_settings"
      expression  = "(http.host eq \"api.arkham.build\" and starts_with(http.request.uri.path, \"/v2/public/preview\"))"
      description = "[API] Previews"
      enabled     = true
      ref         = "f76d299d56274755abd3e8559f323db5"

      action_parameters = {
        cache = true
        browser_ttl = {
          default = 2678400
          mode    = "override_origin"
        }
        edge_ttl = {
          default         = 2678400
          mode            = "override_origin"
          status_code_ttl = local.cache_non_success_status_ttl
        }
      }
    },
    {
      action      = "set_cache_settings"
      expression  = "   http.request.uri.path in {\"/v1/public/share/2624931\" \"/v1/public/share/2624938\" \"/v1/public/share/2624940\" \"/v1/public/share/2624944\"\n \"/v1/public/share/2624949\" \"/v1/public/share/2624950\" \"/v1/public/share/2624958\" \"/v1/public/share/2624961\" \"/v1/public/share/2624965\"\n \"/v1/public/share/2624969\" \"/v1/public/share/2624975\" \"/v1/public/share/2624979\" \"/v1/public/share/2624981\" \"/v1/public/share/2624984\"\n \"/v1/public/share/2624988\" \"/v1/public/share/2624990\" \"/v1/public/share/2624994\" \"/v1/public/share/2625000\" \"/v1/public/share/2625003\"\n \"/v1/public/share/2625005\" \"/v1/public/share/2625007\" \"/v1/public/share/2626342\" \"/v1/public/share/2626347\" \"/v1/public/share/2626365\"\n \"/v1/public/share/2626385\" \"/v1/public/share/2626387\" \"/v1/public/share/2626395\" \"/v1/public/share/2626402\" \"/v1/public/share/2626410\"\n \"/v1/public/share/2626446\" \"/v1/public/share/2626452\" \"/v1/public/share/2626461\" \"/v1/public/share/2626464\" \"/v1/public/share/2626469\"\n \"/v1/public/share/2626479\" \"/v1/public/share/2626672\" \"/v1/public/share/2626685\" \"/v1/public/share/2634588\" \"/v1/public/share/2634603\"\n \"/v1/public/share/2634643\" \"/v1/public/share/2634652\" \"/v1/public/share/2634658\" \"/v1/public/share/2634667\" \"/v1/public/share/2634675\"\n \"/v1/public/share/2634697\" \"/v1/public/share/2634701\" \"/v1/public/share/2634706\" \"/v1/public/share/2634757\" \"/v1/public/share/2636199\"\n \"/v1/public/share/2643925\" \"/v1/public/share/2643928\" \"/v1/public/share/2643931\" \"/v1/public/share/2643932\" \"/v1/public/share/2643934\"\n \"/v1/public/share/3893753\" \"/v1/public/share/3893763\" \"/v1/public/share/3893775\" \"/v1/public/share/3893779\" \"/v1/public/share/3893788\"\n \"/v1/public/share/3893795\" \"/v1/public/share/5248476\" \"/v1/public/share/5248477\" \"/v1/public/share/5248478\" \"/v1/public/share/5248479\"\n \"/v1/public/share/5248480\" \"/v1/public/share/5248481\" \"/v1/public/share/5852588\" \"/v1/public/share/5852589\" \"/v1/public/share/5852591\"\n \"/v1/public/share/5852594\" \"/v1/public/share/5852597\" \"/v1/public/share/5958363\" \"/v1/public/share/5958365\" \"/v1/public/share/5958368\"\n \"/v1/public/share/5958370\" \"/v1/public/share/5958374\"}"
      description = "[API] TTS starter decks"
      enabled     = false
      ref         = "d04c106d28934317ae20e4c932bbeb7e"

      action_parameters = {
        cache = true
        edge_ttl = {
          default         = 31536000
          mode            = "override_origin"
          status_code_ttl = local.cache_non_success_status_ttl
        }
      }
    },
    {
      action      = "set_cache_settings"
      expression  = "(http.host eq \"assets.arkham.build\" and not starts_with(http.request.uri.path, \"/fan_made_content\"))"
      description = "Cache assets.arkham.build"
      enabled     = false
      ref         = "9394c61d755f468aae23716e532fa667"

      action_parameters = {
        cache = true
        browser_ttl = {
          default = 2678400
          mode    = "override_origin"
        }
        edge_ttl = {
          default         = 2678400
          mode            = "override_origin"
          status_code_ttl = local.cache_non_success_status_ttl
        }
        respect_strong_etags = false
        serve_stale = {
          disable_stale_while_updating = false
        }
      }
    },
  ]
}
