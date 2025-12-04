import { DecklistsDateRangeInput } from "@/components/arkhamdb-decklists/decklists-date-range-input";
import { Field } from "@/components/ui/field";
import type { DecklistFilterProps } from "./shared";

export function PublishDate({ formState, setFormState }: DecklistFilterProps) {
  return (
    <Field full>
      <DecklistsDateRangeInput
        onValueChange={(range) => {
          setFormState((prev) => ({
            ...prev,
            dateRange: range,
          }));
        }}
        value={formState.dateRange}
      />
    </Field>
  );
}
