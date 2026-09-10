import type { Id } from "@arkham-build/shared";
import { CircleQuestionMarkIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast.hooks";
import {
  useDiscardLocalDeckConflictMutation,
  useRefreshDeckConflictMutation,
} from "@/queries/mutations/decks";
import { useStore } from "@/store";
import { isDeckConflictError } from "@/store/services/requests/decks";
import type { DeckSyncItemState } from "@/store/slices/sync.types";
import { cx } from "@/utils/cx";
import css from "./deck-conflict-panel.module.css";

type Props = {
  className?: string;
  deckId: Id;
};

export function DeckConflictPanel(props: Props) {
  const { className, deckId } = props;

  const { t } = useTranslation();
  const syncItem = useStore((state) => state.sync.decks.items[deckId]);

  const conflict = syncItem?.conflict;
  const { actionLabel, descriptionLabel, isPending, run, testId } =
    useResolveDeckConflictAction(deckId, conflict);

  if (!conflict) return null;

  return (
    <section className={cx(css["panel"], className)}>
      <header className={css["header"]}>
        <CircleQuestionMarkIcon className={css["icon"]} />
        <h3 className={css["title"]}>{t("deck_sync.conflict.title")}</h3>
      </header>
      <p className={css["description"]}>{t(descriptionLabel)}</p>
      {conflict.remoteVersion && (
        <p className={css["details"]}>
          {t("deck_sync.conflict.remote_version", {
            version: conflict.remoteVersion,
          })}
        </p>
      )}
      {syncItem?.error && <p className={css["details"]}>{syncItem.error}</p>}
      <div className={css["actions"]}>
        <Button
          data-testid={testId}
          disabled={isPending}
          onClick={run}
          size="sm"
          variant="secondary"
        >
          {t(actionLabel)}
        </Button>
      </div>
    </section>
  );
}

export function DeckConflictOverlay(props: Props) {
  return (
    <div className={css["overlay"]}>
      <DeckConflictPanel
        {...props}
        className={cx(css["overlay-panel"], props.className)}
      />
    </div>
  );
}

function useResolveDeckConflictAction(
  deckId: Id,
  conflict: DeckSyncItemState["conflict"] | undefined,
) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const toast = useToast();
  const discardLocalMutation = useDiscardLocalDeckConflictMutation();
  const refreshMutation = useRefreshDeckConflictMutation();

  const run = useCallback(async () => {
    if (!conflict) return;

    try {
      if (conflict.remoteVersion == null) {
        navigate("~/");
        await discardLocalMutation.mutateAsync(deckId);
      } else {
        await refreshMutation.mutateAsync(deckId);
      }
    } catch (error) {
      if (isDeckConflictError(error)) return;

      toast.show({
        children: t("deck_sync.conflict.action_error", {
          error: (error as Error).message,
        }),
        variant: "error",
      });
    }
  }, [
    conflict,
    deckId,
    discardLocalMutation,
    navigate,
    refreshMutation,
    t,
    toast,
  ]);

  return {
    actionLabel:
      conflict?.remoteVersion == null
        ? "deck_sync.conflict.discard_local"
        : "deck_sync.conflict.refresh",
    descriptionLabel:
      conflict?.remoteVersion == null
        ? "deck_sync.conflict.description_remote_missing"
        : "deck_sync.conflict.description",
    isPending: discardLocalMutation.isPending || refreshMutation.isPending,
    run,
    testId:
      conflict?.remoteVersion == null
        ? "deck-conflict-discard-local"
        : "deck-conflict-refresh",
  };
}
