import { cx } from "@/utils/cx";
import css from "./tag.module.css";

type Props<T extends React.ElementType> = {
  as?: T;
  children: React.ReactNode;
  className?: string;
  ref?: React.Ref<T>;
  size?: "sm" | "xs";
  variant?: "inverse";
};

export function Tag<T extends React.ElementType>(props: Props<T>) {
  const {
    as = "span",
    children,
    className,
    size,
    variant,
    ref,
    ...rest
  } = props;
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
}
