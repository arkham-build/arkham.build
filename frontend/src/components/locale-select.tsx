import { LoaderCircleIcon } from "lucide-react";
import { LOCALES } from "@/utils/constants";
import { cx } from "@/utils/cx";
import css from "./locale-select.module.css";
import { CustomSelect } from "./ui/custom-select";

type Props = {
  className?: string;
  id?: string;
  loading?: boolean;
  onValueChange: (value: string) => void;
  value: string;
  variant?: "compact";
  fullWidth?: boolean;
  portal?: boolean;
};

export function LocaleSelect(props: Props) {
  const {
    className,
    variant,
    fullWidth,
    loading,
    id,
    onValueChange,
    value,
    portal,
  } = props;
  const options = Object.values(LOCALES);

  return (
    <CustomSelect
      className={cx(
        css["select"],
        variant && css[variant],
        fullWidth && css["full-width"],
        className,
      )}
      id={id}
      items={options}
      menuClassName={css["menu"]}
      portal={portal}
      renderControl={(item) => {
        if (!item) return null;
        return (
          <span className={css["control-row"]}>
            {loading && <LoaderCircleIcon className="spin" />}
            {variant === "compact" ? (
              <LocaleIcon locale={item.displayValue ?? item.value} />
            ) : (
              <>
                <LocaleIcon locale={item.displayValue ?? item.value} />{" "}
                {item.label}
              </>
            )}
          </span>
        );
      }}
      renderItem={(item) => {
        if (!item) return null;
        return (
          <span className={css["control-row"]}>
            <LocaleIcon locale={item.displayValue ?? item.value} />
            {item.label}
          </span>
        );
      }}
      value={value}
      variant={variant}
      onValueChange={onValueChange}
    />
  );
}

function LocaleIcon({ locale }: { locale: string }) {
  return <span className={css["locale"]}>{locale.toUpperCase()}</span>;
}
