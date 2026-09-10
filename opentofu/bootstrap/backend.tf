terraform {
  backend "s3" {
    bucket = "arkham-build-opentofu-state"
    key    = "bootstrap/state.tfstate"
    region = "auto"

    endpoints = {
      s3 = "https://${var.cloudflare_account_id}.r2.cloudflarestorage.com"
    }

    use_lockfile   = true
    use_path_style = true

    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}
