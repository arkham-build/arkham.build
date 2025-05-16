import { CardModalProvider } from "@/components/card-modal/card-modal-context";
import {
  DeckDisplay,
  type DeckDisplayProps,
} from "@/components/deck-display/deck-display";
import { Loader } from "@/components/ui/loader";
import { useStore } from "@/store";
import { resolveDeck } from "@/store/lib/resolve-deck";
import {
  getDeckHistory,
  selectDeckHistoryCached,
  selectDeckValid,
  selectResolvedDeckById,
} from "@/store/selectors/decks";
import {
  selectClientId,
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import { queryDeck } from "@/store/services/queries";
import type { Id } from "@/store/slices/data.types";
import { isNumeric } from "@/utils/is-numeric";
import { useQuery } from "@/utils/use-query";
import { ResolvedDeckProvider } from "@/utils/use-resolved-deck";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { Error404 } from "../errors/404";
import { ShareInner } from "../share/share";

function DeckView() {
  const { id, type } = useParams<{ id: string; type: string }>();

  const hasDeck = useStore((state) => !!state.data.decks[id]);

  if (hasDeck && type === "deck") {
    return <LocalDeckView id={id} />;
  }

  if (isNumeric(id)) {
    return <ArkhamDbDeckView id={id} type={type} />;
  }

  return <ShareInner id={id} />;
}

function ArkhamDbDeckView({ id, type }: { id: string; type: string }) {
  const clientId = useStore(selectClientId);
  const { t } = useTranslation();

  const idInt = Number.parseInt(id, 10);

  const cacheFanMadeContent = useStore((state) => state.cacheFanMadeContent);

  const query = useMemo(() => {
    if (!Number.isFinite(idInt)) {
      return undefined;
    }

    async function query() {
      const decks = await queryDeck(clientId, type, idInt);
      for (const deck of decks) {
        cacheFanMadeContent(deck);
      }
      return decks;
    }

    return query;
  }, [clientId, idInt, type, cacheFanMadeContent]);

  const { data, state } = useQuery(query);

  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const sharing = useStore((state) => state.sharing);
  const collator = useStore(selectLocaleSortingCollator);

  if (Number.isNaN(idInt)) {
    return <Error404 />;
  }

  if (state === "loading" || state === "initial") {
    return <Loader show message={t("deck_view.loading")} />;
  }

  if (state === "error") {
    return <Error404 />;
  }

  const decks = data.map((deck) =>
    resolveDeck(
      {
        metadata,
        lookupTables,
        sharing,
      },
      collator,
      deck,
    ),
  );

  return (
    <DeckViewInner
      origin="arkhamdb"
      deck={decks[0]}
      history={
        decks.length > 1
          ? getDeckHistory(decks.toReversed(), metadata, collator)
          : []
      }
    />
  );
}

function LocalDeckView({ id }: { id: Id }) {
  const history = useStore((state) => selectDeckHistoryCached(state, id));

  const resolvedDeck = useStore((state) =>
    selectResolvedDeckById(state, id, true),
  );
  if (!resolvedDeck) return null;

  return <DeckViewInner origin="local" deck={resolvedDeck} history={history} />;
}

function DeckViewInner({
  origin,
  deck,
  history,
}: Omit<DeckDisplayProps, "validation">) {
  const validation = useStore((state) => selectDeckValid(state, deck));

  return (
    <ResolvedDeckProvider resolvedDeck={deck}>
      <CardModalProvider>
        <DeckDisplay
          key={deck.id}
          origin={origin}
          deck={deck}
          history={history}
          validation={validation}
        />
      </CardModalProvider>
    </ResolvedDeckProvider>
  );
}

export default DeckView;
