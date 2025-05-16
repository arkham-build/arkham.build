import { CardModalProvider } from "@/components/card-modal/card-modal-context";
import { DeckDisplay } from "@/components/deck-display/deck-display";
import { Loader } from "@/components/ui/loader";
import { useStore } from "@/store";
import { resolveDeck } from "@/store/lib/resolve-deck";
import { selectDeckValid } from "@/store/selectors/decks";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import { getShare } from "@/store/services/queries";
import type { StoreState } from "@/store/slices";
import type { Deck } from "@/store/slices/data.types";
import { useQuery } from "@/utils/use-query";
import { ResolvedDeckProvider } from "@/utils/use-resolved-deck";
import { useCallback } from "react";
import { createSelector } from "reselect";
import { useParams } from "wouter";
import { Error404 } from "../errors/404";

const selectResolvedShare = createSelector(
  selectMetadata,
  selectLookupTables,
  (state: StoreState) => state.sharing,
  selectLocaleSortingCollator,
  (_: StoreState, data: Deck | undefined) => data,
  (metadata, lookupTables, sharing, collator, data) => {
    if (!data) return undefined;
    return resolveDeck(
      {
        metadata,
        lookupTables,
        sharing,
      },
      collator,
      data,
    );
  },
);

function Share() {
  const { id } = useParams<{ id: string }>();
  return <ShareInner id={id} />;
}

export function ShareInner(props: { id: string }) {
  const { id } = props;

  const cacheFanMadeContent = useStore((state) => state.cacheFanMadeContent);

  const query = useCallback(async () => {
    const shareRead = await getShare(id);
    cacheFanMadeContent(shareRead.data);
    return shareRead;
  }, [id, cacheFanMadeContent]);

  const { data, state, error } = useQuery(query);

  const resolvedDeck = useStore((state) =>
    selectResolvedShare(state, data?.data),
  );

  const validation = useStore((state) => selectDeckValid(state, resolvedDeck));

  if (state === "initial" || state === "loading")
    return <Loader show message="Loading shared deck..." />;
  if (error) return <Error404 />;

  if (!resolvedDeck) return null;

  return (
    <ResolvedDeckProvider resolvedDeck={resolvedDeck}>
      <CardModalProvider>
        <DeckDisplay
          origin="share"
          deck={resolvedDeck}
          validation={validation}
          history={data?.history}
        />
      </CardModalProvider>
    </ResolvedDeckProvider>
  );
}

export default Share;
