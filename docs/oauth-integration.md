# OAuth and user API integration guide

arkham.build provides an OAuth 2.0 authorization-code API for confidential
clients. The production API is at `https://api.arkham.build`. The complete
machine-readable contract is
[`openapi/oauth-user-api.json`](./openapi/oauth-user-api.json).

The flow uses two channels:

1. The browser asks the user to authorize access.
2. Your backend exchanges the resulting code for tokens.

The client secret belongs only in the second channel. Never put it in browser
code, a native app, a repository, or logs.

## Register a client

An arkham.build administrator registers your client and its redirect URIs, then
issues a UUID `client_id` and a one-time `client_secret`.

Redirect URIs are matched as exact strings. They may use HTTPS, loopback HTTP,
or a native custom scheme:

```text
https://example.com/oauth/callback
http://localhost:4567/oauth/callback
com.example.app:/oauth/callback
```

The examples below use these variables:

```bash
export API_BASE="https://api.arkham.build"
export CLIENT_ID="019c1234-5678-7000-8000-000000000000"
export CLIENT_SECRET="ab_cs_replace-with-the-issued-secret"
export REDIRECT_URI="https://example.com/oauth/callback"
export STATE="replace-with-a-unique-unpredictable-value"
```

Later examples use the codes and tokens returned by the flow. Deck examples
also use `$SOURCE`, `$DECK_ID`, and a full deck JSON file at `$DECK_FILE`.

## Choose scopes

Every authorization must include `profile:read`. Deck write and delete scopes
include the less powerful scopes beneath them.

| Scope | Permits | Also includes |
| --- | --- | --- |
| `profile:read` | Read account ID and username | — |
| `decks:read` | Read account and ArkhamDB decks | — |
| `decks:write` | Create, replace, and upgrade decks | `decks:read` |
| `decks:delete` | Delete decks and deck history | `decks:write`, `decks:read` |

The server expands implied scopes, removes duplicates, and returns scopes in
the order shown above. Unknown scopes produce `invalid_scope`.

A user's grant remembers the union of all scopes approved for a client. A code
and its tokens contain only the scopes approved in that particular flow.

## Authorize a user

Send the user's browser to `GET /v2/oauth/authorize` with:

- `response_type=code`;
- your `client_id`;
- an exact registered `redirect_uri`;
- a space-separated `scope`; and
- a unique, non-empty `state` of at most 1024 UTF-8 bytes.

<!-- curl:authorize -->
```bash
curl --get --include "$API_BASE/v2/oauth/authorize" \
  --data-urlencode "response_type=code" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "redirect_uri=$REDIRECT_URI" \
  --data-urlencode "scope=profile:read decks:read" \
  --data-urlencode "state=$STATE"
```

The user signs in and sees a consent screen. Every authorization requires a
new Allow or Deny decision, even if the user has previously approved the same
client.

Approval redirects to your callback with `code` and `state`. Denial returns
`error=access_denied` and `state`. Existing callback query parameters are
preserved. Always compare the returned `state` with the value stored for the
browser session before accepting the callback.

Authorization requests expire after 15 minutes. Codes expire after five
minutes, can be used once, and are bound to the client and redirect URI.

If the client or redirect URI is untrusted, the endpoint returns a `400` JSON
error instead of redirecting. Once both are trusted, authorization errors are
sent to the callback.

## Exchange the code

Only your backend may call `POST /v2/oauth/token`. Send
`application/x-www-form-urlencoded` data and place both client credentials in
the form body. HTTP Basic authentication is not supported. The `redirect_uri`
must exactly match the one used during authorization.

<!-- curl:token-authorization-code -->
```bash
curl --request POST "$API_BASE/v2/oauth/token" \
  --header "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET" \
  --data-urlencode "code=$AUTHORIZATION_CODE" \
  --data-urlencode "redirect_uri=$REDIRECT_URI"
```

The response contains a one-hour access token and a 90-day refresh token:

```json
{
  "token_type": "Bearer",
  "access_token": "ab_at_...",
  "expires_in": 3600,
  "refresh_token": "ab_rt_...",
  "scope": "profile:read decks:read"
}
```

## Call the user API

Send the access token as a bearer credential. For example,
`GET /v2/user/me` requires `profile:read` and returns only the stable account ID
and username.

<!-- curl:profile -->
```bash
curl --request GET "$API_BASE/v2/user/me" \
  --header "Authorization: Bearer $ACCESS_TOKEN"
```

```json
{
  "id": "a148f775-4eeb-4c13-9340-60f6b8527512",
  "username": "user-name"
}
```

An unusable token returns `401`. A banned account or insufficient scope returns
`403`. User API errors have this form:

```json
{
  "error": "insufficient_scope",
  "message": "This endpoint requires decks:write"
}
```

OAuth endpoint errors instead use `error_description`:

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code is invalid or expired"
}
```

## Refresh tokens

A refresh exchanges one refresh token for a new one with the same scopes and a
new 90-day lifetime. It also returns a new one-hour access token. Store the
replacement before allowing another refresh for the same session. The token
endpoint does not accept scope changes.

<!-- curl:token-refresh -->
```bash
curl --request POST "$API_BASE/v2/oauth/token" \
  --header "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET" \
  --data-urlencode "refresh_token=$REFRESH_TOKEN"
