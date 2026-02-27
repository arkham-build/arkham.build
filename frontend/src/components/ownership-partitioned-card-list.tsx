import { CollapsibleContent } from "@radix-ui/react-collapsible";
import { FileWarningIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { filterOwnership } from "@/store/lib/filtering";
import type { LookupTables } from "@/store/lib/lookup-tables.types";
import type { ResolvedCard } from "@/store/lib/types";
import {
  selectCollection,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import type { Metadata } from "@/store/slices/metadata.types";
import type { SettingsState } from "@/store/slices/settings.types";
import { isEmpty } from "@/utils/is-empty";
import css from "./ownership-partitioned-card-list.module.css";
import { Collapsible } from "./ui/collapsible";

type Props = {
  cards: ResolvedCard[] | ResolvedCard;
  cardRenderer: (card: ResolvedCard) => React.ReactNode;
};

export function OwnershipPartitionedCardList(props: Props) {
  const { cardRenderer, cards } = props;

  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const collection = useStore(selectCollection);
  const showAllCards = useStore((state) => state.settings.showAllCards);

  if (!cards) return null;

  const { owned, unowned } = partitionCardsByOwnership(
    Array.isArray(cards) ? cards : [cards],
    metadata,
    lookupTables,
    collection,
    showAllCards,
  );

  return (
    <>
      {owned.map(cardRenderer)}
      {!isEmpty(unowned) && (
        <Collapsible
          open={open}
          onOpenChange={setOpen}
          omitBorder
          omitPadding
          triggerClassName={css["unowned-trigger"]}
          title={
            <div className={css["unowned-title"]}>
              <FileWarningIcon />
              {t("common.non_collection_cards", {
                count: unowned.length,
              })}
            </div>
          }
        >
          <CollapsibleContent>{unowned.map(cardRenderer)}</CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}

function partitionCardsByOwnership(
  cards: ResolvedCard[],
  metadata: Metadata,
  lookupTables: LookupTables,
  collection: SettingsState["collection"],
  showAllCards: boolean,
) {
  const owned = [];
  const unowned = [];

  for (const card of cards) {
    if (
      filterOwnership({
        card: card.card,
        metadata,
        lookupTables,
        collection,
        showAllCards,
      })
    ) {
      owned.push(card);
    } else {
      unowned.push(card);
    }
  }

  return {
    owned,
    unowned,
  };
}
