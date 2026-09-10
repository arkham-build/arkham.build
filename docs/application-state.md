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

Zustand owns local-first app state. The remote/query layer owns server-authoritative data.

Synced domains should keep explicit sync state under a top-level `sync` namespace, scoped per domain rather than flattened globally. Today this is implemented for settings as `sync.settings`; future deck sync should follow the same pattern.

Settings sync is local-first:
- local settings remain the runtime source of truth
- authenticated users bootstrap remote settings after local init and session init; this does not block app startup
- saves write local state first, then sync remote state
- account-scoped sync state is reset when the authenticated account changes or the user logs out

Settings sync metadata is global for the settings domain:

```ts
type SyncStatus = "idle" | "loading" | "saving" | "synced" | "conflict" | "error";

type SettingsSyncState = {
  accountId: string | null;
  revision: string | null;
  lastSyncedAt: number | null;
  status: SyncStatus;
  error: string | null;
  conflict: SettingsResponse | null;
};
```

Settings remote payloads are explicit:
- synced settings use `RemoteSettings`
- `collection` is synced separately from settings
- device-only settings currently remain local-only (`devModeEnabled`, `fontSize`)

Settings conflict handling is optimistic-concurrency based:
- the client sends `expectedRevision`
- `409` stores the remote conflict payload in `sync.settings.conflict`
- UX offers **Refresh** (apply remote settings) or **Overwrite** (retry with latest remote revision)

The deck builder remains backed by Zustand. Remote decks, local decks, and imported decks are loaded into the builder through explicit adapters, and saves/export/publish/sync operations leave the builder through explicit actions.
