# OAuth gateway v1 implementation plan

## Final decisions

- arkham.build is an OAuth 2.0 authorization-code provider for confidential server-side clients.
- OAuth routes use `/v2/oauth/*`.
- Bearer-authenticated user routes use `/v2/user/*`.
- Existing `/v2/account/*` routes remain first-party/internal.
- Every authorization requires explicit user consent. Existing grants never issue codes silently.
- Session cookies remain `SameSite=Strict`.
- Native apps are supported only when a confidential backend holds the client secret and exchanges the authorization code. Direct token exchange from an installed app is unsupported in v1.
- No public clients, PKCE, introspection, or explicit rate limits are included in v1.
- External OAuth and user routes use plain Hono with feature-owned Zod schemas and OAuth-specific boundary validation. OpenAPI 3.1 is generated offline from those schemas and detached endpoint metadata; OpenAPI tooling is not part of runtime request handling.
- Opaque authorization requests, codes, and tokens are stored as SHA-256 hashes only.
- Refresh exchanges rotate the submitted token with a new 90-day lifetime. Just-rotated tokens have a non-extending one-minute retry grace period.
- Client secrets are shown only on creation or rotation and stored using scrypt-based secret hashing.
- User grants accumulate the union of approved scopes, while each code and token receives only the scopes approved in that authorization.

## Delivery approach

Implement the gateway as vertical, testable increments. Do not create a separate phase for speculative shared OAuth modules. Add feature-owned helpers for cryptography, scope handling, persistence, validation, and errors in the first phase that uses them; extract shared APIs only when a later phase has a concrete reuse case.

Each phase below ends with a user-visible behavior or a verifiable repository artifact. Complete its listed integration or browser tests before starting the next dependent phase. Never log raw client secrets, authorization-request handles, authorization codes, access tokens, or refresh tokens.

External request and response schemas live in feature-owned DTO modules and are reused by runtime validation, response serialization, tests, and offline documentation generation. The OpenAPI generator imports DTOs, not route handlers. Convert only representable boundary schemas with Zod's JSON Schema support; runtime-only transforms remain outside the generated contract.

## Phase 1 — Install the OAuth persistence model - DONE

### Implementation

Create a dbmate migration with the following tables.

#### `oauth_client`

- UUID `id`, also used as the public `client_id`
- `name`
- `secret_hash`
- `disabled_at`
- `created_at`
- `updated_at`

A disabled client can be re-enabled. Disabling does not revoke tokens; they become usable again if the client is re-enabled.

#### `oauth_client_redirect_uri`

- `oauth_client_id`
- `redirect_uri`
- `created_at`
- unique constraint on client and URI

Require at least one URI per client at the application layer.

#### `oauth_authorization_request`

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

#### `oauth_grant`

- UUID `id`
- `oauth_client_id`
- `account_id`
- accumulated granted scopes
- `created_at` as the initial grant date
- `updated_at` as the latest approval date
- unique constraint on client and account

#### `oauth_authorization_code`

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

Codes expire after five minutes and can be consumed only once.

#### `oauth_refresh_token`

- UUID `id`
- `oauth_grant_id`
- `token_hash`
- scopes
- `expires_at`
- `revoked_at`
- `last_used_at`
- `rotated_at`
- `created_at`
- `updated_at`

Each refresh token expires 90 days after issuance. Refresh exchanges rotate the submitted token and give the replacement a new 90-day lifetime.

#### `oauth_access_token`

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

Add foreign keys, cascade account and grant deletion, scope checks, unique hash constraints, and indexes that support hash lookup, relationship traversal, status checks, and expiry cleanup. Keep migrations explicit and reversible where practical.

After applying the migration:

1. Run Kysely type generation.
2. Generate `backend/src/db/schema.sql` using dbmate dump.
3. Do not edit `schema.sql` manually.
4. Add a migration test that proves the constraints and cascade behavior.

**Deliverable:** a migrated test database, generated Kysely types, and generated `backend/src/db/schema.sql` containing the complete OAuth persistence model.

