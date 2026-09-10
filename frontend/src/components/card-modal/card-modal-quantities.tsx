import type { Card } from "@arkham-build/shared";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { getDeckLimitOverride } from "@/store/lib/resolve-deck";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectLookupTables } from "@/store/selectors/shared";
import type { Slot } from "@/store/slices/deck-edits.types";
import { cardLimit } from "@/utils/card-utils";
import { inputFocused } from "@/utils/keyboard";
import { QuantityInput } from "../ui/quantity-input";
import css from "./card-modal.module.css";

type Props = {
  card: Card;
  canEdit?: boolean;
  deck?: ResolvedDeck;
  showExtraQuantities?: boolean;
  onCloseModal(): void;
};

export function CardModalQuantities(props: Props) {
  const { card, canEdit, deck, showExtraQuantities } = props;
  const { t } = useTranslation();

  const updateCardQuantity = useStore((state) => state.updateCardQuantity);

  const lookupTables = useStore(selectLookupTables);
  const limitOverride = getDeckLimitOverride(lookupTables, deck, card);
  const limit = limitOverride ?? cardLimit(card);

  useEffect(() => {
    if (!canEdit) return;

    function onKeyDown(evt: KeyboardEvent) {
      if (evt.metaKey || !deck?.id || inputFocused()) return;

      const slots = evt.shiftKey ? "sideSlots" : "slots";

      if (evt.key === "ArrowRight") {
        evt.preventDefault();
        updateCardQuantity(deck.id, card.code, 1, limit, slots);
      } else if (evt.key === "ArrowLeft") {
        evt.preventDefault();
        updateCardQuantity(deck.id, card.code, -1, limit, slots);
      } else if (evt.code.startsWith("Digit")) {
        evt.preventDefault();
        const quantity = Number.parseInt(evt.code.replace("Digit", ""), 10);
        updateCardQuantity(deck.id, card.code, quantity, limit, slots, "set");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [canEdit, card.code, updateCardQuantity, deck?.id, limit]);

  const quantities = deck?.slots;
  const sideSlotQuantities = deck?.sideSlots;
  const extraSlotQuantities = deck?.extraSlots;
  const bondedSlotQuantities = deck?.bondedSlots;
  const ignoreDeckLimitQuantities = deck?.ignoreDeckLimitSlots;

  const onChangeQuantity = (quantity: number, slot: Slot) => {
    if (!deck?.id) return;
    updateCardQuantity(deck.id, card.code, quantity, limit, slot);
  };

  const code = card.code;

  const isBonded = !!bondedSlotQuantities?.[code];

  return (
    <>
      {!isBonded && (
        <article className={css["quantity"]}>
          <h3 className={css["quantity-title"]}>{t("common.decks.slots")}</h3>
          <QuantityInput
            data-testid="card-modal-quantities-main"
            disabled={!canEdit}
            limit={limit + (ignoreDeckLimitQuantities?.[code] ?? 0)}
            limitOverride={limitOverride}
            onValueChange={(quantity) => onChangeQuantity(quantity, "slots")}
            value={quantities?.[code] ?? 0}
          />
        </article>
      )}
      {!isBonded && (
        <article className={css["quantity"]}>
          <h3 className={css["quantity-title"]}>
            {t("common.decks.sideSlots")}
          </h3>
          <QuantityInput
            data-testid="card-modal-quantities-side"
            disabled={isBonded || !canEdit}
            limit={limit}
            onValueChange={(quantity) =>
              onChangeQuantity(quantity, "sideSlots")
            }
            value={sideSlotQuantities?.[code] ?? 0}
          />
        </article>
      )}
      {isBonded && (
        <article className={css["quantity"]}>
          <h3 className={css["quantity-title"]}>
            {t("common.decks.bondedSlots_short")}
          </h3>
          <QuantityInput
            disabled
            data-testid="card-modal-quantities-bonded"
            limit={limit}
            value={bondedSlotQuantities[code]}
          />
        </article>
      )}
      {showExtraQuantities && (
        <article className={css["quantity"]}>
          <h3 className={css["quantity-title"]}>
            {t("common.decks.extraSlots")}
          </h3>
          <QuantityInput
            data-testid="card-modal-quantities-extra"
            disabled={!canEdit}
            limit={limit}
            onValueChange={(quantity) =>
              onChangeQuantity(quantity, "extraSlots")
            }
            value={extraSlotQuantities?.[code] ?? 0}
          />
        </article>
      )}
      {!isBonded && (
        <article className={css["quantity"]}>
          <h3 className={css["quantity-title"]}>
            {t("common.decks.ignoreDeckLimitSlots")}
          </h3>
          <QuantityInput
            data-testid="card-modal-quantities-ignored"
            disabled={!canEdit}
            limit={limit}
            onValueChange={(quantity) =>
              onChangeQuantity(quantity, "ignoreDeckLimitSlots")
            }
            value={ignoreDeckLimitQuantities?.[code] ?? 0}
          />
        </article>
      )}
    </>
  );
}
