import { DecklistsXpRangeInput } from "@/components/arkhamdb-decklists/decklists-xp-range-input";
import { Field } from "@/components/ui/field";
import type { DecklistFilterProps } from "./shared";

export function XpRange({ formState, setFormState }: DecklistFilterProps) {
  return (
    <Field full>
      <DecklistsXpRangeInput
        onValueChange={(range) => {
          setFormState((prev) => ({ ...prev, xp: range }));
        }}
        value={formState.xp}
      />
    </Field>
  );
}
