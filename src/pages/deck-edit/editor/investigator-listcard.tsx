import { useCallback } from "react";

import { DeckInvestigator } from "@/components/deck-investigator";
import { ListCard } from "@/components/list-card/list-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useDialogContext } from "@/components/ui/dialog.hooks";
import { Modal } from "@/components/ui/modal";
import type { ResolvedDeck } from "@/store/lib/types";

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
  const modalContext = useDialogContext();

  const onCloseModal = useCallback(() => {
    modalContext?.setOpen(false);
  }, [modalContext]);

  const card = {
    ...deck.investigatorFront.card,
    parallel:
      deck.investigatorFront.card.parallel ||
      deck.investigatorBack.card.parallel,
  };

  return (
    <>
      <DialogTrigger>
        <ListCard
          card={card}
          disableModalOpen
          omitBorders
          showInvestigatorIcons
          size="investigator"
          tooltip={
            <DeckInvestigator
              canToggleBack={false}
              deck={deck}
              size="tooltip"
            />
          }
        />
      </DialogTrigger>
      <DialogContent>
        <Modal
          actions={
            <Button
              as="a"
              href={`/card/${deck.investigatorFront.card.code}`}
              tabIndex={0}
              target="_blank"
            >
              Open card page
            </Button>
          }
          data-testid="investigator-modal"
          onClose={onCloseModal}
          size="52rem"
        >
          <DeckInvestigator
            canToggleBack={false}
            deck={deck}
            showRelated
            size="full"
          />
        </Modal>
      </DialogContent>
    </>
  );
}
