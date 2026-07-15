terraform {
  backend "s3" {
    bucket = "arkham-build-opentofu-state"
    key    = "bootstrap/state.tfstate"
    region = "auto"

    endpoints = {
      s3 = "https://94e251adeda7b04912793c3f02196c23.r2.cloudflarestorage.com"
    }

    use_lockfile   = true
    use_path_style = true

    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}
