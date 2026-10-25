import { UnfoldVertical } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { Button } from "./button";
import css from "./expander.module.css";

type Props = {
  children: ReactNode;
  collapsedHeight?: string;
  defaultExpanded?: boolean;
  label?: ReactNode;
};

export function Expander({
  children,
  collapsedHeight = "15.625rem",
  defaultExpanded,
  label,
}: Props) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? false);
  const [canExpand, setCanExpand] = useState(false);
  const contentId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const inner = innerRef.current;
    if (!content || !inner || isExpanded) return;

    const updateOverflow = () => {
      setCanExpand(content.scrollHeight > content.clientHeight);
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(content);
    observer.observe(inner);

    return () => observer.disconnect();
  }, [collapsedHeight, isExpanded]);

  const cssVariables = {
    "--collapsed-height": collapsedHeight,
  };

  return (
    <article
      className={cx(
        css["expander"],
        isExpanded && css["expanded"],
        canExpand && !isExpanded && css["collapsed"],
      )}
      style={cssVariables as React.CSSProperties}
    >
      {label && (
        <header className={css["expander-header"]}>
          <h2 className={css["expander-label"]}>{label}</h2>
        </header>
      )}
      <div className={css["expander-content"]} id={contentId} ref={contentRef}>
        <div ref={innerRef}>{children}</div>
      </div>
      {canExpand && !isExpanded && (
        <Button
          aria-controls={contentId}
          aria-expanded={false}
          className={css["expander-toggle"]}
          onClick={() => setIsExpanded(true)}
          size="sm"
          variant="primary"
        >
          <UnfoldVertical />
          {t("ui.collapsible.expand")}
        </Button>
      )}
    </article>
  );
}
