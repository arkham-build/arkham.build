import { Redirect } from "wouter";
import { PopularDecks } from "@/components/arkhamdb-decklists/popular-decks";
import { Card } from "@/components/card/card";
import {
  SpecialistAccess,
  SpecialistInvestigators,
} from "@/components/card-modal/specialist";
import { CustomizationsEditor } from "@/components/customizations/customizations-editor";
import { getRelatedCards } from "@/store/lib/resolve-card";
import type { CardWithRelations } from "@/store/lib/types";
import { isSpecialist } from "@/utils/card-utils";
import { formatRelationTitle } from "@/utils/formatting";
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

export function CardViewCards({
  cardWithRelations,
}: {
  cardWithRelations: CardWithRelations;
}) {
  const canonicalCode =
    cardWithRelations.card.duplicate_of_code ??
    cardWithRelations.card.alternate_of_code;

  if (canonicalCode && !cardWithRelations.card.parallel) {
    const href = `/card/${canonicalCode}`;
    return <Redirect replace to={href} />;
  }

  const related = getRelatedCards(cardWithRelations);

  return (
    <>
      <div data-testid="main">
        <Card resolvedCard={cardWithRelations}>
          {cardWithRelations.card.customization_options ? (
            <CustomizationsEditor card={cardWithRelations.card} />
          ) : undefined}
        </Card>
      </div>

      <PopularDecks scope={cardWithRelations.card} />

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
