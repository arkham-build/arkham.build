import { Trans, useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function HideWeaknessSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  const onCheckHideWeaknesses = (val: boolean | string) => {
    setSettings((settings) => ({
      ...settings,
      hideWeaknessesByDefault: !!val,
    }));
  };

  return (
    <Field
      bordered
      helpText={
        <Trans
          i18nKey="settings.display.hide_weaknesses_help"
          t={t}
          components={{
            strong: <strong />,
          }}
        />
      }
    >
      <Checkbox
        checked={settings.hideWeaknessesByDefault}
        label={t("settings.display.hide_weaknesses")}
        id="hide-weaknesses-by-default"
        name="hide-weaknesses-by-default"
        onCheckedChange={onCheckHideWeaknesses}
      />
    </Field>
  );
}
