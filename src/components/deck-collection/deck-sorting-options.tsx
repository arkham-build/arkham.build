import { ArrowDownNarrowWideIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type {
  DeckSortPayload,
  SortCriteria,
  SortOrder,
} from "@/store/slices/deck-collection.types";
import { Select } from "../ui/select";
import css from "./deck-sorting-options.module.css";

type Props = {
  filteredCount: number;
  totalCount: number;
};

export function DeckSortingOptions(props: Props) {
  const { filteredCount, totalCount } = props;
  const { t } = useTranslation();

  const setSort = useStore((state) => state.setDeckSort);
  const sort = useStore((state) => state.deckCollection.sort);

  const sortingOptions: {
    label: string;
    sorting: DeckSortPayload;
  }[] = useMemo(
    () => [
      {
        label: t("deck_collection.sorting.date_updated"),
        sorting: { order: "desc", criteria: "date_updated" },
      },
      {
        label: t("deck_collection.sorting.date_created"),
        sorting: { order: "desc", criteria: "date_created" },
      },
      {
        label: t("deck_collection.sorting.alphabetical_asc"),
        sorting: { order: "asc", criteria: "alphabetical" },
      },
      {
        label: t("deck_collection.sorting.alphabetical_desc"),
        sorting: { order: "desc", criteria: "alphabetical" },
      },
      {
        label: t("deck_collection.sorting.xp_desc"),
        sorting: { order: "desc", criteria: "xp" },
      },
      {
        label: t("deck_collection.sorting.xp_asc"),
        sorting: { order: "asc", criteria: "xp" },
      },
    ],
    [t],
  );

  const handleValueChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    const [criteria, order] = evt.target.value.split("|");
    if (criteria && order) {
      setSort({
        criteria: criteria as SortCriteria,
        order: order as SortOrder,
      });
    }
  };

  const diff = totalCount - filteredCount;

  return (
    <div className={css["options-container"]}>
      <p className={css["results-label"]}>
        {t("deck_collection.count", { count: filteredCount })}
        {diff > 0 && (
          <em>{t("deck_collection.count_hidden", { count: diff })}</em>
        )}
      </p>
      <div className={css["options-input"]}>
        <ArrowDownNarrowWideIcon />
        <Select
          emptyLabel="Sort by"
          variant="compressed"
          data-testid="deck-sorting-options"
          name="sorting-options"
          onChange={handleValueChange}
          required
          value={formatDeckSortOption(sort)}
          options={sortingOptions.map((option) => {
            return {
              value: formatDeckSortOption(option.sorting),
              label: option.label,
            };
          })}
        />
      </div>
    </div>
  );
}

function formatDeckSortOption(option: DeckSortPayload) {
  return `${option.criteria}|${option.order}`;
}
