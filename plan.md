# Settings sync plan

## Current state

### Documentation alignment
- `docs/application-state.md` defines settings as a local-first synced domain.
- Deck collection ownership is now being moved under the settings domain.

### Backend data model
Completed:
- Added `collection` to `account_settings`.
- Removed `account_collection`.
- Added `revision` to `account_settings` for optimistic concurrency.

Relevant files:
- `backend/src/db/migrations/20260425075347_add_collection_to_account_settings.sql`
- `backend/src/db/migrations/20260425080323_add_revision_to_account_settings.sql`
- `backend/src/db/schema.types.ts`

Current `account_settings` shape:
- `account_id`
- `settings`
- `collection`
- `revision`

### Shared schemas
Completed:
- Added shared request/response schemas for settings.
- Added reusable recursive JSON schema support.

Relevant files:
- `shared/src/dtos/settings.schema.ts`
- `shared/src/schemas/base.schema.ts`
- `shared/src/index.ts`

Current API DTOs:
- `SettingsRequestSchema`
  - `settings`
  - `collection`
  - `expectedRevision`
- `SettingsResponseSchema`
  - `settings`
  - `collection`
  - `revision`

### Backend routes
Completed:
- Added authenticated settings routes in a single file.
- Refactored routes to use shared schemas for validation and serialization.
- Added revision conflict handling.

Relevant files:
- `backend/src/features/settings/routes.ts`
- `backend/src/app.ts`

Current endpoints:
- `GET /v2/settings`
  - returns `{ settings, collection, revision }`
  - returns `null` values when no row exists yet
- `PUT /v2/settings`
  - validates request with `SettingsRequestSchema`
  - compares `expectedRevision`
  - returns `409` on mismatch
  - writes a new `revision` on success

### Validation state
Completed:
- `cd shared && npm run check`
- `cd backend && npm run check`

Both currently pass.

---

## Remaining tasks

### 1) Frontend request layer
Add typed settings API helpers using the shared DTOs.

Expected work:
- add `fetchSettings()`
- add `putSettings(payload)`
- validate responses with `SettingsResponseSchema`
- use authenticated v2 request flow

Likely file:
- `frontend/src/store/services/requests/settings.ts`

### 2) Frontend remote payload mapping
Define an explicit mapping between local `SettingsState` and remote synced settings.

Reason:
- `docs/application-state.md` says some settings are device-only and should not be synced.

Expected work:
- create `toRemoteSettings(settings: SettingsState)`
- create `fromRemoteSettings(...)`
- keep `collection` separate from `settings`
- preserve device-only values locally

Likely files:
- `frontend/src/store/slices/settings.ts`
- possibly a new serializer/helper module

### 3) Decide synced vs device-only fields
Explicitly classify every field in `SettingsState`.

Needs confirmation / implementation:
- synced settings
- device-only settings
- whether some derived/UI-only values should never leave the device

Examples likely device-only:
- theme
- maybe `fontSize`
- maybe `devModeEnabled`

### 4) Add settings sync metadata in the store
The app state doc says settings sync should track global sync metadata.

Expected work:
- add status
- add last synced time
- add remote revision
- add error state

Possible shape:
- `idle`
- `synced`
- `local-changes`
- `syncing`
- `conflict`
- `error`

Likely files:
- `frontend/src/store/slices/settings.types.ts`
- `frontend/src/store/slices/settings.ts`

### 5) Connect settings page save flow to backend
Current settings page still saves locally only.

Expected work:
- on save, persist local state
- send remote payload with `expectedRevision`
- update revision on success
- surface conflict state on `409`
- keep collection in the same save flow

Likely files:
- `frontend/src/pages/settings/settings.tsx`
- `frontend/src/store/slices/settings.ts`

### 6) Bootstrap remote settings for authenticated users
Load remote settings after local hydration and session initialization.

Expected work:
- initialize auth session during app startup
- if authenticated, fetch remote settings
- merge remote synced state into local store
- preserve device-only local values

Likely files:
- `frontend/src/main.tsx`
- `frontend/src/store/slices/auth.ts`
- `frontend/src/store/slices/settings.ts`

### 7) Conflict UX
Handle revision mismatch in a user-visible way.

Expected work:
- detect `409` conflict
- expose conflict state in store
- decide whether to:
  - show a blocking error,
  - allow overwrite after refresh,
  - or prompt the user to reload remote settings

Likely files:
- `frontend/src/pages/settings/settings.tsx`
- settings-related store code

### 8) Tests
Add coverage for the new settings domain.

Frontend:
- serializer excludes device-only fields
- response parsing/merging
- revision handling
- conflict handling

---

## Suggested implementation order
1. frontend request layer
2. settings serializer / remote mapping
3. settings sync metadata in store
4. settings save flow integration
5. app bootstrap remote load
6. conflict UX
7. tests

---

## Open decisions
- Final list of device-only settings
- Exact merge behavior when remote settings exist but local persisted settings also exist
- Preferred UX for conflict resolution
