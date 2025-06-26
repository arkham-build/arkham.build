import { useTranslation } from "react-i18next";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useStore } from "@/store";
import { selectTabooSetOptions } from "@/store/selectors/lists";
import { formatTabooSet } from "@/utils/formatting";
import type { SettingProps } from "./types";

export function TabooSetSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  const tabooSets = useStore(selectTabooSetOptions);

  const onChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    if (evt.target instanceof HTMLSelectElement) {
      const value = +evt.target.value || undefined;
      setSettings((settings) => ({ ...settings, tabooSetId: value }));
    }
  };

  return (
    <Field bordered>
      <FieldLabel htmlFor="taboo-set">
        {t("settings.general.default_taboo")}
      </FieldLabel>
      <Select
        data-testid="settings-taboo-set"
        emptyLabel={t("common.none")}
        id="taboo-set"
        name="taboo-set"
        onChange={onChange}
        value={settings.tabooSetId ?? ""}
        options={tabooSets.map((set) => {
          return { label: formatTabooSet(set), value: set.id };
        })}
      />
    </Field>
  );
}
