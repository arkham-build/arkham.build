import { cx } from "@/utils/cx";
import css from "./select.module.css";

export type SelectOption = {
  label: string;
  value: string | number;
};

export interface Props extends React.ComponentProps<"select"> {
  required?: boolean;
  emptyLabel?: string;
  options: SelectOption[];
  className?: string;
  variant?: "compressed";
}

export function Select(props: Props) {
  const { emptyLabel, options, required, className, variant, ...rest } = props;
  return (
    <select
      className={cx(css["select"], variant && css[variant], className)}
      {...rest}
    >
      {!required && <option value="">{emptyLabel}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
