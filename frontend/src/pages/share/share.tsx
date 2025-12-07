import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { createSelector } from "reselect";
import { useParams } from "wouter";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { DeckDisplay } from "@/components/deck-display/deck-display";
import { Loader } from "@/components/ui/loader";
import { useStore } from "@/store";
import { resolveDeck } from "@/store/lib/resolve-deck";
import type { Deck } from "@/store/schemas/deck.schema";
import { selectDeckValid } from "@/store/selectors/decks";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import { getShare } from "@/store/services/queries";
import { ApiError } from "@/store/services/requests/shared";
import type { StoreState } from "@/store/slices";
import { ResolvedDeckProvider } from "@/utils/use-resolved-deck";
import { ErrorStatus } from "../errors/404";

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

  const { t } = useTranslation();

  const cacheFanMadeContent = useStore((state) => state.cacheFanMadeContent);

  async function queryFn() {
    const shareRead = await getShare(id);
    cacheFanMadeContent([shareRead.data]);
    return shareRead;
  }

  const { data, isPending, error } = useQuery({
    queryFn,
    queryKey: ["share", id],
  });

  const resolvedDeck = useStore((state) =>
    selectResolvedShare(state, data?.data),
  );

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
          history={data?.history}
        />
      </CardModalProvider>
    </ResolvedDeckProvider>
  );
}

export default Share;
