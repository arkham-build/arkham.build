# Deck sync plan

## Goal
Implement deck sync as an account-backed collection using a manifest-based pull model for reconciliation and per-deck optimistic concurrency for write-through saves.

This plan follows `docs/application-state.md`:
- deck collection remains locally owned at runtime
- sync metadata lives under `sync.decks`
- startup should sync local and remote collections in the background
- user-initiated remote actions resolve immediately through the backend
- remote is authoritative for adds and deletes discovered during reconciliation
- updates use explicit conflict handling

## Constraints and decisions
- Decks are a collection, not a single blob.
- Accounts may have many hundred decks.
- Decks are frequently updated out-of-band.
- We do not need real-time updates.
- V1 will use a manifest to minimize transfer size.
- Manifest responses will not be paginated initially; start with a single payload and only add pagination if payload size becomes a real issue.
- Manifest responses will always return `200` in V1; we are not using `If-None-Match` / `304` yet.
- Deck sync will use the existing deck `version` field as the concurrency token instead of adding a separate `revision` field.
- User-initiated creates, updates, and deletes are write-through backend operations, same as settings.
- Existing provider-based deck sync will be completely replaced by account-based deck sync.
- Legacy `connections`-based ArkhamDB deck sync should be removed completely.
- New account-backed deck writes use a client-supplied external deck id; the backend keeps its own internal storage id separately.
- Backend deck DTOs and storage rows differ slightly, so conversion lives in a backend-only mapping utility.
- ArkhamDB-specific deck logic should not live in the frontend for account-backed synced deck writes.
- Delete UX is not optimistic in V1; remove the deck locally after successful backend delete.

## Implementation status

Implemented so far:
- shared deck schema extracted to `shared/src/schemas/deck.schema.ts`
- shared deck sync DTOs added under `shared/src/dtos/deck-sync.schema.ts`
- backend deck routes added at `backend/src/features/decks/routes.ts`
- backend deck row <-> DTO conversion added at `backend/src/features/decks/conversion.ts`
- backend tests added for manifest, batch, create, update, delete, and conflict responses

Still pending:
- frontend request helpers and sync state/workflow
- removal of legacy frontend `connections`-based deck sync
- conflict UX and reconciliation flow in the frontend
- backend upgrade endpoint and frontend upgrade integration

## Current state

### Frontend
Relevant code today:
- `frontend/src/store/slices/connections.ts`
- `frontend/src/store/services/queries.ts`
- `frontend/src/store/lib/sync.ts`
- `frontend/src/store/schemas/deck.schema.ts`

Current behavior:
- remote deck sync exists for provider connections
- `getDecks()` supports `If-Modified-Since` and full collection fetches
- synced decks are merged directly into `data.decks`
- deck payloads already include `version`
- synced deck writes call ArkhamDB-oriented frontend logic directly instead of going through account-backed backend writes

Limitations:
- sync is provider-specific, not account-scoped app sync like settings
- sync metadata is not tracked under `sync.decks`
- conflict handling is not modeled per deck
- pull model is full collection based, not manifest based
- remote adds/deletes vs local in-flight writes are not explicitly separated
- ArkhamDB-specific write behavior still lives in the frontend

### Backend
Relevant code today:
- `backend/src/features/auth/routes.ts`
- ArkhamDB OAuth-backed deck endpoints are already in use from the frontend

Current behavior assumptions:
- deck APIs already return full deck payloads including `id`, `date_update`, and `version`
- remote deck updates change `version`

Needed guarantee:
- `version` must change on every successful remote mutation, including out-of-band edits

## Target design

### Sync model
Use two levels of sync state:
1. collection-level manifest state for pull efficiency
2. per-deck sync state for write status and conflicts

Remote authority rules:
- remote adds discovered during reconciliation are applied locally
- remote deletes discovered during reconciliation remove locally synced decks
- remote updates discovered during reconciliation replace local decks unless a conflicting write is currently being resolved
- user-initiated writes go directly to the backend and commit the authoritative backend response locally
- write conflicts are handled per deck via optimistic concurrency on `version`

### API shape

#### 1) Manifest endpoint
Add a manifest endpoint that returns metadata only.

`GET /v2/decks/manifest`