## Phase 2 — Deliver administrable confidential clients - DONE

### Implementation

Add only the client-owned functionality needed by this phase:

- server-side client ID and secret generation
- scrypt-based client-secret hashing and verification
- redirect URI parsing and validation
- transactional client and redirect-URI persistence

Redirect URI validation permits:

- HTTPS web callbacks
- HTTP loopback callbacks for local or native applications
- native-app custom schemes such as `com.example.app:/oauth/callback`

Reject:

- relative URIs
- credentials or fragments
- dangerous schemes such as `javascript`, `data`, `file`, `vbscript`, `about`, and `blob`
- non-loopback plain HTTP web callbacks

Store redirect URIs as supplied and use exact string matching without URI normalization. For a native redirect, the native app receives the code and forwards it to its confidential backend. Only that backend stores `client_secret` and calls `/v2/oauth/token`.

Add these admin-key-protected routes:

```txt
POST  /admin/oauth/clients
GET   /admin/oauth/clients
GET   /admin/oauth/clients/:clientId
PATCH /admin/oauth/clients/:clientId
POST  /admin/oauth/clients/:clientId/disable
POST  /admin/oauth/clients/:clientId/enable
POST  /admin/oauth/clients/:clientId/secret/rotate
```

Creation accepts:

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

`PATCH` can change the client name or replace the complete redirect URI set. Perform redirect replacement transactionally and invalidate outstanding authorization requests and codes that use a removed URI.

Disable and enable are idempotent. A disabled client cannot authorize, exchange, refresh, revoke, or use bearer tokens. Disabling leaves grants and tokens unchanged so that re-enabling restores any otherwise usable token.

Secret rotation runs in one transaction:

1. Replace the secret hash.
2. Revoke access and refresh tokens.
3. Revoke outstanding authorization codes.
4. Consume or invalidate outstanding authorization requests.
5. Retain user grants.

Return the new raw secret once. Admin responses must never expose secret or token hashes.

### Completion checks

Add admin API integration tests for creation, list, get, redirect validation, custom schemes, complete redirect replacement, disable, enable, and secret rotation. Seed dependent OAuth rows to verify update and rotation invalidation even though their public flows are delivered later. Assert that neither raw secrets nor hashes leak through list, get, update, logs, or error responses.

**Deliverable:** an administrator can create and fully manage a confidential OAuth client, copy its secret once, and safely register HTTPS, loopback, or native custom-scheme callbacks.

## Phase 3 — Deliver authorization-request intake - DONE

### Implementation

Establish the external OAuth route composition with plain Hono and feature-specific Zod boundary validation when adding:

```txt
GET /v2/oauth/authorize
```

Implement the authorization-request functionality needed by this endpoint:

- generate 32 cryptographically random bytes and encode the raw handle as `ab_ar_...`
- store only its SHA-256 hash
- use a named 15-minute lifetime and an injectable or otherwise controllable clock
- persist the trusted client, exact redirect URI, effective scopes, and state
- classify and serialize OAuth errors without exposing secrets

Validate:

- `response_type=code`
- an active client
- an exact registered redirect URI
- requested scopes
- bounded, non-empty `state`

Supported scopes, in canonical order, are:

```txt
profile:read
decks:read
decks:write
decks:delete
```

Scope rules:

- `profile:read` must be requested.
- `decks:write` adds `decks:read`.
- `decks:delete` adds `decks:write` and `decks:read`.
- Unknown scopes produce `invalid_scope`.
- Effective scopes are deduplicated and returned as a canonical space-separated string.

Because the Strict session cookie is intentionally absent on the initial cross-site navigation, this endpoint does not determine whether the user is authenticated. A valid request creates the short-lived record and redirects to:

```txt
https://arkham.build/oauth/consent?request=ab_ar_...
```

Apply these error redirect rules:

