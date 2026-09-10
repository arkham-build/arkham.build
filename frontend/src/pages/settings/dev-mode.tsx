import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function DevModeSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  return (
    <Field bordered>
      <Checkbox
        checked={settings.devModeEnabled}
        label={t("settings.developer.dev_mode_enabled")}
        data-testid="dev-mode-enabled"
        id="dev-mode-enabled"
        name="dev-mode-enabled"
        onCheckedChange={(val: boolean | string) => {
          setSettings((s) => ({ ...s, devModeEnabled: !!val }));
        }}
      />
    </Field>
  );
}
