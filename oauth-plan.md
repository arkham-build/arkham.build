# OAuth gateway v1 implementation plan

## Final decisions

- arkham.build is an OAuth 2.0 authorization-code provider for confidential server-side clients.
- OAuth routes use `/v2/oauth/*`.
- Bearer-authenticated user routes use `/v2/user/*`.
- Existing `/v2/account/*` routes remain first-party/internal.
- Every authorization requires explicit user consent. Existing grants never issue codes silently.
- Session cookies remain `SameSite=Strict`.
- Native apps are supported only when a confidential backend holds the client secret and exchanges the authorization code. Direct token exchange from an installed app is unsupported in v1.
- No public clients, PKCE, introspection, or explicit rate limits in v1.
- External OAuth and user routes use `@hono/zod-openapi`.
- Opaque authorization requests, codes, and tokens are stored as SHA-256 hashes only.
- Client secrets are shown only on creation or rotation and stored using scrypt-based secret hashing.
- User grants accumulate the union of approved scopes, while each code and token receives only the scopes approved in that authorization.

## 1. Database schema

Create a dbmate migration adding the following tables.

### `oauth_client`

- UUID `id`, also used as the public `client_id`
- `name`
- `secret_hash`
- `disabled_at`
- `created_at`
- `updated_at`

A disabled client can be re-enabled. Disabling does not revoke tokens; they become usable again if the client is re-enabled.

### `oauth_client_redirect_uri`

- `oauth_client_id`
- `redirect_uri`
- `created_at`
- unique constraint on client and URI

Require at least one URI per client at the application layer.

Redirect URI validation permits:

- HTTPS web callbacks
- HTTP loopback callbacks for local or native applications
- native-app custom schemes such as `com.example.app:/oauth/callback`

Reject:

- relative URIs
- credentials or fragments
- dangerous schemes such as `javascript`, `data`, `file`, `vbscript`, `about`, and `blob`
- non-loopback plain HTTP web callbacks

Authorization uses exact string matching without URI normalization.

For a native redirect, the native app receives the code and forwards it to its confidential backend. Only that backend stores `client_secret` and calls `/v2/oauth/token`. Supporting direct token exchange from an installed app later requires public clients and PKCE.

### `oauth_authorization_request`

- UUID `id`
- `request_token_hash`
- `oauth_client_id`
- nullable `account_id`, populated when the SPA claims the request
- `redirect_uri`
- effective requested scopes
- OAuth `state`
- `expires_at`
- `claimed_at`
- `consumed_at`
- decision
- `created_at`
- `updated_at`

Authorization requests expire after 15 minutes and are single-use.

### `oauth_grant`

- UUID `id`
- `oauth_client_id`
- `account_id`
- accumulated granted scopes
- `created_at` as the initial grant date
- `updated_at` as the latest approval date
- unique constraint on client and account

### `oauth_authorization_code`

- UUID `id`
- `oauth_grant_id`
- `code_hash`
- `redirect_uri`
- scopes for this authorization
- `expires_at`
- `used_at`
- `revoked_at`
- `created_at`
- `updated_at`

Codes expire after five minutes and can only be consumed once.

### `oauth_refresh_token`

- UUID `id`
- `oauth_grant_id`
- `token_hash`
- scopes
- `expires_at`
- `revoked_at`
- `last_used_at`
- `created_at`
- `updated_at`

Refresh expiry is fixed at 90 days and is never extended.

### `oauth_access_token`

- UUID `id`
- `oauth_grant_id`
- `oauth_refresh_token_id`
- `token_hash`
- scopes
- `expires_at`
- `revoked_at`
- `last_used_at`
- `created_at`
- `updated_at`

Access tokens expire after one hour.

Add foreign keys, cascade account and grant deletion, scope checks, unique hash constraints, and indexes for hash lookup, relationships, status, and expiry.

After applying the migration:

1. Run Kysely type generation.
2. Generate `backend/src/db/schema.sql` using dbmate dump.
3. Do not edit `schema.sql` manually.

## 2. OAuth core modules

Add OAuth-owned modules for:

- authorization request, code, and token generation and hashing
- client-secret hashing and verification
- scope parsing, expansion, ordering, and comparison
- client and redirect validation
- authorization request persistence
- code exchange
- access and refresh token issuance and revocation
- grant persistence and app-level revocation
- OAuth error classification and serialization

Raw values use 32 bytes of cryptographic randomness and these prefixes:

```txt
ab_ar_...    authorization request
ab_code_...  authorization code
ab_at_...    access token
ab_rt_...    refresh token
```

Never log raw secrets, codes, request handles, access tokens, or refresh tokens.

