import { createContext, useContext } from "react";
import type { CardFormat } from "./cards-to-markdown";

export type CardOrigin = "deck" | "usable" | "player" | "campaign";
export type ToolbarPopover = "symbols" | "cards";

interface TextareaContextType {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;

  cardFormat: CardFormat;
  cardOrigin: CardOrigin;

  popoverOpen: ToolbarPopover | undefined;
  settingsChanged: boolean;

  insertTextAtCaret: (text: string) => void;
  setCardOrigin: (origin: CardOrigin) => void;
  setCardFormat: (format: CardFormat) => void;
  setPopoverOpen: (popover: ToolbarPopover | undefined) => void;
}

export const NotesRichTextEditorContext = createContext<
  TextareaContextType | undefined
>(undefined);

export function useNotesRichTextEditorContext() {
  const context = useContext(NotesRichTextEditorContext);

  if (!context) {
    throw new Error(
      "useNotesRichTextEditorContext must be used within a TextareaProvider",
    );
  }

  return context;
}
