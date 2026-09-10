import { CircleAlertIcon } from "lucide-react";
import { cx } from "@/utils/cx";
import css from "./status-bubble.module.css";

type StatusBubbleVariant = "error" | "loading" | "success" | "warning";

type Props = React.ComponentPropsWithoutRef<"div"> & {
  label?: string;
  variant?: StatusBubbleVariant;
};

export function StatusBubble({
  className,
  label,
  variant = "error",
  ...rest
}: Props) {
  const showIcon = variant === "error" || variant === "warning";

  return (
    <div
      {...rest}
      aria-hidden={label ? undefined : true}
      className={cx(css["status-bubble"], css[variant], className)}
      role={label ? "status" : undefined}
      title={label}
    >
      {showIcon && <CircleAlertIcon />}
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}
