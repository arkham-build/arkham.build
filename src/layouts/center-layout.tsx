import { forwardRef } from "react";
import { cx } from "@/utils/cx";
import css from "./center-layout.module.css";

type Props = {
  children: React.ReactNode;
  className?: string;
  top?: React.ReactNode;
};

export const CenterLayout = forwardRef(function CenterLayout(
  props: Props,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const { children, className, top } = props;

  return (
    <div className={cx(css["layout"], className)} ref={ref}>
      {top && <div className={css["top"]}>{top}</div>}
      <div className={css["main"]}>{children}</div>
    </div>
  );
});
