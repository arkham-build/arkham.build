# Application state

Application state is split by data ownership:

| Area | Approach | Runtime source of truth |
| --- | --- | --- |
| Deck collection | Local-first with sync | Zustand/local persistence |
| Settings | Local-first with sync; device-only settings are not synced | Zustand/local persistence |
| Auth/session | Lightweight mirrored state | Auth/session provider, represented in a small Zustand auth slice |
| User profile | Remote-authoritative | Server/query layer |
| Social features | Remote-authoritative | Server/query layer |
| Public/shared decks | Remote-authoritative | Server/query layer |
| Editor drafts | Local draft state | Component state or temporary Zustand state |

Zustand owns local-first app state. The remote/query layer owns server-authoritative data. Sync services connect local-first domains to the server:

```txt
deckCollectionStore <-> deckSyncService     <-> API
settingsStore       <-> settingsSyncService <-> API
authStore           <-  lightweight session identity
profile/social/etc  <-> remote query/mutation layer <-> API
```

Synced domains should keep explicit sync metadata. Deck sync tracks this per deck; settings sync may track it globally or per field.

```ts
type SyncStatus =
  | "idle"
  | "synced"
  | "local-changes"
  | "syncing"
  | "conflict"
  | "error";

type SyncMetadata = {
  status: SyncStatus;
  lastSyncedAt?: string;
  remoteRevision?: string;
  error?: string;
};
```

The deck builder remains backed by Zustand. Remote decks, local decks, and imported decks are loaded into the builder through explicit adapters, and saves/export/publish/sync operations leave the builder through explicit actions.
