import type { Deck, Id, StorageProvider } from "@arkham-build/shared";
import { useMutation } from "@tanstack/react-query";
import type { DeckDisplayType } from "@/components/deck-display/deck-display";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { useHttpClient } from "@/store/services/http-client.context";
import type { DeckUpgradePayload } from "@/store/slices/app.types";

export function useCreateDeckMutation() {
  const client = useHttpClient();
  const createDeck = useStore((state) => state.createDeck);

  return useMutation({
    mutationKey: ["decks", "create"],
    mutationFn: () => createDeck(client),
  });
}

export function useSaveDeckMutation() {
  const client = useHttpClient();
  const saveDeck = useStore((state) => state.saveDeck);

  return useMutation({
    mutationKey: ["decks", "save"],
    mutationFn: (deckId: Id) => saveDeck(client, deckId),
  });
}

export function useUpdateDeckPropertiesMutation() {
  const client = useHttpClient();
  const updateDeckProperties = useStore((state) => state.updateDeckProperties);

  return useMutation({
    mutationKey: ["decks", "update-properties"],
    mutationFn: (payload: { deckId: Id; properties: Partial<Deck> }) =>
      updateDeckProperties(client, payload.deckId, payload.properties),
  });
}

export function useUploadDeckToProviderMutation() {
  const client = useHttpClient();
  const uploadDeckToProvider = useStore((state) => state.uploadDeckToProvider);

  return useMutation({
    mutationKey: ["decks", "upload"],
    mutationFn: (payload: { deckId: Id; provider: StorageProvider }) =>
      uploadDeckToProvider(client, payload.deckId, payload.provider),
  });
}

export function useDeleteDeckMutation() {
  const client = useHttpClient();
  const deleteDeck = useStore((state) => state.deleteDeck);

  return useMutation({
    mutationKey: ["decks", "delete"],
    mutationFn: (payload: { deckId: Id; onBeforeTransition?: () => void }) =>
      deleteDeck(client, payload.deckId, payload.onBeforeTransition),
  });
}

export function useDeleteUpgradeMutation() {
  const client = useHttpClient();
  const deleteUpgrade = useStore((state) => state.deleteUpgrade);

  return useMutation({
    mutationKey: ["decks", "delete-upgrade"],
    mutationFn: (payload: {
      deckId: Id;
      onBeforeTransition?: (id: Id) => void;
    }) => deleteUpgrade(client, payload.deckId, payload.onBeforeTransition),
  });
}

export function useUpgradeDeckMutation() {
  const client = useHttpClient();
  const upgradeDeck = useStore((state) => state.upgradeDeck);

  return useMutation({
    mutationKey: ["decks", "upgrade"],
    mutationFn: (payload: DeckUpgradePayload) => upgradeDeck(client, payload),
  });
}

export function useDuplicateDeckMutation() {
  const duplicateDeck = useStore((state) => state.duplicateDeck);

  return useMutation({
    mutationKey: ["decks", "duplicate"],
    mutationFn: (payload: { id: Id; options?: { applyEdits: boolean } }) =>
      duplicateDeck(payload.id, payload.options),
  });
}

export function useImportSharedDeckMutation() {
  const importSharedDeck = useStore((state) => state.importSharedDeck);

  return useMutation({
    mutationKey: ["decks", "import-shared"],
    mutationFn: (payload: { deck: ResolvedDeck; type: DeckDisplayType }) =>
      importSharedDeck(payload.deck, payload.type),
  });
}

export function useImportDeckMutation() {
  const client = useHttpClient();
  const importDeck = useStore((state) => state.importDeck);

  return useMutation({
    mutationKey: ["decks", "import"],
    mutationFn: (input: string) => importDeck(client, input),
  });
}

export function useImportFromFilesMutation() {
  const importFromFiles = useStore((state) => state.importFromFiles);

  return useMutation({
    mutationKey: ["decks", "import-files"],
    mutationFn: (files: FileList) => importFromFiles(files),
  });
}

export function useDeleteAllDecksMutation() {
  const deleteAllDecks = useStore((state) => state.deleteAllDecks);

  return useMutation({
    mutationKey: ["decks", "delete-all"],
    mutationFn: () => deleteAllDecks(),
  });
}

export function useRefreshDeckConflictMutation() {
  const client = useHttpClient();
  const resolveDeckConflictWithRefresh = useStore(
    (state) => state.resolveDeckConflictWithRefresh,
  );

  return useMutation({
    mutationKey: ["decks", "conflict", "refresh"],
    mutationFn: (deckId: Id) => resolveDeckConflictWithRefresh(client, deckId),
  });
}

export function useDiscardLocalDeckConflictMutation() {
  const resolveDeckConflictWithDiscard = useStore(
    (state) => state.resolveDeckConflictWithDiscard,
  );

  return useMutation({
    mutationKey: ["decks", "conflict", "discard-local"],
    mutationFn: (deckId: Id) => resolveDeckConflictWithDiscard(deckId),
  });
}
