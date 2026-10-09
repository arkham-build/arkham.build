import { useTranslation } from "react-i18next";
import { LocaleSelect } from "@/components/locale-select";
import { Field, FieldLabel } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function LocaleSetting(props: SettingProps) {
  const { settings, setSettings } = props;

  const { t } = useTranslation();

  const onSelectChange = (locale: string) => {
    setSettings((settings) => ({
      ...settings,
      locale: locale,
    }));
  };

  return (
    <Field bordered helpText={t("settings.locale.help")}>
      <FieldLabel as="label" htmlFor="locale-select">
        {t("settings.locale.title")}
      </FieldLabel>
      <LocaleSelect
        id="locale-select"
        value={settings.locale}
        onValueChange={onSelectChange}
      />
    </Field>
  );
}
