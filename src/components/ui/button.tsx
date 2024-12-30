import { cx } from "@/utils/cx";
import { forwardRef } from "react";
import css from "./button.module.css";
import { DefaultTooltip } from "./tooltip";

export type ButtonType = "a" | "button" | "summary" | "label";

export type Props<T extends ButtonType> = React.ComponentProps<T> & {
  as?: T;
  children: React.ReactNode;
  className?: string;
  iconOnly?: boolean;
  variant?: "primary" | "secondary" | "bare";
  size?: "xs" | "sm" | "lg" | "full" | "none";
  tooltip?: React.ReactNode;
  round?: boolean;
};

export const Button = forwardRef(function Button<
  T extends "a" | "button" | "summary" | "label",
>(props: Props<T>, ref: React.ForwardedRef<Element>) {
  const {
    as,
    children,
    iconOnly,
    variant = "secondary",
    size,
    tooltip,
    round,
    ...rest
  } = props;
  // biome-ignore lint/suspicious/noExplicitAny: safe.
  const Element: any = as ?? "button";

  return (
    <DefaultTooltip tooltip={tooltip}>
      <Element
        {...rest}
        className={cx(
          css["button"],
          variant && css[variant],
          size && css[size],
          iconOnly && css["icon-only"],
          round && css["round"],
          rest.className,
        )}
        ref={ref}
      >
        {children}
      </Element>
    </DefaultTooltip>
  );
});
