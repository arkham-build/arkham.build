import { Redirect } from "wouter";
import { Card } from "@/components/card/card";
import { CustomizationsEditor } from "@/components/customizations/customizations-editor";
import { getRelatedCards } from "@/store/lib/resolve-card";
import type { CardWithRelations, ResolvedCard } from "@/store/lib/types";
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

  if (canonicalCode) {
    const href = `/card/${canonicalCode}`;

    return (
      <Redirect
        replace
        to={cardWithRelations.card.parallel ? `${href}#parallel` : href}
      />
    );
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

      {!isEmpty(related) &&
        related.map(([key, value]) => (
          <CardViewSection key={key} id={key} title={formatRelationTitle(key)}>
            {key === "parallel" && (
              <Card resolvedCard={value as CardWithRelations} />
            )}
            {key !== "parallel" &&
              (value as ResolvedCard[]).map((c) => (
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
    </>
  );
}
