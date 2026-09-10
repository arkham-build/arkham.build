import { useTranslation } from "react-i18next";
import css from "./oauth-separator.module.css";

export function OAuthSeparator() {
  const { t } = useTranslation();

  return (
    <div className={css["separator"]}>
      <span>{t("common.or")}</span>
    </div>
  );
}
