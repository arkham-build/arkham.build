import { CircleAlertIcon } from "lucide-react";
import { cx } from "@/utils/cx";
import css from "./status-bubble.module.css";

type StatusBubbleVariant = "error" | "loading" | "success" | "warning";

type Props = {
  label?: string;
  variant?: StatusBubbleVariant;
};

export function StatusBubble({ label, variant = "error" }: Props) {
  const showIcon = variant === "error" || variant === "warning";

  return (
    <div
      aria-hidden={label ? undefined : true}
      className={cx(css["status-bubble"], css[variant])}
      role={label ? "status" : undefined}
      title={label}
    >
      {showIcon && <CircleAlertIcon />}
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}
