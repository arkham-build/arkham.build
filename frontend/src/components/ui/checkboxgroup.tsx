import { cx } from "@/utils/cx";
import css from "./checkboxgroup.module.css";

type Props = {
  as?: "fieldset" | "div";
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2;
};

export function CheckboxGroup(props: Props) {
  const { as = "fieldset", children, className, cols = 1 } = props;
  const Tag = as;
  return (
    <Tag className={cx(css["checkboxgroup"], css[`cols-${cols}`], className)}>
      {children}
    </Tag>
  );
}
