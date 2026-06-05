import type { Card } from "@arkham-build/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { displayAttribute } from "@/utils/card-utils";
import { CustomizationChooseTraits } from "../customizations/customization-choose-trait";
import { Field, FieldLabel } from "../ui/field";
import { Plane } from "../ui/plane";

type Props = {
  canEdit?: boolean;
  card: Card;
  deck: ResolvedDeck;
};

export function InvestigatorTraitsChoice(props: Props) {
  const { canEdit, card, deck } = props;
  const { t } = useTranslation();

  const updateMetaProperty = useStore((state) => state.updateMetaProperty);

  const metaKey = `custom_behavior:${card.code}` as const;

  const selectedTrait = deck.metaParsed[metaKey];
  const inDeck = !!deck.slots[card.code];

  const canChooseTrait =
    inDeck &&
    card.custom_behavior?.type === "investigator_traits" &&
    card.custom_behavior.values === "trait_choice";

  const onChange = useCallback(
    (selections: string[]) => {
      updateMetaProperty(deck.id, metaKey, selections[0] ?? null);
    },
    [deck.id, metaKey, updateMetaProperty],
  );

  if (!canChooseTrait || (!canEdit && !selectedTrait)) return null;

  return (
    <Plane>
      <Field
        helpText={t("card_modal.custom_behavior.investigator_traits.help", {
          card: displayAttribute(card, "name"),
        })}
      >
        <FieldLabel>
          {t("card_modal.custom_behavior.investigator_traits.title")}
        </FieldLabel>
        <CustomizationChooseTraits
          id={`${metaKey}-choose-trait`}
          limit={1}
          onChange={onChange}
          readonly={!canEdit}
          selections={selectedTrait ? [selectedTrait] : []}
        />
      </Field>
    </Plane>
  );
}
