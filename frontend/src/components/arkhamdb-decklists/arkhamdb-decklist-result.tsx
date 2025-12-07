import type { DecklistSearchResult } from "@arkham-build/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { resolveDeck } from "@/store/lib/resolve-deck";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import { ResolvedDeckProvider } from "@/utils/use-resolved-deck";
import { DeckDetails } from "../deck-details";
import { DeckSummary } from "../deck-summary/deck-summary";
import { Decklist } from "../decklist/decklist";
import { Collapsible, CollapsibleContent } from "../ui/collapsible";
import { ArkhamdbDecklistMeta } from "./arkhamdb-decklist-meta";
import css from "./arkhamdb-decklist-result.module.css";

type Props = {
  result: DecklistSearchResult;
  showDetails?: boolean;
};

export function ArkhamDBDecklistResult({ result, showDetails }: Props) {
  const { t } = useTranslation();
  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const sharing = useStore((state) => state.sharing);
  const collator = useStore(selectLocaleSortingCollator);

  const resolved = useMemo(() => {
    const deps = { lookupTables, metadata, sharing };
    return resolveDeck(deps, collator, {
      ...result,
    });
  }, [result, lookupTables, metadata, sharing, collator]);

  return (
    <DeckSummary
      deck={resolved}
      interactive
      showThumbnail
      type="decklist"
      elevation="elevated"
    >
      <ArkhamdbDecklistMeta
        className={!showDetails ? css["decklist-meta-standalone"] : undefined}
        date_creation={result.date_creation}
        like_count={result.like_count}
        user_id={result.user_id as number}
        user_name={result.user_name}
        user_reputation={result.user_reputation}
      />
      {showDetails && (
        <>
          <DeckDetails
            className={css["decklist-details"]}
            deck={resolved}
            omitXpRequired
            omitDeckSize
            size="sm"
          />
          <Collapsible
            className={css["decklist-container"]}
            triggerClassName={css["decklist-container-trigger"]}
            title={
              <span className={css["decklist-container-title"]}>
                <i className="icon-deck" />
                {t("deck.cards")}
              </span>
            }
            omitPadding
            omitBorder
          >
            <CollapsibleContent>
              <ResolvedDeckProvider resolvedDeck={resolved}>
                <Decklist className={css["decklist"]} deck={resolved} />
              </ResolvedDeckProvider>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </DeckSummary>
  );
}
