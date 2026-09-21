import { useEffect, useRef } from "react";
import { Toaster as SonnerToaster } from "sonner";
import { useLocation } from "wouter";
import { dismissRouteToasts } from "./toast.hooks";
import css from "./toast.module.css";

export function Toaster() {
  const [location] = useLocation();
  const previousLocation = useRef(location);

  useEffect(() => {
    if (previousLocation.current === location) return;

    previousLocation.current = location;
    dismissRouteToasts();
  }, [location]);

  return (
    <SonnerToaster
      className={css["toast-container"]}
      gap={16}
      mobileOffset={{
        bottom: "calc(1rem + var(--safe-area-bottom))",
        left: "calc(1rem + var(--safe-area-left))",
        right: "calc(1rem + var(--safe-area-right))",
      }}
      offset={{
        bottom: "calc(1rem + var(--safe-area-bottom))",
        right: "calc(1rem + var(--safe-area-right))",
      }}
      toastOptions={{
        classNames: {
          closeButton: css["toast-dismiss"],
          content: css["content"],
          error: css["error"],
          icon: css["icon"],
          success: css["success"],
          toast: css["toast"],
        },
        closeButtonAriaLabel: "Dismiss",
        unstyled: true,
      }}
    />
  );
}