### Scope normalization

Supported scopes, in canonical order:

```txt
profile:read
decks:read
decks:write
decks:delete
```

Rules:

- `profile:read` must be requested.
- `decks:write` adds `decks:read`.
- `decks:delete` adds `decks:write` and `decks:read`.
- Unknown scopes produce `invalid_scope`.
- Effective scopes are deduplicated and returned as a canonical space-separated string.
- A grant stores the union of every approved scope.
- A code and its resulting tokens store only the effective scopes requested in that authorization.

Keep lifetimes as named constants and use time consistently so expiry tests can control it.

## 3. Admin OAuth client API

Add admin-key-protected routes:

```txt
POST  /admin/oauth/clients
GET   /admin/oauth/clients
GET   /admin/oauth/clients/:clientId
PATCH /admin/oauth/clients/:clientId
POST  /admin/oauth/clients/:clientId/disable
POST  /admin/oauth/clients/:clientId/enable
POST  /admin/oauth/clients/:clientId/secret/rotate
```

### Create

Request:

```json
{
  "name": "Example application",
  "redirectUris": [
    "https://example.com/oauth/callback",
    "com.example.app:/oauth/callback"
  ]
}
```

Generate the client ID and secret server-side. Return the raw secret only in the creation response.

### Update

Allow changing:

- client name
- complete redirect URI set

Redirect URI replacement is transactional. Invalidate outstanding requests and codes that use a removed URI.

### Disable and enable

- Both actions are idempotent.
- Disabled clients cannot authorize, exchange, refresh, revoke, or use bearer tokens.
- Stored tokens and grants remain unchanged.
- Re-enabling makes non-expired, non-revoked tokens usable again.

### Rotate secret

In one transaction:

- replace the secret hash
- revoke access and refresh tokens
- revoke outstanding authorization codes
- consume or invalidate outstanding authorization requests
- retain user grants

Return the new raw secret once. Admin responses must never expose hashes.

## 4. Authorization and consent flow

### Initial authorization request

Implement:

```txt
GET /v2/oauth/authorize
```

Validate:

- `response_type=code`
- active client
- exact redirect URI
- requested scopes
- bounded, non-empty `state`

Because the Strict session cookie is intentionally absent on the initial cross-site navigation, this endpoint does not decide whether the user is authenticated. It creates a short-lived authorization request and redirects to:

```txt
https://arkham.build/oauth/consent?request=ab_ar_...
```

For authorization errors:

- Never redirect when the client or redirect URI cannot be trusted.
- Return an OAuth JSON error directly in that case.
- Once the client and redirect URI are trusted, redirect errors to the client and preserve `state`.
- Build redirect responses with the URL API so HTTPS, loopback, and custom-scheme URIs all preserve their existing query parameters correctly.

### Internal consent endpoints

Add session-authenticated account routes:

```txt
POST /v2/account/oauth/authorization-requests/:token/claim
POST /v2/account/oauth/authorization-requests/:token/approve
POST /v2/account/oauth/authorization-requests/:token/deny
```

`claim` is idempotent for the same account. It binds the request to the authenticated account and returns:

```json
{
  "client": {
    "id": "...",
    "name": "Example application"
  },
  "scopes": [
    {
      "id": "profile:read",
      "description": "Read your profile"
    }
  ],
  "expiresAt": "..."
}
```

All three endpoints recheck:

- request hash, expiry, and consumption
- request ownership
- client status
- redirect URI
- account existence and ban status
- completed profile

Approval atomically:

1. locks and consumes the authorization request
2. creates or updates the union grant
3. creates a five-minute authorization code
4. redirects to the registered client URI with `code` and `state`

Denial atomically consumes the request and redirects with:

```txt
error=access_denied
state=...
```

No code is issued without the approval POST.

## 5. Frontend consent and authentication continuation

Add:

```txt
/oauth/consent
```

The page explicitly renders loading, expired or error, unauthenticated, and ready states.

Flow:

1. If unauthenticated, redirect to login with the consent URL as the local return destination.
2. Preserve that destination through email login and ArkhamDB login.
3. If the profile is incomplete, preserve it through profile completion.
4. Claim the request.
5. Display the client name and expanded requested permissions.
6. Render separate Allow and Deny buttons.
7. Submit approval or denial only in the corresponding click handler.

Update the existing ArkhamDB login flow so its signed OAuth state can carry a validated frontend return path. Update login and profile-completion pages to navigate back to that path.

Protect the consent page against clickjacking:

