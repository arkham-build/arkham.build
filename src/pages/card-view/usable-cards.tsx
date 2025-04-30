import {
  CardModalProvider,
  useCardModalContextChecked,
} from "@/components/card-modal/card-modal-context";
import { PortaledCardTooltip } from "@/components/card-tooltip/card-tooltip-portaled";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useStore } from "@/store";
import type { Card } from "@/store/services/queries.types";
import { displayAttribute } from "@/utils/card-utils";
import { useAccentColor } from "@/utils/use-accent-color";
import { useCallback, useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useParams } from "wouter";
import { Error404 } from "../errors/404";
import css from "./usable-cards.module.css";

type Props = {
  code: string;
};

function UsableCards() {
  const params = useParams<Props>();

  const card = useStore((state) => state.metadata.cards[params.code]);

  if (!card || card.type_code !== "investigator") {
    return <Error404 />;
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
    addList(listKey, "player", {
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

function CardLink({
  children,
  card,
}: { children?: React.ReactNode; card: Card }) {
  const accentColor = useAccentColor(card.faction_code);

  const cardModalContext = useCardModalContextChecked();

  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip();

  const onClick = useCallback(() => {
    cardModalContext.setOpen({ code: card.code });
  }, [cardModalContext, card.code]);

  return (
    <>
      <button
        {...referenceProps}
        className={css["card-link"]}
        onClick={onClick}
        type="button"
        ref={refs.setReference}
        style={accentColor}
      >
        {card.parallel && <i className="icon-parallel" />}
        {children}
      </button>
      {isMounted && (
        <PortaledCardTooltip
          card={card}
          ref={refs.setFloating}
          floatingStyles={floatingStyles}
          transitionStyles={transitionStyles}
        />
      )}
    </>
  );
}

export default UsableCards;
