import clsx from "clsx";
import css from "./quantity-output.module.css";

type Props = {
  className?: string;
  value: number;
} & React.HTMLAttributes<HTMLSpanElement>;

export function QuantityOutput(props: Props) {
  const { className, value, ...rest } = props;

  return (
    <span className={clsx(css["container"], className)} {...rest}>
      <strong className={css["value"]} data-testid="quantity-value">
        {value}
      </strong>
      <span className={css["x"]}>×</span>
    </span>
  );
}
