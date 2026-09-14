import { FloatingPortal } from "@floating-ui/react";
import {
  CheckCircleIcon,
  CircleAlertIcon,
  LoaderCircleIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import { randomId } from "@/utils/crypto";
import { cx } from "@/utils/cx";
import { Button } from "./button";
import {
  ToastContext,
  type ToastPayload,
  type Toast as ToastType,
} from "./toast.hooks";
import css from "./toast.module.css";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showToast = (value: ToastPayload) => {
    const id = randomId();
    setToasts((prev) => [...prev, { ...value, id }]);
    return id;
  };

  const ctx = { show: showToast, dismiss: dismissToast };

  return (
    <ToastContext value={ctx}>
      {children}
      <FloatingPortal id={FLOATING_PORTAL_ID}>
        <section className={css["toast-container"]}>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              id={toast.id}
              onRemove={dismissToast}
            />
          ))}
        </section>
      </FloatingPortal>
    </ToastContext>
  );
}

function Toast(props: {
  toast: ToastType;
  id: string;
  onRemove: (id: string) => void;
}) {
  const { toast, id, onRemove } = props;

  const [isExiting, setIsExiting] = useState(false);
  const [location] = useLocation();
  const locationRef = useRef(location);

  const removeToast = () => {
    setIsExiting(true);
  };

  useEffect(() => {
    if (!toast.duration) return;

    const timeout = setTimeout(() => setIsExiting(true), toast.duration);

    return () => {
      clearTimeout(timeout);
    };
  }, [toast.duration]);

  useEffect(() => {
    if (
      !toast.duration &&
      locationRef.current !== location &&
      !toast.persistent
    ) {
      setIsExiting(true);
    }
  }, [location, toast.duration, toast.persistent]);

  return (
    <output
      className={cx(
        css["toast"],
        toast.variant && css[toast.variant],
        isExiting && css["exiting"],
        !toast.duration && css["closable"],
      )}
      data-testid="toast"
      onAnimationEnd={(event) => {
        if (event.currentTarget === event.target && isExiting) onRemove(id);
      }}
    >
      {toast.variant === "success" && (
        <CheckCircleIcon className={css["icon"]} />
      )}
      {toast.variant === "error" && <CircleAlertIcon className={css["icon"]} />}
      {toast.variant === "loading" && <LoaderCircleIcon className="spin" />}
      <div>
        {typeof toast.children === "function"
          ? toast.children({ onClose: removeToast })
          : toast.children}
        {!toast.duration && (
          <Button
            aria-label="Dismiss"
            className={css["toast-dismiss"]}
            iconOnly
            onClick={removeToast}
            type="button"
            variant="bare"
            size="sm"
          >
            <XIcon />
          </Button>
        )}
      </div>
    </output>
  );
}
