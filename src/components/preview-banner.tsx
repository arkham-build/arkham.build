import { useStore } from "@/store";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import css from "./preview-banner.module.css";
import { Button } from "./ui/button";

const BANNER_ID = "preview-tdc";

export function PreviewBanner() {
  const settings = useStore((state) => state.settings);
  const { t } = useTranslation();

  const dismissBanner = useStore((state) => state.dismissBanner);
  const applySettings = useStore((state) => state.applySettings);

  const dismissed = useStore((state) =>
    state.app?.bannersDismissed?.includes(BANNER_ID),
  );

  const onDismiss = useCallback(async () => {
    try {
      await dismissBanner(BANNER_ID);
    } catch (err) {
      console.error(err);
    }
  }, [dismissBanner]);

  const onEnablePreviews = useCallback(async () => {
    try {
      await applySettings({ ...settings, showPreviews: true });
      await dismissBanner(BANNER_ID);
    } catch (err) {
      console.error(err);
    }
  }, [settings, applySettings, dismissBanner]);

  if (settings.showPreviews || dismissed) {
    return null;
  }

  return (
    <article className={css["preview"]} data-testid="preview-banner">
      <div className={css["content"]}>
        <header className={css["header"]}>
          <h3 className={css["title"]}>
            <i className="encounters-tdcp" />
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