```

If a response is lost, the old refresh token may be retried for one minute.
Each retry returns another replacement. This grace period does not move or
extend. After it ends, the old token returns `invalid_grant`; existing access
tokens and newer refresh tokens remain valid.

## Revoke tokens

`POST /v2/oauth/revoke` uses the same form-body client authentication as the
token endpoint.

<!-- curl:revoke -->
```bash
curl --request POST "$API_BASE/v2/oauth/revoke" \
  --header "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET" \
  --data-urlencode "token=$REFRESH_TOKEN" \
  --data-urlencode "token_type_hint=refresh_token"
```

Revoking an access token affects only that token. Revoking a refresh token also
revokes access tokens issued from it. Unknown tokens, cross-client tokens, and
repeated requests all return `200` with an empty body.

A user can revoke the entire client grant from arkham.build account settings.

## Deck API

Deck endpoints use two providers:

- `account` deck IDs are strings;
- `arkhamdb` deck IDs are positive integers in JSON and decimal strings in URL
  paths.

Treat an ID as meaningful only within its provider, and pass returned IDs
unchanged.

Account storage is always available. ArkhamDB requires a linked identity and a
reachable upstream. If ArkhamDB is unavailable, a manifest still returns
account decks with `providers.arkhamdb.available=false` and an
`arkhamdbSyncToken` of `null`. A single-deck read or mutation that requires an
unavailable ArkhamDB connection returns `503`.

### Manifest

`GET /v2/user/decks/manifest` requires `decks:read`. Use `source=account` or
`source=arkhamdb` to select one provider. A manifest that includes ArkhamDB
performs a conditional upstream synchronization. The manifest version changes
whenever a deck's source, ID, version, or update time changes.

A successful ArkhamDB manifest includes an opaque `arkhamdbSyncToken`. Use this
token for every ArkhamDB batch belonging to that manifest. Batches read the
exact stored snapshot and do not contact ArkhamDB again.

<!-- curl:deck-manifest -->
```bash
curl --request GET "$API_BASE/v2/user/decks/manifest?source=arkhamdb" \
  --header "Authorization: Bearer $ACCESS_TOKEN"
```

```json
{
  "version": "...",
  "arkhamdbSyncToken": "019c1234-5678-7000-8000-000000000000",
  "providers": {
    "account": { "available": true },
    "arkhamdb": { "available": true }
  },
  "decks": []
}
```

### Batch read

`POST /v2/user/decks/batch` requires `decks:read` and accepts at most 250
targets. Results follow request order. `arkhamdbSyncToken` may be omitted or
set to `null` for an account-only batch. ArkhamDB targets require the non-null
token returned by the manifest. If the snapshot is no longer retained, the
endpoint returns `409`; request a new manifest and retry. If any target is
missing, the whole request fails.

<!-- curl:deck-batch -->
```bash
curl --request POST "$API_BASE/v2/user/decks/batch" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "arkhamdbSyncToken": "019c1234-5678-7000-8000-000000000000",
    "decks": [
      { "source": "account", "id": "a148f775-4eeb-4c13-9340-60f6b8527512" },
      { "source": "arkhamdb", "id": 12345 }
    ]
  }'
```

### Read one deck

`GET /v2/user/decks/{source}/{id}` requires `decks:read`.

<!-- curl:deck-get -->
```bash
curl --request GET "$API_BASE/v2/user/decks/$SOURCE/$DECK_ID" \
  --header "Authorization: Bearer $ACCESS_TOKEN"
```

### Write decks

Create, replace, and upgrade accept a full `OAuthDeck` object. See the OpenAPI
schema for its fields. The server ignores these client-supplied fields:

```text
id, source, user_id, date_creation, date_update, version,
previous_deck, next_deck
```

Use the IDs, timestamps, versions, and history links returned by the server.
The examples below read the request body from `$DECK_FILE`.

#### Create

`POST /v2/user/decks/{source}` requires `decks:write` and returns `201`.

<!-- curl:deck-create -->
```bash
curl --request POST "$API_BASE/v2/user/decks/$SOURCE" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data-binary "@$DECK_FILE"
```

#### Replace

`PUT /v2/user/decks/{source}/{id}` requires `decks:write`. It replaces all
mutable content while preserving server fields and history links.

<!-- curl:deck-update -->
```bash
curl --request PUT "$API_BASE/v2/user/decks/$SOURCE/$DECK_ID" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data-binary "@$DECK_FILE"
```

#### Delete

`DELETE /v2/user/decks/{source}/{id}` requires `decks:delete` and returns `204`.
Add `?all=true` to delete the selected deck and its previous history chain.

<!-- curl:deck-delete -->
```bash
curl --request DELETE "$API_BASE/v2/user/decks/$SOURCE/$DECK_ID?all=true" \
  --header "Authorization: Bearer $ACCESS_TOKEN"
```

#### Upgrade

`POST /v2/user/decks/{source}/{id}/upgrade` requires `decks:write` and returns
`201`. It creates and links a child deck. A parent with an existing child
returns `409`.

<!-- curl:deck-upgrade -->
```bash
curl --request POST "$API_BASE/v2/user/decks/$SOURCE/$DECK_ID/upgrade" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data-binary "@$DECK_FILE"
```

Deck routes use `400` for invalid input, `404` for a missing deck, `409` for an
invalid history transition, and `503` when required ArkhamDB access is
unavailable. Authentication errors use `401` or `403` as described above.
