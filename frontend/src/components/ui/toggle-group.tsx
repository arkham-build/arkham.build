import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { cx } from "@/utils/cx";
import css from "./toggle-group.module.css";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface ToggleGroupContextValue {
  disabled?: boolean;
  isSelected(value: string): boolean;
  onItemClick(value: string): void;
}

const ToggleGroupContext = createContext<ToggleGroupContextValue>({
  isSelected: () => false,
  onItemClick: () => {},
});

interface ToggleGroupSingleProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  disabled?: boolean;
  type: "single";
  value?: string;
  onValueChange?(value: string): void;
}

interface ToggleGroupMultipleProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  disabled?: boolean;
  type: "multiple";
  value?: string[];
  onValueChange?(value: string[]): void;
}

export type ToggleGroupProps = (
  | ToggleGroupSingleProps
  | ToggleGroupMultipleProps
) & {
  full?: boolean;
  icons?: boolean;
};

export function ToggleGroup({
  className,
  disabled,
  full,
  icons,
  onValueChange,
  type,
  value,
  children,
  ...rest
}: ToggleGroupProps) {
  const shiftKeyPressed = useRef(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Shift") shiftKeyPressed.current = true;
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Shift") shiftKeyPressed.current = false;
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const isSelected = useCallback(
    (v: string) => {
      if (type === "single") return value === v;
      return (value as string[] | undefined)?.includes(v) ?? false;
    },
    [type, value],
  );

  const onItemClick = useCallback(
    (v: string) => {
      if (type === "single") {
        (onValueChange as ToggleGroupSingleProps["onValueChange"])?.(
          value === v ? "" : v,
        );
      } else {
        const current = (value as string[] | undefined) ?? [];
        let next = current.includes(v)
          ? current.filter((x) => x !== v)
          : [...current, v];
        if (shiftKeyPressed.current) {
          next = next.filter((x) => !current.includes(x));
        }
        (onValueChange as ToggleGroupMultipleProps["onValueChange"])?.(next);
      }
    },
    [type, value, onValueChange],
  );

  const ctx = useMemo(
    () => ({ disabled, isSelected, onItemClick }),
    [disabled, isSelected, onItemClick],
  );

  return (
    <ToggleGroupContext value={ctx}>
      <div
        {...rest}
        className={cx(
          css["togglegroup"],
          className,
          full && css["is-full"],
          icons && css["is-icons"],
        )}
      >
        {children}
      </div>
    </ToggleGroupContext>
  );
}

type GroupItemProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "value"
> & {
  ref?: React.Ref<HTMLButtonElement>;
  tooltip?: string;
  value: string;
};

export function ToggleGroupItem({
  className,
  tooltip,
  value,
  onClick,
  ref,
  ...rest
}: GroupItemProps) {
  const {
    disabled: groupDisabled,
    isSelected,
    onItemClick,
  } = useContext(ToggleGroupContext);
  const selected = isSelected(value);
  const disabled = rest.disabled ?? groupDisabled;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onItemClick(value);
      onClick?.(e);
    },
    [onItemClick, value, onClick],
  );

  const element = (
    <button
      type="button"
      {...rest}
      ref={ref}
      className={cx(css["item"], className)}
      data-state={selected ? "on" : "off"}
      aria-pressed={selected}
      disabled={disabled}
      onClick={handleClick}
    />
  );

  if (!tooltip) return element;

  return (
    <Tooltip delay={300}>
      <TooltipTrigger asChild>{element}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
