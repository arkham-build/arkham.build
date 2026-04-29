# Step 10 plan: provider-driven write-through deck flows

## Goal
Refactor frontend deck create/update/delete behavior so account-backed remote deck writes are explicit provider-driven operations, not inferred from authentication status.

A user chooses where a deck is saved:
- `local`: always available
- `remote`: account-backed remote storage, available when authenticated
- `arkhamdb`: later; conceptually a special remote provider

## Locked decisions
- Account-backed remote decks use `deck.source = "remote"`.
- Authentication only controls provider availability; it does not automatically make new decks remote.
- Uploading a local deck to a provider is one-way. There is no conversion back to local.
- Uploading a deck with unsaved edits discards `deckEdits[deckId]` and uploads the current persisted `data.decks[deckId]` state.
- Duplicating any deck always creates a local-only deck.

## Provider model

Suggested provider type:

```ts
type DeckProvider = "local" | "remote" | "arkhamdb";
```

Provider availability:
- `local`: always available
- `remote`: available when `auth.status === "authenticated"`
- `arkhamdb`: unavailable for now

Remote synced deck predicate:

```ts
deck.source === "remote" && !!sync.decks.items[deckId]
```

`sync.decks.items` remains authoritative for concurrency metadata. `deck.source = "remote"` makes account-backed decks explicit in deck data and UI/filtering.

## Files likely involved

Store/actions:
- `frontend/src/store/slices/app.ts`
- `frontend/src/store/slices/app.types.ts`
- `frontend/src/store/slices/data.ts` if upload fits better there, but likely `app.ts`
- `frontend/src/store/lib/sync.ts`
- `frontend/src/store/services/requests/decks.ts`

Create UI:
- `frontend/src/store/slices/deck-create.ts`
- `frontend/src/store/slices/deck-create.types.ts`
- `frontend/src/pages/deck-create/...`

Deck view upload UI:
- `frontend/src/pages/deck-view/...`
- possibly deck display/sidebar/action components

Translations:
- `frontend/src/locales/en.json`
- other locales can be synced later if project workflow allows placeholders

Tests:
- store slice tests under `frontend/src/store/slices/...`
- sync helper tests under `frontend/src/store/lib/sync.spec.ts`

## Helper additions

Add to `frontend/src/store/lib/sync.ts` or another provider-oriented helper location:

```ts
export type DeckProvider = "local" | "remote" | "arkhamdb";

export function isStorageProviderAvailable(
  state: StoreState,
  provider: DeckProvider,
): boolean;

export function isRemoteSyncedDeck(
  state: StoreState,
  deckId: Id,
): boolean;

export function markRemoteDeck(deck: Deck): Deck;
```

Rules:

```ts
local => true
remote => state.auth.status === "authenticated"
arkhamdb => false for now
```

`markRemoteDeck(deck)` returns a deck with:

```ts
source: "remote"
```

Use it for:
- remote decks applied during manifest reconciliation
- remote create responses
- remote update responses
- upload responses

## Normalize remote decks during sync

In `applyRemoteDeckReconciliation()`:

```ts
nextDecks[deck.id] = markRemoteDeck(deck);
```

This ensures all account-backed remote decks discovered during startup sync are tagged consistently.

## Duplicate always local

Update `duplicateDeck()` so cloned decks are local-only:

```ts
newDeck.source = null;
```

Also ensure no sync metadata is created for the duplicate.

Expected behavior:
- duplicating a remote deck creates a local copy
- duplicating an ArkhamDB deck later also creates a local copy

## Upload local deck to provider

Add store action, probably in `AppSlice`:

```ts
uploadDeckToProvider(deckId: Id, provider: DeckProvider): Promise<Id>;
```

V1 supports only `provider === "remote"`.

### Upload preconditions

For remote upload:
1. deck exists
2. deck is not already remote synced
3. remote provider is available/authenticated
4. provider is supported

### Upload behavior

1. Read persisted deck from `data.decks[deckId]`.
2. Delete any `deckEdits[deckId]`; unsaved edits are not uploaded.
3. Set deck sync item to `saving`.
4. Call:

```ts
postDeck(deck)
```

5. On success:
   - mark backend response with `source = "remote"`
   - replace local deck with backend response
   - add/update `sync.decks.items[remoteDeck.id]`
   - set item `version = remoteDeck.version`
   - set item status `synced`
   - clear item error/conflict
   - clear `sync.decks.manifestVersion` because write responses do not return a manifest snapshot token
   - persist app + edits
   - return remote deck id

6. On failure:
   - keep deck local
   - mark sync item `error` or remove temporary sync item if preferred
   - throw error so UI can surface it

### Upload ID handling

Backend should preserve client-supplied external deck id. If a different id is ever returned, handle it by replacing the old local id with the returned id and rebuilding history.

## Provider-aware create flow

Current deck create has a selected provider (`deckCreate.provider`). Use that explicit provider.

### Local create

If selected provider is `local`:
- keep existing behavior
- no backend request
- no sync metadata

### Remote create

