import { cx } from "@/utils/cx";
import css from "./status-pill.module.css";

type Props = {
  children: React.ReactNode;
  className?: string;
  color?: string;
  icon?: React.ReactNode;
  testId?: string;
};

export function StatusPill(props: Props) {
  const { children, className, color, icon, testId } = props;

  return (
    <output
      className={cx(css["status-pill"], className)}
      data-testid={testId}
      style={
        color
          ? ({ "--status-pill-color": color } as React.CSSProperties)
          : undefined
      }
    >
      {icon && <span className={css["icon"]}>{icon}</span>}
      <span>{children}</span>
    </output>
  );
}
