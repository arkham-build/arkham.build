import { useStore } from "@/store";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CardFormat } from "./cards-to-markdown";

export type ToolbarPopover = "symbols" | "cards";
export type CardOrigin = "deck" | "usable" | "player" | "campaign";

interface TextareaContextType {
  textareaRef: React.RefObject<HTMLTextAreaElement>;

  cardFormat: CardFormat;
  cardOrigin: CardOrigin;

  popoverOpen: ToolbarPopover | undefined;
  settingsChanged: boolean;

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

  const { defaultOrigin, defaultFormat } = useStore(
    (state) => state.settings.notesEditor,
  );

  const [cardOrigin, setCardOrigin] = useState<CardOrigin>(defaultOrigin);
  const [cardFormat, setCardFormat] = useState<CardFormat>(defaultFormat);
  const [popoverOpen, setPopoverOpen] = useState<ToolbarPopover | undefined>(
    undefined,
  );

  const insertTextAtCaret = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (document.activeElement !== textarea) {
      textarea.focus();
    }

    document.execCommand("insertText", false, text);

    textarea.dispatchEvent(
      new Event("input", {
        bubbles: true,
        cancelable: true,
      }),
    );

    setTimeout(() => {
      if (document.activeElement !== textarea) {
        textarea.focus();
      }
    });
  }, []);

  const settingsChanged =
    defaultFormat !== cardFormat || defaultOrigin !== cardOrigin;

  const contextValue = useMemo(
    () => ({
      textareaRef,
      insertTextAtCaret,
      cardOrigin,
      cardFormat,
      popoverOpen,
      settingsChanged,
      setCardOrigin,
      setCardFormat,
      setPopoverOpen,
    }),
    [insertTextAtCaret, cardOrigin, cardFormat, popoverOpen, settingsChanged],
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
