import type { Card } from "@arkham-build/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearch } from "wouter";
import { ListCard } from "@/components/list-card/list-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDialogContextChecked } from "@/components/ui/dialog.hooks";
import { Field, FieldLabel } from "@/components/ui/field";
import { HotkeyTooltip } from "@/components/ui/hotkey";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "@/components/ui/modal";
import { Scroller } from "@/components/ui/scroller";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  selectConnectionLockForDeck,
  selectMetadata,
} from "@/store/selectors/shared";
import { decodeExileSlots, displayAttribute } from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { isEmpty } from "@/utils/is-empty";
import { range } from "@/utils/range";
import { useAccentColor } from "@/utils/use-accent-color";
import { useHotkey } from "@/utils/use-hotkey";
import css from "./upgrade-modal.module.css";

type Props = {
  deck: ResolvedDeck;
};

function toExilable(
  deck: ResolvedDeck,
  slotKey: "slots" | "extraSlots",
  burnAfterReading?: boolean,
) {
  const slots = deck[slotKey];
  if (!slots) return [];

  return Object.entries(slots).reduce<{ card: Card; limit: number }[]>(
    (acc, [code, limit]) => {
      const card = deck.cards[slotKey][code].card;
      if (
        burnAfterReading &&
        !card.permanent &&
        card.xp != null &&
        !deck.ignoreDeckLimitSlots?.[code]
      ) {
        acc.push({ card, limit });
      } else if (card.exile) {
        acc.push({ card, limit });
      }

      return acc;
    },
    [],
  );
}

function selectExilableCards(deck: ResolvedDeck) {
  const burnAfterReading = !!deck.slots[SPECIAL_CARD_CODES.BURN_AFTER_READING];

  const exilable: { card: Card; limit: number }[] = [];

  exilable.push(...toExilable(deck, "slots", burnAfterReading));
  exilable.push(...toExilable(deck, "extraSlots", burnAfterReading));

  return exilable;
}

