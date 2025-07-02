import { DicesIcon } from "lucide-react";
import { useMemo } from "react";
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

  if (!weaknesses) return null; // Return an error

  return (
    <Modal size="52rem">
      <ModalContent title="Drafting a basic weakness">
        <form>
          <div>
            <p>
              This is a common house rule to give the player more control over
              the basic weakness in comparison to fully randomizing it.
            </p>
            <p>
              Choose one weakness to cancel. One of the two remaining weaknesses
              will be added to your deck at random.
            </p>
          </div>
          <footer>
            <Button type="submit">Confirm</Button>
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

  const drawnWeaknesses = new Set();

  while (drawnWeaknesses.size < 3) {
    const weakness = randomBasicWeaknessForDeck(
      metadata,
      lookupTables,
      settings,
      deck,
    );

    if (weakness) {
      drawnWeaknesses.add(weakness);
    } else {
      break;
    }
  }

  return Array.from(drawnWeaknesses);
}
