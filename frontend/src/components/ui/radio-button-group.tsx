import { cx } from "@/utils/cx";
import css from "./radio-button-group.module.css";
import {
  RadioGroupContext,
  useRadioGroupItem,
  useRadioGroupProvider,
} from "./radio-group.context";
import { DefaultTooltip } from "./tooltip";

export interface RadioButtonGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  disabled?: boolean;
  full?: boolean;
  icons?: boolean;
  onValueChange?(value: string): void;
  value?: string;
}

export function RadioButtonGroup(props: RadioButtonGroupProps) {
  const {
    full,
    icons,
    className,
    disabled,
    onValueChange,
    value,
    children,
    ...rest
  } = props;
  const ctx = useRadioGroupProvider({ disabled, onValueChange, value });

  return (
    <RadioGroupContext value={ctx}>
      <div
        role="radiogroup"
        {...rest}
        className={cx(
          css["radio-button-group"],
          className,
          full && css["is-full"],
          icons && css["is-icons"],
        )}
      >
        {children}
      </div>
    </RadioGroupContext>
  );
}

export interface RadioButtonGroupItemProps
  extends Omit<React.HTMLAttributes<HTMLLabelElement>, "onChange"> {
  disabled?: boolean;
  size?: "small" | "default";
  tooltip?: React.ReactNode;
  value: string;
  variant?: "bare";
}

export function RadioButtonGroupItem({
  className,
  size,
  tooltip,
  variant,
  value,
  disabled: itemDisabled,
  children,
  ...rest
}: RadioButtonGroupItemProps) {
  const { checked, disabled, handleChange, id, name } = useRadioGroupItem(
    value,
    itemDisabled,
  );

  return (
    <DefaultTooltip tooltip={tooltip}>
      <label
        {...rest}
        htmlFor={id}
        className={cx(
          css["item"],
          size && css[size],
          variant && css[variant],
          className,
        )}
      >
        <input
          type="radio"
          className={cx(css["input"], "sr-only")}
          id={id}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
        />
        {children}
      </label>
    </DefaultTooltip>
  );
}
