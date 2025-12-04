import { useTranslation } from "react-i18next";
import { TabooSelect } from "@/components/taboo-select";
import { Field, FieldLabel } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function TabooSetSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  const onChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    if (evt.target instanceof HTMLSelectElement) {
      const value = evt.target.value;
      const tabooSetId =
        value === "latest" ? "latest" : Number.parseInt(value, 10);

      setSettings((settings) => ({ ...settings, tabooSetId }));
    }
  };

  const id = "settings-taboo-set";

  return (
    <Field bordered>
      <FieldLabel htmlFor={id}>
        {t("settings.general.default_taboo")}
      </FieldLabel>
      <TabooSelect
        includeLatest
        id={id}
        onChange={onChange}
        value={settings.tabooSetId}
      />
    </Field>
  );
}
