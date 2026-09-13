import { CustomSelect, type Item } from "@/components/ui/custom-select";
import css from "./custom-select-filter.module.css";
import { FilterContainer } from "./filter-container";
import { useFilter } from "./filter-hooks";

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

  const { onReset, onOpenChange, onChange, locked } = useFilter<string>(id);

  return (
    <FilterContainer
      {...rest}
      changes={changes}
      locked={locked}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={open}
      title={title}
    >
      <CustomSelect
        disabled={locked}
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
