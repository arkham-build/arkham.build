import { Card } from "@/components/card/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Modal, ModalContent } from "@/components/ui/modal";
import { QuantityInput } from "@/components/ui/quantity-input";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  type AvailableUpgrades,
  selectResolvedCardById,
} from "@/store/selectors/lists";
import type { Card as CardT } from "@/store/services/queries.types";
import { assert } from "@/utils/assert";
import { cardLimit, displayAttribute } from "@/utils/card-utils";
import { FLOATING_PORTAL_ID } from "@/utils/constants";
import { useAccentColor } from "@/utils/use-accent-color";
import { FloatingPortal } from "@floating-ui/react";
import { DicesIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import css from "./quick-upgrade.module.css";

type Props = {
  availableUpgrades: AvailableUpgrades;
  card: CardT;
  currentTab: string;
  deck: ResolvedDeck;
  hideButton?: boolean;
};

export function QuickUpgrade(props: Props) {
  const { availableUpgrades, card, currentTab, deck, hideButton } = props;
  const { t } = useTranslation();

  const [dialogOpen, setDialogOpen] = useState(false);

  const upgradeCard = useStore((state) => state.upgradeCard);

  const slots = currentTab === "extraSlots" ? "extraSlots" : "slots";

  const onUpgradeCard = useCallback(() => {
    const upgrades = availableUpgrades.upgrades[card.code];
    assert(upgrades.length, "No upgrades available for card");

    const canDirectUpgrade =
      upgrades.length === 1 &&
      !isShrewdAnalysisUpgrade(availableUpgrades, card, deck);

    if (canDirectUpgrade) {
      upgradeCard({
        availableUpgrades,
        deckId: deck.id,
        code: card.code,
        upgradeCode: upgrades[0].code,
        delta: 1,
        slots,
      });
    } else {
      setDialogOpen(true);
    }
  }, [availableUpgrades, card, slots, deck, upgradeCard]);

  return (
    <>
      {!hideButton && (
        <Button
          iconOnly
          data-testid="quick-upgrade"
          tooltip={t("deck_edit.actions.quick_upgrade", {
            name: displayAttribute(card, "name"),
          })}
          onClick={onUpgradeCard}
          variant="bare"
          size="sm"
        >
          <i className="icon icon-upgrade" />
        </Button>
      )}
      {dialogOpen && (
        <QuickUpgradeDialog
          {...props}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          slots={slots}
        />
      )}
    </>
  );
}

function QuickUpgradeDialog(
  props: Props & {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    slots: "slots" | "extraSlots";
  },
) {
  const { availableUpgrades, card, deck, onOpenChange, open, slots } = props;
  const { t } = useTranslation();

  const accentColor = useAccentColor(card.faction_code);

  const resolvedCard = useStore((state) =>
    selectResolvedCardById(state, card.code, deck),
  );

  const resolvedUpgrades = useStore(
    useShallow((state) =>
      availableUpgrades.upgrades[card.code].map((upgrade) =>
        selectResolvedCardById(state, upgrade.code, deck),
      ),
    ),
  );

  const upgradeCard = useStore((state) => state.upgradeCard);
  const applyShrewdAnalysis = useStore((state) => state.applyShrewdAnalysis);

  const onChangeUpgradeQuantity = useCallback(
    (upgradeCode: string, delta: number) => {
      upgradeCard({
        availableUpgrades,
        deckId: deck.id,
        code: card.code,
        upgradeCode,
        delta,
        slots,
      });
    },
    [availableUpgrades, deck.id, card.code, slots, upgradeCard],
  );

  const onUseShrewdAnalysis = useCallback(() => {
    applyShrewdAnalysis({
      availableUpgrades,
      deckId: deck.id,
      code: card.code,
      slots,
    });

    onOpenChange(false);
  }, [
    applyShrewdAnalysis,
    availableUpgrades,
    deck.id,
    card.code,
    onOpenChange,
    slots,
  ]);

  const shrewdAnalysisPossible =
    slots === "slots" && isShrewdAnalysisUpgrade(availableUpgrades, card, deck);

  if (!resolvedCard) return null;

  return (
    <FloatingPortal id={FLOATING_PORTAL_ID}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <Modal
            size="60rem"
            onClose={() => onOpenChange(false)}
            open={open}
            data-testid="quick-upgrade-modal"
          >
            <ModalContent
              title={
                <>
                  <i className="icon icon-upgrade" />
                  <span>
                    {t("deck_edit.quick_upgrade.title", {
                      name: displayAttribute(card, "name"),
                    })}
                  </span>
                </>
              }
            >
              <div className={css["container"]} style={accentColor}>
                <article>
                  {shrewdAnalysisPossible && (
                    <Field
                      helpText={t(
                        "deck_edit.quick_upgrade.shrewd_analysis_help",
                      )}
                    >
                      <Button
                        variant="primary"
                        onClick={onUseShrewdAnalysis}
                        data-testid="quick-upgrade-shrewd-analysis"
                      >
                        <DicesIcon />
                        {t("deck_edit.quick_upgrade.shrewd_analysis")}
                      </Button>
                    </Field>
                  )}
                </article>
                <article>
                  <Card
                    slotHeaderActions={
                      <QuantityInput
                        className={css["quantity"]}
                        date-testid={`quick-upgrade-${card.code}-quantity`}
                        disabled
                        limit={cardLimit(card)}
                        value={deck[slots]?.[card.code] ?? 0}
                      />
                    }
                    resolvedCard={resolvedCard}
                    size="compact"
                  />
                </article>
                <article>
                  <header className={css["header"]}>
                    <h3 className={css["title"]}>
                      {t("deck_edit.quick_upgrade.available_upgrades")}
                    </h3>
                  </header>
                  <ol className={css["upgrades"]}>
                    {resolvedUpgrades.map((upgrade) => {
                      if (!upgrade) return null;
                      return (
                        <li key={upgrade.card.code}>
                          <Card
                            resolvedCard={upgrade}
                            size="compact"
                            slotHeaderActions={
                              <QuantityInput
                                className={css["quantity"]}
                                date-testid={`quick-upgrade-${upgrade.card.code}-quantity`}
                                limit={cardLimit(upgrade.card)}
                                onValueChange={(delta) => {
                                  onChangeUpgradeQuantity(
                                    upgrade.card.code,
                                    delta,
                                  );
                                }}
                                value={deck[slots]?.[upgrade.card.code] ?? 0}
                              />
                            }
                          />
                        </li>
                      );
                    })}
                  </ol>
                </article>
              </div>
            </ModalContent>
          </Modal>
        </DialogContent>
      </Dialog>
    </FloatingPortal>
  );
}

function isShrewdAnalysisUpgrade(
  availableUpgrades: AvailableUpgrades,
  card: CardT,
  deck: ResolvedDeck,
) {
  return (
    availableUpgrades.shrewdAnalysisPresent &&
    deck.slots[card.code] > 1 &&
    ["Unidentified", "Untranslated"].some((trait) =>
      card.real_subname?.includes(trait),
    )
  );
}
