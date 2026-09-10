import type {
  SettingsResponse,
  Settings as SettingsState,
} from "@arkham-build/shared";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast.hooks";
import {
  useApplyRemoteSettingsMutation,
  useLoadRemoteSettingsMutation,
  useSaveSettingsMutation,
} from "@/queries/mutations/settings";
import { useStore } from "@/store";
import { isSettingsConflictError } from "@/store/services/requests/settings";
import css from "./settings.module.css";

export function SettingsConflictToast({
  conflict,
  onClose,
  settings,
  theme,
  updateColorTheme,
}: {
  conflict: SettingsResponse | null;
  onClose: () => void;
  settings: SettingsState;
  theme: string;
  updateColorTheme: (theme: string) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const applyRemoteSettingsMutation = useApplyRemoteSettingsMutation();
  const loadRemoteSettingsMutation = useLoadRemoteSettingsMutation();
  const saveSettingsMutation = useSaveSettingsMutation();
  const [activeConflict, setActiveConflict] = useState(conflict);
  const [pendingAction, setPendingAction] = useState<
    "refresh" | "overwrite" | null
  >(null);

  const runAction = useCallback(
    async (action: "refresh" | "overwrite", handler: () => Promise<void>) => {
      setPendingAction(action);

      try {
        await handler();
        onClose();
      } catch (error) {
        if (isSettingsConflictError(error)) {
          setActiveConflict(
            error.remote ?? useStore.getState().sync.settings.conflict,
          );
        } else {
          toast.show({
            children: t("settings.error", {
              error: (error as Error).message,
            }),
            variant: "error",
          });
        }
      } finally {
        setPendingAction(null);
      }
    },
    [onClose, t, toast],
  );

  const refresh = useCallback(async () => {
    if (activeConflict) {
      await applyRemoteSettingsMutation.mutateAsync(activeConflict);
      return;
    }

    await loadRemoteSettingsMutation.mutateAsync();
  }, [activeConflict, applyRemoteSettingsMutation, loadRemoteSettingsMutation]);

  const overwrite = useCallback(async () => {
    await saveSettingsMutation.mutateAsync({
      settings,
      opts: {
        expectedRevision:
          useStore.getState().sync.settings.conflict?.revision ??
          activeConflict?.revision ??
          null,
      },
    });
    updateColorTheme(theme);
  }, [activeConflict, saveSettingsMutation, settings, theme, updateColorTheme]);

  return (
    <div className={css["sync-toast"]}>
      <p>{t("settings.conflict.description")}</p>
      {activeConflict?.revision && (
        <p className={css["sync-toast-details"]}>
          {t("settings.conflict.remote_revision", {
            revision: activeConflict.revision,
          })}
        </p>
      )}
      <div className={css["sync-toast-actions"]}>
        <Button
          disabled={pendingAction !== null}
          onClick={() => {
            void runAction("refresh", refresh);
          }}
          size="sm"
          variant="secondary"
        >
          {t("settings.conflict.refresh")}
        </Button>
        <Button
          disabled={pendingAction !== null}
          onClick={() => {
            void runAction("overwrite", overwrite);
          }}
          size="sm"
          variant="primary"
        >
          {t("settings.conflict.overwrite")}
        </Button>
      </div>
    </div>
  );
}