If selected provider is `remote`:
1. assert provider available
2. build deck as today
3. call `postDeck(deck)`
4. mark response with `source = "remote"`
5. save authoritative response locally
6. create sync metadata item with backend version
7. clear `sync.decks.manifestVersion`
8. persist

### ArkhamDB create

If selected provider is `arkhamdb`:
- unsupported for now
- assert/fail rather than silently falling back

## Write-through update/save flows

Actions to update:
- `saveDeck(deckId)`
- `updateDeckProperties(deckId, properties)`

Decision rule:

```ts
if (!isRemoteSyncedDeck(get(), deckId)) {
  // existing local behavior
}
```

### Remote save/update behavior

1. Compute `nextDeck` exactly as today.
2. Read `expectedVersion` from `sync.decks.items[deckId].version`.
3. Set item status to `saving`.
4. Call:

```ts
putDeck({ ...nextDeck, expectedVersion })
```

5. On success:
   - mark response with `source = "remote"`
   - replace local deck with backend response
   - clear relevant local edits only after successful save
   - update sync item version/status
   - clear `sync.decks.manifestVersion`
   - persist app + edits

6. On `409` conflict:
   - mark item status `conflict`
   - set conflict kind:
     - `update` for save/property update
   - store `remoteVersion` from response when available
   - keep persisted local deck unchanged
   - keep local edits unchanged
   - throw error

7. On other error:
   - mark item status `error`
   - keep persisted local deck unchanged
   - keep local edits unchanged
   - throw error

## Write-through delete flow

Update action:
- `deleteDeck(id, cb)`

Decision rule:

```ts
if (!isRemoteSyncedDeck(get(), id)) {
  // existing local delete behavior
}
```

### Remote delete behavior

1. Assert deck exists and has no upgrades, same as today.
2. Read `expectedVersion` from sync item.
3. Set item status `saving`.
4. Call backend delete:

```ts
deleteRemoteDeck(id, { expectedVersion })
```

5. On success:
   - call callback only after backend delete succeeds
   - remove deck/history/upgrades locally using existing delete semantics
   - remove sync metadata for all removed deck ids
   - clear `sync.decks.manifestVersion`
   - persist app + edits

6. On `409` conflict:
   - mark item status `conflict`
   - set conflict kind `delete`
   - store remote version when available
   - do not delete local deck
   - do not call callback
   - throw error

7. On other error:
   - mark item status `error`
   - do not delete local deck
   - do not call callback
   - throw error

## Extract shared local removal helper

Current delete logic is embedded in `deleteDeck()`.

Extract a helper in `app.ts`:

```ts
function removeDeckTree(state: StoreState, id: Id): {
  data: StoreState["data"];
  deckEdits: StoreState["deckEdits"];
  removedIds: Id[];
};
```

Use it for both:
- local delete
- successful remote delete

Remote delete additionally removes `sync.decks.items[removedId]` for all removed ids.

## Manifest version after writes

Successful remote writes should clear:

```ts
sync.decks.manifestVersion = null
```

Reason: write endpoints return authoritative deck data but not a manifest snapshot token. Clearing forces the next manifest sync to reconcile against the current remote collection.

Apply after successful:
- remote create
- remote upload
- remote update
- remote delete

## UI requirements

### Create flow provider picker

Provider picker should include:
- local always
- remote only when authenticated
- arkhamdb later

Do not hardcode UI text. Add translation keys.

### Deck view upload action

Show upload action only for local-only decks.

Remote upload option is visible/enabled only when authenticated.

If deck has unsaved edits, store action will discard them. UI may optionally show a confirmation before calling upload, but the store behavior is fixed: persisted state is uploaded, edits are deleted.

## Tests

### Duplicate
- duplicating remote deck creates `source: null`
- duplicated deck has no sync item

### Upload
- local deck upload calls `postDeck`
- success sets `source: "remote"`
- success creates sync item
- success deletes `deckEdits[deckId]`
- failure keeps deck local and does not mark it remote

### Create
- local provider does not call backend
- remote provider calls backend
- remote provider unavailable throws
- remote create stores authoritative backend response and sync item

### Save/update
- local decks keep existing behavior
- remote save calls `putDeck` with expectedVersion
- remote save success replaces local deck with backend response and clears edits
- remote conflict marks item conflict and keeps local edits
- remote non-conflict error marks item error and keeps local edits

### Delete
- local delete keeps existing behavior
- remote delete calls backend before local removal
- remote delete success removes local deck and sync metadata
- remote conflict keeps deck and does not call callback
- remote non-conflict error keeps deck and does not call callback

## Suggested implementation order

1. Add provider/sync helpers and `markRemoteDeck`.
2. Normalize remote decks in startup reconciliation.
3. Ensure duplicate always creates local-only decks.
4. Extract local deck tree removal helper.
5. Implement `uploadDeckToProvider(deckId, "remote")` store action.
6. Refactor remote delete write-through flow.
7. Refactor remote `updateDeckProperties` write-through flow.
8. Refactor remote `saveDeck` write-through flow.
9. Refactor provider-aware `createDeck` flow.
10. Add create provider UI availability changes.
11. Add deck view upload UI.
12. Add tests throughout, prioritizing store/action tests first.
