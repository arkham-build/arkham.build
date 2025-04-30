import { useStore } from "@/store";
import {
  getRelatedCardQuantity,
  getRelatedCards,
} from "@/store/lib/resolve-card";
import { selectCardWithRelations } from "@/store/selectors/card-view";
import { localizeArkhamDBBaseUrl } from "@/utils/arkhamdb";
import {
  getCanonicalCardCode,
  isSpecialist,
  isStaticInvestigator,
} from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { formatRelationTitle } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import { useMedia } from "@/utils/use-media";
import { useResolvedDeck } from "@/utils/use-resolved-deck";
import {
  CheckCircleIcon,
  ExternalLinkIcon,
  MessagesSquareIcon,
} from "lucide-react";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Annotation } from "../annotations/annotation";
import { Card } from "../card/card";
import { CardSet } from "../cardset";
import { Customizations } from "../customizations/customizations";
import { CustomizationsEditor } from "../customizations/customizations-editor";
import { AttachableCards } from "../deck-tools/attachable-cards";
import { Button } from "../ui/button";
import { useDialogContextChecked } from "../ui/dialog.hooks";
import { Modal } from "../ui/modal";
import { AnnotationEdit } from "./card-modal-annotation-edit";
import { CardModalAttachmentQuantities } from "./card-modal-attachment-quantities";
import { useCardModalContextChecked } from "./card-modal-context";
import { CardModalQuantities } from "./card-modal-quantities";
import css from "./card-modal.module.css";
import { SpecialistAccess, SpecialistInvestigators } from "./specialist";

type Props = {
  code: string;
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

  const cardModalCtx = useCardModalContextChecked();
  const completeTask = useStore((state) => state.completeTask);

  const onCompleteTask = useCallback(() => {
    if (!ctx.resolvedDeck) return;
    const nextCode = completeTask(ctx.resolvedDeck.id, props.code);
    cardModalCtx.setOpen({ code: nextCode });
  }, [completeTask, ctx.resolvedDeck, props.code, cardModalCtx.setOpen]);

  const showQuantities =
    !!ctx.resolvedDeck && cardWithRelations?.card.type_code !== "investigator";

  const showExtraQuantities = ctx.resolvedDeck?.hasExtraDeck;

  const canRenderFull = useMedia("(min-width: 45rem)");

  if (!cardWithRelations) return null;

  const related = getRelatedCards(cardWithRelations);

  const attachableDefinition = ctx.resolvedDeck?.availableAttachments.find(
    (config) => config.code === cardWithRelations.card.code,
  );

  const annotation = ctx.resolvedDeck?.annotations[cardWithRelations.card.code];

  const cardNode = (
    <>
      <Card
        className={cx(css["card"], css["shadow"])}
        resolvedCard={cardWithRelations}
        size={canRenderFull ? "full" : "compact"}
        slotCardFooter={
          !!ctx.resolvedDeck &&
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
          ))
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
    </>
  );

  const canonicalCode = getCanonicalCardCode(cardWithRelations.card);

  const traits = cardWithRelations.card.real_traits;
  const deckQuantity = ctx.resolvedDeck?.slots[canonicalCode] ?? 0;

  return (
    <Modal
      key={cardWithRelations.card.code}
      actions={
        <>
          {cardWithRelations.card.type_code === "investigator" &&
            !isStaticInvestigator(cardWithRelations.card) && (
              <Link
                asChild
                href={
                  cardWithRelations.card.parallel
                    ? `/deck/create/${canonicalCode}?initial_investigator=${cardWithRelations.card.code}`
                    : `/deck/create/${canonicalCode}`
                }
                onClick={onCloseModal}
              >
                <Button as="a" data-testid="card-modal-create-deck">
                  <i className="icon-deck" /> {t("deck.actions.create")}
                </Button>
              </Link>
            )}
          <Button
            as="a"
            href={`/card/${cardWithRelations.card.code}`}
            target="_blank"
          >
            <ExternalLinkIcon />
            {t("card_modal.actions.open_card_page")}
          </Button>
          <Button
            as="a"
            href={`${localizeArkhamDBBaseUrl()}/card/${cardWithRelations.card.code}#reviews-header`}
            rel="noreferrer"
            target="_blank"
          >
            <MessagesSquareIcon />
            {t("card_modal.actions.reviews")}
          </Button>
          {canEdit &&
            deckQuantity &&
            traits?.includes("Task") &&
            traits?.includes("Incomplete") && (
              <Button onClick={onCompleteTask}>
                <CheckCircleIcon />
                {t("card_modal.actions.complete_task")}
              </Button>
            )}
        </>
      }
      data-testid="card-modal"
      onClose={onCloseModal}
      size={showQuantities ? "60rem" : "52rem"}
    >
      {showQuantities ? (
        <div className={css["container"]}>
          <div className={css["card"]}>{cardNode}</div>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: not relevant. */}
          <div
            className={css["quantities"]}
            onClick={onClickBackdrop}
            ref={quantitiesRef}
          >
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
    </Modal>
  );
}
