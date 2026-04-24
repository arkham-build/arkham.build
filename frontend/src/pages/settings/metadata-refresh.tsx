import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "@/store/services/queries";

export function MetadataRefresh() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();

  const init = useStore((state) => state.init);
  const locale = useStore((state) => state.settings.locale);

  const { isPending, mutateAsync } = useMutation({
    mutationFn: async () => {
      await init(queryMetadata, queryDataVersion, queryCards, {
        refresh: true,
        locale,
      });

      const dataVersion = useStore.getState().metadata.dataVersion;

      queryClient.setQueryData(
        ["settings", "dataVersion", locale],
        dataVersion,
      );
      queryClient.setQueryData(["tasks", "dataVersion", locale], dataVersion);
    },
  });

  const onRefresh = useCallback(async () => {
    const toastId = toast.show({
      children: t("settings.card_data.loading"),
      variant: "loading",
    });

    try {
      await mutateAsync();
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
  }, [mutateAsync, t, toast]);

  return (
    <Button disabled={isPending} onClick={onRefresh} type="button">
      {t("settings.card_data.sync")}
    </Button>
  );
}
