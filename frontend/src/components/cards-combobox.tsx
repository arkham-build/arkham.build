import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Card } from "@/store/schemas/card.schema";
import { displayAttribute } from "@/utils/card-utils";
import { ListCard } from "./list-card/list-card";
import { ListCardInner } from "./list-card/list-card-inner";
import { Combobox, type Props as ComboboxProps } from "./ui/combobox/combobox";

type Props = Omit<
  ComboboxProps<Card>,
  | "itemToString"
  | "renderItem"
  | "renderResult"
  | "placeholder"
  | "omitItemPadding"
>;

export function CardsCombobox(props: Props) {
  const { t } = useTranslation();

  const cardRenderer = useCallback(
    (item: Card) => <ListCard disableModalOpen card={item} />,
    [],
  );

  const resultRenderer = useCallback((item: Card) => {
    return (
      <ListCardInner
        cardLevelDisplay="icon-only"
        cardShowCollectionNumber
        omitBorders
        omitThumbnail
        size="xs"
        card={item}
      />
    );
  }, []);

  const itemToString = useCallback((item: Card) => {
    return displayAttribute(item, "name").toLowerCase();
  }, []);

  return (
    <Combobox
      {...props}
      omitItemPadding
      itemToString={itemToString}
      renderItem={cardRenderer}
      renderResult={resultRenderer}
      placeholder={t("ui.cards_combobox.placeholder", {
        count: props.limit ?? 2,
      })}
    />
  );
}