```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

The session cookie remains explicitly:

```txt
HttpOnly
Secure in production
SameSite=Strict
Path=/
```

## 6. Token endpoint

Implement:

```txt
POST /v2/oauth/token
Content-Type: application/x-www-form-urlencoded
```

Only accept client credentials in the form body.

### Authorization-code grant

Fields:

```txt
grant_type=authorization_code
client_id=...
client_secret=...
code=ab_code_...
redirect_uri=...
```

Atomically:

- authenticate the active client
- find and consume the unexpired code
- verify client, grant, and exact redirect URI
- create a 90-day refresh token
- create a one-hour access token

Response:

```json
{
  "token_type": "Bearer",
  "access_token": "ab_at_...",
  "expires_in": 3600,
  "refresh_token": "ab_rt_...",
  "scope": "profile:read decks:read"
}
```

### Refresh-token grant

Fields:

```txt
grant_type=refresh_token
client_id=...
client_secret=...
refresh_token=ab_rt_...
```

- Authenticate the active client.
- Verify the refresh token, grant, account, expiry, and revocation state.
- Issue a new access token.
- Do not rotate or extend the refresh token.
- Echo the submitted refresh token in the response.
- Do not permit scope expansion or narrowing during refresh.

Ensure concurrent or replayed code exchanges cannot both succeed.

## 7. Revoke endpoint

Implement:

```txt
POST /v2/oauth/revoke
Content-Type: application/x-www-form-urlencoded
```

Fields:

```txt
client_id
client_secret
token
token_type_hint
```

Behavior:

- Bad client credentials return `401 invalid_client`.
- Unknown tokens and tokens belonging to another client return `200`.
- Revoking an access token revokes only that access token.
- Revoking a refresh token revokes it and all access tokens issued from it.
- Repeated revocation is idempotent.
- Return an empty successful response.

## 8. OAuth response handling

Use OAuth error bodies for `/v2/oauth/*`:

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code is invalid or expired"
}
```

Support the relevant errors:

- `invalid_request`
- `invalid_client`
- `invalid_grant`
- `invalid_scope`
- `unauthorized_client`
- `unsupported_grant_type`
- `access_denied`

Token and revoke responses include:

```http
Cache-Control: no-store
Pragma: no-cache
```

Bad client authentication uses status `401`; malformed grants generally use `400`.

## 9. Bearer authentication middleware

Add OAuth bearer context to `HonoEnv` and implement middleware that:

1. extracts the Authorization bearer token
2. hashes it
3. loads the access token and grant
4. verifies expiry and revocation
5. verifies the client is active
6. verifies the account exists
7. verifies the account is not banned
8. verifies required scopes
9. updates `last_used_at`
10. exposes the authenticated account, client, token, and scopes

Use:

- `401` for missing, malformed, unknown, expired, or unusable tokens
- `403` for insufficient scope or a banned account
- `WWW-Authenticate: Bearer` where applicable

User API errors use a stable simple JSON shape:

```json
{
  "error": "insufficient_scope",
  "message": "This endpoint requires decks:write"
}
```

Generalize the ArkhamDB user-service context so it can operate with either first-party session authentication or OAuth bearer authentication without pretending an OAuth request has a session.

## 10. User profile API

Implement:

```txt
GET /v2/user/me
```

Require `profile:read`.

Response:

```json
{
  "id": "stable-account-uuid",
  "username": "user-name"
}
```

Do not expose email or linked identities.

## 11. External deck API

Define dedicated external request and response schemas without changing the existing first-party deck contracts.

### Manifest

```txt
GET /v2/user/decks/manifest
GET /v2/user/decks/manifest?source=account
GET /v2/user/decks/manifest?source=arkhamdb
```

Require `decks:read`.

Return both provider states and use `source` in deck entries:

```json
{
  "version": "...",
  "providers": {
    "account": { "available": true },
    "arkhamdb": { "available": false }
  },
  "decks": [
    {
      "source": "account",
      "id": "abc",
      "updatedAt": "...",
      "version": "0.2"
    }
  ]
}
```

The manifest version hashes a deterministic ordering of source, ID, version, and updated timestamp.

If ArkhamDB is unavailable:

- retain account results
- report ArkhamDB unavailable
- omit ArkhamDB decks
- still return `200`

### Batch

```txt
POST /v2/user/decks/batch
```

Require `decks:read`.

Request:

```json
{
  "decks": [
    { "source": "account", "id": "abc" },
    { "source": "arkhamdb", "id": 123 }
  ]
}
```

Limit the request to 250 targets. Preserve request order.

Response:

```json
{
  "decks": []
}
```

Fail the entire request if any target is missing or unavailable.

### Single deck

```txt
GET /v2/user/decks/:source/:id
```

Require `decks:read`. Validate account IDs as bounded strings and ArkhamDB IDs as positive integers.

### Writes

```txt
POST   /v2/user/decks/:source
PUT    /v2/user/decks/:source/:id
DELETE /v2/user/decks/:source/:id
POST   /v2/user/decks/:source/:id/upgrade
```

Require:

- `decks:write` for create, update, and upgrade
- `decks:delete` for delete

Create, update, and upgrade accept a full `DeckSchema`. Ignore these server-owned fields:

- `id`
- `source`
- `user_id`
- `date_creation`
- `date_update`
- `version`
- `previous_deck`
- `next_deck`

For account decks:

- create generates a UUID, timestamps, `version = "0.1"`, and empty history links
- update locks the current row, fully replaces mutable content, preserves server fields and links, increments the current version, and updates the timestamp
- upgrade locks the current row, rejects an existing upgrade, creates a UUID child deck with `version = "0.1"`, and updates the parent link and version atomically
- delete uses the existing history semantics; `?all=true` deletes the selected deck and its previous chain

For ArkhamDB:

- ignore the supplied ID on creation
- use the route ID for update, delete, and upgrade
- keep the current ArkhamDB mapping, hidden-slot, metadata, snapshot, and XP behavior
- take returned IDs, timestamps, versions, and links from ArkhamDB

Use `201` for create and upgrade, `200` for reads and update, and `204` for delete.

Use:

- `400` for invalid source, filter, identifier, or input
- `404` for a missing deck
- `409` for invalid history transitions
- `503` for an unavailable ArkhamDB connection or upstream

After deployment, verify through Cloudflare that a real unavailable-ArkhamDB request preserves the JSON `503` response. Use `500` instead only if Cloudflare demonstrably replaces it.

Refactor the current deck route implementation into shared account and ArkhamDB service operations rather than duplicating the existing logic.

## 12. Connected apps account API and UI

Add internal session-authenticated routes:

```txt
GET    /v2/account/oauth/grants
DELETE /v2/account/oauth/grants/:clientId
```

The list response includes:

- client ID
- client name
- active or disabled status
- accumulated scopes
- initial grant date
- latest authorization date

App-level revocation runs transactionally and deletes:

- the grant
- access tokens
- refresh tokens
- authorization codes
- claimed pending authorization requests for that account and client

Unclaimed requests may expire normally but can never complete without new explicit consent.

Add a Connected Apps section to the account settings tab with:

- loading, empty, error, and ready states
- disabled status
- translated scope labels
- grant date
- revoke confirmation and mutation feedback

Do not expose individual tokens or sessions.

## 13. OpenAPI and documentation

Add `@hono/zod-openapi` to the backend and define the external OAuth and user routes with `OpenAPIHono` and `createRoute`.

Document:

- form bodies and OAuth errors
- redirect responses, including custom-scheme native redirects
- confidential client authentication and the native-backend restriction
- bearer security
- scope requirements
- source-specific deck IDs
- all request and response schemas and statuses

Add a deterministic generation script and checked-in output:

```txt
docs/openapi/oauth-user-api.json
```

Add stable handwritten documentation covering:

- authorization and explicit consent flow
- client authentication
- native-app redirect architecture
- scopes and implications
- code exchange
- refresh behavior
- revocation behavior
- `/v2/user/me`
- every deck endpoint
- account and ArkhamDB availability behavior
- cURL examples

Do not manually edit the generated OpenAPI JSON.

## 14. Tests and completion checks

Add backend integration coverage for:

- client creation, redirect validation, custom-scheme redirects, disable, enable, update, and rotation
- secret and token hashes never storing raw values
- authorization validation and safe error redirects
- Strict-cookie consent handoff
- login and profile-completion continuation
- mandatory approval on every authorization
- denial and `access_denied`
- scope expansion and grant union
- code expiry, single use, redirect binding, and concurrent exchange
- access and refresh expiry
- fixed non-rotating refresh behavior and echoed refresh token
- access-token and refresh-family revocation
- app-level grant revocation
- disabled and banned account or client behavior
- bearer scope enforcement
- profile response
- account and ArkhamDB deck read, write, delete, and upgrade behavior
- whole-batch failure
- ArkhamDB partial manifest behavior
- OpenAPI containing every external route

Add full-stack Playwright coverage for:

1. third-party authorization redirect
2. login continuation
3. profile completion when required
4. consent rendering
5. approval callback with code and state
6. native custom-scheme callback construction at the backend integration boundary
7. denial callback
8. repeated authorization still requiring another click
9. connected-app listing and revocation
10. anti-framing headers

Run formatting, linting, TypeScript checks, backend and frontend tests, and full-stack tests before considering the implementation complete.
