import { cx } from "@/utils/cx";
import css from "./field.module.css";

interface Props extends React.ComponentProps<"div"> {
  bordered?: boolean;
  children: React.ReactNode;
  className?: string;
  full?: boolean;
  helpText?: React.ReactNode;
  padded?: boolean;
}

export function FieldLabel<T extends React.ElementType>({
  as,
  children,
  className,
  ...rest
}: {
  as?: T;
  children: React.ReactNode;
  className?: string;
} & React.ComponentProps<T>) {
  const Element: React.ElementType = as ?? "label";

  return (
    <Element className={cx(css["label"], className)} {...rest}>
      {children}
    </Element>
  );
}

export function Field(props: Props) {
  const { bordered, children, className, full, helpText, padded, ...rest } =
    props;

  return (
    <div
      {...rest}
      className={cx(
        css["field"],
        className,
        bordered && css["bordered"],
        padded && css["padded"],
        full && css["full"],
      )}
    >
      {children}
      {helpText && <div className={css["help"]}>{helpText}</div>}
    </div>
  );
}
