import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function ShowPreviewsSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  const onCheckedChange = (val: boolean | string) => {
    setSettings((settings) => ({ ...settings, showPreviews: !!val }));
  };

  return (
    <Field bordered helpText={t("settings.collection.show_previews_help")}>
      <Checkbox
        checked={settings.showPreviews}
        data-testid="settings-show-previews"
        id="show-previews"
        label={t("settings.collection.show_previews")}
        name="show-previews"
        onCheckedChange={onCheckedChange}
      />
    </Field>
  );
}
