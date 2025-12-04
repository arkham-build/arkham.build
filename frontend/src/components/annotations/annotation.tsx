import { MessageCircleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import DeckDescription from "../deck-description";
import css from "./annotation.module.css";

type Props = {
  actions?: React.ReactNode;
  content: string;
  className?: string;
  size?: "sm";
};

export function Annotation(props: Props) {
  const { content, ...rest } = props;

  return (
    <AnnotationContainer {...rest}>
      <DeckDescription className={css["content"]} content={content} />
    </AnnotationContainer>
  );
}

export function AnnotationContainer(
  props: Omit<Props, "content"> & { children: React.ReactNode },
) {
  const { actions, className, children, size } = props;
  const { t } = useTranslation();

  return (
    <article
      className={cx(className, css["annotation"], size && css[size])}
      data-testid="annotation"
    >
      <header className={css["header"]}>
        <div className={css["row"]}>
          <MessageCircleIcon className={css["icon"]} />
          <h4>{t("deck.annotation")}</h4>
        </div>
        {actions}
      </header>
      <div className={css["content"]}>{children}</div>
    </article>
  );
}
