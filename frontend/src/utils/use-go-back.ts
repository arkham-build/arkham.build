import { useCallback } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/store";

export function useGoBack(override?: string) {
  const [currentPath, navigate] = useLocation();

  const history = useStore((state) => state.ui.navigationHistory);
  const pruneHistory = useStore((state) => state.pruneHistory);

  const goBack = useCallback(() => {
    if (override) {
      navigate(override);
    } else {
      for (let i = history.length - 1; i >= 0; i--) {
        const location = history[i];
        if (!location.startsWith(currentPath)) {
          pruneHistory(i);
          navigate(location);
          return;
        }
      }

      navigate("/");
    }
  }, [navigate, history, override, currentPath, pruneHistory]);

  return goBack;
}
