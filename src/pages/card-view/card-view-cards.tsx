import { PopularDecks } from "@/components/arkhamdb-decklists/popular-decks";
import { Card } from "@/components/card/card";
import {
  SpecialistAccess,
  SpecialistInvestigators,
} from "@/components/card-modal/specialist";
import { CustomizationsEditor } from "@/components/customizations/customizations-editor";
import { useStore } from "@/store";
import { getRelatedCards } from "@/store/lib/resolve-card";
import type { CardWithRelations } from "@/store/lib/types";
import { selectShowFanMadeRelations } from "@/store/selectors/card-view";
import { isSpecialist, official } from "@/utils/card-utils";
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
  const showFanMadeRelations = useStore(selectShowFanMadeRelations);
  const related = getRelatedCards(cardWithRelations, showFanMadeRelations);

  return (
    <>
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
