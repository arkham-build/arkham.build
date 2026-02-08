import type { Card } from "@arkham-build/shared";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import {
  getRelatedCardQuantity,
  getRelatedCards,
} from "@/store/lib/resolve-card";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectShowFanMadeRelations } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";
import { formatRelationTitle } from "@/utils/formatting";
import { CardBack } from "../card/card-back";
import { CardContainer } from "../card/card-container";
import { CardFace } from "../card/card-face";
import { SpecialistAccess } from "../card-modal/specialist";
import { CardSet } from "../cardset";
import { AttachableCards } from "../deck-tools/attachable-cards";
import { LimitedSlots } from "../deck-tools/limited-slots";
import { Button } from "../ui/button";
import { useDialogContextChecked } from "../ui/dialog.hooks";
import css from "./deck-investigator.module.css";

type Props = {
  canToggleBack?: boolean;
  className?: string;
  deck: ResolvedDeck;
  onPrintingSelect?: (card: Card) => void;
  readonly?: boolean;
  showRelated?: boolean;
  size: "tooltip" | "full";
  titleLinks?: "dialog" | "card-modal" | "card";
};

export function DeckInvestigator(props: Props) {
  // TECH DEBT: If a card modal is open, close this dialog.
  const cardModalOpen = useStore((state) => !!state.ui.cardModal.code);
  const dialogContext = useDialogContextChecked();
  if (cardModalOpen) dialogContext?.setOpen(false);

  const {
    canToggleBack = true,
    className,
    deck,
    onPrintingSelect,
    readonly,
    showRelated,
    size,
    titleLinks,
  } = props;

  const [backToggled, toggleBack] = useState(false);
  const { t } = useTranslation();

  const showFanMadeRelations = useStore(selectShowFanMadeRelations);
  const settings = useStore((state) => state.settings);

  const related = getRelatedCards(
    deck.cards.investigator,
    showFanMadeRelations,
    settings.showPreviews,
  ).filter(([key]) => key !== "parallel");

  const hasBack =
    deck.investigatorBack.card.double_sided ||
    deck.investigatorBack.card.back_link_id;

  const children = canToggleBack ? (
    <>
      <CardFace
        data-testid="deck-investigator-front"
        onPrintingSelect={onPrintingSelect}
        resolvedCard={deck.investigatorFront}
        titleLinks={titleLinks}
        size={size}
      />
      {hasBack && (
        <div
          className={cx(css["back-toggle"], backToggled && css["open"])}
          data-testid="deck-investigator-back-toggle"
        >
          <Button onClick={() => toggleBack((p) => !p)}>
            {backToggled ? <ChevronUpIcon /> : <ChevronDownIcon />}
            {t("card_view.actions.view_backside")}{" "}
            {deck.investigatorBack.card.parallel && (
              <>
                (<span className="icon-parallel" />)
              </>
            )}
          </Button>
        </div>
      )}
      {hasBack && backToggled && (
        <CardBack
          card={deck.investigatorBack.card}
          data-testid="deck-investigator-back"
          size={size}
        />
      )}
    </>
  ) : (
    <>
      <CardFace
        onPrintingSelect={onPrintingSelect}
        resolvedCard={deck.investigatorFront}
        size={size}
        titleLinks={titleLinks}
      />
      {hasBack && <CardBack card={deck.investigatorBack.card} size={size} />}
    </>
  );

  const attachableDefinition = deck?.availableAttachments?.find(
    (config) => config.code === deck.investigatorBack.card.code,
  );

  return (
    <div className={cx(css["deck-investigator-container"], className)}>
      <CardContainer
        className={cx(css["deck-investigator"], css[size])}
        data-testid="deck-investigator"
        size={size}
      >
        {children}
      </CardContainer>
      {showRelated && deck && !!attachableDefinition && (
        <AttachableCards
          card={deck.investigatorBack.card}
          definition={attachableDefinition}
          readonly={readonly}
          resolvedDeck={deck}
        />
      )}
      {showRelated && <LimitedSlots deck={deck} />}
      {showRelated && (
        <div className={css["deck-investigator-related"]}>
          {related.map(([key, value]) => {
            const cards = Array.isArray(value) ? value : [value];
            return (
              <CardSet
                key={key}
                set={{
                  title: formatRelationTitle(key),
                  cards,
                  id: key,
                  selected: false,
                  quantities: getRelatedCardQuantity(key, cards),
                }}
              />
            );
          })}
          <SpecialistAccess card={deck.investigatorBack.card} />
        </div>
      )}
    </div>
  );
}