- Never redirect when the client or redirect URI cannot be trusted; return an OAuth JSON error directly.
- After the client and redirect URI are trusted, redirect errors to the client and preserve `state`.
- Build redirects with the URL API so HTTPS, loopback, and custom-scheme callbacks preserve existing query parameters.

### Completion checks

Add integration tests for scope expansion and canonical ordering, unknown scopes, required `profile:read`, client status, exact redirect matching, request expiry data, hashed storage, safe direct errors, safe redirected errors, preserved state, existing query parameters, and native custom-scheme callback construction.

**Deliverable:** a registered client can start authorization and receive an opaque, expiring consent handle, while invalid requests follow safe OAuth redirect rules.

## Phase 4 — Deliver the backend consent decision and authorization code - DONE

### Implementation

Add session-authenticated account routes:

```txt
POST /v2/account/oauth/authorization-requests/:token/claim
POST /v2/account/oauth/authorization-requests/:token/approve
POST /v2/account/oauth/authorization-requests/:token/deny
```

`claim` is idempotent for the same account. It binds an unclaimed request to the authenticated account and returns an explicit DTO:

```json
{
  "client": {
    "id": "...",
    "name": "Example application"
  },
  "scopes": [
    "profile:read"
  ],
  "expiresAt": "..."
}
```

The backend returns canonical scope IDs only. User-visible scope labels and descriptions are owned by frontend i18n.

All three routes recheck:

- request hash, expiry, and consumption
- request ownership
- client status
- exact current redirect registration
- account existence and ban status
- completed profile

Approval performs one atomic transition:

1. Lock and consume the authorization request.
2. Create the client/account grant or update it with the union of all scopes ever approved for that grant.
3. Generate a code from 32 cryptographically random bytes with the `ab_code_...` prefix.
4. Store only the code's SHA-256 hash, the exact redirect URI, and only the scopes approved in this authorization.
5. Set a named five-minute expiry.
6. Redirect to the registered callback with `code` and `state` using the URL API. Set those response parameters while preserving every other existing callback query parameter.

Denial atomically consumes the request and redirects with:

```txt
error=access_denied
state=...
```

Set `error` and `state` while preserving every other existing callback query parameter. Do not delete pre-existing OAuth-named parameters from the registered redirect URI.

No path may issue a code without the approval POST. Concurrent approval or denial attempts must result in only one decision.

### Completion checks

Add account API integration tests for idempotent same-account claim, cross-account rejection, all rechecks, mandatory approval, denial, grant creation, grant scope union, code-specific scopes, hashed code storage, expiry, and concurrent single-decision behavior.

**Deliverable:** an authenticated account can claim, approve, or deny a consent request; approval returns one short-lived code and denial returns `access_denied`.

## Phase 5 — Deliver the browser consent and authentication-continuation flow - DONE

### Implementation

Add the frontend route:

```txt
/oauth/consent
```

Define the authorization-request token, OAuth scope, and consent-details response schemas once in `@arkham-build/shared`; both backend and frontend parse the same contracts.

The page explicitly renders loading, expired or error, unauthenticated, and ready states. Implement this sequence:

1. Read and validate the local consent URL and request handle.
2. If unauthenticated, redirect to login with the consent URL as the local return destination.
3. Preserve that destination through email login and ArkhamDB login.
4. Preserve it through profile completion when the account profile is incomplete.
5. Claim the authorization request.
6. Display the client name and expanded requested permissions, translating the returned scope IDs through frontend i18n.
7. Render separate Allow and Deny buttons.
8. Submit approval or denial only from the corresponding click handler.

Update the existing ArkhamDB login flow so its signed OAuth state can carry a validated same-origin frontend return path. Update login and profile-completion pages to return to that path. Do not allow an arbitrary external return URL.

Protect the consent page against clickjacking:

