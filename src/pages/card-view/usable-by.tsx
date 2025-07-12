import { useTranslation } from "react-i18next";
import { ListCard } from "@/components/list-card/list-card";
import { Details } from "@/components/ui/details";
import { useStore } from "@/store";
import type { Card } from "@/store/schemas/card.schema";
import { selectUsableByInvestigators } from "@/store/selectors/card-view";
import { displayAttribute } from "@/utils/card-utils";

type Props = {
  card: Card;
};

export function UsableBy(props: Props) {
  const { t } = useTranslation();

  const investigators = useStore((state) =>
    selectUsableByInvestigators(state, props.card),
  );

  return (
    <Details
      data-testid="usable-by"
      iconClosed={<i className="icon-per_investigator" />}
      title={t("card_view.actions.who_can_take", {
        name: displayAttribute(props.card, "name"),
      })}
      scrollHeight="24rem"
    >
      <ol>
        {investigators.map((card) => (
          <ListCard as="li" card={card} key={card.code} size="investigator" />
        ))}
      </ol>
    </Details>
  );
}
