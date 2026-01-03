import { useCallback } from "react";
import { Combobox } from "@/components/ui/combobox/combobox";
import { useStore } from "@/store";
import type { Coded } from "@/store/lib/types";
import { FilterContainer } from "./filter-container";
import { useFilter } from "./filter-hooks";

type Props<T extends Coded> = {
  changes?: string;
  children?: React.ReactNode;
  collapsibleContent?: React.ReactNode;
  id: number;
  itemToString?: (val: T) => string;
  nameRenderer?: (val: T) => React.ReactNode;
  title: string;
  open: boolean;
  options: T[];
  placeholder?: string;
  value: T[];
};

export function MultiselectFilter<T extends Coded>(props: Props<T>) {
  const {
    changes,
    children,
    collapsibleContent,
    id,
    itemToString,
    nameRenderer,
    open,
    options,
    placeholder,
    title,
    value,
  } = props;

  const { onReset, onOpenChange, onChange, locked } = useFilter<string[]>(id);

  const locale = useStore((state) => state.settings.locale);

  const onValueChange = useCallback(
    (selected: T[]) => {
      onChange(selected.map((s) => s.code));
    },
    [onChange],
  );

  return (
    <FilterContainer
      data-testid={`filter-${title}`}
      changes={changes}
      locked={locked}
      nonCollapsibleContent={children}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={open}
      title={title}
    >
      <Combobox
        autoFocus
        disabled={locked}
        id={`filter-${id}`}
        itemToString={itemToString}
        items={options}
        label={title}
        locale={locale}
        onValueChange={onValueChange}
        placeholder={placeholder}
        renderItem={nameRenderer}
        renderResult={nameRenderer}
        selectedItems={value}
      />
      {collapsibleContent}
    </FilterContainer>
  );
}
