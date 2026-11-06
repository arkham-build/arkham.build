import type { Card } from "@arkham-build/shared";
import { Trans, useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { CardLink } from "@/components/card-link";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { displayAttribute } from "@/utils/card-utils";
import { useTemporaryList } from "@/utils/use-temporary-list";
import { ErrorStatus } from "../errors/404";

type Props = {
  code: string;
};

function UsableCards() {
  const params = useParams<Props>();

  const card = useStore((state) => selectMetadata(state).cards[params.code]);

  if (!card || card.type_code !== "investigator") {
    return <ErrorStatus statusCode={404} />;
  }

  return (
    <CardModalProvider>
      <UsableCardsList card={card} />
    </CardModalProvider>
  );
}

function UsableCardsList(props: { card: Card }) {
  const { card } = props;
  const { t } = useTranslation();

  const listReady = useTemporaryList(`investigator_usable_${card.code}`, {
    investigator: card.code,
  });

  if (!listReady) return null;

  const titleInterpolationValues = {
    prefix: card.parallel ? `${t("common.parallel")} ` : "",
    suffix: card.parallel ? ` ${t("common.parallel").toLowerCase()}` : "",
    name: displayAttribute(card, "name"),
  };

  const title = (
    <Trans
      t={t}
      i18nKey="card_view.actions.usable_by_interpolated"
      values={titleInterpolationValues}
      components={{
        tooltip: <CardLink card={card} />,
      }}
    />
  );

  const titleString = t(
    "card_view.actions.usable_by",
    titleInterpolationValues,
  );

  return (
    <ListLayoutContextProvider>
      <ListLayoutNoSidebar titleString={titleString} title={title} />
    </ListLayoutContextProvider>
  );
}

export default UsableCards;
