import { DicesIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

  const dialogContext = useDialogContext();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('Confirmed cancellation for weakness code:', selectedWeakness);
    // Close the modal
    dialogContext?.setOpen(false);

    // Decrease RBW count by 1

    // Add chosen card to deck

    // Display toast with resulting card
  };

  return (
    <Modal size="60rem" >
      <ModalContent title="Drafting a basic weakness">
        <form onSubmit={handleSubmit}>
          <h3 className={`${css['h3']}`} >
            Explanation
          </h3>
          <p className={`${css['p']}`} >
            This is a common house rule to give the player more control over
            the basic weakness in comparison to fully randomizing it.
          </p>
          <h3 className={`${css['h3']}`} >
            Choose one weakness to cancel
          </h3>
          <ol className={css['list-container']}>
            {weaknesses.map((weakness) => {
              const isSelected = weakness.code === selectedWeakness;
              return (
                <li
                  key={weakness.code}
                  className={`${css['list-item']} ${isSelected ? css['selected'] : ''}`}
                  onClick={() => setSelectedWeakness(weakness.code)}
                >
                  {isSelected && <div className={css['overlay']}></div>}
                  <CardScan className={css["draft-weakness"]} card={weakness} preventFlip />
                </li>
              );
            })}
          </ol>
          <p className={`${css['p']}`} >
            One of the two remaining weaknesses will be added to your deck at random.
          </p>
          <footer>
            {/* Disable the button if nothing is selected */}
            <Button type="submit" disabled={!selectedWeakness}>
              Confirm
            </Button>
            <Button variant="bare">Cancel</Button>
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