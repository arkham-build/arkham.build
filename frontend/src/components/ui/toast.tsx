import { FloatingPortal } from "@floating-ui/react";
import {
  CheckCircleIcon,
  CircleAlertIcon,
  LoaderCircleIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((value: ToastPayload) => {
    const id = randomId();
    setToasts((prev) => [...prev, { ...value, id }]);
    return id;
  }, []);

  const ctx = useMemo(
    () => ({ show: showToast, dismiss: dismissToast }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={ctx}>
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
    </ToastContext.Provider>
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

  const toastRef = useRef<HTMLOutputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const removeToast = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (!toastRef.current) {
        onRemove(id);
        return resolve();
      }

      setIsExiting(true);

      const afterExit = () => {
        toastRef.current?.removeEventListener("animationend", afterExit);
        onRemove(id);
        setIsExiting(false);
        return resolve();
      };

      toastRef.current.addEventListener("animationend", afterExit);
    });
  }, [id, onRemove]);

  useEffect(() => {
    if (!toast?.duration) return;

    timeoutRef.current = setTimeout(() => {
      removeToast();
    }, toast.duration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [toast, removeToast]);

  useEffect(() => {
    if (
      !toast.duration &&
      locationRef.current !== location &&
      !toast.persistent
    ) {
      removeToast();
    }
  }, [location, removeToast, toast.duration, toast.persistent]);

  return (
    <output
      className={cx(
        css["toast"],
        toast.variant && css[toast.variant],
        isExiting && css["exiting"],
        !toast.duration && css["closable"],
      )}
      data-testid="toast"
      ref={toastRef}
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
