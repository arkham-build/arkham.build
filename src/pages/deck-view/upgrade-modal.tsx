import { ListCard } from "@/components/list-card/list-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDialogContextChecked } from "@/components/ui/dialog.hooks";
import { Field, FieldLabel } from "@/components/ui/field";
import { HotkeyTooltip } from "@/components/ui/hotkey";
import { Modal, ModalContent } from "@/components/ui/modal";
import { Scroller } from "@/components/ui/scroller";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectConnectionLockForDeck } from "@/store/selectors/shared";
import type { Card } from "@/store/services/queries.types";
import { decodeExileSlots, displayAttribute } from "@/utils/card-utils";
import { SPECIAL_CARD_CODES } from "@/utils/constants";
import { isEmpty } from "@/utils/is-empty";
import { range } from "@/utils/range";
import { useAccentColor } from "@/utils/use-accent-color";
import { useHotkey } from "@/utils/use-hotkey";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearch } from "wouter";
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
    async (path = "edit") => {
      const toastId = toast.show({
        children: t("deck_view.upgrade_modal.loading"),
        variant: "loading",
      });

      let upgradeXp = xp ? +xp : 0;
      if (hasCharonsObol) upgradeXp += 2;
      if (hasGreatWork && !usurped) upgradeXp += 1;

      try {
        const newDeck = await upgradeDeck({
          id: deck.id,
          xp: upgradeXp,
          exileString,
          usurped: hasGreatWork ? usurped : undefined,
        });

        toast.dismiss(toastId);
        onCloseModal();

        toast.show({
          duration: 3000,
          children: t("deck_view.upgrade_modal.success"),
          variant: "success",
        });

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
      upgradeDeck,
      xp,
      onCloseModal,
      navigate,
      toast,
      exileString,
      usurped,
      hasGreatWork,
      hasCharonsObol,
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

  const cssVariables = useAccentColor(
    deck.cards.investigator.card.faction_code,
  );

  const disabled = xp === "" || !!connectionLock;

  const onSave = useCallback(() => {
    onUpgrade("edit");
  }, [onUpgrade]);

  const onSaveClose = useCallback(() => {
    onUpgrade("view");
  }, [onUpgrade]);

  useHotkey("cmd+enter", onSave, { disabled, allowInputFocused: true });

  useHotkey("cmd+shift+enter", onSaveClose, {
    disabled,
    allowInputFocused: true,
  });

  return (
    <Modal data-testid="upgrade-modal" onClose={onCloseModal} size="45rem">
      <ModalContent
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
          </Field>
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
      </ModalContent>
    </Modal>
  );
}
