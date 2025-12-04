import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { LocaleSelect } from "./locale-select";
import { useToast } from "./ui/toast.hooks";

export function LocaleQuickSwitch() {
  const { t } = useTranslation();
  const toast = useToast();

  const [loading, setLoading] = useState(false);

  const applySettings = useStore((state) => state.applySettings);
  const settings = useStore((state) => state.settings);

  const onLocaleChange = useCallback(
    async (locale: string) => {
      setLoading(true);

      try {
        await applySettings(
          {
            ...settings,
            locale,
          },
          { keepListState: true },
        );
      } catch (err) {
        toast.show({
          children: t("settings.error", { error: (err as Error).message }),
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [applySettings, settings, t, toast],
  );

  return (
    <LocaleSelect
      onValueChange={onLocaleChange}
      value={settings.locale}
      loading={loading}
      variant="compact"
    />
  );
}
