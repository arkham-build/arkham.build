import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function ShowPreviewsSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  const onCheckedChange = useCallback(
    (val: boolean | string) => {
      setSettings((settings) => ({ ...settings, showPreviews: !!val }));
    },
    [setSettings],
  );

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
