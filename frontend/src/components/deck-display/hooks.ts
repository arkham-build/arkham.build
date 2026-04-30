import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import { formatDeckAsText, formatDeckShare } from "@/store/lib/deck-io";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Deck, Id } from "@/store/schemas/deck.schema";
import { useHttpClient } from "@/store/services/http-client.context";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";
import { download } from "@/utils/download";

export function useDeleteDeck() {
  const toast = useToast();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const client = useHttpClient();
  const deleteDeck = useStore((state) => state.deleteDeck);

  return useCallback(
    async (deckId: Id) => {
      const confirmed = confirm(t("deck.toasts.delete_confirm"));
      if (confirmed) {
        const toastId = toast.show({
          children: t("deck.toasts.delete_loading"),
        });

        try {
          await deleteDeck(client, deckId, () => navigate("~/"));
          toast.dismiss(toastId);
        } catch (err) {
          toast.dismiss(toastId);
          toast.show({
            children: t("deck.toasts.delete_error", {
              error: (err as Error)?.message,
            }),
            variant: "error",
          });
        }
      }
    },
    [client, navigate, toast, deleteDeck, t],
  );
}

export function useDeleteUpgrade() {
  const toast = useToast();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const client = useHttpClient();
  const deleteUpgrade = useStore((state) => state.deleteUpgrade);

  return useCallback(
    async (deckId: Id) => {
      const confirmed = confirm(t("deck.toasts.delete_upgrade_confirm"));
      if (confirmed) {
        const toastId = toast.show({
          children: t("deck.toasts.delete_upgrade_loading"),
        });

        try {
          await deleteUpgrade(client, deckId, (id) =>
            navigate(`/deck/view/${id}`),
          );
          toast.dismiss(toastId);
        } catch (err) {
          toast.dismiss(toastId);
          toast.show({
            children: t("deck.toasts.delete_upgrade_error", {
              error: (err as Error)?.message,
            }),
            variant: "error",
          });
        }
      }
    },
    [client, deleteUpgrade, navigate, toast, t],
  );
}

export function useUploadDeckToProvider() {
  const toast = useToast();
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const client = useHttpClient();
  const uploadDeckToProvider = useStore((state) => state.uploadDeckToProvider);

  return useCallback(
    async (deckId: Id) => {
      const provider = t("deck_edit.config.storage_provider.remote");

      const toastId = toast.show({
        children: t("deck.toasts.upload_loading", { provider }),
        variant: "loading",
      });

      try {
        const id = await uploadDeckToProvider(client, deckId, "remote");
        toast.dismiss(toastId);
        if (id !== deckId) navigate(`/deck/view/${id}`, { replace: true });
      } catch (err) {
        toast.dismiss(toastId);

        toast.show({
          children: t("deck.toasts.upload_error", {
            provider,
            error: (err as Error)?.message,
          }),
          variant: "error",
        });
      }
    },
    [client, navigate, toast, uploadDeckToProvider, t],
  );
}

export function useDuplicateDeck() {
  const toast = useToast();
  const { t } = useTranslation();

  const [, navigate] = useLocation();
  const duplicateDeck = useStore((state) => state.duplicateDeck);

  return useCallback(
    async (deckId: Id) => {
      try {
        const id = await duplicateDeck(deckId);
        navigate(`/deck/view/${id}`);
      } catch (err) {
        toast.show({
          children: t("deck.toasts.duplicate_error", {
            error: (err as Error)?.message,
          }),
          variant: "error",
        });
      }
    },
    [duplicateDeck, navigate, toast.show, t],
  );
}

export function useExportJson() {
  const toast = useToast();
  const { t } = useTranslation();

  return useCallback(
    (deck: Deck) => {
      try {
        download(
          JSON.stringify(formatDeckShare(deck), null, 2),
          `arkhambuild-${deck.id}.json`,
          "application/json",
        );
      } catch (err) {
        console.error(err);
        toast.show({
          duration: 3000,
          children: t("deck.toasts.export_error", {
            error: (err as Error)?.message,
          }),
          variant: "error",
        });
      }
    },
    [toast.show, t],
  );
}

export function useExportText() {
  const { t } = useTranslation();
  const toast = useToast();
  const state = useStore.getState();

  return useCallback(
    (deck: ResolvedDeck) => {
      try {
        download(
          formatDeckAsText(state, deck),
          `arkhambuild-${deck.id}.md`,
          "text/markdown",
        );
      } catch (err) {
        console.error(err);
        toast.show({
          children: t("deck.toasts.export_error", {
            error: (err as Error)?.message,
          }),
          variant: "error",
        });
      }
    },
    [toast.show, state, t],
  );
}

export function useChangeArchiveStatus(deckId: Id) {
  const addDeckToArchive = useStore((state) => state.addDeckToArchive);
  const removeDeckFromFolder = useStore((state) => state.removeDeckFromFolder);

  const isArchived = useStore(
    (state) => state.data.deckFolders[deckId] === ARCHIVE_FOLDER_ID,
  );

  return {
    isArchived,
    toggleArchived: () => {
      if (isArchived) {
        removeDeckFromFolder(deckId);
      } else {
        addDeckToArchive(deckId);
      }
    },
  };
}
