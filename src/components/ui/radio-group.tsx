import {
  Indicator,
  Item,
  type RadioGroupIndicatorProps,
  type RadioGroupItemProps,
  type RadioGroupProps,
  Root,
} from "@radix-ui/react-radio-group";
import { cx } from "@/utils/cx";
import css from "./radio-group.module.css";

export function RadioGroup(props: RadioGroupProps) {
  const { className, ...rest } = props;
  return <Root className={cx(css["root"], className)} {...rest} />;
}

export function RadioGroupItem(
  props: RadioGroupItemProps & {
    value: string;
  },
) {
  const { className, children, value, ...rest } = props;
  return (
    <div className={cx(css["wrapper"], className)}>
      <Item className={css["item"]} {...rest} id={value} value={value}>
        <RadioGroupIndicator />
      </Item>
      <label className={css["label"]} htmlFor={value}>
        {children}
      </label>
    </div>
  );
}

function RadioGroupIndicator(props: RadioGroupIndicatorProps) {
  const { className, ...rest } = props;
  return <Indicator className={cx(css["indicator"], className)} {...rest} />;
}
