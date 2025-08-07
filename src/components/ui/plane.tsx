import { cx } from "@/utils/cx";
import css from "./plane.module.css";

type Props<T extends React.ElementType = "div"> = {
  as?: T;
  children: React.ReactNode;
  className?: string;
} & React.ComponentPropsWithoutRef<T>;

export function Plane<T extends React.ElementType>(props: Props<T>) {
  const { as, children, className, ...rest } = props;

  const Element = as ?? "div";

  return (
    <Element {...rest} className={cx(css["plane"], className)}>
      {children}
    </Element>
  );
}
