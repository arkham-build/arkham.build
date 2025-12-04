import { useTranslation } from "react-i18next";
import { Select } from "@/components/ui/select";
import type { Card } from "@/store/schemas/card.schema";
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
  const { t } = useTranslation();

  const onValueChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    if (evt.target instanceof HTMLSelectElement) {
      onChange([evt.target.value]);
    }
  };

  if (readonly) {
    return (
      <Tag size="xs">
        {
          splitMultiValue(card.original?.real_slot).map((slot) =>
            t(`common.slot.${slot.toLowerCase()}`),
          )[+selections[0]]
        }
      </Tag>
    );
  }

  return (
    <Select
      defaultValue={selections[0] || ""}
      disabled={disabled}
      data-testid="customization-remove-slot"
      id={`${id}-remove-slot`}
      onChange={onValueChange}
      options={splitMultiValue(card.original?.real_slot ?? card.real_slot).map(
        (slot, i) => ({
          label: t(`common.slot.${slot.toLowerCase()}`),
          value: i.toString(),
        }),
      )}
    />
  );
}