Response shape:
```ts
type DeckManifestItem = {
  id: string | number;
  version: string;
  updatedAt: string;
};

type DeckManifestResponse = {
  version: string; // manifest snapshot token / etag value
  decks: DeckManifestItem[];
};
```

Behavior:
- always return `200` with the manifest body in V1
- return only metadata needed for comparison
- do not paginate in V1; add pagination later only if payload size proves problematic
- include a deterministic manifest `version` token for client-side change comparison

#### 2) Batch fetch endpoint
Fetch full deck payloads only for ids that are new or changed.

`POST /v2/decks/batch`

Request shape:
```ts
type DeckBatchRequest = {
  ids: Array<string | number>;
};
```

Response:
- array of full deck payloads in the same schema the frontend already understands
- response order does not matter; reconciliation is id-based

#### 3) Per-deck writes with optimistic concurrency
Use the deck `version` field as the expected remote state.

Endpoints:
- `POST /v2/decks`
- `PUT /v2/decks/:id`
- `DELETE /v2/decks/:id`
- `POST /v2/decks/:id/upgrade` or equivalent backend-owned upgrade endpoint

Write behavior:
- user-initiated writes call these endpoints immediately, same as settings
- `PUT` and `DELETE` accept `expectedVersion`
- mismatch returns `409`
- `409` response should include the current remote deck, or at minimum the current remote `version`
- successful writes return the full saved deck with the authoritative remote `version`

## Shared DTOs
Status: implemented.

Added shared schemas for:
- deck schema and deck id in `shared/src/schemas/deck.schema.ts`
- deck manifest item/response
- batch request/response
- write request payloads carrying `expectedVersion`
- conflict response payloads

Relevant location:
- `shared/src/...`

## Frontend state shape
Add explicit sync state under `sync.decks`.

Suggested shape:
```ts
type DeckSyncItemStatus =
  | "idle"
  | "loading"
  | "saving"
  | "synced"
  | "conflict"
  | "error";

type DeckSyncItemState = {
  version: string | null;
  status: DeckSyncItemStatus;
  lastSyncedAt: number | null;
  error: string | null;
  conflict: {
    kind: "update" | "delete" | "upgrade";
    remoteVersion: string | null;
  } | null;
};

type DecksSyncState = {
  accountId: string | null;
  manifestVersion: string | null;
  lastSyncedAt: number | null;
  status: "idle" | "loading" | "saving" | "synced" | "conflict" | "error";
  error: string | null;
  items: Record<string, DeckSyncItemState>;
};
```

Notes:
- `manifestVersion` is for collection change detection only
- item `version` is the per-deck concurrency token
- item status tracks in-flight writes, reconciliation state, and conflicts
- write intent is not queued in `sync.decks`; user-initiated writes resolve through the backend immediately

## Reconciliation algorithm

### Startup flow
1. hydrate local store
2. initialize auth/session
3. if authenticated, run deck sync in background
4. fetch manifest
5. compare returned manifest `version` to stored `manifestVersion`
6. if unchanged, skip remote comparison
7. if changed, compare manifest to local sync metadata
8. batch fetch only remote decks that are new or changed
9. reconcile local state
10. persist updated `sync.decks`

### Manifest comparison rules
For each remote manifest item:
- local missing -> mark for fetch and add locally
- local item version matches remote version -> no-op
- local item version differs -> fetch and replace locally unless the deck is currently in a conflicting write resolution flow

For each local synced deck missing from the remote manifest:
- remove locally because remote is authoritative for deletes discovered during reconciliation

### In-flight writes vs reconciliation
- a deck in `saving` state should not be clobbered by background reconciliation while its write is in flight
- once a write succeeds, the backend response becomes the local source of truth
- if a write fails with `409`, mark that deck `conflict` and use the returned remote state for resolution actions

## Local write behavior

### Create
For a new deck:
- call `POST /v2/decks` immediately
- on success, save the returned deck to local state and store returned remote `version`
- on failure, surface the error and do not treat the deck as remotely synced

### Update
For a synced deck edit:
- call `PUT /v2/decks/:id` immediately with `expectedVersion`
- on success, replace local deck with returned remote deck and mark `synced`
- on `409`, mark `conflict`

