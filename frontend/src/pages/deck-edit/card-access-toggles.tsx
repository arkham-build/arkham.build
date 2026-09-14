import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { HotkeyTooltip } from "@/components/ui/hotkey";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectLimitedSlotOccupation } from "@/store/selectors/decks";
import { displayAttribute } from "@/utils/card-utils";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
import { useHotkey } from "@/utils/use-hotkey";
import css from "./deck-edit.module.css";

type Props = {
  deck: ResolvedDeck;
};

export function CardAccessToggles(props: Props) {
  const { deck } = props;
  const { t } = useTranslation();

  const showUnusable = useStore((state) => state.ui.showUnusableCards);
  const setShowUnusable = useStore((state) => state.setShowUnusableCards);

  const showLimitedAccess = useStore((state) => state.ui.showLimitedAccess);
  const setShowLimitedAccess = useStore((state) => state.setShowLimitedAccess);

  const limitedSlots = useStore((state) =>
    selectLimitedSlotOccupation(state, deck),
  );

  const canShowLimitedAccess = !isEmpty(limitedSlots);

  const onShowUnusableChange = (val: boolean) => {
    setShowUnusable(val);
  };

  const onUnusableHotkey = () => {
    setShowUnusable(!showUnusable);
  };

  const onLimitedAccessHotkey = () => {
    setShowLimitedAccess(!showLimitedAccess);
  };

  useHotkey("alt+u", onUnusableHotkey);

  useHotkey("alt+a", onLimitedAccessHotkey, {
    disabled: !canShowLimitedAccess,
  });

  return (
    <Field
      className={cx(
        css["card-access-toggles"],
        (!showLimitedAccess || showUnusable) && css["active"],
      )}
    >
      {canShowLimitedAccess && (
        <HotkeyTooltip
          keybind="alt+a"
          description={t("lists.actions.show_limited_access_help", {
            name: displayAttribute(deck.investigatorBack.card, "name"),
          })}
        >
          <Checkbox
            checked={showLimitedAccess}
            id="show-limited-access"
            label={
              <>
                {t("lists.actions.show_limited_access")}
                &nbsp;(
                {limitedSlots.map(({ option, entries }, idx) => (
                  <span key={option.id ?? option.name ?? idx}>
                    {idx > 0 && ", "}
                    <span>
                      {entries.reduce((acc, curr) => acc + curr.quantity, 0)}/
                      {option.limit}
                    </span>
                  </span>
                ))}
                )
              </>
            }
            onCheckedChange={setShowLimitedAccess}
          />
        </HotkeyTooltip>
      )}
      <HotkeyTooltip
        keybind="alt+u"
        description={t("lists.actions.show_unusable_cards")}
      >
        <Checkbox
          checked={showUnusable}
          id="show-unusable-cards"
          label={t("lists.actions.show_unusable_cards")}
          onCheckedChange={onShowUnusableChange}
        />
      </HotkeyTooltip>
    </Field>
  );
}
