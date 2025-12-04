import { forwardRef } from "react";
import { cx } from "@/utils/cx";
import css from "./tag.module.css";

type Props<T extends React.ElementType> = {
  as?: T;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "xs";
  variant?: "inverse";
};

export const Tag = forwardRef(function TagInner<T extends React.ElementType>(
  props: Props<T>,
  ref: React.Ref<T>,
) {
  const { as = "span", children, className, size, variant, ...rest } = props;
  const Element: React.ElementType = as;

  return (
    <Element
      {...rest}
      className={cx(
        css["tag"],
        size && css[size],
        variant && css[variant],
        className,
      )}
      ref={ref}
    >
      {children}
    </Element>
  );
});
