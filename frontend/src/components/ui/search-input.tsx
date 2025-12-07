import { SearchIcon, XIcon } from "lucide-react";
import { forwardRef, useCallback } from "react";
import { cx } from "@/utils/cx";
import { Button } from "./button";
import css from "./search-input.module.css";

interface Props extends React.ComponentProps<"input"> {
  className?: string;
  inputClassName?: string;
  label?: string;
  omitSearchIcon?: boolean;
  onChangeValue: (value: string) => void;
  id: string;
  value: string;
}

export const SearchInput = forwardRef<HTMLInputElement, Props>(
  function SearchInput(
    {
      className,
      inputClassName,
      id,
      label,
      omitSearchIcon,
      onChangeValue,
      value,
      ...rest
    },
    ref,
  ) {
    const onClear = useCallback(() => {
      onChangeValue("");
    }, [onChangeValue]);

    const onChange = useCallback(
      (evt: React.ChangeEvent<HTMLInputElement>) => {
        if (evt.target instanceof HTMLInputElement) {
          onChangeValue(evt.target.value);
        }
      },
      [onChangeValue],
    );

    return (
      <div
        className={cx(
          css["search"],
          !omitSearchIcon && css["has-icon"],
          className,
        )}
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
        {!!value && (
          <Button
            className={css["icon_clear"]}
            iconOnly
            onClick={onClear}
            variant="bare"
          >
            <XIcon />
          </Button>
        )}
      </div>
    );
  },
);
