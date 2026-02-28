import { SearchIcon, XIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { cx } from "@/utils/cx";
import { Button } from "./button";
import css from "./search-input.module.css";

interface Props extends React.ComponentProps<"input"> {
  bindSlashKey?: boolean;
  className?: string;
  error?: Error;
  iconSlotSize?: number;
  iconSlot?: React.ReactNode;
  inputClassName?: string;
  label?: string;
  omitSearchIcon?: boolean;
  onValueChange: (value: string) => void;
  id: string;
  value: string;
}

export function SearchInput({
  bindSlashKey,
  className,
  error,
  iconSlot,
  iconSlotSize,
  inputClassName,
  id,
  label,
  omitSearchIcon,
  onValueChange,
  ref,
  value,
  ...rest
}: Props) {
  const onClear = useCallback(() => {
    onValueChange("");
  }, [onValueChange]);

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      if (evt.target instanceof HTMLInputElement) {
        onValueChange(evt.target.value);
      }
    },
    [onValueChange],
  );

  const cssVariables = useMemo(
    () =>
      ({
        "--icon-slot-size": iconSlotSize ? `${iconSlotSize}px` : "0px",
      }) as React.CSSProperties,
    [iconSlotSize],
  );

  return (
    <div
      className={cx(
        css["search"],
        !omitSearchIcon && css["has-icon"],
        error && css["has-error"],
        className,
      )}
      style={cssVariables}
    >
      {!omitSearchIcon && (
        <label htmlFor={id} title={label}>
          <SearchIcon className={css["icon_search"]} />
        </label>
      )}
      <input
        {...rest}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className={cx(css["input"], inputClassName)}
        id={id}
        onChange={onChange}
        ref={ref}
        type="text"
        value={value}
      />
      {(!!iconSlot || !!value) && (
        <div className={css["icon_clear"]}>
          {iconSlot}
          {!!value && (
            <Button iconOnly onClick={onClear} variant="bare" size="sm">
              <XIcon />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
