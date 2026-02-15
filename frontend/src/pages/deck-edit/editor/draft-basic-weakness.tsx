import type { Card } from "@arkham-build/shared";
import {
  DicesIcon,
  ExternalLinkIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { CardScan } from "@/components/card-scan";
import { PortaledCardTooltip } from "@/components/card-tooltip/card-tooltip-portaled";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useDialogContext } from "@/components/ui/dialog.hooks";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "@/components/ui/modal";
import { Plane } from "@/components/ui/plane";
import { useToast } from "@/components/ui/toast.hooks";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";
import { useStore } from "@/store";
import type { LookupTables } from "@/store/lib/lookup-tables.types";
import { randomBasicWeaknessForDeck } from "@/store/lib/random-basic-weakness";
import type { ResolvedDeck } from "@/store/lib/types";
import type { Slots } from "@/store/schemas/deck.schema";
import { selectLookupTables, selectMetadata } from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import { assert } from "@/utils/assert";
import { cardLimit, displayAttribute } from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { useAccentColor } from "@/utils/use-accent-color";
import css from "./draft-basic-weakness.module.css";

type Props = {
  deck: ResolvedDeck;
  quantity?: number;
  targetDeck: string;
};

export function DraftBasicWeakness(props: Props) {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          data-testid="draft-basic-weakness"
          disabled={!props.quantity || props.targetDeck !== "slots"}
          iconOnly
          size="sm"
          tooltip={t("deck_edit.actions.draft_random_basic_weakness")}
          variant="bare"
        >
          <DicesIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DraftBasicWeaknessModal {...props} />
      </DialogContent>
    </Dialog>
  );
}

