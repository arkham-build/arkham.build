import { PlusSquareIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Card } from "@/store/schemas/card.schema";
import { selectCardOptions } from "@/store/selectors/lists";
import { selectCardMapper } from "@/store/selectors/shared";
import { canShowCardPoolExtension, displayAttribute } from "@/utils/card-utils";
import { isEmpty } from "@/utils/is-empty";
import { CardsCombobox } from "../cards-combobox";
import { Field, FieldLabel } from "../ui/field";
import css from "./limited-card-pool.module.css";

type Props = {
  canEdit?: boolean;
  card: Card;
  deck: ResolvedDeck;
  showLabel?: boolean;
};

export function CardPoolExtension(props: Props) {
  const { canEdit, card, deck, showLabel } = props;

  const { t } = useTranslation();

  const id = `card_pool_extension_${card.code}` as const;

  const items = useStore(selectCardOptions);
  const cardMapper = useStore(selectCardMapper);

  const locale = useStore((state) => state.settings.locale);

  const updateMetaProperty = useStore((state) => state.updateMetaProperty);

  const onCardPoolChange = useCallback(
    (selectedItems: Card[]) => {
      updateMetaProperty(
        deck.id,
        id,
        selectedItems.map(({ code }) => `card:${code}`).join(","),
      );
    },
    [updateMetaProperty, deck.id, id],
  );

  if (card.card_pool_extension?.type !== "card") {
    return null;
  }

  const selectedItems = parseValue(deck.metaParsed[id]);

  return (
    <CardsCombobox
      className={canEdit ? undefined : css["extension-readonly"]}
      data-testid="card-pool-extension"
      id={id}
      items={items}
      label={
        <span className={css["extension-label"]}>
          <PlusSquareIcon />
          {t("deck_edit.config.card_pool.selected_cards")}
        </span>
      }
      locale={locale}
      onValueChange={onCardPoolChange}
      readonly={!canEdit}
      showLabel={showLabel}
      selectedItems={selectedItems.map(cardMapper)}
    />
  );
}

export function CardPoolExtensionFields(props: {
  deck: ResolvedDeck;
  value?: string[];
}) {
  const { deck } = props;

  const cardsWithExtensions = Object.values(deck.cards.slots).filter((c) =>
    canShowCardPoolExtension(c.card),
  );

  if (isEmpty(cardsWithExtensions)) return null;

  return (
    <>
      {cardsWithExtensions.map(({ card }) => (
        <Field className={css["extension"]} key={card.code} bordered>
          <FieldLabel className={css["extension-name"]}>
            {displayAttribute(card, "name")}
          </FieldLabel>
          <CardPoolExtension canEdit card={card} deck={deck} />
        </Field>
      ))}
    </>
  );
}

function parseValue(value: string | null) {
  return (
    value?.split(",").reduce((acc, curr) => {
      const x = curr.split("card:");
      if (x.length === 2) {
        const code = x[1];
        if (code) acc.push(code);
      }

      return acc;
    }, [] as string[]) ?? []
  );
}
