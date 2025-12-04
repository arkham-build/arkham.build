import { MessageCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import css from "./annotation-indicator.module.css";
import { DefaultTooltip } from "./ui/tooltip";

export function AnnotationIndicator() {
  const { t } = useTranslation();

  return (
    <DefaultTooltip tooltip={t("deck.annotation_tooltip")}>
      <span
        className={css["annotation-icon"]}
        data-testid="annotation-indicator"
      >
        <MessageCircleIcon />
      </span>
    </DefaultTooltip>
  );
}
