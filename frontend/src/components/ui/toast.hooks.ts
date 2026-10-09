import type { ReactNode } from "react";
import { toast } from "sonner";
import { randomId } from "@/utils/crypto";

export type ToastPayload = {
  children: ReactNode | ((props: { onClose: () => void }) => ReactNode);
  duration?: number;
  id?: string;
  persistent?: boolean;
  variant?: "success" | "error" | "loading";
};

const routeDismissibleToastIds = new Set<string>();

const toastApi = {
  show: showToast,
  dismiss: dismissToast,
};

export function useToast() {
  return toastApi;
}

export function dismissRouteToasts() {
  for (const id of routeDismissibleToastIds) {
    toast.dismiss(id);
  }
  routeDismissibleToastIds.clear();
}

function showToast(value: ToastPayload) {
  const id = value.id ?? randomId();
  const dismiss = () => dismissToast(id);
  const message =
    typeof value.children === "function"
      ? value.children({ onClose: dismiss })
      : value.children;
  const options = {
    closeButton: !value.duration,
    duration: value.duration || Infinity,
    id,
    onAutoClose: forgetToast,
    onDismiss: forgetToast,
    testId: "toast",
  };

  switch (value.variant) {
    case "success":
      toast.success(message, options);
      break;
    case "error":
      toast.error(message, options);
      break;
    case "loading":
      toast.loading(message, options);
      break;
    default:
      toast(message, options);
  }

  if (!value.duration && !value.persistent) {
    routeDismissibleToastIds.add(id);
  } else {
    routeDismissibleToastIds.delete(id);
  }

  return id;
}

function dismissToast(id: string) {
  routeDismissibleToastIds.delete(id);
  toast.dismiss(id);
}

function forgetToast(value: { id: string | number }) {
  routeDismissibleToastIds.delete(String(value.id));
}
