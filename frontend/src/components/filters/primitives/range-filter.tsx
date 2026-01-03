import { RangeSelect } from "@/components/ui/range-select";
import { FilterContainer } from "./filter-container";
import { useFilter } from "./filter-hooks";

type Props = {
  id: number;
  changes?: string;
  "data-testid"?: string;
  min: number;
  max: number;
  open: boolean;
  title: string;
  value: [number, number] | undefined;
};

export function RangeFilter(props: Props) {
  const { changes, id, min, max, open, title, value } = props;

  const { onReset, onChange, onOpenChange, locked } = useFilter(id);

  return (
    <FilterContainer
      changes={changes}
      locked={locked}
      onOpenChange={onOpenChange}
      onReset={onReset}
      open={open}
      title={title}
    >
      <RangeSelect
        disabled={locked}
        data-testid={props["data-testid"]}
        id={`range-filter-${id}`}
        max={max}
        min={min}
        label={title}
        onValueCommit={onChange}
        value={value ?? [min, max]}
      />
    </FilterContainer>
  );
}
