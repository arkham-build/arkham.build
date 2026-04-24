import { useCallback, useMemo, useRef, useState } from "react";
import { useStore } from "@/store";
import type { CardFormat } from "./cards-to-markdown";
import {
  type CardOrigin,
  NotesRichTextEditorContext,
  type ToolbarPopover,
} from "./notes-rte-context";

export function NotesRichTextEditorContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
    <NotesRichTextEditorContext value={contextValue}>
      {children}
    </NotesRichTextEditorContext>
  );
}