function DraftBasicWeaknessModal(props: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const { deck } = props;

  const deps = useStore(
    useShallow((state) => ({
      metadata: selectMetadata(state),
      lookupTables: selectLookupTables(state),
      settings: state.settings,
    })),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: should only be computed once on mount
  const weaknesses = useMemo(() => selectDraftWeaknesses(deps, deck), []);

  const [selectedWeakness, setSelectedWeakness] = useState<
    string | undefined
  >();

  const updateCardQuantity = useStore((state) => state.updateCardQuantity);

  const accentColor = useAccentColor(deck.investigatorBack.card);

  const dialogContext = useDialogContext();

  const handleSubmit = useCallback(
    (evt: React.FormEvent<HTMLFormElement>) => {
      evt.preventDefault();

      assert(weaknesses, "Submit called before draft initialized.");

      const remainingWeaknesses = weaknesses.filter(
        (w) => w.code !== selectedWeakness,
      );

      const chosenWeakness =
        remainingWeaknesses[
          Math.floor(Math.random() * remainingWeaknesses.length)
        ];

      assert(chosenWeakness, "Could not determine which weakness to add.");

      dialogContext?.setOpen(false);

      updateCardQuantity(
        deck.id,
        chosenWeakness.code,
        1,
        cardLimit(deps.metadata.cards[chosenWeakness.code]),
      );

      updateCardQuantity(
        deck.id,
        SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS,
        -1,
        cardLimit(
          deps.metadata.cards[SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS],
        ),
      );

      toast.show({
        variant: "success",
        duration: 3000,
        children: (
          <Trans
            defaults="<strong>{{name}}</strong> was added to your deck."
            i18nKey="deck_edit.actions.draft_random_basic_weakness_success"
            t={t}
            values={{ name: displayAttribute(chosenWeakness, "name") }}
            components={{ strong: <strong /> }}
          />
        ),
      });
    },
    [
      weaknesses,
      selectedWeakness,
      updateCardQuantity,
      deck.id,
      deps.metadata.cards,
      dialogContext,
      toast,
      t,
    ],
  );

  return (
    <Modal>
      <ModalBackdrop />
      <ModalInner size="52rem">
        <ModalActions />
        <DefaultModalContent
          title={
            <span className={css["modal-title"]}>
              <DicesIcon />
              {t("deck_edit.draft_weakness_modal.title")}
            </span>
          }
        >
          {weaknesses ? (
            <form className={css["container"]} onSubmit={handleSubmit}>
              <h3>{t("deck_edit.draft_weakness_modal.explanation_title")}</h3>
              <p>{t("deck_edit.draft_weakness_modal.explanation_body")}</p>
              <h3>{t("deck_edit.draft_weakness_modal.choice_title")}</h3>
              <ol className={css["list-container"]}>
                {weaknesses.map((weakness) => (
                  <WeaknessCard
                    key={weakness.code}
                    card={weakness}
                    selectedCode={selectedWeakness}
                    setSelectedCode={setSelectedWeakness}
                  />
                ))}
              </ol>
              <footer className={css["actions"]} style={accentColor}>
                <Button
                  type="submit"
                  data-testid="draft-basic-weakness-confirm"
                  disabled={!selectedWeakness}
                  style={accentColor}
                  variant="primary"
                >
                  {t("deck_edit.draft_weakness_modal.confirm_button")}
                </Button>
                <Button
                  variant="bare"
                  onClick={() => dialogContext?.setOpen(false)}
                >
                  {t("deck_edit.draft_weakness_modal.cancel_button")}
                </Button>
              </footer>
            </form>
          ) : (
            <Plane className={css["error"]}>
              <TriangleAlertIcon />
              {t("deck_edit.draft_weakness_modal.too_few_rbw")}
            </Plane>
          )}
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}

type WeaknessCardProps = {
  card: Card;
  setSelectedCode: (code: string | undefined) => void;
  selectedCode?: string;
};

function WeaknessCard(props: WeaknessCardProps) {
  const { card, selectedCode, setSelectedCode } = props;

  const { refs, referenceProps, isMounted, floatingStyles, transitionStyles } =
    useRestingTooltip();

  const isSelected = card.code === selectedCode;

  return (
    <li
      key={card.code}
      className={`${css["list-item"]} ${isSelected ? css["selected"] : ""}`}
    >
      <button
        className={css["card-container"]}
        data-testid="drafted-weakness"
        data-code={card.code}
        onClick={() => {
          setSelectedCode(selectedCode === card.code ? undefined : card.code);
        }}
        onKeyDown={(evt) => {
          if (evt.key === "Enter" || evt.key === " ") {
            evt.preventDefault();
            setSelectedCode(selectedCode === card.code ? undefined : card.code);
          }
        }}
        type="button"
      >
        {isSelected && (
          <>
            <div className={css["overlay"]} />
            <XIcon className={css["cancel-icon"]} />
          </>
        )}
        <CardScan card={card} preventFlip draggable={false} />
      </button>

      <Button
        {...referenceProps}
        ref={refs.setReference}
        as="a"
        href={`/card/${card.code}`}
        target="_blank"
        rel="noopener noreferrer"
        variant="link"
        className={css["title-button"]}
        tabIndex={-1}
      >
        <ExternalLinkIcon />
        {displayAttribute(card, "name")}
      </Button>

      {isMounted && (
        <PortaledCardTooltip
          card={card}
          ref={refs.setFloating}
          floatingStyles={floatingStyles}
          transitionStyles={transitionStyles}
        />
      )}
    </li>
  );
}

function selectDraftWeaknesses(
  deps: {
    metadata: StoreState["metadata"];
    lookupTables: LookupTables;
    settings: StoreState["settings"];
  },
  deck: ResolvedDeck,
) {
  const { lookupTables, metadata, settings } = deps;

  const drawnWeaknesses = new Set<string>();

  while (drawnWeaknesses.size < 3) {
    const weaknessCode = randomBasicWeaknessForDeck(
      metadata,
      lookupTables,
      settings,
      {
        ...deck,
        slots: {
          ...deck.slots,
          // Make sure we don't draw the same weakness multiple times
          ...Array.from(drawnWeaknesses).reduce((acc, curr) => {
            acc[curr] = Number.MAX_SAFE_INTEGER;
            return acc;
          }, {} as Slots),
        },
      },
    );

    if (weaknessCode) {
      drawnWeaknesses.add(weaknessCode);
    } else {
      return undefined;
    }
  }

  return Array.from(drawnWeaknesses).map((code) => metadata.cards[code]);
}
