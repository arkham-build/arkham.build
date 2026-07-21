# OAuth database schema

```mermaid
erDiagram
  ACCOUNT o|--o{ OAUTH_AUTHORIZATION_REQUEST : claims
  ACCOUNT ||--o{ OAUTH_GRANT : authorizes

  OAUTH_CLIENT ||--o{ OAUTH_CLIENT_REDIRECT_URI : registers
  OAUTH_CLIENT ||--o{ OAUTH_AUTHORIZATION_REQUEST : receives
  OAUTH_CLIENT ||--o{ OAUTH_GRANT : receives

  OAUTH_GRANT ||--o{ OAUTH_AUTHORIZATION_CODE : issues
  OAUTH_GRANT ||--o{ OAUTH_REFRESH_TOKEN : issues
  OAUTH_GRANT ||--o{ OAUTH_ACCESS_TOKEN : issues
  OAUTH_REFRESH_TOKEN ||--o{ OAUTH_ACCESS_TOKEN : issues

  ACCOUNT {
    uuid id PK
  }

  OAUTH_CLIENT {
    uuid id PK "public client_id"
    text name
    text secret_hash
    timestamp disabled_at "nullable"
    timestamp created_at
    timestamp updated_at
  }

  OAUTH_CLIENT_REDIRECT_URI {
    uuid oauth_client_id PK, FK
    text redirect_uri PK
    timestamp created_at
  }

  OAUTH_AUTHORIZATION_REQUEST {
    uuid id PK
    text request_token_hash UK
    uuid oauth_client_id FK
    uuid account_id FK "nullable until claimed"
    text redirect_uri
    oauth_scopes scopes
    text state
    timestamp expires_at
    timestamp claimed_at "nullable"
    timestamp consumed_at "nullable"
    oauth_authorization_decision decision "nullable"
    timestamp created_at
    timestamp updated_at
  }

  OAUTH_GRANT {
    uuid id PK
    uuid oauth_client_id FK "unique with account_id"
    uuid account_id FK "unique with oauth_client_id"
    oauth_scopes scopes "accumulated union"
    timestamp created_at "initial grant"
    timestamp updated_at "latest approval"
  }

  OAUTH_AUTHORIZATION_CODE {
    uuid id PK
    uuid oauth_grant_id FK
    text code_hash UK
    text redirect_uri
    oauth_scopes scopes
    timestamp expires_at
    timestamp used_at "nullable"
    timestamp revoked_at "nullable"
    timestamp created_at
    timestamp updated_at
  }

  OAUTH_REFRESH_TOKEN {
    uuid id PK
    uuid oauth_grant_id FK
    text token_hash UK
    oauth_scopes scopes
    timestamp expires_at
    timestamp revoked_at "nullable"
    timestamp last_used_at "nullable"
    timestamp created_at
    timestamp updated_at
  }

  OAUTH_ACCESS_TOKEN {
    uuid id PK
    uuid oauth_grant_id FK
    uuid oauth_refresh_token_id FK
    text token_hash UK
    oauth_scopes scopes
    timestamp expires_at
    timestamp revoked_at "nullable"
    timestamp last_used_at "nullable"
    timestamp created_at
    timestamp updated_at
  }
```

Each authorization request belongs to exactly one client but may be unclaimed, so
its account relationship is optional. Every grant belongs to one client and one
account. Authorization codes and tokens inherit that association through their
grant. An access token must reference a refresh token belonging to the same
grant.

Redirect URIs are copied onto authorization requests and codes rather than
foreign-keyed to the registration row. This retains authorization history and
allows a removed URI's outstanding requests and codes to be invalidated without
deleting consumed records.

The `oauth_scopes` domain stores a text array so PostgreSQL clients parse it as
an array. Its check uses the `oauth_scope` enum as the centralized list of
supported values and requires `profile:read`.

The database permits zero redirect URIs during a transaction; the application
requires at least one URI per client. The existing `oauth_token` table stores
ArkhamDB identity credentials and is unrelated to these OAuth gateway tables.
