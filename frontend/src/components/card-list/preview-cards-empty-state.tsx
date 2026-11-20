import { useTranslation } from "react-i18next";
import { useSaveSettingsMutation } from "@/queries/mutations/settings";
import { useStore } from "@/store";
import { Button } from "../ui/button";
import { Scroller } from "../ui/scroller";
import { useToast } from "../ui/toast.hooks";
import css from "./preview-cards-empty-state.module.css";
import { ImageOffIcon } from "lucide-react";

export function PreviewCardsEmptyState() {
  const { t } = useTranslation();
  const saveSettingsMutation = useSaveSettingsMutation();
  const toast = useToast();

  const onEnablePreviews = async () => {
    try {
      await saveSettingsMutation.mutateAsync({
        settings: { ...useStore.getState().settings, showPreviews: true },
      });
    } catch (error) {
      toast.show({
        children: t("settings.error", { error: (error as Error).message }),
        variant: "error",
      });
    }
  };

  return (
    <Scroller
      className={css["scroller"]}
      data-testid="preview-cards-empty-state"
      viewportClassName={css["viewport"]}
    >
      <div className={css["content"]}>
        <ImageOffIcon className={css["icon"]} />
        <p className={css["description"]}>
          {t("lists.empty_previews.description")}
        </p>
        <div>
          <Button
            disabled={saveSettingsMutation.isPending}
            onClick={onEnablePreviews}
            variant="primary"
          >
            {t("lists.empty_previews.enable")}
          </Button>
        </div>
      </div>
    </Scroller>
  );
}
