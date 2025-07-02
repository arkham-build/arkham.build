import { Icon, DicesIcon } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { Id } from "@/store/slices/data.types";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Modal, ModalContent } from "@/components/ui/modal";
import { randomBasicWeaknessForDeck } from "@/store/lib/random-basic-weakness";
import { selectMetadata, selectLookupTables } from "@/store/selectors/shared";
import { StoreState } from "@/store/slices";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { selectResolvedDeckById } from "@/store/selectors/decks";
import { assert } from "@/utils/assert";

type Props = {
  deckId: Id;
  quantity?: number;
  targetDeck: string;
};

function selectDraftWeaknesses(state: StoreState, deckId: Id) {
  const metadata = selectMetadata(state);
  const resolvedDeck = selectResolvedDeckById(state, deckId, true);
  const lookupTables = selectLookupTables(state);
  const settings = state.settings;
  const drawnWeaknesses = new Set();

  assert(resolvedDeck, "Tried to draft random basic weaknesses for a deck that does not exist.");

  while (drawnWeaknesses.size < 3) {
    const weakness = randomBasicWeaknessForDeck(metadata, lookupTables, settings, resolvedDeck);
    if (weakness) {
      drawnWeaknesses.add(weakness);
    } else {
      break
    }
  }

  console.log("Drawn weaknesses: ", Array.from(drawnWeaknesses));

  return drawnWeaknesses;
}

export function DraftBasicWeakness(props: Props) {
  const { t } = useTranslation();

  const weaknesses = useStore(
    useShallow((state: StoreState) => selectDraftWeaknesses(state, props.deckId))
  );

  if (!weaknesses) return null; // Return an error

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled={!props.quantity || props.targetDeck !== "slots"}
          iconOnly
          size="sm"
          tooltip={t("deck_edit.actions.draft_random_basic_weakness")}
          variant="bare">
          <DicesIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Modal size="52rem">
          <ModalContent title="Drafting a basic weakness">
            <form>
              <div>
                <p>
                  This is a common house rule to give the player more control over the basic weakness in comparison to fully randomizing it.
                </p>
                <p>
                  Choose one weakness to cancel. One of the two remaining weaknesses will be added to your deck at random.
                </p>
              </div>

              <footer>
                <Button type="submit">
                  Confirm Cancellation
                </Button>
              </footer>
            </form>
          </ModalContent>
        </Modal>
      </DialogContent>
    </Dialog>
  );
}
