import type { ResolvedDeck } from "@/store/lib/types";
import { CardReviewsLink } from "../card-modal/card-arkhamdb-links";
import { CardPageLink } from "../card-modal/card-page-link";
import { Modal } from "../ui/modal";
import { DeckInvestigator } from "./deck-investigator";

type Props = {
  deck: ResolvedDeck;
  onCloseModal: () => void;
  readonly?: boolean;
};

export function DeckInvestigatorModal(props: Props) {
  const { deck, onCloseModal, readonly } = props;

  return (
    <Modal
      actions={
        <>
          <CardPageLink card={deck.investigatorFront.card} />
          <CardReviewsLink card={deck.investigatorFront.card} />
        </>
      }
      data-testid="investigator-modal"
      onClose={onCloseModal}
      size="52rem"
    >
      <DeckInvestigator
        canToggleBack={false}
        deck={deck}
        readonly={readonly}
        showRelated
        size="full"
      />
    </Modal>
  );
}
