import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function ShowAllCardsSetting(props: SettingProps) {
  const { settings, setSettings } = props;

  const { t } = useTranslation();

  const onCheckShowAll = useCallback(
    (val: boolean | string) => {
      setSettings((settings) => ({ ...settings, showAllCards: !!val }));
    },
    [setSettings],
  );

  return (
    <Field
      bordered
      helpText={t("settings.collection.show_all_cards_owned_help")}
    >
      <Checkbox
        checked={settings.showAllCards}
        data-testid="settings-show-all"
        id="show-all-cards"
        label={t("settings.collection.show_all_cards_owned")}
        name="show-all-cards"
        onCheckedChange={onCheckShowAll}
      />
    </Field>
  );
}
