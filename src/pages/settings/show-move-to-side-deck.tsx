import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { useTranslation } from "react-i18next";
import type { SettingProps } from "./types";

export function ShowMoveToSideDeckSetting(props: SettingProps) {
  const { settings, updateSettings } = props;
  const { t } = useTranslation();

  const onCheckMoveToSideDeckSetting = (val: boolean | string) => {
    updateSettings((settings) => ({
      ...settings,
      showMoveToSideDeck: !!val,
    }));
  };

  return (
    <Field
      bordered
      helpText={t("settings.display.show_move_to_side_deck_help")}
    >
      <Checkbox
        checked={settings.showMoveToSideDeck}
        label={t("settings.display.show_move_to_side_deck")}
        data-testid="show-move-to-side-deck"
        id="show-move-to-side-deck"
        name="show-move-to-side-deck"
        onCheckedChange={onCheckMoveToSideDeckSetting}
      />
    </Field>
  );
}
