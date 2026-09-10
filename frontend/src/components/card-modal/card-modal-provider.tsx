import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { Dialog, DialogContent } from "../ui/dialog";
import { CardModal } from "./card-modal";

type Props = {
  children: React.ReactNode;
};

export function CardModalProvider(props: Props) {
  const cardModal = useStore((state) => state.ui.cardModal);
  const closeCardModal = useStore((state) => state.closeCardModal);

  const [previousCardModal, setPreviousCardModal] = useState(cardModal);
  const visibleCardModal = cardModal.code ? cardModal : previousCardModal;

  useEffect(() => {
    if (cardModal.code) setPreviousCardModal(cardModal);
  }, [cardModal]);

  return (
    <>
      {props.children}
      <Dialog onOpenChange={closeCardModal} open={!!cardModal.code}>
        <DialogContent>
          {visibleCardModal.code && (
            <CardModal
              code={visibleCardModal.code}
              config={visibleCardModal.config}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
