import { CARD_TAG_FAVORITE_ID } from "@arkham-build/shared";
import { HeartIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import type { Coded } from "@/store/lib/types";
import {
  selectActiveListFilter,
  selectCardTagMapper,
  selectCardTagOptions,
  selectFilterChanges,
} from "@/store/selectors/lists";
import { isCardTagsFilterObject } from "@/store/slices/lists.type-guards";
import { assert } from "@/utils/assert";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import css from "./filters.module.css";
import type { FilterProps } from "./filters.types";
import { useFilter } from "./primitives/filter-hooks";
import { MultiselectFilter } from "./primitives/multiselect-filter";

export function CardTagsFilter({ id, resolvedDeck, targetDeck }: FilterProps) {
  const { t } = useTranslation();
  const filter = useStore((state) => selectActiveListFilter(state, id));

  assert(
    isCardTagsFilterObject(filter),
    `CardTagsFilter instantiated with '${filter?.type}'`,
  );

  const changes = useStore((state) =>
    selectFilterChanges(state, filter.type, filter.value),
  );
  const options = useStore((state) =>
    selectCardTagOptions(state, resolvedDeck, targetDeck),
  );
  const tagMapper = useStore(selectCardTagMapper);

  const nameRenderer = useCallback(
    (tag: Coded & { name: string }) => tag.name,
    [],
  );

  const { onChange } = useFilter<string[]>(id);

  const favoriteOnly =
    filter.value.length === 1 && filter.value[0] === CARD_TAG_FAVORITE_ID;

  const customOptions = options.filter(
    (option) => option.code !== CARD_TAG_FAVORITE_ID,
  );
  const customValue = filter.value
    .filter((code) => code !== CARD_TAG_FAVORITE_ID)
    .map(tagMapper);

  const showFavoriteShortcut =
    favoriteOnly ||
    options.some((option) => option.code === CARD_TAG_FAVORITE_ID);

  const onToggleFavoriteOnly = useCallback(
    (value: string) => {
      onChange(value === CARD_TAG_FAVORITE_ID ? [CARD_TAG_FAVORITE_ID] : []);
    },
    [onChange],
  );

  return (
    <MultiselectFilter
      changes={changes}
      id={id}
      itemToString={nameRenderer}
      nameRenderer={nameRenderer}
      open={filter.open}
      options={customOptions}
      placeholder={t("filters.card_tags.placeholder")}
      title={t("filters.card_tags.title")}
      value={customValue}
    >
      {showFavoriteShortcut && (
        <ToggleGroup
          full
          onValueChange={onToggleFavoriteOnly}
          type="single"
          value={favoriteOnly ? CARD_TAG_FAVORITE_ID : ""}
        >
          <ToggleGroupItem
            className={css["favorite-toggle"]}
            value={CARD_TAG_FAVORITE_ID}
          >
            <HeartIcon className={css["favorite-icon"]} />
            {t("filters.card_tags.favorites")}
          </ToggleGroupItem>
        </ToggleGroup>
      )}
    </MultiselectFilter>
  );
}
