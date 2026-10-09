# OAuth protocol test client

This local application acts as a confidential OAuth client for arkham.build. It
supports the authorization code, refresh, and revocation flows. It can also
read the user profile, synchronize deck manifests and batches, and run all deck
CRUD operations.

The application uses only Node.js built-in modules. It keeps client credentials
and tokens in memory. All state is lost when the process stops. It is a local
test tool. Do not deploy it or expose it to a network.

## Set up a local OAuth client

Start the arkham.build backend and frontend. Then register this exact callback
URI with the local backend:

```sh
curl --request POST http://localhost:8686/admin/oauth/clients \
  --header "Authorization: Bearer admin_key" \
  --header "Content-Type: application/json" \
  --data '{
    "name": "OAuth protocol test client",
    "redirectUris": ["http://localhost:4567/oauth/callback"]
  }'
```

Copy the returned `clientId` and one-time `clientSecret` into the test client.
You can also put them in a local `.env` file. For example:

```sh
cp oauth-test-client/.env.example oauth-test-client/.env
```

The local backend sends the authorization request to the configured arkham.build
frontend. The default backend configuration uses `http://localhost:3000`.

## Run

From the repository root:

```sh
npm run dev:oauth-client
```

Open <http://localhost:4567>. Save the connection settings before you select
**Connect to arkham.build**.

To use a different server or port, set the values documented in
[`.env.example`](./.env.example). The configured redirect URI must route to this
application and must exactly match a redirect URI registered by the OAuth
server.

## Deck synchronization

**Get manifest** runs the manifest request only. **Sync all decks** gets a new
manifest and reads all listed decks in batches of 250. For ArkhamDB decks, each
batch uses the snapshot token from that manifest.

The deck editor starts with a small valid payload for local tests. A read,
create, replace, or upgrade response copies the returned deck into the editor.
The API ignores server-controlled fields when that JSON is used for a later
write.
