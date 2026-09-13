import { useState } from "react";
import { useStore } from "@/store";
import { Dialog, DialogContent } from "../ui/dialog";
import { CardModal } from "./card-modal";

type Props = {
  children: React.ReactNode;
};

export function CardModalProvider(props: Props) {
  const cardModal = useStore((state) => state.ui.cardModal);
  const closeCardModal = useStore((state) => state.closeCardModal);

  const [visibleCardModal, setVisibleCardModal] = useState(cardModal);

  if (cardModal.code && cardModal !== visibleCardModal) {
    setVisibleCardModal(cardModal);
  }

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
