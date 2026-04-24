import { createContext, useCallback, useContext, useId, useMemo } from "react";

interface RadioGroupContextValue {
  disabled?: boolean;
  name: string;
  onValueChange?(value: string): void;
  value?: string;
}

export const RadioGroupContext = createContext<RadioGroupContextValue>({
  name: "",
});

interface RadioGroupProviderOptions {
  disabled?: boolean;
  onValueChange?(value: string): void;
  value?: string;
}

export function useRadioGroupProvider(options: RadioGroupProviderOptions) {
  const name = useId();
  const ctx = useMemo(
    () => ({
      disabled: options.disabled,
      name,
      onValueChange: options.onValueChange,
      value: options.value,
    }),
    [options.disabled, name, options.onValueChange, options.value],
  );
  return ctx;
}

export function useRadioGroupItem(value: string, itemDisabled?: boolean) {
  const ctx = useContext(RadioGroupContext);
  const id = `${ctx.name}${value}`;
  const checked = ctx.value === value;
  const disabled = ctx.disabled || itemDisabled;

  const handleChange = useCallback(() => {
    ctx.onValueChange?.(value);
  }, [ctx.onValueChange, value]);

  return { checked, disabled, handleChange, id, name: ctx.name };
}
