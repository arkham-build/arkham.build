import { cx } from "@/utils/cx";
import css from "./card.module.css";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  size: "compact" | "tooltip" | "full";
}

export function CardContainer(props: Props) {
  const { children, className, size, ...rest } = props;
  return (
    <div {...rest} className={cx(css["container"], css[size], className)}>
      {children}
    </div>
  );
}
