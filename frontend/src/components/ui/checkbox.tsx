import type { CheckboxProps } from "@radix-ui/react-checkbox";
import { Indicator, Root } from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import { forwardRef, useCallback, useRef } from "react";
import { cx } from "@/utils/cx";
import css from "./checkbox.module.css";

interface Props extends Omit<CheckboxProps, "label"> {
  className?: string;
  hideLabel?: boolean;
  id?: string;
  label: React.ReactNode;
}

export const Checkbox = forwardRef(function Checkbox(
  props: Props,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const { className, id, hideLabel, label, ...rest } = props;
  const checkboxRef = useRef<HTMLButtonElement>(null);

  const preventDefault = useCallback((evt: React.MouseEvent) => {
    evt.preventDefault();
  }, []);

  return (
    <div className={cx(css["checkbox"], className)} ref={ref}>
      <Root {...rest} className={css["root"]} id={id} ref={checkboxRef}>
        <Indicator className={css["indicator"]}>
          <CheckIcon />
        </Indicator>
      </Root>
      <label
        className={cx(css["label"], hideLabel && "sr-only")}
        onPointerDown={preventDefault}
        htmlFor={id}
      >
        {label}
      </label>
    </div>
  );
});
