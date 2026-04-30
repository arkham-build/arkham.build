import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useApplySettingsMutation } from "@/queries/mutations/settings";
import { useStore } from "@/store";
import { LocaleSelect } from "./locale-select";
import { useToast } from "./ui/toast.hooks";

export function LocaleQuickSwitch() {
  const settings = useStore((state) => state.settings);
  const { isPending, onLocaleChange } = useApplyLocaleSetting(settings);

  return (
    <LocaleSelect
      onValueChange={onLocaleChange}
      value={settings.locale}
      loading={isPending}
      variant="compact"
    />
  );
}

function useApplyLocaleSetting(
  settings: ReturnType<typeof useStore.getState>["settings"],
) {
  const { t } = useTranslation();
  const toast = useToast();
  const applySettingsMutation = useApplySettingsMutation();

  const onLocaleChange = useCallback(
    async (locale: string) => {
      try {
        await applySettingsMutation.mutateAsync({
          settings: {
            ...settings,
            locale,
          },
          opts: { keepListState: true },
        });
      } catch (err) {
        toast.show({
          children: t("settings.error", { error: (err as Error).message }),
          variant: "error",
        });
      }
    },
    [applySettingsMutation, settings, t, toast],
  );

  return {
    isPending: applySettingsMutation.isPending,
    onLocaleChange,
  };
}
