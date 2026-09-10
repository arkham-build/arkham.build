import type { Deck } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { useParams } from "wouter";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { DeckDisplay } from "@/components/deck-display/deck-display";
import { ResolvedDeckProvider } from "@/components/resolved-deck-context-provider";
import { Loader } from "@/components/ui/loader";
import { useShareQuery } from "@/queries/legacy";
import { useStore } from "@/store";
import { resolveDeck } from "@/store/lib/resolve-deck";
import { getDeckHistory, selectDeckValid } from "@/store/selectors/decks";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import { ApiError } from "@/store/services/requests/shared";
import type { StoreState } from "@/store/slices";
import { ErrorStatus } from "../errors/404";

const selectResolvedShare = createSelector(
  selectMetadata,
  selectLookupTables,
  selectLocaleSortingCollator,
  (_: StoreState, data: Deck[] | undefined) => data,
  (_: StoreState, __: Deck[] | undefined, id: string) => id,
  (metadata, lookupTables, collator, data, id) => {
    if (!data?.length) return undefined;

    const decks = data.map((deck) =>
      resolveDeck(
        {
          metadata,
          lookupTables,
        },
        collator,
        deck,
      ),
    );

    return {
      deck: decks.find((deck) => String(deck.id) === id) ?? decks[0],
      history:
        decks.length > 1
          ? getDeckHistory(decks.toReversed(), metadata, collator)
          : [],
    };
  },
);

function Share() {
  const { id } = useParams<{ id: string }>();
  return <ShareInner id={id} />;
}

export function ShareInner(props: { id: string }) {
  const { id } = props;

  const { t } = useTranslation();

  const { data, isPending, error } = useShareQuery(id);

  const resolvedShare = useStore((state) =>
    selectResolvedShare(state, data, id),
  );
  const resolvedDeck = resolvedShare?.deck;

  const validation = useStore((state) => selectDeckValid(state, resolvedDeck));

  if (isPending) return <Loader show message={t("deck_view.loading")} />;

  if (error) {
    const statusCode = error instanceof ApiError ? error.status : 500;
    return <ErrorStatus statusCode={statusCode} />;
  }

  if (!resolvedDeck) return null;

  return (
    <ResolvedDeckProvider resolvedDeck={resolvedDeck}>
      <CardModalProvider>
        <DeckDisplay
          origin="share"
          deck={resolvedDeck}
          validation={validation}
          history={resolvedShare.history}
        />
      </CardModalProvider>
    </ResolvedDeckProvider>
  );
}

export default Share;
