import { useEffect } from "react";

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    if (title) document.title = `${title} · ${import.meta.env.VITE_PAGE_NAME}`;
  }, [title]);
}
