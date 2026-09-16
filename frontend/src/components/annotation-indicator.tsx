import { MessageCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import css from "./annotation-indicator.module.css";
import { DefaultTooltip } from "./ui/tooltip";

type Props = {
  hideTooltip?: boolean;
};

export function AnnotationIndicator(props: Props) {
  const { hideTooltip } = props;
  const { t } = useTranslation();

  const indicator = (
    <span className={css["annotation-icon"]} data-testid="annotation-indicator">
      <MessageCircleIcon />
    </span>
  );

  if (hideTooltip) return indicator;

  return (
    <DefaultTooltip tooltip={t("deck.annotation_tooltip")}>
      {indicator}
    </DefaultTooltip>
  );
}
