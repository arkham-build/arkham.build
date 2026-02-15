/** biome-ignore-all lint/a11y/useKeyWithClickEvents: not relevant. */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: backdrop needs to be clickable. */

import type { Card as CardT } from "@arkham-build/shared";
import { ArrowDownIcon, ArrowUpIcon, CheckCircleIcon } from "lucide-react";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useStore } from "@/store";
import {
  getRelatedCardQuantity,
  getRelatedCards,
} from "@/store/lib/resolve-card";
import { selectCardWithRelations } from "@/store/selectors/card-view";
import { selectShowFanMadeRelations } from "@/store/selectors/shared";
import type { CardModalConfig } from "@/store/slices/ui.types";
import {
  canShowCardPoolExtension,
  deckCreateLink,
  isSpecialist,
  isStaticInvestigator,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { formatRelationTitle } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import { useHotkey } from "@/utils/use-hotkey";
import { useMedia } from "@/utils/use-media";
import { useResolvedDeck } from "@/utils/use-resolved-deck";
import { Annotation } from "../annotations/annotation";
import { PopularDecks } from "../arkhamdb-decklists/popular-decks";
import { Card } from "../card/card";
import { CardSet } from "../cardset";
import { Customizations } from "../customizations/customizations";
import { CustomizationsEditor } from "../customizations/customizations-editor";
import { AttachableCards } from "../deck-tools/attachable-cards";
import { CardPoolExtension } from "../limited-card-pool/card-pool-extension";
import { Button } from "../ui/button";
import { useDialogContextChecked } from "../ui/dialog.hooks";
import { HotkeyTooltip } from "../ui/hotkey";
import { Modal, ModalActions, ModalBackdrop, ModalInner } from "../ui/modal";
import { CardReviewsLink } from "./card-arkhamdb-links";
import css from "./card-modal.module.css";
import { AnnotationEdit } from "./card-modal-annotation-edit";
import { CardModalAttachmentQuantities } from "./card-modal-attachment-quantities";
import { CardModalQuantities } from "./card-modal-quantities";
import { CardPageLink } from "./card-page-link";
import { SpecialistAccess, SpecialistInvestigators } from "./specialist";

type Props = {
  code: string;
  config: CardModalConfig | undefined;
};

export function CardModal(props: Props) {
  const { t } = useTranslation();
  const ctx = useResolvedDeck();

  const canEdit = ctx.canEdit;

  const modalContext = useDialogContextChecked();

  const onCloseModal = useCallback(() => {
    modalContext?.setOpen(false);
  }, [modalContext]);

  const quantitiesRef = useRef<HTMLDivElement>(null);

  const onClickBackdrop = useCallback(
    (evt: React.MouseEvent) => {
      if (evt.target === quantitiesRef.current) {
        onCloseModal();
      }
    },
    [onCloseModal],
  );

  const cardWithRelations = useStore((state) =>
    selectCardWithRelations(state, props.code, true, ctx.resolvedDeck),
  );

  const settings = useStore((state) => state.settings);
  const showFanMadeRelations = useStore(selectShowFanMadeRelations);

  const openCardModal = useStore((state) => state.openCardModal);
  const listOrder = useStore((state) => state.ui.cardModal.config?.listOrder);

  const completeTask = useStore((state) => state.completeTask);

  const onCompleteTask = useCallback(() => {
    if (!ctx.resolvedDeck || !cardWithRelations?.card) return;

    const nextCode = completeTask(ctx.resolvedDeck.id, cardWithRelations.card);
    openCardModal(nextCode);
  }, [completeTask, ctx.resolvedDeck, cardWithRelations?.card, openCardModal]);

  const canRenderFull = useMedia("(min-width: 45rem)");

  const handlePrintingSelect = useCallback(
    (card: CardT) => {
      openCardModal(card.code);
    },
    [openCardModal],
  );

  if (!cardWithRelations) return null;

  const showQuantities =
    !!ctx.resolvedDeck && cardWithRelations?.card.type_code !== "investigator";
  const showExtraQuantities = ctx.resolvedDeck?.hasExtraDeck;
  const related = getRelatedCards(
    cardWithRelations,
    showFanMadeRelations,
    settings.showPreviews,
  );

  const attachableDefinition = ctx.resolvedDeck?.availableAttachments.find(
    (config) => config.code === cardWithRelations.card.code,
  );

  const annotation = ctx.resolvedDeck?.annotations[cardWithRelations.card.code];

  const cardNode = (
    <>
      <Card
        className={cx(css["card"], css["shadow"])}
        resolvedCard={cardWithRelations}
        onPrintingSelect={handlePrintingSelect}
        size={canRenderFull ? "full" : "compact"}
        slotCardFooter={
          <>
            {ctx.resolvedDeck &&
              canShowCardPoolExtension(cardWithRelations.card) && (
                <div className={css["related"]}>
                  <CardPoolExtension
                    canEdit={canEdit}
                    card={cardWithRelations.card}
                    deck={ctx.resolvedDeck}
                    showLabel
                  />
                </div>
              )}

            {!!ctx.resolvedDeck &&
              (canEdit ? (
                <div className={css["related"]}>
                  <AnnotationEdit
                    cardCode={cardWithRelations.card.code}
                    deckId={ctx.resolvedDeck.id}
                    text={annotation}
                  />
                </div>
              ) : (
                annotation && (
                  <div className={css["related"]}>
                    <Annotation content={annotation} />
                  </div>
                )
              ))}
          </>
        }
      >
        {ctx.resolvedDeck && !!attachableDefinition && (
          <AttachableCards
            card={cardWithRelations.card}
            definition={attachableDefinition}
            readonly={!canEdit}
            resolvedDeck={ctx.resolvedDeck}
          />
        )}
        {cardWithRelations.card.customization_options ? (
          ctx.resolvedDeck ? (
            <CustomizationsEditor
              canEdit={canEdit}
              card={cardWithRelations.card}
              deck={ctx.resolvedDeck}
            />
          ) : (
            <Customizations card={cardWithRelations.card} />
          )
        ) : undefined}
      </Card>
      {!isEmpty(related) && (
        <div className={css["related"]}>
          {related.map(([key, value]) => {
            const cards = Array.isArray(value) ? value : [value];
            return (
              <CardSet
                className={cx(css["cardset"], css["shadow"])}
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
          {cardWithRelations.card.type_code === "investigator" && (
            <SpecialistAccess card={cardWithRelations.card} />
          )}
        </div>
      )}
      {isSpecialist(cardWithRelations.card) && (
        <div className={css["related"]}>
          <SpecialistInvestigators card={cardWithRelations.card} />
        </div>
      )}
      {!cardWithRelations.card.preview &&
        !ctx.resolvedDeck &&
        settings.showCardModalPopularDecks &&
        cardWithRelations.card.official && (
          <div className={css["related"]}>
            <PopularDecks scope={cardWithRelations.card} />
          </div>
        )}
    </>
  );

  const traits = cardWithRelations.card.real_traits;
  const deckQuantity =
    ctx.resolvedDeck?.slots[cardWithRelations.card.code] ?? 0;

  return (
    <Modal key={cardWithRelations.card.code} data-testid="card-modal">
      <ModalBackdrop />
      <ModalInner size="60rem">
        <ModalActions>
          {cardWithRelations.card.type_code === "investigator" &&
            !isStaticInvestigator(cardWithRelations.card) && (
              <Link
                asChild
                href={deckCreateLink(cardWithRelations.card)}
                onClick={onCloseModal}
              >
                <Button as="a" data-testid="card-modal-create-deck">
                  <i className="icon-deck" /> {t("deck.actions.create")}
                </Button>
              </Link>
            )}
          <CardPageLink card={cardWithRelations.card} />
          <CardReviewsLink card={cardWithRelations.card} />
          {canEdit &&
            !!deckQuantity &&
            traits?.includes("Task") &&
            traits?.includes("Incomplete") && (
              <Button onClick={onCompleteTask}>
                <CheckCircleIcon />
                {t("card_modal.actions.complete_task")}
              </Button>
            )}
        </ModalActions>
        {showQuantities || listOrder ? (
          <div className={css["container"]}>
            <div className={css["card"]}>{cardNode}</div>
            <div
              className={css["quantities"]}
              onClick={onClickBackdrop}
              ref={quantitiesRef}
            >
              {listOrder && (
                <CardModalArrowNavigation
                  code={props.code}
                  listOrder={listOrder}
                />
              )}
              {showQuantities && (
                <CardModalQuantities
                  canEdit={canEdit}
                  card={cardWithRelations.card}
                  deck={ctx.resolvedDeck}
                  onCloseModal={onCloseModal}
                  showExtraQuantities={showExtraQuantities}
                />
              )}
              {!isEmpty(ctx.resolvedDeck?.availableAttachments) && (
                <CardModalAttachmentQuantities
                  card={cardWithRelations.card}
                  resolvedDeck={ctx.resolvedDeck}
                />
              )}
            </div>
          </div>
        ) : (
          cardNode
        )}
      </ModalInner>
    </Modal>
  );
}

function CardModalArrowNavigation(props: {
  code: string;
  listOrder?: string[];
}) {
  const { code, listOrder } = props;
  const { t } = useTranslation();
  const openCardModal = useStore((state) => state.openCardModal);

  const cardPosition = listOrder?.indexOf(code) ?? -1;

  const nextCardCode = listOrder?.[cardPosition + 1];
  const previousCardCode = listOrder?.[cardPosition - 1];

  const onNextCard = useCallback(() => {
    if (nextCardCode) {
      openCardModal(nextCardCode);
    }
  }, [openCardModal, nextCardCode]);

  const onPreviousCard = useCallback(() => {
    if (previousCardCode) {
      openCardModal(previousCardCode);
    }
  }, [openCardModal, previousCardCode]);

  useHotkey("arrowdown", onNextCard, { disabled: !nextCardCode });
  useHotkey("arrowup", onPreviousCard, { disabled: !previousCardCode });

  return (
    <nav className={css["neighbour-nav"]}>
      <HotkeyTooltip
        keybind="arrowup"
        description={t("lists.actions.previous_card")}
      >
        <Button
          data-testid="card-modal-prev-card"
          onClick={onPreviousCard}
          disabled={!previousCardCode}
          iconOnly
          size="lg"
        >
          <ArrowUpIcon />
        </Button>
      </HotkeyTooltip>
      <HotkeyTooltip
        keybind="arrowdown"
        description={t("lists.actions.next_card")}
      >
        <Button
          data-testid="card-modal-next-card"
          onClick={onNextCard}
          disabled={!nextCardCode}
          iconOnly
          size="lg"
        >
          <ArrowDownIcon />
        </Button>
      </HotkeyTooltip>
    </nav>
  );
}
