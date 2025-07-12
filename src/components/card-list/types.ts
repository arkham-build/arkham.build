import type { ResolvedDeck } from "@/store/lib/types";
import type { Card } from "@/store/schemas/card.schema";
import type { ListState } from "@/store/selectors/lists";
import type { Slots } from "@/store/slices/data.types";
import type { Search, ViewMode } from "@/store/slices/lists.types";
import type { Metadata } from "@/store/slices/metadata.types";
import type { Props as ListCardProps } from "../list-card/list-card";

type FilteredListCardProps = Omit<ListCardProps, "card" | "quantity">;
export type FilteredListCardPropsGetter = (card: Card) => FilteredListCardProps;

export type CardListProps = {
  className?: string;
  quantities?: Slots;
  getListCardProps?: FilteredListCardPropsGetter;
  slotLeft?: React.ReactNode;
  slotRight?: React.ReactNode;
  targetDeck?: "slots" | "extraSlots" | "both";
};

export type CardListImplementationProps = Omit<
  CardListProps,
  "className" | "targetDeck" | "slotLeft" | "slotRight"
> & {
  data: ListState;
  metadata: Metadata;
  resolvedDeck?: ResolvedDeck;
  viewMode: ViewMode;
  listMode?: "single" | "grouped";
  search?: Search;
};

export type CardListItemProps = {
  listCardProps?: FilteredListCardProps;
};
