import { DicesIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Modal, ModalContent } from "@/components/ui/modal";
import { useStore } from "@/store";
import type { LookupTables } from "@/store/lib/lookup-tables.types";
import { randomBasicWeaknessForDeck } from "@/store/lib/random-basic-weakness";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectLookupTables, selectMetadata } from "@/store/selectors/shared";
import type { StoreState } from "@/store/slices";
import { CardScan } from "@/components/card-scan";
import css from "./draft-basic-weakness.module.css";
import { Slots } from "@/store/slices/data.types";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { useDialogContext } from "@/components/ui/dialog.hooks";
import { assert } from "@/utils/assert";
import { useToast } from "@/components/ui/toast.hooks";
import { cardLimit, displayAttribute } from "@/utils/card-utils";
import { PortaledCardTooltip } from "@/components/card-tooltip/card-tooltip-portaled";
import { useRestingTooltip } from "@/components/ui/tooltip.hooks";

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

  const weaknesses = useMemo(
    () => selectDraftWeaknesses(deps, deck),
    [deps, deck],
  );

  if (!weaknesses) return null;

  const [selectedWeakness, setSelectedWeakness] = useState<string | null>(null);

  const updateCardQuantity = useStore((state) => state.updateCardQuantity);

  const dialogContext = useDialogContext();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Choose weakness from remaining two
    const remainingWeaknesses = weaknesses.filter((w) => w.code !== selectedWeakness,);
    const chosenWeakness = remainingWeaknesses[Math.floor(Math.random() * remainingWeaknesses.length)];
    assert(chosenWeakness, "Could not determine which weakness to add.");

    // Add chosen card to deck
    updateCardQuantity(
      deck.id,
      chosenWeakness.code,
      1,
      cardLimit(deps.metadata.cards[chosenWeakness.code])
    );

    // Decrease RBW count by 1
    updateCardQuantity(
      deck.id,
      SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS,
      -1,
      cardLimit(deps.metadata.cards[SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS])
    );

    // Close the modal
    dialogContext?.setOpen(false);

    // Display toast with resulting card
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
  };

  return (
    <Modal size="60rem" >
      <ModalContent title={t("deck_edit.draft_weakness_modal.title")}>
        <form onSubmit={handleSubmit}>
          <h3 className={`${css['h3']}`} >
            {t("deck_edit.draft_weakness_modal.explanation_title")}
          </h3>
          <p className={`${css['p']}`} >
            {t("deck_edit.draft_weakness_modal.explanation_body")}
          </p>
          <h3 className={`${css['h3']}`} >
            {t("deck_edit.draft_weakness_modal.choice_title")}
          </h3>
          <ol className={css['list-container']}>
            {weaknesses.map((weakness) => {
              const isSelected = weakness.code === selectedWeakness;
              const {
                refs,
                referenceProps,
                isMounted,
                floatingStyles,
                transitionStyles
              } = useRestingTooltip({ delay: 350 });

              return (
                <li key={weakness.code}
                  className={`${css['list-item']} ${isSelected ? css['selected'] : ''}`}
                  onClick={() => setSelectedWeakness(weakness.code)} >

                  <div className={css['card-container']}>
                    {isSelected && <div className={css['overlay']}></div>}
                    <CardScan
                      className={css['draft-weakness']}
                      card={weakness}
                      preventFlip
                    />
                  </div>

                  <div className={css['title-container']}>
                    <span ref={refs.setReference} {...referenceProps}>
                      {displayAttribute(weakness, "name")}
                    </span>
                  </div>

                  {isMounted && (
                    <PortaledCardTooltip
                      card={weakness}
                      ref={refs.setFloating}
                      floatingStyles={floatingStyles}
                      transitionStyles={transitionStyles}
                    />
                  )}
                </li>
              );
            })}
          </ol>
          <p className={`${css['p']}`} >
            {t("deck_edit.draft_weakness_modal.choice_footer")}
          </p>
          <footer>
            {/* Disable the button if nothing is selected */}
            <Button type="submit" disabled={!selectedWeakness}>
              {t("deck_edit.draft_weakness_modal.confirm_button")}
            </Button>
            <Button variant="bare" onClick={() => dialogContext?.setOpen(false)}>
              {t("deck_edit.draft_weakness_modal.cancel_button")}
            </Button>
          </footer>
        </form>
      </ModalContent>
    </Modal>
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
          }, {} as Slots)
        }
      }
    );

    if (weaknessCode) {
      drawnWeaknesses.add(weaknessCode);
    } else {
      return undefined;
    }
  }

  return Array.from(drawnWeaknesses).map((code) => metadata.cards[code]);
}