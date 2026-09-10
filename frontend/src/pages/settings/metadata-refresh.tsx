import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast.hooks";
import { useRefreshMetadataMutation } from "@/queries/cache";

export function MetadataRefresh() {
  const { t } = useTranslation();
  const toast = useToast();
  const refreshMetadataMutation = useRefreshMetadataMutation();

  const onRefresh = useCallback(async () => {
    const toastId = toast.show({
      children: t("settings.card_data.loading"),
      variant: "loading",
    });

    try {
      await refreshMetadataMutation.mutateAsync();
      toast.dismiss(toastId);
      toast.show({
        duration: 3000,
        children: t("settings.card_data.up_to_date"),
        variant: "success",
      });
    } catch (err) {
      toast.dismiss(toastId);
      console.error(err);
      toast.show({
        children: t("settings.card_data.error"),
        variant: "error",
      });
    }
  }, [refreshMetadataMutation, t, toast]);

  return (
    <Button
      disabled={refreshMetadataMutation.isPending}
      onClick={onRefresh}
      type="button"
    >
      {t("settings.card_data.sync")}
    </Button>
  );
}
