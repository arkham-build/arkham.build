import { useEffect } from "react";
import { useCardModalContextChecked } from "@/components/card-modal/card-modal-context";
import { DeckInvestigator } from "@/components/deck-investigator/deck-investigator";
import { DeckInvestigatorModal } from "@/components/deck-investigator/deck-investigator-modal";
import { ListCard } from "@/components/list-card/list-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDialogContextChecked } from "@/components/ui/dialog.hooks";
import type { ResolvedDeck } from "@/store/lib/types";
import css from "./investigator-listcard.module.css";

type Props = {
  deck: ResolvedDeck;
};

export function InvestigatorListcard(props: Props) {
  return (
    <Dialog>
      <InvestigatorListcardInner {...props} />
    </Dialog>
  );
}

function InvestigatorListcardInner({ deck }: Props) {
  const cardModalContext = useCardModalContextChecked();
  const modalContext = useDialogContextChecked();

  useEffect(() => {
    if (cardModalContext.isOpen) {
      modalContext?.setOpen(false);
    }
  }, [cardModalContext.isOpen, modalContext.setOpen]);

  const card = {
    ...deck.investigatorFront.card,
    parallel:
      deck.investigatorFront.card.parallel ||
      deck.investigatorBack.card.parallel,
  };

  return (
    <div
      className={css["investigator-container"]}
      data-testid="investigator-container"
    >
      <ListCard
        card={card}
        omitBorders
        showInvestigatorIcons
        size="investigator"
        titleOpens="dialog"
        tooltip={
          <DeckInvestigator
            canToggleBack={false}
            deck={deck}
            readonly
            size="tooltip"
          />
        }
      />
      <DialogContent>
        <DeckInvestigatorModal deck={deck} />
      </DialogContent>
    </div>
  );
}
