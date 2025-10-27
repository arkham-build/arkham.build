import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { CardLink } from "@/components/card-link";
import { CardModalProvider } from "@/components/card-modal/card-modal-provider";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useStore } from "@/store";
import type { Card } from "@/store/schemas/card.schema";
import { selectMetadata } from "@/store/selectors/shared";
import { displayAttribute } from "@/utils/card-utils";
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
  const listKey = `investigator_usable_${card.code}`;
  const { t } = useTranslation();

  const activeList = useStore((state) => state.lists[state.activeList ?? ""]);
  const addList = useStore((state) => state.addList);
  const setActiveList = useStore((state) => state.setActiveList);
  const removeList = useStore((state) => state.removeList);

  useEffect(() => {
    addList(listKey, {
      investigator: card.code,
    });

    setActiveList(listKey);

    return () => {
      removeList(listKey);
      setActiveList(undefined);
    };
  }, [addList, removeList, setActiveList, listKey, card.code]);

  if (!activeList) return null;

  const titleInterpolationValues = {
    prefix: card.parallel ? `${t("common.parallel")} ` : "",
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
