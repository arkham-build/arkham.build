import { cx } from "@/utils/cx";
import css from "./quantity-output.module.css";

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
  value: number;
}

export function QuantityOutput(props: Props) {
  const { className, value, ...rest } = props;

  return (
    <span className={cx(css["container"], className)} {...rest}>
      <strong className={css["value"]} data-testid="quantity-value">
        {value}
      </strong>
      <span className={css["x"]}>×</span>
    </span>
  );
}
