import { Select } from "@/components/ui/select";
import type { Card } from "@/store/services/queries.types";
import { splitMultiValue } from "@/utils/card-utils";
import { Tag } from "../ui/tag";

type Props = {
  card: Card;
  disabled?: boolean;
  id: string;
  onChange: (selections: string[]) => void;
  readonly?: boolean;
  selections: string[];
};

export function CustomizationRemoveSlot(props: Props) {
  const { card, disabled, id, onChange, readonly, selections } = props;

  const onValueChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    if (evt.target instanceof HTMLSelectElement) {
      onChange([evt.target.value]);
    }
  };

  if (readonly) {
    return (
      <Tag size="xs">{splitMultiValue(card.original_slot)[+selections[0]]}</Tag>
    );
  }

  return (
    <Select
      defaultValue={selections[0] || ""}
      disabled={disabled}
      id={`${id}-remove-slot`}
      onChange={onValueChange}
      options={splitMultiValue(card.original_slot).map((trait, i) => ({
        label: trait,
        value: i.toString(),
      }))}
    />
  );
}
