import type { Settings as SettingsState } from "@arkham-build/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/toast.hooks";
import { useSaveSettingsMutation } from "@/queries/mutations/settings";
import { isSettingsConflictError } from "@/store/services/requests/settings";
import { SettingsConflictToast } from "./settings-conflict-toast";

type Props = {
  settings: SettingsState;
  theme?: string;
  updateColorTheme?: (theme: string) => void;
};

export function useSaveSettings(props: Props) {
  const { settings, theme = "", updateColorTheme = () => {} } = props;

  const { t } = useTranslation();
  const toast = useToast();
  const saveSettingsMutation = useSaveSettingsMutation();

  const saveSettings = useCallback(
    async (opts?: { expectedRevision?: string | null }) => {
      const toastId = toast.show({
        children: t("settings.saving"),
        variant: "loading",
      });

      try {
        await saveSettingsMutation.mutateAsync({ settings, opts });
        updateColorTheme(theme);
        toast.dismiss(toastId);
      } catch (err) {
        toast.dismiss(toastId);

        if (isSettingsConflictError(err)) {
          toast.show({
            children: ({ onClose }) => (
              <SettingsConflictToast
                conflict={err.remote}
                onClose={onClose}
                settings={settings}
                theme={theme}
                updateColorTheme={updateColorTheme}
              />
            ),
            variant: "error",
          });
          return;
        }

        toast.show({
          children: t("settings.error", { error: (err as Error).message }),
          variant: "error",
        });
      }
    },
    [saveSettingsMutation, settings, t, theme, toast, updateColorTheme],
  );

  return {
    isPending: saveSettingsMutation.isPending,
    saveSettings,
  };
}
