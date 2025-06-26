import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function SortPunctuationSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  const onCheckedChange = (val: boolean | string) => {
    setSettings((settings) => ({
      ...settings,
      sortIgnorePunctuation: !!val,
    }));
  };

  return (
    <Field
      bordered
      helpText={t("settings.display.sort_ignore_punctuation_help")}
    >
      <Checkbox
        checked={settings.sortIgnorePunctuation}
        label={t("settings.display.sort_ignore_punctuation")}
        data-testid="sort_ignore_punctuation"
        id="sort_ignore_punctuation"
        name="sort_ignore_punctuation"
        onCheckedChange={onCheckedChange}
      />
    </Field>
  );
}
