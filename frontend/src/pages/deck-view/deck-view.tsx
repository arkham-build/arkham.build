import { useQueries } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { ArkhamdbDecklistMeta } from "@/components/arkhamdb-decklists/arkhamdb-decklist-meta";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import {
  DeckDisplay,
  type DeckDisplayProps,
  type DeckDisplayType,
} from "@/components/deck-display/deck-display";
import { Loader } from "@/components/ui/loader";
import { useStore } from "@/store";
import { resolveDeck } from "@/store/lib/resolve-deck";
import { syncAdapters } from "@/store/lib/sync";
import type { Id } from "@/store/schemas/deck.schema";
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
import { fetchArkhamDBDecklistMeta } from "@/store/services/requests/decklist-meta";
import { ApiError } from "@/store/services/requests/shared";
import { isNumeric } from "@/utils/is-numeric";
import { ResolvedDeckProvider } from "@/utils/use-resolved-deck";
import { ErrorStatus } from "../errors/404";
import { ShareInner } from "../share/share";

function DeckView() {
  const { id, type } = useParams<{ id: string; type: DeckDisplayType }>();

  const setActiveList = useStore((state) => state.setActiveList);
  const hasDeck = useStore((state) => !!state.data.decks[id]);

  useEffect(() => {
    // TECH DEBT: This should be handled by the views that mount a list.
    //            Requires persisting list state to the URL.
    setActiveList(undefined);
  });

  if (hasDeck && type === "deck") {
    return <LocalDeckView id={id} />;
  }

  if (isNumeric(id)) {
    return <ArkhamDBDeckView id={id} type={type} />;
  }

  return <ShareInner id={id} />;
}

function ArkhamDBDeckView({ id, type }: { id: string; type: DeckDisplayType }) {
  const clientId = useStore(selectClientId);
  const { t } = useTranslation();

  const idInt = Number.parseInt(id, 10);

  const cacheFanMadeContent = useStore((state) => state.cacheFanMadeContent);

  async function queryFn() {
    const decks = await queryDeck(clientId, type, idInt);
    cacheFanMadeContent(decks);
    const adapter = new syncAdapters.arkhamdb(useStore.getState);
    return decks.map((deck) => adapter.in(deck));
  }

  const [
    { data, isPending, error },
    { data: meta, isPending: metaPending, isEnabled: metaEnabled },
  ] = useQueries({
    queries: [
      {
        queryKey: ["deck", type, idInt],
        queryFn,
      },
      {
        queryKey: ["deck_meta", idInt],
        queryFn: () => fetchArkhamDBDecklistMeta(idInt),
        enabled: type === "decklist",
      },
    ],
  });

  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);
  const sharing = useStore((state) => state.sharing);
  const collator = useStore(selectLocaleSortingCollator);

  if (Number.isNaN(idInt)) {
    return <ErrorStatus statusCode={404} />;
  }

  if (isPending || (metaEnabled && metaPending)) {
    return <Loader show message={t("deck_view.loading")} />;
  }

  if (error) {
    // ArkhamDB loves to return 500 or otherwise borked errors, default to a 404 unless rate-limited.
    const statusCode =
      error instanceof ApiError ? (error.status === 429 ? 429 : 404) : 500;
    return <ErrorStatus statusCode={statusCode} />;
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

  const deck = decks.find((d) => d.id === idInt);
  if (!deck) {
    return <ErrorStatus statusCode={404} />;
  }

  return (
    <DeckViewInner
      origin="arkhamdb"
      deck={deck}
      headerSlot={meta ? <ArkhamdbDecklistMeta {...meta} /> : undefined}
      history={
        decks.length > 1
          ? getDeckHistory(decks.toReversed(), metadata, collator)
          : []
      }
      type={type}
    />
  );
}

function LocalDeckView({ id }: { id: Id }) {
  const history = useStore((state) => selectDeckHistoryCached(state, id));

  const resolvedDeck = useStore((state) =>
    selectResolvedDeckById(state, id, false),
  );
  if (!resolvedDeck) return null;

  return <DeckViewInner origin="local" deck={resolvedDeck} history={history} />;
}

function DeckViewInner({
  origin,
  deck,
  headerSlot,
  history,
  type,
}: Omit<DeckDisplayProps, "validation">) {
  const validation = useStore((state) => selectDeckValid(state, deck));

  return (
    <ResolvedDeckProvider resolvedDeck={deck}>
      <CardModalProvider>
        <DeckDisplay
          key={deck.id}
          origin={origin}
          deck={deck}
          headerSlot={headerSlot}
          history={history}
          validation={validation}
          type={type}
        />
      </CardModalProvider>
    </ResolvedDeckProvider>
  );
}

export default DeckView;