```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

Keep the session cookie explicitly configured as:

```txt
HttpOnly
Secure in production
SameSite=Strict
Path=/
```

### Completion checks

Add full-stack Playwright coverage for:

- email login continuation, consent rendering, approval with code and state, and preservation of existing callback query parameters
- repeated authorization requiring another explicit decision, followed by denial with `access_denied`
- incomplete-profile login, profile completion, return to consent, and approval
- ArkhamDB login continuation, return to consent, and denial
- expanded and translated scope rendering

Do not emulate Cloudflare response headers in Vite or the local full-stack suite. Verify the deployed consent response's anti-framing headers against production.

**Deliverable:** a user arriving without a cross-site session cookie can authenticate, finish their profile if needed, review permissions, and explicitly approve or deny the client in the browser.

## Phase 6 — Deliver code exchange and refresh - DONE

### Implementation

Add the external endpoint:

```txt
POST /v2/oauth/token
Content-Type: application/x-www-form-urlencoded
```

Accept client credentials only in the form body. Parse all form input at the route boundary and return stable OAuth errors.

For `grant_type=authorization_code`, accept:

```txt
grant_type=authorization_code
client_id=...
client_secret=...
code=ab_code_...
redirect_uri=...
```

In one transaction:

1. Authenticate the active client.
2. Find and consume the unexpired code by its SHA-256 hash.
3. Verify that the code's grant belongs to the client.
4. Verify the exact redirect URI.
5. Generate a refresh token from 32 cryptographically random bytes with the `ab_rt_...` prefix.
6. Store only its SHA-256 hash, the code scopes, and a fixed 90-day expiry.
7. Generate an access token from 32 cryptographically random bytes with the `ab_at_...` prefix.
8. Store only its SHA-256 hash, the same scopes, and a one-hour expiry.

Return:

```json
{
  "token_type": "Bearer",
  "access_token": "ab_at_...",
  "expires_in": 3600,
  "refresh_token": "ab_rt_...",
  "scope": "profile:read decks:read"
}
```

For `grant_type=refresh_token`, accept:

```txt
grant_type=refresh_token
client_id=...
client_secret=...
refresh_token=ab_rt_...
```

Authenticate the active client and verify the refresh token, grant, account, expiry, revocation state, rotation state, and ownership. Atomically mark the submitted refresh token as rotated and issue a replacement with the exact stored scopes and a new 90-day lifetime. Permit the rotated token to be retried for one minute without extending that grace period, issuing another replacement so clients can recover from a lost response. After the grace period, reuse returns `invalid_grant` without revoking descendants or existing access tokens. Issue a new one-hour access token linked to each replacement refresh token. Existing access tokens remain valid until expiry or explicit revocation. Do not allow scope expansion or narrowing. Return the replacement refresh token.

Use the relevant OAuth errors:

- `invalid_request`
- `invalid_client`
- `invalid_grant`
- `invalid_scope`
- `unauthorized_client`
- `unsupported_grant_type`

Error bodies use:

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code is invalid or expired"
}
```

Bad client authentication returns `401`; malformed or unusable grants generally return `400`. Every successful token response includes:

```http
Cache-Control: no-store
Pragma: no-cache
```

### Completion checks

Add integration tests for form-only credentials, bad client authentication, code expiry, redirect binding, grant/client binding, single use, concurrent exchange, access and refresh expiry, exact scope propagation, refresh rotation with renewed 90-day expiry, the one-minute retry grace period, stale-token rejection without family revocation, and continued validity of existing access tokens.

**Deliverable:** a confidential backend can exchange an approved code exactly once, continuously refresh access through rotating refresh tokens, and receive standards-shaped OAuth responses.

## Phase 7 — Deliver a complete authenticated profile lifecycle - DONE

### Implementation

Add the external revoke endpoint:

```txt
POST /v2/oauth/revoke
Content-Type: application/x-www-form-urlencoded
```

Accept:

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
- A successful response has an empty body.
- Every response includes `Cache-Control: no-store` and `Pragma: no-cache`.

Add OAuth bearer context to `HonoEnv` and bearer middleware that:

