import { EyeIcon, PilcrowIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import DeckDescription from "@/components/deck-description";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Hotkey } from "@/components/ui/hotkey";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "@/components/ui/modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import type { StoreState } from "@/store/slices";
import { debounce } from "@/utils/debounce";
import { useAccentColor } from "@/utils/use-accent-color";
import { CardsPopover } from "./cards-popover";
import css from "./notes-rte.module.css";
import { useNotesRichTextEditorContext } from "./notes-rte-context";
import { SymbolsPopover } from "./symbols-popover";

const selectUpdateDescription = createSelector(
  (state: StoreState) => state.updateDescription,
  (updateDescription) => debounce(updateDescription, 100),
);

export function NotesRichTextEditor({ deck }: { deck: ResolvedDeck }) {
  const { t } = useTranslation();
  const { textareaRef, setPopoverOpen } = useNotesRichTextEditorContext();
  const accentColorStyles = useAccentColor(deck.investigatorFront.card);

  const updateDescription = useStore(selectUpdateDescription);

  const onDescriptionChange = useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (evt.target instanceof HTMLTextAreaElement) {
        updateDescription(deck.id, evt.target.value);
      }
    },
    [updateDescription, deck.id],
  );

  const handleShortcuts = useCallback(
    (evt: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (evt.key === "Tab" && evt.shiftKey) {
        evt.preventDefault();
        setPopoverOpen("symbols");
      } else if (evt.key === "Tab") {
        evt.preventDefault();
        setPopoverOpen("cards");
      }
    },
    [setPopoverOpen],
  );

  return (
    <div className={css["rich-text-editor"]} style={accentColorStyles}>
      <NotesRichTextEditorToolbar deck={deck} />
      <textarea
        className={css["textarea"]}
        data-testid="editor-description"
        name="description"
        defaultValue={deck.description_md ?? ""}
        onChange={onDescriptionChange}
        onKeyDown={handleShortcuts}
        placeholder={t("deck_edit.notes.description_placeholder")}
        ref={textareaRef}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
    </div>
  );
}

function NotesRichTextEditorToolbar({ deck }: { deck: ResolvedDeck }) {
  const { t } = useTranslation();

  const { popoverOpen, setPopoverOpen, textareaRef } =
    useNotesRichTextEditorContext();

  const onCardsOpenChange = useCallback(
    (open: boolean) => {
      setPopoverOpen(open ? "cards" : undefined);
      textareaRef.current?.focus();
    },
    [setPopoverOpen, textareaRef.current],
  );

  const onSymbolsOpenChange = useCallback(
    (open: boolean) => {
      setPopoverOpen(open ? "symbols" : undefined);
      textareaRef.current?.focus();
    },
    [setPopoverOpen, textareaRef.current],
  );

  const onBlurPopover = useCallback(() => {
    setPopoverOpen(undefined);
    textareaRef.current?.focus();
  }, [setPopoverOpen, textareaRef.current]);

  return (
    <nav className={css["toolbar"]}>
      <div className={css["toolbar-actions"]}>
        <Popover
          placement="bottom-start"
          open={popoverOpen === "cards"}
          onOpenChange={onCardsOpenChange}
        >
          <PopoverTrigger asChild>
            <Button
              data-testid="notes-toolbar-cards"
              size="sm"
              tooltip={
                <Hotkey
                  keybind="tab"
                  description={t("deck_edit.notes.toolbar.card_tooltip")}
                />
              }
              variant={popoverOpen === "cards" ? "primary" : "secondary"}
            >
              <i className="icon-card-outline" />
              {t("deck_edit.notes.toolbar.card")}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className={css["toolbar-popover"]}>
              <CardsPopover deck={deck} onEscapePress={onBlurPopover} />
            </div>
          </PopoverContent>
        </Popover>
        <Popover
          placement="bottom-start"
          open={popoverOpen === "symbols"}
          onOpenChange={onSymbolsOpenChange}
        >
          <PopoverTrigger asChild>
            <Button
              data-testid="notes-toolbar-symbols"
              tooltip={
                <Hotkey
                  keybind="shift+tab"
                  description={t("deck_edit.notes.toolbar.symbol_tooltip")}
                />
              }
              size="sm"
              variant={popoverOpen === "symbols" ? "primary" : "secondary"}
            >
              <PilcrowIcon />
              {t("deck_edit.notes.toolbar.symbol")}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className={css["toolbar-popover"]}>
              <SymbolsPopover deck={deck} onEscapePress={onBlurPopover} />
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div>
        <Dialog
          onOpenChange={(val) => {
            if (!val) {
              textareaRef.current?.focus();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <EyeIcon />
              {t("deck_edit.notes.toolbar.preview")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <Modal>
              <ModalBackdrop />
              <ModalInner size="48rem">
                <ModalActions />
                <DefaultModalContent
                  title={t("deck_edit.notes.toolbar.preview")}
                >
                  <DeckDescription
                    className={css["preview"]}
                    content={deck.description_md ?? ""}
                  />
                </DefaultModalContent>
              </ModalInner>
            </Modal>
          </DialogContent>
        </Dialog>
      </div>
    </nav>
  );
}
