import { cx } from "@/utils/cx";
import css from "./auth-form.module.css";

export function AuthForm({
  className,
  ...rest
}: React.ComponentPropsWithoutRef<"form">) {
  return <form {...rest} className={cx(css["form"], className)} />;
}
