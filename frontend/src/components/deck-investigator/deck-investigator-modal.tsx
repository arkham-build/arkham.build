import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { CardReviewsLink } from "../card-modal/card-arkhamdb-links";
import { CardPageLink } from "../card-modal/card-page-link";
import { Modal, ModalActions, ModalBackdrop, ModalInner } from "../ui/modal";
import { DeckInvestigator } from "./deck-investigator";

type Props = {
  deck: ResolvedDeck;
  readonly?: boolean;
};

export function DeckInvestigatorModal(props: Props) {
  const { deck, readonly } = props;

  const updateInvestigatorCode = useStore(
    (state) => state.updateInvestigatorCode,
  );

  return (
    <Modal data-testid="investigator-modal">
      <ModalBackdrop />
      <ModalInner size="52rem">
        <ModalActions>
          <CardPageLink card={deck.investigatorFront.card} />
          <CardReviewsLink card={deck.investigatorFront.card} />
        </ModalActions>
        <DeckInvestigator
          canToggleBack={false}
          deck={deck}
          readonly={readonly}
          onPrintingSelect={(card) => {
            updateInvestigatorCode(deck.id, card.code);
          }}
          showRelated
          size="full"
        />
      </ModalInner>
    </Modal>
  );
}
