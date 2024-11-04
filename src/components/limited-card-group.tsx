import type { Card } from "@/store/services/queries.types";
import { cx } from "@/utils/cx";
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

  return (
    <article className={css["container"]} data-testid="limited-card-group">
      <header className={cx(css["header"], className)}>
        <h3 className={css["title"]}>{title}</h3>
        <div className={css["stats"]} data-testid="limited-card-stats">
          {count.total} / {count.limit}
        </div>
      </header>
      <ul className={css["content"]}>{entries.map(renderCard)}</ul>
    </article>
  );
}
