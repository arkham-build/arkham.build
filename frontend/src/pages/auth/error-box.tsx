import { cx } from "@/utils/cx";
import css from "./error-box.module.css";

export function ErrorBox({
  children,
  className,
  ...rest
}: React.ComponentPropsWithoutRef<"output">) {
  return (
    <output {...rest} className={cx(css["error"], className)}>
      {children}
    </output>
  );
}
