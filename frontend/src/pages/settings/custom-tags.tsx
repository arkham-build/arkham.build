import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function CustomTagsSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  return (
    <Field bordered helpText={t("settings.general.custom_tags_help")}>
      <Checkbox
        checked={settings.customTagsEnabled}
        data-testid="settings-custom-tags-enabled"
        id="custom-tags-enabled"
        label={t("settings.general.custom_tags")}
        name="custom-tags-enabled"
        onCheckedChange={(val: boolean | string) => {
          setSettings((s) => ({ ...s, customTagsEnabled: !!val }));
        }}
      />
    </Field>
  );
}
