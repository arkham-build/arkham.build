import type { ResolvedDeck } from "@/store/lib/types";
import { localizeArkhamDBBaseUrl } from "@/utils/arkhamdb";
import { ExternalLinkIcon, MessagesSquareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { DeckInvestigator } from "./deck-investigator";

type Props = {
  deck: ResolvedDeck;
  onCloseModal: () => void;
  readonly?: boolean;
};

export function DeckInvestigatorModal(props: Props) {
  const { deck, onCloseModal, readonly } = props;
  const { t } = useTranslation();

  return (
    <Modal
      actions={
        <>
          <Button
            as="a"
            href={`/card/${deck.investigatorFront.card.code}`}
            tabIndex={0}
            target="_blank"
          >
            <ExternalLinkIcon />
            {t("card_modal.actions.open_card_page")}
          </Button>
          <Button
            as="a"
            href={`${localizeArkhamDBBaseUrl()}/card/${deck.investigatorFront.card.code}#reviews-header`}
            rel="noreferrer"
            target="_blank"
          >
            <MessagesSquareIcon />
            {t("card_modal.actions.reviews")}
          </Button>
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
