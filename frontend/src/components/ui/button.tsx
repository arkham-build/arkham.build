import { cx } from "@/utils/cx";
import css from "./button.module.css";
import { DefaultTooltip } from "./tooltip";

export type ButtonType = "a" | "button" | "summary" | "label";

type ButtonRounding = "full" | "lg" | "xl";

export type Props<T extends ButtonType> = React.ComponentProps<T> & {
  as?: T;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  full?: boolean;
  iconOnly?: boolean;
  rounded?: ButtonRounding;
  size?: "xxs" | "xs" | "sm" | "lg" | "xl" | "none";
  tooltip?: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "bare" | "link";
};

export function Button<T extends "a" | "button" | "summary" | "label">(
  props: Props<T>,
) {
  const {
    as,
    children,
    disabled,
    full,
    iconOnly,
    ref,
    rounded,
    size,
    tooltip,
    variant = "secondary",
    ...rest
  } = props;
  // oxlint-disable-next-line typescript/no-explicit-any -- safe.
  const Element: any = disabled ? "button" : (as ?? "button");

  return (
    <DefaultTooltip tooltip={tooltip}>
      <Element
        {...rest}
        className={cx(
          css["button"],
          variant && css[variant],
          size && css[size],
          full && css["full"],
          iconOnly && css["icon-only"],
          rounded && css[`rounded-${rounded}`],
          rest.className,
        )}
        type={
          Element === "button"
            ? ((rest as React.ComponentProps<"button">).type ?? "button")
            : undefined
        }
        disabled={disabled}
        ref={ref}
      >
        {children}
      </Element>
    </DefaultTooltip>
  );
}
