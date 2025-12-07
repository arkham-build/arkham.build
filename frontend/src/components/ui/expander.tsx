import { UnfoldVertical } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
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
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const contentRef = useRef<HTMLDivElement>(null);

  const cssVariables = useMemo(
    () => ({
      "--collapsed-height": collapsedHeight,
    }),
    [collapsedHeight],
  );

  return (
    <article
      className={cx(css["expander"], isExpanded && css["expanded"])}
      style={cssVariables as React.CSSProperties}
    >
      {label && (
        <header className={css["expander-header"]}>
          <h2 className={css["expander-label"]}>{label}</h2>
        </header>
      )}
      <div className={css["expander-content"]} ref={contentRef}>
        {children}
      </div>
      <Button
        className={css["expander-toggle"]}
        onClick={() => {
          setIsExpanded((prev) => !prev);
        }}
        size="sm"
        variant="primary"
      >
        <UnfoldVertical />
        {isExpanded ? t("ui.collapsible.collapse") : t("ui.collapsible.expand")}
      </Button>
    </article>
  );
}
