import { SaveIcon, TriangleAlertIcon, Undo2Icon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { DecklistValidation } from "@/components/decklist/decklist-validation";
import { Button } from "@/components/ui/button";
import { HotkeyTooltip } from "@/components/ui/hotkey";
import { useToast } from "@/components/ui/toast.hooks";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useDuplicateDeckMutation,
  useSaveDeckMutation,
} from "@/queries/mutations/decks";
import { useStore } from "@/store";
import { UnsupportedPublishError } from "@/store/lib/errors";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectDeckValid } from "@/store/selectors/decks";
import { selectDeckHasConflict } from "@/store/selectors/sync";
import { isDeckConflictError } from "@/store/services/requests/decks";
import { useHotkey } from "@/utils/use-hotkey";
import { LatestUpgrade } from "../../../components/deck-display/deck-history/latest-upgrade";
import css from "./editor.module.css";

type Props = {
  currentTab: string;
  deck: ResolvedDeck;
};

export function EditorActions(props: Props) {
  const { currentTab, deck } = props;

  const { t } = useTranslation();

  const hasEdits = useStore((state) => !!state.deckEdits[deck.id]);
  const hasSyncConflict = useStore((state) =>
    selectDeckHasConflict(state, deck.id),
  );

  const validation = useStore((state) => selectDeckValid(state, deck));

  const { onQuickDiscard, onDiscardClose } = useDiscardDeckEdits(
    deck.id,
    hasEdits,
  );
  const { onQuicksave, onSaveClose } = useSaveDeck(deck);

  useHotkey("cmd+s", onSaveClose, {
    allowInputFocused: true,
    disabled: hasSyncConflict,
  });

  useHotkey("cmd+shift+s", onQuicksave, {
    allowInputFocused: true,
    disabled: hasSyncConflict,
  });

  useHotkey("cmd+backspace", onDiscardClose, { disabled: hasSyncConflict });
  useHotkey("cmd+shift+backspace", onQuickDiscard, {
    disabled: hasSyncConflict,
  });

  const readonly = !!deck.next_deck;

  return (
    <>
      <LatestUpgrade currentTab={currentTab} deck={deck} overflowScroll />
      <div className={css["actions"]}>
        {!validation.valid && (
          <Tooltip placement="top-start">
            <TooltipTrigger className={css["actions-invalid"]}>
              <TriangleAlertIcon />
            </TooltipTrigger>
            <TooltipContent>
              <div className={css["actions-invalid-tooltip"]}>
                <DecklistValidation defaultOpen validation={validation} />
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        <HotkeyTooltip
          keybind="cmd+s"
          description={
            hasSyncConflict
              ? t("deck_sync.conflict.edit_locked")
              : readonly
                ? t("deck_edit.read_only")
                : t("deck_edit.save")
          }
        >
          <Button
            data-testid="editor-save"
            onClick={onSaveClose}
            disabled={hasSyncConflict || readonly}
            variant="primary"
          >
            <SaveIcon />
            {t("deck_edit.save_short")}
          </Button>
        </HotkeyTooltip>
        <HotkeyTooltip
          keybind="cmd+backspace"
          description={t("deck_edit.discard")}
        >
          <Button
            data-testid="editor-discard"
            disabled={hasSyncConflict}
            onClick={onDiscardClose}
            tooltip={
              hasSyncConflict ? t("deck_sync.conflict.edit_locked") : undefined
            }
            variant="bare"
          >
            <Undo2Icon />
            {t("deck_edit.discard")}
          </Button>
        </HotkeyTooltip>
      </div>
    </>
  );
}

function useSaveDeck(deck: ResolvedDeck) {
  const [, navigate] = useLocation();
  const toast = useToast();
  const { t } = useTranslation();

  const saveDeckMutation = useSaveDeckMutation();
  const duplicateDeckMutation = useDuplicateDeckMutation();

  const onDuplicateWithEdits = useCallback(async () => {
    const id = await duplicateDeckMutation.mutateAsync({
      id: deck.id,
      options: { applyEdits: true },
    });
    navigate(`~/deck/view/${id}`);
  }, [deck.id, duplicateDeckMutation, navigate]);

  const onSave = useCallback(
    async (stayOnPage?: boolean) => {
      const toastId = toast.show({
        children: t("deck_edit.save_loading"),
        variant: "loading",
      });

      try {
        const id = await saveDeckMutation.mutateAsync(deck.id);
        toast.dismiss(toastId);
        if (!stayOnPage) navigate(`~/deck/view/${id}`);
      } catch (err) {
        toast.dismiss(toastId);

        if (isDeckConflictError(err)) {
          return;
        }

        toast.show({
          children: (
            <>
              <p>
                {t("deck_edit.save_error", { error: (err as Error).message })}
              </p>
              {err instanceof UnsupportedPublishError && (
                <Button
                  className={css["error-action"]}
                  onClick={onDuplicateWithEdits}
                  size="sm"
                  tooltip={t("deck_edit.create_local_copy_help")}
                >
                  {t("deck_edit.create_local_copy")}
                </Button>
              )}
            </>
          ),
          variant: "error",
        });
      }
    },
    [saveDeckMutation, navigate, deck.id, toast, onDuplicateWithEdits, t],
  );

  const onQuicksave = useCallback(() => onSave(true), [onSave]);
  const onSaveClose = useCallback(() => onSave(false), [onSave]);

  return {
    onQuicksave,
    onSaveClose,
  };
}

function useDiscardDeckEdits(deckId: ResolvedDeck["id"], hasEdits: boolean) {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const discardEdits = useStore((state) => state.discardEdits);

  const onDiscard = useCallback(
    (stayOnPage?: boolean) => {
      const confirmed =
        !hasEdits || window.confirm(t("deck_edit.discard_confirm"));
      if (confirmed) {
        discardEdits(deckId);
        if (!stayOnPage) navigate(`~/deck/view/${deckId}`);
      }
    },
    [discardEdits, navigate, deckId, hasEdits, t],
  );

  const onQuickDiscard = useCallback(() => onDiscard(true), [onDiscard]);
  const onDiscardClose = useCallback(() => onDiscard(false), [onDiscard]);

  return {
    onQuickDiscard,
    onDiscardClose,
  };
}
