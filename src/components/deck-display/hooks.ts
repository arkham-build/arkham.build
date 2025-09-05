import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import { formatDeckAsText, formatDeckShare } from "@/store/lib/deck-io";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Deck, Id } from "@/store/schemas/deck.schema";
import { ARCHIVE_FOLDER_ID } from "@/utils/constants";
import { download } from "@/utils/download";
import { formatProviderName } from "@/utils/formatting";

export function useDeleteDeck() {
  const toast = useToast();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const deleteDeck = useStore((state) => state.deleteDeck);

  return useCallback(
    async (deckId: Id) => {
      const confirmed = confirm(t("deck.toasts.delete_confirm"));
      if (confirmed) {
        const toastId = toast.show({
          children: t("deck.toasts.delete_loading"),
        });

        try {
          await deleteDeck(deckId, () => navigate("~/"));
          toast.dismiss(toastId);
          toast.show({
            children: t("deck.toasts.delete_success"),
            duration: 3000,
            variant: "success",
          });
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
    [navigate, toast, deleteDeck, t],
  );
}

export function useDeleteUpgrade() {
  const toast = useToast();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const deleteUpgrade = useStore((state) => state.deleteUpgrade);

  return useCallback(
    async (deckId: Id) => {
      const confirmed = confirm(t("deck.toasts.delete_upgrade_confirm"));
      if (confirmed) {
        const toastId = toast.show({
          children: t("deck.toasts.delete_upgrade_loading"),
        });

        try {
          await deleteUpgrade(deckId, (id) => navigate(`/deck/view/${id}`));
          toast.dismiss(toastId);
          toast.show({
            duration: 3000,
            children: t("deck.toasts.delete_upgrade_success"),
            variant: "success",
          });
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
    [deleteUpgrade, navigate, toast, t],
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
        toast.show({
          duration: 3000,
          children: t("deck.toasts.duplicate_success"),
          variant: "success",
        });
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

export function useUploadDeck() {
  const { t } = useTranslation();
  const toast = useToast();
  const [, navigate] = useLocation();
  const uploadDeck = useStore((state) => state.uploadDeck);

  return useCallback(
    async (deckId: Id) => {
      const toastId = toast.show({
        children: t("deck.toasts.upload_loading", {
          provider: formatProviderName("arkhamdb"),
        }),
        variant: "loading",
      });

      try {
        const id = await uploadDeck(deckId, "arkhamdb");
        toast.dismiss(toastId);
        toast.show({
          children: t("deck.toasts.upload_success"),
          duration: 3000,
          variant: "success",
        });
        navigate(`/deck/view/${id}`, { replace: true });
      } catch (err) {
        toast.dismiss(toastId);
        toast.show({
          children: t("deck.toasts.upload_error", {
            error: (err as Error)?.message,
            provider: formatProviderName("arkhamdb"),
          }),
          variant: "error",
        });
      }
    },
    [toast, uploadDeck, navigate, t],
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
