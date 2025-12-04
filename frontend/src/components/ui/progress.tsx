import { useMemo } from "react";
import { cx } from "@/utils/cx";
import css from "./progress.module.css";

type Props = {
  className?: string;
  max: number;
  validateInRange?: boolean;
  value: number;
};

export function Progress(props: Props) {
  const { className, max: _max, validateInRange, value } = props;

  const max = Math.max(1, _max);

  const invalid = validateInRange ? value > max : false;

  const cssVariables = useMemo(
    () =>
      ({
        "--progress-value": `${(Math.max(0, Math.min(value, max)) / max) * 100}%`,
      }) as React.CSSProperties,
    [value, max],
  );

  return (
    <div className={cx(css["progress"], className, invalid && css["invalid"])}>
      <span className={css["progress-value"]} style={cssVariables} />
    </div>
  );
}
