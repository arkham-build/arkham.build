import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/layouts/app-layout";
import {
  ErrorDisplay,
  ErrorImage,
} from "../../components/error-display/error-display";
import css from "./404.module.css";

export function ErrorStatus({ statusCode }: { statusCode: number }) {
  const { i18n, t } = useTranslation();

  const message = i18n.exists(`errors.${statusCode}`)
    ? t(`errors.${statusCode}`)
    : t("errors.500");

  return (
    <AppLayout mainClassName={css["main"]} title={message}>
      <ErrorDisplay message={message} pre={<ErrorImage />} status={statusCode}>
        <Link asChild to="~/">
          <Button as="a" variant="bare">
            {t("app.home")}
          </Button>
        </Link>
      </ErrorDisplay>
    </AppLayout>
  );
}
