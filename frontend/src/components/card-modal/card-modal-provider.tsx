import { useStore } from "@/store";
import { Dialog, DialogContent } from "../ui/dialog";
import { CardModal } from "./card-modal";

type Props = {
  children: React.ReactNode;
};

export function CardModalProvider(props: Props) {
  const cardModal = useStore((state) => state.ui.cardModal);
  const closeCardModal = useStore((state) => state.closeCardModal);

  return (
    <>
      {props.children}
      <Dialog onOpenChange={closeCardModal} open={!!cardModal.code}>
        <DialogContent>
          {cardModal.code && (
            <CardModal code={cardModal.code} config={cardModal.config} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
