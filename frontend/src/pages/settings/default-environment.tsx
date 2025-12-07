import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, type SelectOption } from "@/components/ui/select";
import type { SettingProps } from "./types";

export function DefaultEnvironmentSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  const onChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    if (evt.target instanceof HTMLSelectElement) {
      const defaultEnvironment = evt.target.value as "current" | "legacy";
      setSettings((settings) => ({ ...settings, defaultEnvironment }));
    }
  };

  const options: SelectOption[] = [
    {
      value: "legacy",
      label: t("deck_edit.config.card_pool.legacy"),
    },
    {
      value: "current",
      label: t("deck_edit.config.card_pool.current"),
    },
  ];

  const id = "settings-default-environment";

  return (
    <Field
      bordered
      helpText={t(
        `deck_edit.config.card_pool.${settings.defaultEnvironment}_help`,
      )}
    >
      <FieldLabel htmlFor={id}>
        {t("settings.general.default_environment")}
      </FieldLabel>
      <Select
        data-testid="settings-default-environment"
        id={id}
        onChange={onChange}
        options={options}
        required
        value={settings.defaultEnvironment}
      />
    </Field>
  );
}
