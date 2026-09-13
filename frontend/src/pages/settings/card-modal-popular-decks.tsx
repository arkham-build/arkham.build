import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function CardModalPopularDecksSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  const onCheckedChange = useCallback(
    (val: boolean | string) => {
      setSettings((settings) => ({
        ...settings,
        showCardModalPopularDecks: !!val,
      }));
    },
    [setSettings],
  );

  return (
    <Field
      bordered
      helpText={t("settings.display.show_card_modal_popular_decks_help")}
    >
      <Checkbox
        checked={settings.showCardModalPopularDecks}
        data-testid="settings-show-card-modal-popular-decks"
        id="show-card-modal-popular-decks"
        label={t("settings.display.show_card_modal_popular_decks")}
        name="show-card-modal-popular-decks"
        onCheckedChange={onCheckedChange}
      />
    </Field>
  );
}
