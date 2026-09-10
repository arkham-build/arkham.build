# OpenTofu

OpenTofu manages Cloudflare and GitHub infrastructure. Each stack has independent state in the `arkham-build-opentofu-state` R2 bucket at `<stack>/state.tfstate`.

## Setup

Install OpenTofu 1.12, the 1Password CLI, and the AWS CLI. Then:

```sh
cp opentofu/bootstrap/.env.example opentofu/bootstrap/.env.op
./bin/tofu bootstrap init
```

`.env.example` documents the required credentials and scopes. Never commit `.env.op`, state, plans, `.tfvars`, or `.terraform/`. Commit `.terraform.lock.hcl`.

## Usage

Always use the wrapper:

```sh
./bin/tofu bootstrap fmt
./bin/tofu bootstrap validate
./bin/tofu bootstrap plan
./bin/tofu bootstrap apply
```

State and plans are encrypted. Losing `TF_VAR_state_encryption_passphrase` makes them unrecoverable. R2 lock files prevent concurrent changes.

Because R2 has no object versioning, the wrapper backs up state before mutating commands. Create an additional backup with:

```sh
./bin/tofu bootstrap backup
```

Backups are retained under `history/<stack>/`. To recover, download and inspect a history object with `tofu show`, stop all other OpenTofu operations, then restore it with `./bin/tofu <stack> state push <file>`.

Do not use `tofu state pull` for backups because it outputs decrypted state. Investigate lineage or serial errors before considering `state push -force`.
