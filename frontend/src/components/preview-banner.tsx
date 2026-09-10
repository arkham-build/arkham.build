import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDismissBannerMutation } from "@/queries/mutations/app";
import { useApplySettingsMutation } from "@/queries/mutations/settings";
import { useStore } from "@/store";
import css from "./preview-banner.module.css";
import { Button } from "./ui/button";

const BANNER_ID = "preview-core-2026";

export function PreviewBanner() {
  const settings = useStore((state) => state.settings);
  const dismissed = useStore((state) =>
    state.app?.bannersDismissed?.includes(BANNER_ID),
  );
  const { t } = useTranslation();
  const onDismiss = useDismissPreviewBanner();
  const onEnablePreviews = useEnablePreviewBanner(settings);

  if (settings.showPreviews || dismissed) {
    return null;
  }

  return (
    <article className={css["preview"]} data-testid="preview-banner">
      <div className={css["content"]}>
        <header className={css["header"]}>
          <h3 className={css["title"]}>
            <i className="encounters-core_2026" />
            {t("preview_banner.title")}
          </h3>
        </header>
        <p>{t("preview_banner.description")}</p>
        <div className={css["actions"]}>
          <Button
            size="sm"
            variant="primary"
            onClick={onEnablePreviews}
            data-testid="preview-banner-enable"
          >
            {t("preview_banner.actions.enable")}
          </Button>
          <Button
            size="sm"
            onClick={onDismiss}
            data-testid="preview-banner-dismiss"
          >
            {t("preview_banner.actions.dismiss")}
          </Button>
        </div>
      </div>
    </article>
  );
}

function useDismissPreviewBanner() {
  const dismissBannerMutation = useDismissBannerMutation();

  return useCallback(async () => {
    try {
      await dismissBannerMutation.mutateAsync(BANNER_ID);
    } catch (err) {
      console.error(err);
    }
  }, [dismissBannerMutation]);
}

function useEnablePreviewBanner(
  settings: ReturnType<typeof useStore.getState>["settings"],
) {
  const dismissBannerMutation = useDismissBannerMutation();
  const applySettingsMutation = useApplySettingsMutation();

  return useCallback(async () => {
    try {
      await applySettingsMutation.mutateAsync({
        settings: { ...settings, showPreviews: true },
      });
      await dismissBannerMutation.mutateAsync(BANNER_ID);
    } catch (err) {
      console.error(err);
    }
  }, [applySettingsMutation, dismissBannerMutation, settings]);
}
