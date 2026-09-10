variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account containing the OpenTofu state bucket."

  validation {
    condition     = can(regex("^[0-9a-f]{32}$", var.cloudflare_account_id))
    error_message = "The Cloudflare account ID must be 32 lowercase hexadecimal characters."
  }
}

variable "state_encryption_passphrase" {
  type        = string
  description = "Passphrase used to encrypt OpenTofu state and saved plans."
  sensitive   = true

  validation {
    condition     = length(var.state_encryption_passphrase) >= 32
    error_message = "The state encryption passphrase must contain at least 32 characters."
  }
}
