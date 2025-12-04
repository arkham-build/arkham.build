import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "wouter";
import { PopularDecks } from "@/components/arkhamdb-decklists/popular-decks";
import { Card } from "@/components/card/card";
import {
  SpecialistAccess,
  SpecialistInvestigators,
} from "@/components/card-modal/specialist";
import { CustomizationsEditor } from "@/components/customizations/customizations-editor";
import PackIcon from "@/components/icons/pack-icon";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import { filterBacksides } from "@/store/lib/filtering";
import { getRelatedCards } from "@/store/lib/resolve-card";
import { sortByPosition } from "@/store/lib/sorting";
import type { CardWithRelations } from "@/store/lib/types";
import type { Card as CardType } from "@/store/schemas/card.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import {
  selectLookupTables,
  selectMetadata,
  selectShowFanMadeRelations,
} from "@/store/selectors/shared";
import {
  cardUrl,
  displayAttribute,
  isSpecialist,
  official,
  oldFormatCardUrl,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { displayPackName, formatRelationTitle } from "@/utils/formatting";
import { and } from "@/utils/fp";
import { isEmpty } from "@/utils/is-empty";
import css from "./card-view.module.css";

type Props = {
  title: string;
  children: React.ReactNode;
  id?: string;
};

function CardViewSection(props: Props) {
  const { title, children, id } = props;

  return (
    <section className={css["view-section"]} id={id} data-testid={id}>
      <h2 className={css["view-section-title"]}>{title}</h2>
      <div className={css["view-section-cards"]}>{children}</div>
    </section>
  );
}

function CardSetNav(props: { currentCard: CardWithRelations }) {
  const { currentCard } = props;

  const metadata = useStore(selectMetadata);
  const lookupTables = useStore(selectLookupTables);

  const [search] = useSearchParams();
  const oldFormat = search.get("old_format") === "true";

  const targetPack = useMemo(() => {
    const currentCardPackCode = currentCard.card.pack_code;

    const currentPack = metadata.packs[currentCardPackCode];
    let targetPack = currentPack;

    if (!oldFormat) {
      const reprintPackCodes =
        lookupTables.reprintPacksByPack[currentCardPackCode];

      if (reprintPackCodes) {
        const targetType = currentCard.card.encounter_code
          ? "encounter"
          : "player";

        const reprint = Object.keys(reprintPackCodes).reduce(
          (acc, curr) => {
            const pack = metadata.packs[curr];
            return pack.reprint?.type === targetType ? pack : acc;
          },
          undefined as Pack | undefined,
        );

        if (reprint) {
          targetPack = reprint;
        }
      }
    }

    return targetPack;
  }, [
    currentCard.card.encounter_code,
    currentCard.card.pack_code,
    lookupTables.reprintPacksByPack,
    metadata.packs,
    oldFormat,
  ]);

  const filteredCards = useMemo(
    () =>
      Object.values(metadata.cards)
        .filter(
          and([
            filterBacksides,
            (card) => !card.hidden,
            (card) => {
              if (targetPack.reprint && targetPack.reprint?.type !== "rcore") {
                const cardPack = metadata.packs[card.pack_code];

                const cycleMatches =
                  cardPack.cycle_code === targetPack.cycle_code;

                const reprintTypeMatches =
                  !!card.encounter_code === !!currentCard.card.encounter_code;

                return cycleMatches && reprintTypeMatches;
              }

              return card.pack_code === targetPack.code;
            },
          ]),
        )
        .sort(sortByPosition),
    [
      currentCard.card.encounter_code,
      metadata.cards,
      metadata.packs,
      targetPack,
    ],
  );

  const cardListIndex = filteredCards.findIndex(
    (card) => card.code === currentCard.card.code,
  );

  return (
    <div>
      <div className={css["card-set-nav-title"]}>
        <h3>
          {<PackIcon code={targetPack.code} />}
          {displayPackName(targetPack)}
        </h3>
      </div>
      <div className={css["card-set-nav-container"]}>
        <CardSetLink
          shift={-1}
          cardListIndex={cardListIndex}
          filteredCards={filteredCards}
          oldFormat={oldFormat}
        />
        <CardSetLink
          shift={1}
          cardListIndex={cardListIndex}
          filteredCards={filteredCards}
          oldFormat={oldFormat}
        />
      </div>
    </div>
  );
}

function CardSetLink(props: {
  cardListIndex: number;
  filteredCards: CardType[];
  oldFormat: boolean;
  shift: number;
}) {
  const { shift, cardListIndex, filteredCards, oldFormat } = props;

  const targetCard = filteredCards[cardListIndex + shift];

  if (targetCard) {
    const url = oldFormat ? oldFormatCardUrl(targetCard) : cardUrl(targetCard);

    return (
      <Link to={url} asChild>
        <Button
          className={cx(
            css["card-set-button"],
            shift < 0 ? css["prev"] : css["next"],
          )}
          as="a"
        >
          {shift < 0 && <ChevronsLeftIcon />}
          {displayAttribute(targetCard, "name")}
          {shift > 0 && <ChevronsRightIcon />}
        </Button>
      </Link>
    );
  }
}

export function CardViewCards({
  cardWithRelations,
}: {
  cardWithRelations: CardWithRelations;
}) {
  const showFanMadeRelations = useStore(selectShowFanMadeRelations);
  const settings = useStore((state) => state.settings);
  const related = getRelatedCards(
    cardWithRelations,
    showFanMadeRelations,
    settings.showPreviews,
  );

  return (
    <>
      <CardSetNav currentCard={cardWithRelations} />
      <div data-testid="main">
        <Card resolvedCard={cardWithRelations}>
          {cardWithRelations.card.customization_options ? (
            <CustomizationsEditor card={cardWithRelations.card} />
          ) : undefined}
        </Card>
      </div>

      {official(cardWithRelations.card) && !cardWithRelations.card.preview && (
        <PopularDecks scope={cardWithRelations.card} />
      )}

      {!isEmpty(related) &&
        related.map(([key, value]) => (
          <CardViewSection key={key} id={key} title={formatRelationTitle(key)}>
            {typeof value === "object" && !Array.isArray(value) && (
              <Card resolvedCard={value} titleLinks="card" size="compact" />
            )}
            {Array.isArray(value) &&
              value.map((c) => (
                <Card
                  canToggleBackside
                  key={c.card.code}
                  titleLinks="card"
                  resolvedCard={c}
                  size="compact"
                />
              ))}
          </CardViewSection>
        ))}

      {cardWithRelations.card.type_code === "investigator" && (
        <CardViewSection title={formatRelationTitle("specialist")}>
          <SpecialistAccess card={cardWithRelations.card} />
        </CardViewSection>
      )}
      {isSpecialist(cardWithRelations.card) && (
        <CardViewSection
          title={formatRelationTitle("specialist_investigators")}
        >
          <SpecialistInvestigators card={cardWithRelations.card} />
        </CardViewSection>
      )}
    </>
  );
}