export function UpgradeModal(props: Props) {
  const { deck } = props;
  const [, navigate] = useLocation();
  const search = useSearch();
  const toast = useToast();
  const { t } = useTranslation();

  const connectionLock = useStore((state) =>
    selectConnectionLockForDeck(state, deck),
  );
  const upgradeDeck = useStore((state) => state.upgradeDeck);

  const [xp, setXp] = useState(
    new URLSearchParams(search).get("upgrade_xp")?.toString() ?? "",
  );
  const [cardsPerPick, setCardsPerPick] = useState(5);
  const [skipsAllowed, setSkipsAllowed] = useState(0);
  const [researchedCards, setResearchedCards] = useState<Set<string>>(
    new Set(),
  );
  const isDraftDeck = deck.metaParsed?.is_draft === true;

  const metadata = useStore(selectMetadata);

  // Find base cards for researched upgrades
  // Only include base cards that exist in the deck
  const researchedBaseCards = useMemo(() => {
    if (!isDraftDeck) return [];

    const baseCardsMap = new Map<
      string,
      { card: Card; researchedUpgrades: Card[] }
    >();

    // Check all cards in metadata to find researched cards
    for (const card of Object.values(metadata.cards)) {
      // Check if this card has "Researched." in its text
      if (card.real_text?.includes("Researched.")) {
        // Find the base version (same real_name without "Researched." text)
        const baseCard = Object.values(metadata.cards).find(
          (c) =>
            c.real_name === card.real_name &&
            !c.real_text?.includes("Researched."),
        );

        if (baseCard) {
          // Only include base cards that exist in the deck
          if (deck.slots[baseCard.code] && deck.slots[baseCard.code] > 0) {
            // Get or create entry for this base card
            if (!baseCardsMap.has(baseCard.code)) {
              baseCardsMap.set(baseCard.code, {
                card: baseCard,
                researchedUpgrades: [],
              });
            }
            // Add this researched upgrade
            const entry = baseCardsMap.get(baseCard.code);
            if (entry) {
              entry.researchedUpgrades.push(card);
            }
          }
        }
      }
    }

    return Array.from(baseCardsMap.values());
  }, [deck.slots, metadata, isDraftDeck]);

  const handleResearchedToggle = useCallback((cardCode: string) => {
    setResearchedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardCode)) {
        next.delete(cardCode);
      } else {
        next.add(cardCode);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const url = new URL(window.location.toString());
    url.search = "";
    window.history.replaceState(null, "", url.toString());
  }, []);

  const exilableCards = selectExilableCards(deck);
  const [exileString, setExileString] = useState("");

  const hasGreatWork = !!deck.slots[SPECIAL_CARD_CODES.THE_GREAT_WORK];
  const hasCharonsObol = !!deck.slots[SPECIAL_CARD_CODES.CHARONS_OBOL];

  const [usurped, setUsurped] = useState(false);

  const onUsurpedChange = useCallback((val: boolean | string) => {
    setUsurped(!!val);
  }, []);

  const modalContext = useDialogContextChecked();

  const onCloseModal = useCallback(() => {
    modalContext?.setOpen(false);
  }, [modalContext]);

  const onUpgrade = useCallback(
    async (path = "edit", useDraftFlow = true) => {
      const enteredXp = xp ? +xp : 0;
      const remainingXp =
        (deck.xp ?? 0) + (deck.xp_adjustment ?? 0) - (deck.xp_spent ?? 0);

      // For draft decks, navigate to draft upgrade flow (unless useDraftFlow is false)
      if (isDraftDeck && useDraftFlow) {
        // Calculate NEW XP (entered + bonuses) - this is what will be spent
        let newXp = enteredXp;
        if (hasCharonsObol) newXp += 2;
        if (hasGreatWork && !usurped) newXp += 1;

        // Total available XP for card pool filtering (remaining + new)
        const totalAvailableXp = remainingXp + newXp;

        onCloseModal();
        const params = new URLSearchParams({
          upgrade_deck: deck.id.toString(),
          xp: newXp.toString(), // Only pass NEW XP
          previous_remaining_xp: remainingXp.toString(), // Pass remaining XP separately
          total_available_xp: totalAvailableXp.toString(), // Total for card pool filtering
          cards_per_pick: cardsPerPick.toString(),
          skips_allowed: skipsAllowed.toString(),
        });

        // Add researched cards as comma-separated list
        if (researchedCards.size > 0) {
          params.set("researched", Array.from(researchedCards).join(","));
        }
        if (exileString) {
          params.set("exile", exileString);
        }
        navigate(
          `/deck/draft/${deck.investigatorFront.card.code}?${params.toString()}`,
        );
        return;
      }

      // Normal upgrade flow: only use entered XP + bonuses
      // Remaining XP will be handled automatically by upgradeDeck via xpCarryover
      let upgradeXp = enteredXp;
      if (hasCharonsObol) upgradeXp += 2;
      if (hasGreatWork && !usurped) upgradeXp += 1;

      const toastId = toast.show({
        children: t("deck_view.upgrade_modal.loading"),
        variant: "loading",
      });

      try {
        const newDeck = await upgradeDeck({
          id: deck.id,
          xp: upgradeXp,
          exileString,
          usurped: hasGreatWork ? usurped : undefined,
        });

        toast.dismiss(toastId);
        onCloseModal();

        navigate(`/deck/${path}/${newDeck.id}`);
      } catch (err) {
        toast.dismiss(toastId);
        toast.show({
          children: t("deck_view.upgrade_modal.error", {
            error: (err as Error).message,
          }),
          variant: "error",
        });
      }
    },
    [
      deck.id,
      deck.xp,
      deck.xp_adjustment,
      deck.xp_spent,
      deck.investigatorFront.card.code,
      upgradeDeck,
      xp,
      onCloseModal,
      navigate,
      toast,
      exileString,
      usurped,
      hasGreatWork,
      hasCharonsObol,
      isDraftDeck,
      cardsPerPick,
      skipsAllowed,
      researchedCards,
      t,
    ],
  );

  const onXpChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setXp(evt.target.value);
  }, []);

  const exiledQuantities = useMemo(
    () => decodeExileSlots(exileString),
    [exileString],
  );

  const onExileChange = useCallback(
    (card: Card, quantity: number, limit: number) => {
      const cardQuantity = (exiledQuantities[card.code] ?? 0) + quantity;

      if (cardQuantity <= limit) {
        setExileString((prev) =>
          prev
            .split(",")
            .filter((x) => x && x !== card.code)
            .concat(range(0, cardQuantity).map(() => card.code))
            .join(","),
        );
      }
    },
    [exiledQuantities],
  );

  const cssVariables = useAccentColor(deck.cards.investigator.card);

  // Calculate remaining XP from previous upgrades
  const remainingXp =
    (deck.xp ?? 0) + (deck.xp_adjustment ?? 0) - (deck.xp_spent ?? 0);
  const enteredXp = xp ? Number.parseInt(xp, 10) : 0;
  const totalAvailableXp = remainingXp + enteredXp;

  const disabled =
    (xp === "" && remainingXp <= 0) || totalAvailableXp < 1 || !!connectionLock;

  const onSave = useCallback(() => {
    onUpgrade("edit", true);
  }, [onUpgrade]);

  const onSaveClose = useCallback(() => {
    onUpgrade("view", false);
  }, [onUpgrade]);

  useHotkey("cmd+enter", onSave, { disabled, allowInputFocused: true });

  useHotkey("cmd+shift+enter", onSaveClose, {
    disabled,
    allowInputFocused: true,
  });

  return (
    <Modal data-testid="upgrade-modal">
      <ModalBackdrop />
      <ModalInner size="45rem">
        <ModalActions />
        <DefaultModalContent
          className={css["content"]}
          title={
            <>
              <i className="icon-xp-bold" />
              {t("deck_view.upgrade_modal.title")}
            </>
          }
          footer={
            <div className={css["footer"]}>
              <div className={css["footer-row"]}>
                <HotkeyTooltip
                  keybind="cmd+enter"
                  description={
                    connectionLock ?? t("deck_view.actions.save_upgrade")
                  }
                >
                  <Button
                    data-testid="upgrade-save"
                    disabled={disabled}
                    onClick={onSave}
                    variant="primary"
                  >
                    {t("deck_view.actions.save_upgrade_short")}
                  </Button>
                </HotkeyTooltip>
                <HotkeyTooltip
                  keybind="cmd+shift+enter"
                  description={
                    connectionLock ?? t("deck_view.actions.save_upgrade_close")
                  }
                >
                  <Button
                    data-testid="upgrade-save-close"
                    disabled={disabled}
                    onClick={onSaveClose}
                    variant="bare"
                  >
                    {t("deck_view.actions.save_upgrade_close_short")}
                  </Button>
                </HotkeyTooltip>
              </div>
              <Button onClick={onCloseModal} variant="bare">
                {t("common.cancel")}
              </Button>
            </div>
          }
          style={cssVariables}
        >
          <div className={css["content"]}>
            <Field bordered full>
              <FieldLabel htmlFor="xp-gained">
                {t("deck_view.upgrade_modal.xp_gained")}
              </FieldLabel>
              <input
                // biome-ignore lint/a11y/noAutofocus: this is a modal.
                autoFocus
                onChange={onXpChange}
                min="0"
                required
                type="number"
                data-testid="upgrade-xp"
                name="xp-gained"
                value={xp}
              />
              {remainingXp > 0 && (
                <p>
                  <small>
                    <em>
                      {t("deck_view.upgrade_modal.remaining_xp", {
                        count: remainingXp,
                      })}
                    </em>
                  </small>
                </p>
              )}
            </Field>
            {isDraftDeck && (
              <>
                <Field full padded>
                  <FieldLabel htmlFor="cards-per-pick">
                    {t("deck_view.upgrade_modal.cards_per_pick")}
                  </FieldLabel>
                  <div className={css["slider-container"]}>
                    <Slider
                      id="cards-per-pick"
                      min={2}
                      max={15}
                      step={1}
                      value={[cardsPerPick]}
                      onValueChange={(value) => setCardsPerPick(value[0])}
                      className={css["slider-flex"]}
                    />
                    <output
                      htmlFor="cards-per-pick"
                      className={css["slider-output"]}
                    >
                      {cardsPerPick}
                    </output>
                  </div>
                </Field>
                <Field full padded>
                  <FieldLabel htmlFor="skips-allowed">
                    {t("deck_draft.setup.skips_allowed")}
                  </FieldLabel>
                  <div className={css["slider-container"]}>
                    <Slider
                      id="skips-allowed"
                      min={0}
                      max={5}
                      step={1}
                      value={[skipsAllowed]}
                      onValueChange={(value) => setSkipsAllowed(value[0])}
                      className={css["slider-flex"]}
                    />
                    <output
                      htmlFor="skips-allowed"
                      className={css["slider-output"]}
                    >
                      {skipsAllowed}
                    </output>
                  </div>
                </Field>
                {researchedBaseCards.length > 0 && (
                  <Field full padded>
                    <FieldLabel>
                      {t("deck_view.upgrade_modal.researched_cards")}
                    </FieldLabel>
                    <div className={css["researched-list"]}>
                      {researchedBaseCards.map(
                        ({ card, researchedUpgrades }) => (
                          <Checkbox
                            key={card.code}
                            checked={researchedCards.has(card.code)}
                            id={`researched-${card.code}`}
                            label={
                              <>
                                {displayAttribute(card, "name")}
                                <span className={css["researched-count"]}>
                                  {" "}
                                  ({researchedUpgrades.length}{" "}
                                  {researchedUpgrades.length === 1
                                    ? t(
                                        "deck_view.upgrade_modal.researched_upgrade",
                                      )
                                    : t(
                                        "deck_view.upgrade_modal.researched_upgrades",
                                      )}
                                  )
                                </span>
                              </>
                            }
                            onCheckedChange={() =>
                              handleResearchedToggle(card.code)
                            }
                          />
                        ),
                      )}
                    </div>
                  </Field>
                )}
              </>
            )}
            {hasGreatWork && (
              <Field
                bordered
                helpText={
                  usurped ? (
                    <i>
                      {t("deck_view.upgrade_modal.great_work_status_usurped")}
                    </i>
                  ) : (
                    <i>
                      {t("deck_view.upgrade_modal.automatic_xp_gain", {
                        count: 1,
                      })}
                    </i>
                  )
                }
              >
                <FieldLabel htmlFor="xp-gained">
                  {displayAttribute(
                    deck.cards.slots[SPECIAL_CARD_CODES.THE_GREAT_WORK].card,
                    "name",
                  )}
                </FieldLabel>
                <Checkbox
                  label={t("deck_view.upgrade_modal.great_work_label")}
                  id="the-great-work"
                  checked={usurped}
                  onCheckedChange={onUsurpedChange}
                />
              </Field>
            )}
            {hasCharonsObol && (
              <Field bordered>
                <FieldLabel>
                  {displayAttribute(
                    deck.cards.slots[SPECIAL_CARD_CODES.CHARONS_OBOL].card,
                    "name",
                  )}
                </FieldLabel>
                <p>
                  <small>
                    <em>
                      {t("deck_view.upgrade_modal.automatic_xp_gain", {
                        count: 2,
                      })}
                    </em>
                  </small>
                </p>
              </Field>
            )}
            {!isEmpty(exilableCards) && (
              <Field bordered>
                <FieldLabel htmlFor="xp-gained">
                  {t("common.exiled_cards")}
                </FieldLabel>
                <Scroller className={css["exile"]}>
                  <ul>
                    {exilableCards.map(({ card, limit }) => (
                      <ListCard
                        annotation={deck.annotations[card.code]}
                        as="li"
                        key={card.code}
                        card={card}
                        limitOverride={limit}
                        onChangeCardQuantity={onExileChange}
                        quantity={exiledQuantities[card.code] ?? 0}
                        size="sm"
                      />
                    ))}
                  </ul>
                </Scroller>
              </Field>
            )}
          </div>
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}
