import { MinusIcon, PlusIcon } from "lucide-react";
import { cx } from "@/utils/cx";
import { Button } from "./button";
import css from "./quantity-input.module.css";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
  tabIndex?: number;
  limitOverride?: number;
  onValueChange?: (value: number, limit: number) => void;
  value: number;
  limit: number;
}

export function QuantityInput(props: Props) {
  const {
    className,
    disabled,
    limit,
    limitOverride,
    onValueChange,
    tabIndex,
    value,
    ...rest
  } = props;

  const decrementCardQuantity = () => {
    if (value <= 0) return;
    onValueChange?.(-1, limit);
  };

  const incrementCardQuantity = () => {
    if (value >= limit) return;
    onValueChange?.(1, limit);
  };

  return (
    <div {...rest} className={cx(css["container"], className)}>
      <Button
        data-testid="quantity-decrement"
        disabled={disabled || value <= 0}
        iconOnly
        onClick={decrementCardQuantity}
        size="sm"
        tabIndex={tabIndex}
        variant="bare"
      >
        <MinusIcon />
      </Button>
      <strong className={css["value"]} data-testid="quantity-value">
        {value}
        {limitOverride != null && (
          <small className={css["value-override"]}>/{limitOverride}</small>
        )}
      </strong>
      <Button
        data-testid="quantity-increment"
        disabled={disabled || value >= limit}
        iconOnly
        onClick={incrementCardQuantity}
        size="sm"
        tabIndex={tabIndex}
        variant="bare"
      >
        <PlusIcon />
      </Button>
    </div>
  );
}
