import { useStore } from "@/store";
import type { Card } from "@/store/services/queries.types";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";

type Props = {
  card: Card;
};

export function CardPageLink(props: Props) {
  const { card } = props;

  const { t } = useTranslation();

  const foreignFanMadeCard = useStore(
    (state) => !card.official && !state.fanMadeData.projects[card.pack_code],
  );

  if (foreignFanMadeCard) {
    return null;
  }

  return (
    <Button as="a" href={`/card/${card.code}`} target="_blank">
      <ExternalLinkIcon />
      {t("card_modal.actions.open_card_page")}
    </Button>
  );
}
