import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox/combobox";
import { ResultTag } from "@/components/ui/combobox/combobox-results";
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

  const onReset = () => {
    resetFilter("tags");
  };

  const onOpenChange = (val: boolean) => {
    setFilterOpen("tags", val);
  };

  const onChange = (value: Coded[]) => {
    setFilterValue(
      "tags",
      value.map((tag) => tag.code),
    );
  };

  const renderTag = (tag: Coded) => capitalize(tag.code.trim());

  const renderResult = (tag: Coded, onRemove?: () => void) => (
    <ResultTag data-testid={`combobox-result-${tag.code}`} onRemove={onRemove}>
      {renderTag(tag)}
    </ResultTag>
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
          renderItem={renderTag}
        />
      </FilterContainer>
    )
  );
}
