import type {
  ToggleGroupItemProps,
  ToggleGroupMultipleProps,
  ToggleGroupSingleProps,
} from "@radix-ui/react-toggle-group";
import { Item, Root } from "@radix-ui/react-toggle-group";
import { forwardRef, useCallback, useEffect, useRef } from "react";
import { cx } from "@/utils/cx";
import css from "./toggle-group.module.css";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export type ToggleGroupProps = (
  | ToggleGroupSingleProps
  | ToggleGroupMultipleProps
) & {
  full?: boolean;
  icons?: boolean;
};

export function ToggleGroup({
  className,
  full,
  icons,
  onValueChange,
  type,
  value,
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

  const onValueChangeBound = useCallback(
    (val: string | string[]) => {
      if (type === "multiple" && shiftKeyPressed.current) {
        const newValue = (val as string[]).filter((v) => !value?.includes(v));
        onValueChange?.(newValue);
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: work around library type.
        onValueChange?.(val as any);
      }
    },
    [onValueChange, type, value],
  );

  return (
    <Root
      {...rest}
      // biome-ignore lint/suspicious/noExplicitAny: work around library type.
      value={value as any}
      onValueChange={onValueChangeBound}
      // biome-ignore lint/suspicious/noExplicitAny: work around library type.
      type={type as any}
      className={cx(
        css["togglegroup"],
        className,
        full && css["is-full"],
        icons && css["is-icons"],
      )}
    />
  );
}

type GroupItemProps = Omit<ToggleGroupItemProps, "size"> & {
  tooltip?: string;
};

export const ToggleGroupItem = forwardRef(function ToggleGroupItem(
  { className, tooltip, ...rest }: GroupItemProps,
  ref: React.Ref<HTMLButtonElement>,
) {
  const element = (
    <Item {...rest} className={cx(css["item"], className)} ref={ref} />
  );

  if (!tooltip) return element;

  return (
    <Tooltip delay={300}>
      <TooltipTrigger asChild>{element}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
});
