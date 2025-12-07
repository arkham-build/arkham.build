import { useMemo } from "react";
import { cx } from "@/utils/cx";
import css from "./decklist-section.module.css";

type Props = {
  children: React.ReactNode;
  columns?: "single" | "auto" | "scans";
  size?: number;
  showTitle?: boolean;
  title: string;
  extraInfos?: string;
};

export function DecklistSection(props: Props) {
  const {
    children,
    columns = "auto",
    showTitle,
    size,
    title,
    extraInfos,
  } = props;

  // Chrome has an issue where CSS columns become extremely slow to draw when
  // there are many items and more than two columns here.
  const maxColumns = useMemo(
    () => ({
      "--max-columns": (size ?? 0) > 100 ? 2 : 3,
    }),
    [size],
  );

  return (
    <article
      className={cx(css["decklist-section"], css[columns])}
      style={maxColumns as React.CSSProperties}
    >
      <header className={css["decklist-section-header"]}>
        <h3
          className={cx(css["decklist-section-title"], !showTitle && "sr-only")}
        >
          {title}
          {extraInfos && (
            <span className={cx(css["decklist-section-extra-infos"])}>
              ({extraInfos})
            </span>
          )}
        </h3>
      </header>
      <div className={css["decklist-section-content"]}>{children}</div>
    </article>
  );
}
