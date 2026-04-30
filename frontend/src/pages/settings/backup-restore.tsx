import { AlertTriangleIcon } from "lucide-react";
import { useCallback } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { useToast } from "@/components/ui/toast.hooks";
import { useRestoreBackupMutation } from "@/queries/mutations/app";
import { useStore } from "@/store";
import { assert } from "@/utils/assert";
import css from "./backup-restore.module.css";

export function BackupRestore() {
  const { t } = useTranslation();

  const backup = useStore((state) => state.backup);
  const onRestore = useRestoreBackup();

  return (
    <Field
      bordered
      helpText={
        <>
          <p>{t("settings.backup.help")}</p>
          <p>
            <AlertTriangleIcon className="icon-inline" />{" "}
            <Trans
              i18nKey="settings.backup.help_warning"
              components={{ strong: <strong /> }}
              t={t}
            />
          </p>
        </>
      }
    >
      <div className={css["actions"]}>
        <Button onClick={backup} type="button">
          {t("settings.backup.create")}
        </Button>
        <FileInput
          accept="application/json"
          id="settings-restore"
          onChange={onRestore}
        >
          {t("settings.backup.restore")}
        </FileInput>
      </div>
    </Field>
  );
}

function useRestoreBackup() {
  const toast = useToast();
  const { t } = useTranslation();
  const restoreBackupMutation = useRestoreBackupMutation();

  return useCallback(
    async (evt: React.ChangeEvent<HTMLInputElement>) => {
      const confirmed = confirm(t("settings.backup.confirm"));
      if (!confirmed) return;

      try {
        const file = evt.target.files?.[0];
        assert(file, t("settings.backup.no_file_selected"));
        await restoreBackupMutation.mutateAsync(file);
        toast.show({
          duration: 3000,
          children: t("settings.backup.restore_success"),
          variant: "success",
        });
      } catch (err) {
        toast.show({
          children: t("settings.backup.restore_error", {
            error: (err as Error).message,
          }),
          variant: "error",
        });
      }
    },
    [restoreBackupMutation, t, toast],
  );
}
