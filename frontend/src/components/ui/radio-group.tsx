import { cx } from "@/utils/cx";
import {
  RadioGroupContext,
  useRadioGroupItem,
  useRadioGroupProvider,
} from "./radio-group.context";
import css from "./radio-group.module.css";

export interface RadioGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  disabled?: boolean;
  onValueChange?(value: string): void;
  value?: string;
}

export function RadioGroup(props: RadioGroupProps) {
  const { className, disabled, onValueChange, value, children, ...rest } =
    props;
  const ctx = useRadioGroupProvider({ disabled, onValueChange, value });

  return (
    <RadioGroupContext value={ctx}>
      <div role="radiogroup" className={cx(css["root"], className)} {...rest}>
        {children}
      </div>
    </RadioGroupContext>
  );
}

export interface RadioGroupItemProps
  extends Omit<React.HTMLAttributes<HTMLLabelElement>, "id" | "onChange"> {
  disabled?: boolean;
  value: string;
}

export function RadioGroupItem(props: RadioGroupItemProps) {
  const { className, children, value, disabled: itemDisabled, ...rest } = props;
  const { checked, disabled, handleChange, id, name } = useRadioGroupItem(
    value,
    itemDisabled,
  );

  return (
    <label className={cx(css["wrapper"], className)} {...rest}>
      <span className={css["item"]}>
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
        {checked && <span className={css["indicator"]} />}
      </span>
      <span className={css["label"]}>{children}</span>
    </label>
  );
}
