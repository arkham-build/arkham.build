import { Icon, DicesIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store";
import type { Id } from "@/store/slices/data.types";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Modal } from "@/components/ui/modal";

type Props = {
  deckId: Id;
  quantity?: number;
  targetDeck: string;
};

export function DraftBasicWeakness(props: Props) {
  const { t } = useTranslation();

  const draftRandomBasicWeakness = useStore(
    (state) => state.draftRandomBasicWeakness,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={!props.quantity || props.targetDeck !== "slots"}
          iconOnly
          onClick={() => {
            draftRandomBasicWeakness(props.deckId);
          }}
          size="sm"
          tooltip={t("deck_edit.actions.draft_random_basic_weakness")}
          variant="bare">
          <DicesIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Modal>...</Modal>
      </DialogContent>
    </Dialog>
  );
}
