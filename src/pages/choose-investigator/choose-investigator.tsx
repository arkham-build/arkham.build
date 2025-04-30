import { CardModalProvider } from "@/components/card-modal/card-modal-context";
import { Button } from "@/components/ui/button";
import { ListLayoutContextProvider } from "@/layouts/list-layout-context-provider";
import { ListLayoutNoSidebar } from "@/layouts/list-layout-no-sidebar";
import { useStore } from "@/store";
import type { CardWithRelations } from "@/store/lib/types";
import {
  selectActiveList,
  selectCardRelationsResolver,
} from "@/store/selectors/lists";
import type { Card } from "@/store/services/queries.types";
import { displayAttribute } from "@/utils/card-utils";
import { useAccentColor } from "@/utils/use-accent-color";
import { useDocumentTitle } from "@/utils/use-document-title";
import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import css from "./choose-investigator.module.css";
import { SignatureLink } from "./signature-link";

function DeckCreateChooseInvestigator() {
  const { t } = useTranslation();
  const activeListId = useStore((state) => state.activeList);

  const setActiveList = useStore((state) => state.setActiveList);

  const cardResolver = useStore(selectCardRelationsResolver);

  const activeList = useStore(selectActiveList);

  useDocumentTitle(t("choose_investigator.title"));

  useEffect(() => {
    setActiveList("create_deck");
  }, [setActiveList]);

  const getListCardProps = useCallback(
    () => ({
      renderCardExtra: (card: Card) => <ChooseInvestigatorLink card={card} />,
      renderCardMetaExtra:
        activeList?.display.viewMode === "compact"
          ? (card: Card) => (
              <p className={css["traits"]}>
                &middot; {displayAttribute(card, "traits")}
              </p>
            )
          : undefined,
      renderCardAfter: (card: Card) => (
        <ListcardExtra code={card.code} cardResolver={cardResolver} />
      ),
      size: "investigator" as const,
    }),
    [activeList?.display.viewMode, cardResolver],
  );

  if (activeListId !== "create_deck") return null;

  return (
    <CardModalProvider>
      <ListLayoutContextProvider>
        <ListLayoutNoSidebar
          getListCardProps={getListCardProps}
          titleString={t("choose_investigator.title")}
        />
      </ListLayoutContextProvider>
    </CardModalProvider>
  );
}

function ListcardExtra({
  cardResolver,
  code,
}: {
  cardResolver: (code: string) => CardWithRelations | undefined;
  code: string;
}) {
  const signaturesRef = useRef<HTMLUListElement>(null);

  const resolved = cardResolver(code);
  const signatures = resolved?.relations?.requiredCards;

  if (!signatures?.length) return null;

  return (
    <ul className={css["signatures"]} ref={signaturesRef}>
      {signatures.map(({ card }) => (
        <SignatureLink
          card={card}
          key={card.code}
          signaturesRef={signaturesRef}
        />
      ))}
    </ul>
  );
}

function ChooseInvestigatorLink(props: { card: Card }) {
  const { t } = useTranslation();
  const cssVariables = useAccentColor(props.card.faction_code);

  return (
    <Link
      asChild
      to={
        props.card.parallel
          ? `/deck/create/${props.card.alternate_of_code}?initial_investigator=${props.card.code}`
          : `/deck/create/${props.card.code}`
      }
    >
      <Button
        as="a"
        className={css["choose-investigator-button"]}
        data-testid="create-choose-investigator"
        iconOnly
        size="lg"
        style={cssVariables}
        tooltip={t("choose_investigator.create_tooltip", {
          name: displayAttribute(props.card, "name"),
        })}
        variant="primary"
      >
        <PlusIcon />
      </Button>
    </Link>
  );
}

export default DeckCreateChooseInvestigator;
