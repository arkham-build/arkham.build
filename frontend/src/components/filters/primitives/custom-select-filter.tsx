import { CustomSelect, type Item } from "@/components/ui/custom-select";
import css from "./custom-select-filter.module.css";
import { FilterContainer } from "./filter-container";
import { useFilterCallbacks } from "./filter-hooks";

type Props = {
  className?: string;
  id: number;
  changes?: string;
  options: Item[];
  open: boolean;
  renderOption: (option: Item | undefined) => React.ReactNode;
  title: string;
  value: string;
} & Omit<React.ComponentProps<"div">, "id">;

export function CustomSelectFilter(props: Props) {
  const { changes, id, options, renderOption, open, title, value, ...rest } =
    props;

  const { onReset, onOpenChange, onChange } = useFilterCallbacks<string>(id);

  return (
    <FilterContainer
      {...rest}
      changes={changes}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={open}
      title={title}
    >
      <CustomSelect
        menuClassName={css["menu"]}
        data-testid={`filter-${title}-input`}
        items={options}
        onValueChange={onChange}
        renderItem={renderOption}
        renderControl={renderOption}
        value={value}
      />
    </FilterContainer>
  );
}
