import { Field, FieldLabel } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { getAvailableThemes } from "@/utils/use-color-theme";
import { useTranslation } from "react-i18next";

type Props = {
  setTheme: (value: string) => void;
  theme: string;
};

export function ThemeSetting({ setTheme, theme }: Props) {
  const { t } = useTranslation();

  return (
    <Field bordered>
      <FieldLabel>{t("settings.display.theme")}</FieldLabel>
      <Select
        data-testid={"settings-select-theme"}
        value={theme}
        required
        onChange={(evt) => setTheme(evt.target.value)}
        options={Object.entries(getAvailableThemes()).map(([value, label]) => ({
          label,
          value,
        }))}
      />
    </Field>
  );
}
