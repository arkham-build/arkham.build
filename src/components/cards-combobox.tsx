import type { Card } from "@/store/services/queries.types";
import { useCallback } from "react";
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
  const cardRenderer = useCallback(
    (item: Card) => <ListCardInner disableModalOpen card={item} size="sm" />,
    [],
  );

  const resultRenderer = useCallback((item: Card) => {
    const name = item.real_name;
    return item.xp ? `${name} (${item.xp})` : name;
  }, []);

  const itemToString = useCallback((item: Card) => {
    return item.real_name.toLowerCase();
  }, []);

  return (
    <Combobox
      {...props}
      omitItemPadding
      itemToString={itemToString}
      renderItem={cardRenderer}
      renderResult={resultRenderer}
      placeholder="Select cards..."
    />
  );
}
