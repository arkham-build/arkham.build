import { InfoIcon, TriangleAlertIcon } from "lucide-react";
import { cx } from "@/utils/cx";
import css from "./notice.module.css";

type Variant = "info" | "warning";

type Props = {
  as?: React.JSX.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
};

function getIconForVariant(variant?: Variant) {
  switch (variant) {
    case "info":
      return <InfoIcon />;

    case "warning":
      return <TriangleAlertIcon />;

    default:
      return null;
  }
}

export function Notice(props: Props) {
  const { as = "div", className, children, variant } = props;
  const Element = as;

  const icon = getIconForVariant(variant);

  return (
    <Element className={cx(css["notice"], variant && css[variant], className)}>
      {!!icon && <div className={css["notice-icon"]}>{icon}</div>}
      <div className={css["notice-content"]}>{children}</div>
    </Element>
  );
}
