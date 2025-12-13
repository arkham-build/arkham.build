import { LoaderCircleIcon } from "lucide-react";
import { LOCALES } from "@/utils/constants";
import { cx } from "@/utils/cx";
import css from "./locale-select.module.css";
import { CustomSelect } from "./ui/custom-select";

type Props = {
  id?: string;
  loading?: boolean;
  onValueChange: (value: string) => void;
  value: string;
  variant?: "compact";
};

export function LocaleSelect(props: Props) {
  const { variant, loading, id, onValueChange, value } = props;
  const options = Object.values(LOCALES);

  return (
    <CustomSelect
      className={cx(css["select"], variant && css[variant])}
      id={id}
      items={options}
      renderControl={(item) => {
        if (!item) return null;
        return (
          <span className={css["control-row"]}>
            {loading && <LoaderCircleIcon className="spin" />}
            {variant === "compact" ? (
              <LocaleIcon locale={item.value} />
            ) : (
              <>
                <LocaleIcon locale={item.value} /> {item.label}
              </>
            )}
          </span>
        );
      }}
      renderItem={(item) => {
        if (!item) return null;
        return (
          <span className={css["control-row"]}>
            <LocaleIcon locale={item.value} />
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
