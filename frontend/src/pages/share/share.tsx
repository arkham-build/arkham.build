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
import { selectDeckValid } from "@/store/selectors/decks";
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

  const { data, isPending, error } = useShareQuery(id);

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
