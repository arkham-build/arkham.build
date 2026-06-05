import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useStore } from "@/store";

export function DataExport() {
  const { t } = useTranslation();

  const backup = useStore((state) => state.backup);

  return (
    <Field bordered helpText={<p>{t("settings.support.help")}</p>}>
      <Button onClick={backup} type="button">
        {t("settings.support.create")}
      </Button>
    </Field>
  );
}
