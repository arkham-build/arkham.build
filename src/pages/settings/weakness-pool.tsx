import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function WeaknessPoolSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  const onCheckWeaknessPool = useCallback(
    (val: boolean | string) => {
      setSettings((settings) => ({
        ...settings,
        useLimitedPoolForWeaknessDraw: !!val,
      }));
    },
    [setSettings],
  );

  return (
    <Field
      bordered
      helpText={t("settings.general.weakness_limited_card_pool_help")}
    >
      <Checkbox
        checked={settings.useLimitedPoolForWeaknessDraw}
        data-testid="settings-weakness-pool"
        id="weakness-pool"
        label={t("settings.general.weakness_limited_card_pool")}
        name="weakness-pool"
        onCheckedChange={onCheckWeaknessPool}
      />
    </Field>
  );
}