### Delete
For a synced deck delete:
- call `DELETE /v2/decks/:id` immediately with `expectedVersion`
- on success, remove the deck and its sync metadata fully
- on `409`, mark `conflict`

### Upgrade
For a synced deck upgrade:
- call the backend-owned upgrade endpoint immediately
- on success, replace local state with the returned authoritative deck data
- on `409`, mark `conflict`
- frontend implementation can land after the backend endpoint exists

## Conflict handling
Conflicts should be handled per deck, not globally.

V1 UX:
- show a summary toast when one or more deck conflicts exist
- do not show one toast per deck
- each conflict should support:
  - `Refresh`: apply remote deck
  - `Overwrite`: retry local save using the latest remote `version`
- delete conflicts only support the same two actions in V1: `Refresh` and `Overwrite`

Possible future improvement:
- conflict list UI with deck names and actions

## Local version handling
We will use the existing deck `version` field for sync, but with one rule:
- for synced decks, the backend response is authoritative

Implications:
- do not rely on client-incremented `version` for conflict correctness
- local pre-save `version` bumps may remain for local editing/history UX, but the final saved state must always be replaced with the remote response
- if possible, reduce or remove client-side semantic dependence on `incrementVersion()` for synced decks later

## Store and persistence tasks
1. Add `sync.decks` types and initial state
2. Persist `sync.decks` with the app store
3. Reset `sync.decks` when the authenticated account changes or the user logs out
4. Add deck sync actions:
   - `loadDeckManifest()`
   - `syncDecks()`
   - `applyRemoteDecks()`
   - `saveRemoteDeckCreate()`
   - `saveRemoteDeckUpdate()`
   - `saveRemoteDeckDelete()`
   - `resolveDeckConflictWithRefresh()`
   - `resolveDeckConflictWithOverwrite()`

## Backend tasks
1. Confirm remote deck `version` semantics are reliable for optimistic concurrency
2. Add manifest endpoint ✅
3. Add batch fetch endpoint ✅
4. Add write endpoints or wrappers that accept `expectedVersion` ✅
5. Return structured `409` conflict payloads ✅
6. Add backend conversion between storage rows and shared deck DTOs ✅
7. Remove legacy provider-specific deck sync endpoints or wrappers that are no longer needed by the frontend flow ✅
8. Add backend upgrade endpoint for write-through deck upgrades
9. Add tests for:
   - changed manifest response ✅
   - batch fetch ✅
   - create/update/delete success ✅
   - update/delete version conflict ✅
   - upgrade success/conflict

## Frontend tasks
1. Add typed request helpers for manifest, batch, and write-through deck endpoints
2. Add `sync.decks` slice/types
3. Rework startup deck sync to use manifest comparison instead of full collection pulls
4. Refactor deck create/update/delete flows to call backend deck endpoints immediately
5. Integrate upgrade flow after the backend endpoint exists
6. Add conflict handling and summary toast
7. Ensure id/history updates remain correct when backend responses are applied
8. Remove the existing provider-based `connections` deck sync flow completely
9. Remove ArkhamDB-specific synced deck write logic from the frontend
10. Add tests for reconciliation and conflict handling

## Suggested implementation order
1. Shared DTOs for manifest, batch, and `expectedVersion` ✅
2. Backend manifest endpoint ✅
3. Backend batch fetch endpoint ✅
4. Backend optimistic-concurrency writes using `expectedVersion` ✅
5. Tests ✅

6. Remove legacy `connections`-based deck sync ✅
7. Frontend request helpers ✅
8. Frontend `sync.decks` state and persistence ✅
9. Startup manifest reconciliation flow
10. Write-through create/update/delete flows
11. Conflict UX
12. Upgrade flow after backend endpoint lands

## Resolved decisions
- Manifest responses will not be paginated in V1.
- Manifest responses always return `200` in V1; `304` support is deferred.
- Delete conflicts only support `Refresh` and `Overwrite` in V1.
- User-initiated deck writes are write-through backend operations, same as settings.
- Existing provider-based deck sync will be completely replaced.
- Legacy `connections`-based deck sync will be removed completely.
- Backend deck/storage shape differences are handled in a backend-only bidirectional conversion utility.
- ArkhamDB-specific synced deck write logic does not belong in the frontend.
- Delete UX is not optimistic in V1; local removal happens after backend delete succeeds.
