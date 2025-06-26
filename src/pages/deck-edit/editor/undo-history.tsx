import { useTranslation } from "react-i18next";
import { DeckHistoryEntry } from "@/components/deck-display/deck-history/deck-history";
import { Plane } from "@/components/ui/plane";
import { Scroller } from "@/components/ui/scroller";
import { useStore } from "@/store";
import type { ResolvedDeck } from "@/store/lib/types";
import { selectUndoHistory } from "@/store/selectors/decks";
import { formatDateTime } from "@/utils/formatting";
import css from "./undo-history.module.css";

type Props = {
  deck: ResolvedDeck;
};

export function UndoHistory(props: Props) {
  const { deck } = props;

  const { t } = useTranslation();

  const history = useStore((state) => selectUndoHistory(state, deck));

  return (
    <Scroller className={css["scroller"]}>
      <Plane
        className={css["container"]}
        data-testid="undo-history"
        as="section"
      >
        <header className={css["header"]}>
          <h2 className={css["title"]}>{t("deck_edit.versions.title")}</h2>
        </header>
        <ol className={css["entries"]}>
          {history.map((entry) => {
            return (
              <DeckHistoryEntry
                key={entry.version}
                data={entry.data}
                deck={deck}
                size="sm"
                title={
                  entry.version === "current" ? (
                    <div className={css["entry-title"]}>
                      <span className={css["version"]}>
                        {t("deck_edit.versions.entry_title_current")}
                      </span>
                    </div>
                  ) : (
                    <div className={css["entry-title"]}>
                      <span className={css["version"]}>
                        {t("deck_edit.versions.entry_title", {
                          version: entry.version,
                        })}
                      </span>
                      <span
                        className={css["timestamp"]}
                        data-testid="entry-timestamp"
                      >
                        {formatDateTime(entry.dateUpdate)}
                      </span>
                    </div>
                  )
                }
              />
            );
          })}
        </ol>
      </Plane>
    </Scroller>
  );
}
