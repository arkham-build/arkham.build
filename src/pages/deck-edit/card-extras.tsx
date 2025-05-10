import { Attachments } from "@/components/attachments/attachments";
import { getMatchingAttachables } from "@/components/attachments/attachments.helpers";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectAvailableUpgrades } from "@/store/selectors/lists";
import type { Card } from "@/store/services/queries.types";
import { mapTabToSlot } from "@/store/slices/deck-edits.types";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { isEmpty } from "@/utils/is-empty";
import css from "./deck-edit.module.css";
import { AddToNotes } from "./editor/add-to-notes";
import { DrawBasicWeakness } from "./editor/draw-basic-weakness";
import { MoveToMainDeck } from "./editor/move-to-main-deck";
import { MoveToSideDeck } from "./editor/move-to-side-deck";
import { QuickUpgrade } from "./editor/quick-upgrade";

type Props = {
  canEdit?: boolean;
  deck: ResolvedDeck;
  card: Card;
  quantity: number | undefined;
  currentTool: string;
  currentTab: string;
};

export function CardExtras(props: Props) {
  const { canEdit, card, deck, quantity, currentTab, currentTool } = props;

  const settings = useStore((state) => state.settings);

  const availableUpgrades = useStore((state) =>
    selectAvailableUpgrades(
      state,
      deck,
      currentTab === "extraSlots" ? "extraSlots" : "slots",
    ),
  );

  if (currentTab === "config" || currentTab === "ignoreDeckLimitSlots") {
    return null;
  }

  if (currentTool === "notes") {
    return <AddToNotes card={card} deck={deck} />;
  }

  if (currentTab === "sideSlots") {
    return canEdit && quantity ? (
      <MoveToMainDeck card={card} deck={deck} />
    ) : null;
  }

  if (card.code === SPECIAL_CARD_CODES.RANDOM_BASIC_WEAKNESS) {
    return (
      <DrawBasicWeakness
        deckId={deck.id}
        quantity={quantity}
        targetDeck={mapTabToSlot(currentTab)}
      />
    );
  }

  const hasAttachable =
    currentTab === "slots" && !isEmpty(getMatchingAttachables(card, deck));

  const hasUpgrades =
    canEdit && !isEmpty(availableUpgrades.upgrades[card.code]);

  const canShowMoveButton =
    !!quantity && (currentTab !== "slots" || card.xp != null);

  if (!hasAttachable && !hasUpgrades && !canShowMoveButton) {
    return null;
  }

  return (
    <div className={css["extra-row"]}>
      {hasUpgrades && (
        <QuickUpgrade
          availableUpgrades={availableUpgrades}
          currentTab={currentTab}
          hideButton={!quantity}
          card={card}
          deck={deck}
        />
      )}
      {currentTab === "slots" &&
        canShowMoveButton &&
        settings.showMoveToSideDeck && (
          <MoveToSideDeck card={card} deck={deck} />
        )}
      {hasAttachable && <Attachments card={card} resolvedDeck={deck} />}
    </div>
  );
}