1. Parses the `Authorization` bearer token.
2. Hashes it before lookup.
3. Loads the access token and grant.
4. Verifies expiry and revocation.
5. Verifies that the client is active.
6. Verifies that the account exists.
7. Verifies that the account is not banned.
8. Verifies required scopes.
9. Updates `last_used_at`.
10. Exposes the authenticated account, client, token, and canonical scopes.

Use `401` for missing, malformed, unknown, expired, or otherwise unusable tokens. Use `403` for insufficient scope or a banned account. Include `WWW-Authenticate: Bearer` where applicable. User API errors use a stable DTO:

```json
{
  "error": "insufficient_scope",
  "message": "This endpoint requires decks:write"
}
```

Add the first external bearer route:

```txt
GET /v2/user/me
```

Require `profile:read` and return only:

```json
{
  "id": "stable-account-uuid",
  "username": "user-name"
}
```

Do not expose email or linked identities.

### Completion checks

Add integration tests for access-token revocation, refresh-family revocation, idempotency, cross-client and unknown-token privacy, disabled clients, missing accounts, banned accounts, malformed and expired tokens, scope enforcement, `last_used_at`, `WWW-Authenticate`, and the exact profile DTO.

**Deliverable:** an OAuth client can complete authorization, call `/v2/user/me`, refresh access, revoke either token type, and observe revoked credentials being rejected.

## Phase 7A — Detach OpenAPI generation from runtime routing - DONE

### Implementation

Move external OAuth and user request and response schemas into feature-owned DTO modules. Replace `OpenAPIHono`, `createRoute`, and `@hono/zod-openapi` schema imports with plain Hono routes, standard Zod schemas, and route-boundary validators that preserve the existing OAuth and user error DTOs.

Add a detached OpenAPI 3.1 document builder for the external routes delivered so far. It must:

- import feature DTOs without importing route handlers
- convert representable public Zod schemas with `z.toJSONSchema()`
- keep endpoint metadata, security requirements, form bodies, statuses, and descriptions outside runtime routing
- exclude runtime-only transformed schemas from JSON Schema conversion
- produce deterministic output

Remove route-registry OpenAPI tests and `@hono/zod-openapi` after no runtime or test imports remain. The checked-in complete document, deterministic-generation tests, and integration guide remain Phase 11 deliverables.

### Completion checks

Run the existing authorization, token, revocation, and bearer-profile integration tests unchanged. Verify the detached builder describes all currently implemented `/v2/oauth/*` and `/v2/user/*` routes, form content types, security schemes, response statuses, and DTO schemas.

**Deliverable:** runtime OAuth and user requests use plain Hono and Zod, while a deterministic offline OpenAPI builder describes the implemented external contract without participating in request handling.

## Phase 8 — Deliver external deck reads - FUNCTIONALITY DONE

### Implementation

Define dedicated external deck request and response schemas without changing existing first-party deck contracts. Refactor the current deck route implementation into shared account and ArkhamDB service operations instead of duplicating it. Generalize the ArkhamDB user-service context so it accepts either first-party session authentication or OAuth bearer authentication without pretending an OAuth request has a session.

Add these external bearer routes and register them in the detached external API contract.

### Manifest

```txt
GET /v2/user/decks/manifest
GET /v2/user/decks/manifest?source=account
GET /v2/user/decks/manifest?source=arkhamdb
```

Require `decks:read`. Return both provider states and identify each deck's source:

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

Hash a deterministic ordering of source, ID, version, and updated timestamp to produce the manifest version. If ArkhamDB is unavailable, retain account results, mark ArkhamDB unavailable, omit its decks, and still return `200`.

### Batch

```txt
POST /v2/user/decks/batch
```

Require `decks:read`. Accept at most 250 targets:

```json
{
  "decks": [
    { "source": "account", "id": "abc" },
    { "source": "arkhamdb", "id": 123 }
  ]
}
```

Preserve request order and return:

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

Require `decks:read`. Pass route identifiers unchanged to the selected account query or ArkhamDB provider instead of duplicating identifier validation at the route boundary.

