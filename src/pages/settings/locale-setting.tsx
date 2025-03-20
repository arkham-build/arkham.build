import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { Locale } from "@/store/slices/settings.types";
import { LOCALES } from "@/utils/constants";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { SettingProps } from "./types";

export function LocaleSetting(props: SettingProps) {
  const { settings, setSettings } = props;

  const { t } = useTranslation();

  const onSelectChange = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      setSettings((settings) => ({
        ...settings,
        locale: evt.target.value as Locale,
      }));
    },
    [setSettings],
  );

  return (
    <Field bordered helpText={t("settings.locale.help")}>
      <FieldLabel as="label" htmlFor="locale-select">
        {t("settings.locale.title")}
      </FieldLabel>
      <Select
        id="locale-select"
        options={LOCALES}
        required
        value={settings.locale}
        onChange={onSelectChange}
      />
    </Field>
  );
}
