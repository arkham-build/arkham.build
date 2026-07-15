terraform {
  required_version = "~> 1.12.4"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.22"
    }
  }

  encryption {
    key_provider "pbkdf2" "state" {
      passphrase               = var.state_encryption_passphrase
      encrypted_metadata_alias = "arkham-build-state"
    }

    method "aes_gcm" "state" {
      keys = key_provider.pbkdf2.state
    }

    state {
      method   = method.aes_gcm.state
      enforced = true
    }

    plan {
      method   = method.aes_gcm.state
      enforced = true
    }
  }
}
