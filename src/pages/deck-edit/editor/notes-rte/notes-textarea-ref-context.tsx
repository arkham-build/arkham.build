import { createContext, useRef } from "react";
import type { RefObject } from "react";

/**
 * Allows focusing or moving the caret of description textarea from other components.
 */
export const NotesTextareaRefContext = createContext<
  RefObject<HTMLTextAreaElement>
>({ current: null });

export function NotesTextareaRefContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <NotesTextareaRefContext.Provider value={ref}>
      {children}
    </NotesTextareaRefContext.Provider>
  );
}
