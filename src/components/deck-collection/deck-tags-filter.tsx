import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox/combobox";
import { useStore } from "@/store";
import type { Coded } from "@/store/lib/types";
import {
  selectDeckFilterValue,
  selectTagsChanges,
  selectTagsInLocalDecks,
} from "@/store/selectors/deck-collection";
import { capitalize } from "@/utils/formatting";
import { isEmpty } from "@/utils/is-empty";
import { FilterContainer } from "../filters/primitives/filter-container";

type Props = {
  containerClass?: string;
};

export function DeckTagsFilter({ containerClass }: Props) {
  const { t } = useTranslation();
  const changes = useStore(selectTagsChanges);
  const options = useStore(selectTagsInLocalDecks);
  const open = useStore((state) => state.deckCollection.open.tags);
  const value = useStore((state) =>
    selectDeckFilterValue(state, "tags"),
  ) as string[];

  const locale = useStore((state) => state.settings.locale);

  const setFilterValue = useStore((state) => state.addDecksFilter);
  const setFilterOpen = useStore((state) => state.setDeckFilterOpen);
  const resetFilter = useStore((state) => state.resetDeckFilter);

  const onReset = useCallback(() => {
    resetFilter("tags");
  }, [resetFilter]);

  const onOpenChange = useCallback(
    (val: boolean) => {
      setFilterOpen("tags", val);
    },
    [setFilterOpen],
  );

  const onChange = useCallback(
    (value: Coded[]) => {
      setFilterValue(
        "tags",
        value.map((tag) => tag.code),
      );
    },
    [setFilterValue],
  );

  const renderResult = useCallback(
    (tag: Coded) => capitalize(tag.code.trim()),
    [],
  );

  return (
    !isEmpty(Object.keys(options)) && (
      <FilterContainer
        className={containerClass}
        changes={changes}
        onOpenChange={onOpenChange}
        onReset={onReset}
        open={open}
        title={t("deck_collection.tags_filter.title")}
        data-testid="deck-tags-filter"
      >
        <Combobox
          autoFocus
          id="tag-deck-filter"
          items={options}
          label={t("deck_collection.tags_filter.title")}
          locale={locale}
          onValueChange={onChange}
          placeholder={t("deck_collection.tags_filter.placeholder")}
          selectedItems={value.map((code) => ({ code }))}
          renderResult={renderResult}
          renderItem={renderResult}
        />
      </FilterContainer>
    )
  );
}
