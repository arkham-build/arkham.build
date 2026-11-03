import type { Card, SealedDeckResponse, Slots } from "@arkham-build/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { ChooseInvestigatorLink } from "@/components/choose-investigator-link";
import { Loader } from "@/components/ui/loader";
import { Notice } from "@/components/ui/notice";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useSealedDeckQuery } from "@/queries/sealed-decks";
import { useStore } from "@/store";
import { filterSealedPool, getSealedCardQuantity } from "@/store/lib/filtering";
import { selectLookupTables, selectMetadata } from "@/store/selectors/shared";
import { ApiError } from "@/store/services/requests/shared";
import { isStaticInvestigator } from "@/utils/card-utils";
import { useTemporaryList } from "@/utils/use-temporary-list";
import { ErrorStatus } from "../errors/404";

function SealedDeck() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data, error, isPending } = useSealedDeckQuery(id);

  if (isPending) {
    return <Loader message={t("sealed_deck.loading")} show />;
  }

  if (error) {
    const statusCode =
      error instanceof ApiError && error.status === 404 ? 404 : 500;
    return <ErrorStatus statusCode={statusCode} />;
  }

  if (!data) {
    return <ErrorStatus statusCode={500} />;
  }

  return <SealedDeckBrowser id={id} sealedDeck={data} />;
}

function SealedDeckBrowser(props: {
  id: string;
  sealedDeck: SealedDeckResponse;
}) {
  const { id, sealedDeck } = props;
  const { t } = useTranslation();

  const lookupTables = useStore(selectLookupTables);
  const metadata = useStore(selectMetadata);

  const poolFilter = useMemo(
    () => filterSealedPool(sealedDeck.cards, lookupTables),
    [lookupTables, sealedDeck.cards],
  );
  const quantities = useMemo(
    () =>
      Object.keys(metadata.cards).reduce<Slots>((result, code) => {
        const quantity = getSealedCardQuantity(
          sealedDeck.cards,
          lookupTables,
          code,
        );

        const card = metadata.cards[code];

        if (quantity > 0) {
          result[code] = Math.min(
            quantity,
            card?.deck_limit ?? Number.MAX_SAFE_INTEGER,
          );
        }

        return result;
      }, {}),
    [lookupTables, metadata.cards, sealedDeck.cards],
  );

  const listReady = useTemporaryList(
    `sealed-deck-${id}`,
    {
      card_type: "player",
      fan_made_content: "all",
      ownership: "all",
    },
    {
      displaySettingsKey: "sealed-deck",
      showInvestigatorFilter: true,
      showOwnershipFilter: true,
      systemFilter: poolFilter,
      filters: [
        "faction",
        "type",
        "level",
        "cost",
        "trait",
        "card_tags",
        "investigator",
        "asset",
        "skill_icons",
        "properties",
        "action",
        "subtype",
      ],
    },
    poolFilter,
  );

  if (!listReady) {
    return null;
  }

  const title = t("sealed_deck.title", { name: sealedDeck.name });

  return (
    <CardModalProvider sealedDeckId={id}>
      <ListLayoutContextProvider>
        <ListLayoutNoSidebar
          getListCardProps={(card) => ({
            renderCardExtra:
              card.type_code === "investigator" && !isStaticInvestigator(card)
                ? (card: Card) => (
                    <ChooseInvestigatorLink card={card} sealedDeckId={id} />
                  )
                : undefined,
          })}
          headerTop={
            !Object.keys(quantities).length ? (
              <Notice variant="info">{t("sealed_deck.empty")}</Notice>
            ) : undefined
          }
          quantities={quantities}
          title={title}
          titleString={title}
        />
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

export default SealedDeck;
