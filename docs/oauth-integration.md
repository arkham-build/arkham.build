# Integrate OAuth and the user API

arkham.build supplies an OAuth 2.0 authorization code API for confidential
clients. Use `https://api.arkham.build` for the production API. For the complete
machine-readable contract, refer to
[`openapi/oauth-user-api.json`](./openapi/oauth-user-api.json).

The authorization process uses two channels:

1. The browser asks the user to authorize access.
2. Your backend exchanges the authorization code for tokens.

Keep the client secret only on your backend. Do not put the secret in browser
code, a native app, a repository, or logs.

## Register a client

An arkham.build administrator registers your client and its redirect URIs. The
administrator then issues a UUID `client_id` and a one-time `client_secret`.

The server compares redirect URIs as exact strings. A redirect URI can use
HTTPS, localhost HTTP, or a custom scheme for a native app:

```text
https://example.com/oauth/callback
http://localhost:4567/oauth/callback
com.example.app:/oauth/callback
```

The examples use these variables:

```bash
export API_BASE="https://api.arkham.build"
export CLIENT_ID="019c1234-5678-7000-8000-000000000000"
export CLIENT_SECRET="ab_cs_replace-with-the-issued-secret"
export REDIRECT_URI="https://example.com/oauth/callback"
export STATE="replace-with-a-unique-unpredictable-value"
```

The token and user API examples use codes and tokens from the authorization
process. The deck examples also use `$SOURCE`, `$DECK_ID`, and a complete deck
JSON file at `$DECK_FILE`.

## Select scopes

You must include `profile:read` in each authorization request. The deck write
and delete scopes include the lower-level deck scopes shown in the table.

| Scope | Permits you to | Also includes |
| --- | --- | --- |
| `profile:read` | Read the account ID and username | — |
| `decks:read` | Read account and ArkhamDB decks | — |
| `decks:write` | Create, replace, and upgrade decks | `decks:read` |
| `decks:delete` | Delete decks and deck history | `decks:write`, `decks:read` |

The server adds the included scopes, removes duplicates, and returns the scopes
in the order in the table. An unknown scope causes an `invalid_scope` error.

The user grant stores all scopes that the user approved for the client. Each
code and its tokens have only the scopes approved during that authorization.

## Authorize a user

Open `GET /v2/oauth/authorize` in the user's browser. Include these query
parameters:

- `response_type` with the value `code`
- your `client_id`
- an exact registered `redirect_uri`
- `scope` with a space-separated list of scopes
- `state` with a unique and unpredictable value

The `state` value must not be empty. Its maximum size is 1024 UTF-8 bytes.

<!-- curl:authorize -->
```bash
curl --get --include "$API_BASE/v2/oauth/authorize" \
  --data-urlencode "response_type=code" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "redirect_uri=$REDIRECT_URI" \
  --data-urlencode "scope=profile:read decks:read" \
  --data-urlencode "state=$STATE"
```

The user signs in. The API then shows a consent screen. The user must select
Allow or Deny for each authorization request. A previous approval does not
remove this requirement.

If the user selects Allow, the API redirects the browser to your callback. The
callback includes `code` and `state`. If the user selects Deny, the callback
includes `error=access_denied` and `state`. The API keeps query parameters that
are already in the callback URI.

Before you accept the callback, compare its `state` with the value stored for
the browser session.

An authorization request expires after 15 minutes. An authorization code
expires after five minutes. You can use the code only one time. The code is
bound to the client and the redirect URI.

If the client or redirect URI is not trusted, the endpoint returns a `400` JSON
error. It does not redirect the browser. If both values are trusted, the API
sends authorization errors to the callback.

## Exchange the authorization code

Call `POST /v2/oauth/token` only from your backend. Send data with the
`application/x-www-form-urlencoded` content type. Put both client credentials
in the form body. Do not use HTTP Basic authentication.

The `redirect_uri` must be an exact match for the URI in the authorization
request.

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

The response contains an access token that is valid for one hour. It also
contains a refresh token that is valid for 90 days:

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

Put the access token in the `Authorization` header as a bearer token. For
example, `GET /v2/user/me` requires `profile:read`. It returns only the stable
account ID and the username.

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

If the API cannot use the token, it returns `401`. If the account is banned, or
if the token has insufficient scope, the API returns `403`. User API errors use
this format:

```json
{
  "error": "insufficient_scope",
  "message": "This endpoint requires decks:write"
}
```

OAuth endpoint errors use `error_description` instead of `message`:

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code is invalid or expired"
}
```

## Refresh tokens

Exchange a refresh token to get a new refresh token with the same scopes. The
new refresh token is valid for 90 days. The response also contains a new access
token that is valid for one hour.

Store the new refresh token before you send another refresh request for the
same session. The token endpoint does not accept scope changes.

<!-- curl:token-refresh -->
```bash
curl --request POST "$API_BASE/v2/oauth/token" \
  --header "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET" \
  --data-urlencode "refresh_token=$REFRESH_TOKEN"
