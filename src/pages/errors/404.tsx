import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/layouts/app-layout";
import { useResolvedColorTheme } from "@/utils/use-color-theme";
import { ErrorDisplay } from "./error-display";
import css from "./errors.module.css";

export function Error404() {
  const theme = useResolvedColorTheme();
  const { t } = useTranslation();

  return (
    <AppLayout mainClassName={css["main"]} title={t("errors.404")}>
      <ErrorDisplay
        message={t("errors.404")}
        pre={
          <img
            className={css["image"]}
            src={theme === "dark" ? "/404-dark.png" : "/404-light.png"}
            alt={t("errors.404")}
          />
        }
        status={404}
      >
        <Link asChild to="~/">
          <Button as="a" variant="bare">
            {t("app.home")}
          </Button>
        </Link>
      </ErrorDisplay>
    </AppLayout>
  );
}