For all read routes, use `400` for an invalid source, filter, or input; `404` when the selected query or provider does not find the deck; and `503` for an unavailable required ArkhamDB connection or upstream.

### Completion checks

Add integration tests for bearer scope enforcement, dedicated external DTOs, account and ArkhamDB reads, source filtering, deterministic manifest versions, partial manifests during ArkhamDB failure, the 250-target limit, stable batch order, and whole-batch failure.

**Deliverable:** an authorized external client can discover and read account and ArkhamDB decks through stable, source-aware APIs without changing first-party contracts.

## Phase 9 — Deliver external deck writes and history operations - FUNCTIONALITY DONE

### Implementation

Add these external bearer routes and register them in the detached external API contract:

```txt
POST   /v2/user/decks/:source
PUT    /v2/user/decks/:source/:id
DELETE /v2/user/decks/:source/:id
POST   /v2/user/decks/:source/:id/upgrade
```

Require:

- `decks:write` for create, update, and upgrade
- `decks:delete` for delete

Create, update, and upgrade accept a full `DeckSchema`. Parse it at the boundary and ignore these server-owned fields:

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
- delete uses existing history semantics; `?all=true` deletes the selected deck and its previous chain

For ArkhamDB:

- ignore the supplied ID on creation
- use the route ID for update, delete, and upgrade
- retain the current mapping, hidden-slot, metadata, snapshot, and XP behavior
- take returned IDs, timestamps, versions, and links from ArkhamDB

Use `201` for create and upgrade, `200` for reads and update, and `204` for delete. Use `400` for an invalid source or input; `404` when the selected query or provider does not find the deck; `409` for invalid history transitions; and `503` for an unavailable ArkhamDB connection or upstream.

### Completion checks

Add integration tests for both providers covering create, full replacement, server-owned-field protection, update, delete, `?all=true`, upgrade, history conflicts, transaction rollback, returned upstream fields, scope enforcement, and upstream unavailability.

**Deliverable:** a scoped external client can create, replace, upgrade, and delete account or ArkhamDB decks while preserving each provider's existing history semantics.

## Phase 10 — Deliver connected-app management - DONE

### Implementation

Add session-authenticated account routes:

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

Unclaimed requests may expire normally but can never complete without a new explicit consent decision.

Add a Connected Apps section to the account settings tab with:

- loading, empty, error, and ready states
- disabled status
- translated scope labels
- grant date
- revoke confirmation and mutation feedback

Do not expose individual tokens or sessions.

### Completion checks

Add account API integration tests for listing, account isolation, disabled-client display, transactional grant revocation, token invalidation, and claimed-request invalidation. Add component tests for every visible state and Playwright coverage for connected-app listing, confirmation, revocation, and the revoked token becoming unusable.

**Deliverable:** users can inspect and revoke an application's accumulated account access from account settings without seeing individual credentials.

## Phase 11 — Deliver the external API contract and integration guide - DONE

### Implementation

Keep every `/v2/oauth/*` and `/v2/user/*` runtime route on plain Hono with feature-owned Zod DTO schemas. Extend the detached OpenAPI 3.1 builder so it describes every external route without importing route handlers or participating in request handling. Document:

- form request bodies and OAuth errors
- redirect responses, including native custom-scheme redirects
- confidential client authentication and the native-backend restriction
- bearer security
- scope requirements and implications
- source-specific deck IDs
- every request and response schema and status

Add a deterministic generation script around the detached document builder and checked-in output:

```txt
docs/openapi/oauth-user-api.json
```

Do not edit generated OpenAPI JSON manually.

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

### Completion checks

Add a test that generates the OpenAPI document twice with identical output and verifies that it contains every external route, security scheme, form body, response status, and external DTO. Verify that documentation generation imports feature DTOs rather than route handlers. Run every documented cURL request against the test server or validate it through an equivalent automated documentation test.

**Deliverable:** a checked-in, reproducible OpenAPI document and a complete confidential-client integration guide that match the implemented API.

## Phase 12 — Produce and verify the release candidate

