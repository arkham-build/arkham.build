import { DecklistValidation } from "@/components/decklist/decklist-validation";
import { Button } from "@/components/ui/button";
import { HotkeyTooltip } from "@/components/ui/hotkey";
import { useToast } from "@/components/ui/toast.hooks";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStore } from "@/store";
import { UnsupportedPublishError } from "@/store/lib/errors";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectDeckValid } from "@/store/selectors/decks";
import { selectConnectionLockForDeck } from "@/store/selectors/shared";
import { useHotkey } from "@/utils/use-hotkey";
import { SaveIcon, TriangleAlertIcon, Undo2Icon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { LatestUpgrade } from "../../../components/deck-display/deck-history/latest-upgrade";
import css from "./editor.module.css";

type Props = {
  currentTab: string;
  deck: ResolvedDeck;
};

export function EditorActions(props: Props) {
  const { currentTab, deck } = props;

  const [, navigate] = useLocation();
  const toast = useToast();
  const { t } = useTranslation();

  const hasEdits = useStore((state) => !!state.deckEdits[deck.id]);
  const connectionLock = useStore((state) =>
    selectConnectionLockForDeck(state, deck),
  );

  const discardEdits = useStore((state) => state.discardEdits);
  const saveDeck = useStore((state) => state.saveDeck);
  const duplicateDeck = useStore((state) => state.duplicateDeck);

  const validation = useStore((state) => selectDeckValid(state, deck));

  const onduplicateWithEdits = useCallback(() => {
    const id = duplicateDeck(deck.id, { applyEdits: true });
    navigate(`~/deck/view/${id}`);
  }, [duplicateDeck, deck.id, navigate]);

  const onSave = useCallback(
    async (stayOnPage?: boolean) => {
      const toastId = toast.show({
        children: t("deck_edit.save_loading"),
        variant: "loading",
      });

      try {
        const id = await saveDeck(deck.id);
        toast.dismiss(toastId);

        toast.show({
          children: t("deck_edit.save_success"),
          duration: 3000,
          variant: "success",
        });

        if (!stayOnPage) navigate(`~/deck/view/${id}`);
      } catch (err) {
        toast.dismiss(toastId);

        toast.show({
          children: (
            <>
              <p>
                {t("deck_edit.save_error", { error: (err as Error).message })}
              </p>
              {err instanceof UnsupportedPublishError && (
                <Button
                  className={css["error-action"]}
                  onClick={onduplicateWithEdits}
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
    [saveDeck, navigate, deck.id, toast, onduplicateWithEdits, t],
  );

  const onDiscard = useCallback(
    (stayOnPage?: boolean) => {
      const confirmed =
        !hasEdits || window.confirm(t("deck_edit.discard_confirm"));
      if (confirmed) {
        discardEdits(deck.id);
        if (!stayOnPage) navigate(`~/deck/view/${deck.id}`);
      }
    },
    [discardEdits, navigate, deck.id, hasEdits, t],
  );

  const onQuicksave = useCallback(() => onSave(true), [onSave]);
  const onQuickDiscard = useCallback(() => onDiscard(true), [onDiscard]);

  const onSaveClose = useCallback(() => onSave(false), [onSave]);
  const onDiscardClose = useCallback(() => onDiscard(false), [onDiscard]);

  useHotkey("cmd+s", onSaveClose, {
    allowInputFocused: true,
  });

  useHotkey("cmd+shift+s", onQuicksave, {
    allowInputFocused: true,
  });

  useHotkey("cmd+backspace", onDiscardClose);
  useHotkey("cmd+shift+backspace", onQuickDiscard);

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
        <HotkeyTooltip keybind="cmd+s" description={t("deck_edit.save")}>
          <Button
            data-testid="editor-save"
            onClick={onSaveClose}
            disabled={!!connectionLock || readonly}
            tooltip={
              connectionLock
                ? connectionLock
                : readonly
                  ? t("deck_edit.readonly")
                  : undefined
            }
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
            onClick={onDiscardClose}
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
