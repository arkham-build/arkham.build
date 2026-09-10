import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSaveSettingsMutation } from "@/queries/mutations/settings";
import { useStore } from "@/store";
import { LocaleSelect } from "./locale-select";
import { useToast } from "./ui/toast.hooks";

export function LocaleQuickSwitch(props: {
  variant?: "compact";
  fullWidth?: boolean;
  portal?: boolean;
}) {
  const { variant, fullWidth, portal } = props;
  const settings = useStore((state) => state.settings);
  const { isPending, onLocaleChange } = useApplyLocaleSetting(settings);

  return (
    <LocaleSelect
      onValueChange={onLocaleChange}
      value={settings.locale}
      loading={isPending}
      variant={variant}
      fullWidth={fullWidth}
      portal={portal}
    />
  );
}

function useApplyLocaleSetting(
  settings: ReturnType<typeof useStore.getState>["settings"],
) {
  const { t } = useTranslation();
  const toast = useToast();
  const saveSettingsMutation = useSaveSettingsMutation();

  const onLocaleChange = useCallback(
    async (locale: string) => {
      try {
        await saveSettingsMutation.mutateAsync({
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
    [saveSettingsMutation, settings, t, toast],
  );

  return {
    isPending: saveSettingsMutation.isPending,
    onLocaleChange,
  };
}
