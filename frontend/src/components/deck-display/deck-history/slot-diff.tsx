import { useTranslation } from "react-i18next";
import {
  ListCard,
  type Props as ListcardProps,
} from "@/components/list-card/list-card";
import type { ResolvedDeck } from "@/store/lib/types";
import type { SlotUpgrade } from "@/store/selectors/decks";
import { cx } from "@/utils/cx";
import css from "./diffs.module.css";

export function SlotDiff(props: {
  listCardProps?: Partial<ListcardProps>;
  differences: SlotUpgrade[];
  deck?: ResolvedDeck;
  omitHeadings?: boolean;
  size?: "sm";
  title: React.ReactNode;
}) {
  const { deck, differences, listCardProps, omitHeadings, size, title } = props;
  const { t } = useTranslation();

  if (!differences.length) return null;

  const { additions, removals } = differences.reduce(
    (acc, diff) => {
      if (diff.diff > 0) {
        acc.additions.push(diff);
      } else {
        acc.removals.push(diff);
      }
      return acc;
    },
    { additions: [] as SlotUpgrade[], removals: [] as SlotUpgrade[] },
  );

  return (
    <article className={cx(css["diffs-container"], size && css[size])}>
      <header>
        <h4 className={css["diffs-title"]}>{title}</h4>
      </header>
      {additions.length > 0 && (
        <article>
          {!omitHeadings && (
            <h5 className={css["diffs-subtitle"]}>
              {t("deck_view.history.added")}
            </h5>
          )}
          <ol className={css["diffs"]}>
            {additions.map((change, idx) => (
              <DiffEntry
                listCardProps={listCardProps}
                // biome-ignore lint/suspicious/noArrayIndexKey: no natural key available.
                key={idx}
                deck={deck}
                change={change}
              />
            ))}
          </ol>
        </article>
      )}
      {removals.length > 0 && (
        <article>
          {!omitHeadings && (
            <h5 className={css["diffs-subtitle"]}>
              {t("deck_view.history.removed")}
            </h5>
          )}
          <ol className={css["diffs"]}>
            {removals.map((change, idx) => (
              <DiffEntry
                listCardProps={listCardProps}
                // biome-ignore lint/suspicious/noArrayIndexKey: no natural key available.
                key={idx}
                deck={deck}
                change={change}
              />
            ))}
          </ol>
        </article>
      )}
    </article>
  );
}

function DiffEntry(props: {
  listCardProps?: Partial<ListcardProps>;
  deck?: ResolvedDeck;
  change: SlotUpgrade;
}) {
  const { deck, change, listCardProps } = props;

  return (
    <li className={css["diff"]}>
      <span
        className={cx(
          css["diff-quantity"],
          change.diff > 0 ? css["positive"] : css["negative"],
        )}
      >
        {change.diff > 0 ? "+" : "–"}
        {Math.abs(change.diff)}
      </span>
      <ListCard
        {...listCardProps}
        annotation={deck?.annotations[change.card.code]}
        key={change.card.code}
        card={change.card}
        omitBorders
      />
    </li>
  );
}