```

If you do not receive a response, you can use the old refresh token again for
one minute. Each retry returns a new replacement token. A retry does not restart
or extend this grace period.

After the grace period, the old token causes an `invalid_grant` error. Existing
access tokens and newer refresh tokens stay valid.

## Revoke tokens

To revoke a token, call `POST /v2/oauth/revoke`. Put the client credentials in
the form body, as you do for the token endpoint.

<!-- curl:revoke -->
```bash
curl --request POST "$API_BASE/v2/oauth/revoke" \
  --header "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET" \
  --data-urlencode "token=$REFRESH_TOKEN" \
  --data-urlencode "token_type_hint=refresh_token"
```

If you revoke an access token, the action affects only that token. If you revoke
a refresh token, the action also revokes access tokens issued from it.

The API returns `200` with an empty body for these requests:

- an unknown token
- a token for a different client
- a repeated revocation request

A user can revoke the complete client grant in the arkham.build account
settings.

## Use the deck API

The deck API uses two providers:

- `account` deck IDs are strings.
- `arkhamdb` deck IDs are positive integers in JSON and decimal strings in URL
  paths.

An ID has meaning only for its provider. Send returned IDs without changes.

Account storage is always available. To use ArkhamDB, the user must have a
linked identity, and the upstream service must be available.

If ArkhamDB is unavailable, a manifest still returns account decks. It sets
`providers.arkhamdb.available` to `false` and `arkhamdbSyncToken` to `null`.
A single-deck read or change returns `503` if it requires an unavailable
ArkhamDB connection.

### Get a manifest

`GET /v2/user/decks/manifest` requires `decks:read`. Set `source=account` or
`source=arkhamdb` to select one provider. If a manifest includes ArkhamDB, the
API does a conditional synchronization with the upstream service.

The manifest version changes when a deck's source, ID, version, or update time
changes.

A successful ArkhamDB manifest includes an opaque `arkhamdbSyncToken`. Use this
token for each ArkhamDB batch that belongs to the manifest. Each batch reads the
exact stored snapshot and does not contact ArkhamDB again.

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

### Read a batch of decks

`POST /v2/user/decks/batch` requires `decks:read`. A request can contain a
maximum of 250 targets. The API returns results in the order of the requested
targets.

For an account-only batch, omit `arkhamdbSyncToken` or set it to `null`. For a
batch with ArkhamDB targets, use the non-null token from the manifest.

If the server no longer has the snapshot, the endpoint returns `409`. Get a new
manifest, and then send the batch request again. If one target does not exist,
the complete request fails.

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

For create, replace, and upgrade operations, send an `OAuthDeckWrite` object.
Put only mutable deck content in this object. The API ignores all additional
properties and does not return an error. This rule applies to these
server-controlled fields:

```text
id, source, user_id, date_creation, date_update, version,
previous_deck, next_deck
```

Use the IDs, timestamps, versions, and history links that the server returns.
The examples get the request body from `$DECK_FILE`.

#### Create a deck

`POST /v2/user/decks/{source}` requires `decks:write` and returns `201`.

<!-- curl:deck-create -->
```bash
curl --request POST "$API_BASE/v2/user/decks/$SOURCE" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data-binary "@$DECK_FILE"
```

#### Replace a deck

`PUT /v2/user/decks/{source}/{id}` requires `decks:write`. It replaces all
mutable content. It keeps the server-controlled fields and history links.

<!-- curl:deck-update -->
```bash
curl --request PUT "$API_BASE/v2/user/decks/$SOURCE/$DECK_ID" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data-binary "@$DECK_FILE"
```

#### Delete a deck

`DELETE /v2/user/decks/{source}/{id}` requires `decks:delete` and returns `204`.
Add `?all=true` to delete the selected deck and its previous history chain.

<!-- curl:deck-delete -->
```bash
curl --request DELETE "$API_BASE/v2/user/decks/$SOURCE/$DECK_ID?all=true" \
  --header "Authorization: Bearer $ACCESS_TOKEN"
```

#### Upgrade a deck

`POST /v2/user/decks/{source}/{id}/upgrade` requires `decks:write` and returns
`201`. It creates a child deck and links it to the parent. If the parent already
has a child, the API returns `409`.

<!-- curl:deck-upgrade -->
```bash
curl --request POST "$API_BASE/v2/user/decks/$SOURCE/$DECK_ID/upgrade" \
  --header "Authorization: Bearer $ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data-binary "@$DECK_FILE"
```

Deck routes return these status codes:

- `400` for invalid input
- `404` for a deck that does not exist
- `409` for an invalid history transition
- `503` when required ArkhamDB access is unavailable

For information about `401` and `403` authentication errors, refer to
[Call the user API](#call-the-user-api).
