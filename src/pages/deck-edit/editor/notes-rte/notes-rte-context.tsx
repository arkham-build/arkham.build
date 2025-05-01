import type { CARD_FORMATS } from "@/pages/deck-edit/editor/notes-rte/cards-to-markdown";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToolbarPopover = "symbols" | "cards";
export type CardOrigin = "deck" | "usable" | "player" | "campaign";
export type CardFormat = keyof typeof CARD_FORMATS;

interface TextareaContextType {
  textareaRef: React.RefObject<HTMLTextAreaElement>;

  cardFormat: CardFormat;
  cardOrigin: CardOrigin;

  popoverOpen: ToolbarPopover | undefined;

  insertTextAtCaret: (text: string) => void;
  setCardOrigin: (origin: CardOrigin) => void;
  setCardFormat: (format: CardFormat) => void;
  setPopoverOpen: (popover: ToolbarPopover | undefined) => void;
}

const NotesRichTextEditorContext = createContext<
  TextareaContextType | undefined
>(undefined);

export function NotesRichTextEditorContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cardOrigin, setCardOrigin] = useState<CardOrigin>("deck");
  const [cardFormat, setCardFormat] = useState<CardFormat>("paragraph");
  const [popoverOpen, setPopoverOpen] = useState<ToolbarPopover | undefined>(
    undefined,
  );

  const insertTextAtCaret = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    document.execCommand("insertText", false, text);

    textarea.dispatchEvent(
      new Event("input", {
        bubbles: true,
        cancelable: true,
      }),
    );

    setTimeout(() => {
      textarea.focus();
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      textareaRef,
      insertTextAtCaret,
      cardOrigin,
      cardFormat,
      popoverOpen,
      setCardOrigin,
      setCardFormat,
      setPopoverOpen,
    }),
    [insertTextAtCaret, cardOrigin, cardFormat, popoverOpen],
  );

  return (
    <NotesRichTextEditorContext.Provider value={contextValue}>
      {children}
    </NotesRichTextEditorContext.Provider>
  );
}

export function useNotesRichTextEditorContext() {
  const context = useContext(NotesRichTextEditorContext);

  if (!context) {
    throw new Error(
      "useNotesRichTextEditorContext must be used within a TextareaProvider",
    );
  }

  return context;
}