### Implementation and verification

#### Complete shared deck service extraction

Phases 8 and 9 have delivered and tested the external behavior, but their original shared-service requirement is only partially complete. External routes reuse account queries, row mapping, account deck locking and history traversal, and the existing ArkhamDB user service. The internal deck router still owns substantial `localCrud` and `arkhamdbCrud` orchestration, while the external deck service separately implements some account mutations and ArkhamDB upgrade policy.

Make both internal and external routes thin adapters over feature-owned deck services without changing either API contract.

Add policy-neutral account deck operations for:

- inserting an account deck with caller-supplied server fields
- locking and loading an owned account deck
- fully replacing mutable deck content while preserving server fields and history links
- atomically linking a parent and child upgrade
- deleting one deck or its previous history chain

Keep API-specific policy at each route boundary:

- the internal API retains client-supplied IDs and versions, `expectedVersion`, and its existing conflict DTOs
- the external API retains server-generated UUIDs, server-managed versions, route-owned providers, and its external error DTOs

Do not build a shared CRUD object controlled by flags such as `generateId`, `incrementVersion`, or `requireExpectedVersion`. Route adapters should resolve those policies before calling explicit domain operations.

Move ArkhamDB mutation orchestration out of the internal router. Extract the carryover-XP upgrade calculation and any genuinely shared ArkhamDB availability classification so both APIs call the same provider service. Keep first-party snapshot, hidden-slot, metadata, mapping, and optimistic-conflict behavior unchanged.

Run the complete existing internal and external deck integration suites unchanged. Add focused service tests only for policy-neutral operations that cannot be observed reliably through those API suites. Verify transaction rollback for account upgrades and history deletion, identical ArkhamDB carryover-XP behavior through both APIs, and that internal and external route files no longer contain provider CRUD implementations.

The extraction is complete when internal and external deck routes contain authentication, validation, API-specific policy, and response serialization only; shared account and ArkhamDB services own persistence and provider mutation orchestration without conflating the two API contracts.

#### Verify the release candidate

Close any coverage gaps left by the phase-specific tests. The backend integration suite must demonstrate:

- client creation, redirect validation, custom schemes, disable, enable, update, and rotation
- secret, request, code, and token hashes never storing raw values
- authorization validation and safe error redirects
- Strict-cookie consent handoff
- login and profile-completion continuation
- mandatory approval on every authorization
- denial and `access_denied`
- scope expansion and grant union
- code expiry, single use, redirect binding, and concurrent exchange
- access and refresh expiry
- refresh rotation, renewed 90-day expiry, one-minute retry grace, and stale-token rejection without family revocation
- access-token and refresh-family revocation
- app-level grant revocation
- disabled and banned account or client behavior
- bearer scope enforcement
- profile response minimization
- account and ArkhamDB deck read, write, delete, and upgrade behavior
- whole-batch failure
- ArkhamDB partial manifest behavior
- OpenAPI coverage of every external route

The full-stack Playwright suite must demonstrate:

1. Third-party authorization redirect.
2. Login continuation.
3. Profile completion when required.
4. Consent rendering.
5. Approval callback with code and state.
6. Native custom-scheme callback construction at the backend integration boundary.
7. Denial callback.
8. Repeated authorization still requiring another click.
9. Connected-app listing and revocation.

Run formatting, linting, TypeScript checks, backend tests, frontend tests, and full-stack tests. Verify generated database and OpenAPI files have no uncommitted drift.

After deployment, make a real request to the consent page through Cloudflare and verify `Content-Security-Policy: frame-ancestors 'none'` and `X-Frame-Options: DENY`. Also make a request while ArkhamDB is unavailable and confirm that the JSON `503` response is preserved. Use `500` instead only if Cloudflare demonstrably replaces `503`.

**Deliverable:** a deployable OAuth gateway v1 release candidate with green static checks, backend integration tests, frontend tests, Playwright flows, deterministic generated artifacts, and verified Cloudflare error behavior.
