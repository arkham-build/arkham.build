import { createContext, useRef } from "react";
import type { RefObject } from "react";

/**
 * Allows focusing or moving the caret of description textarea from other components.
 */
export const NotesRichTextEditorContext = createContext<
  RefObject<HTMLTextAreaElement>
>({ current: null });

export function NotesTextareaRefContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <NotesRichTextEditorContext.Provider value={ref}>
      {children}
    </NotesRichTextEditorContext.Provider>
  );
}
