import type { Card } from "@arkham-build/shared";
import { useTranslation } from "react-i18next";
import { cx } from "@/utils/cx";
import { isEmpty } from "@/utils/is-empty";
import css from "./limited-card-group.module.css";

type Entry = {
  card: Card;
  quantity: number;
  limit?: number;
};

type Props = {
  className?: string;
  entries: Entry[];
  count: {
    limit: number;
    total: number;
  };
  renderCard: (entry: Entry) => React.ReactNode;
  title: React.ReactNode;
};

export function LimitedCardGroup(props: Props) {
  const { className, count, entries, renderCard, title } = props;
  const { t } = useTranslation();

  return (
    <article className={css["container"]} data-testid="limited-card-group">
      <header className={cx(css["header"], className)}>
        <h3 className={css["title"]}>{title}</h3>
        <div className={css["stats"]} data-testid="limited-card-stats">
          {count.total} / {count.limit}
        </div>
      </header>
      {isEmpty(entries) ? (
        <p className={css["empty"]}>{t("common.no_entries")}</p>
      ) : (
        <ul className={css["content"]}>{entries.map(renderCard)}</ul>
      )}
    </article>
  );
}
